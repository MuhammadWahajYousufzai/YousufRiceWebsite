"use server";

import { createAppwriteServerClient } from "@/lib/appwrite-server";
import { ID, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import {
  sendPushNotifications,
  type NotificationPayload,
} from "@/lib/push-production";

const NOTIFICATION_IMAGES_BUCKET_ID =
  process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATION_IMAGES_BUCKET_ID ||
  "notification-images";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const NOTIFICATION_CAMPAIGNS_TABLE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATION_CAMPAIGNS_TABLE_ID ||
  "notification_campaigns";

interface CampaignData {
  title: string;
  body: string;
  image_url?: string | null;
  target_url?: string;
  icon_url?: string;
  tag?: string;
  campaign_type: "push" | "in-app" | "both";
  target_segment: "all" | "active_users" | "inactive_users" | "custom";
  target_tags?: string[];
  require_interaction: boolean;
  scheduled_at?: string | null;
  status?: "draft" | "scheduled" | "sending" | "sent" | "failed" | "cancelled";
  is_active?: boolean;
}

export async function createCampaign(data: CampaignData) {
  try {
    const { databases } = await createAppwriteServerClient();

    const campaignId = ID.unique();

    const campaign = await databases.createDocument(
      DATABASE_ID,
      NOTIFICATION_CAMPAIGNS_TABLE_ID,
      campaignId,
      {
        title: data.title,
        body: data.body,
        image_url: data.image_url || null,
        target_url: data.target_url || "/",
        icon_url: data.icon_url || "/logo.png",
        tag: data.tag || "general",
        campaign_type: data.campaign_type,
        target_segment: data.target_segment,
        target_tags: data.target_tags || [],
        require_interaction: data.require_interaction,
        scheduled_at: data.scheduled_at || null,
        status: data.status || "draft",
        is_active: data.is_active !== undefined ? data.is_active : true,
        sent_count: 0,
        clicked_count: 0,
        failed_count: 0,
        delivered_count: 0,
        dismissed_count: 0,
      },
    );

    revalidatePath("/admin/notifications");
    // Serialize to plain object to avoid prototype issues in client components
    const plainCampaign = JSON.parse(JSON.stringify(campaign));
    return { success: true, campaign: plainCampaign };
  } catch (error: any) {
    console.error("[createCampaign] Error:", error);
    return {
      success: false,
      error: error.message || "Failed to create campaign",
    };
  }
}

export async function updateCampaign(
  campaignId: string,
  data: Partial<CampaignData>,
) {
  try {
    const { databases } = await createAppwriteServerClient();

    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.body !== undefined) updateData.body = data.body;
    if (data.image_url !== undefined) updateData.image_url = data.image_url;
    if (data.target_url !== undefined) updateData.target_url = data.target_url;
    if (data.icon_url !== undefined) updateData.icon_url = data.icon_url;
    if (data.tag !== undefined) updateData.tag = data.tag;
    if (data.campaign_type !== undefined)
      updateData.campaign_type = data.campaign_type;
    if (data.target_segment !== undefined)
      updateData.target_segment = data.target_segment;
    if (data.target_tags !== undefined)
      updateData.target_tags = data.target_tags;
    if (data.require_interaction !== undefined)
      updateData.require_interaction = data.require_interaction;
    if (data.scheduled_at !== undefined)
      updateData.scheduled_at = data.scheduled_at;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    const campaign = await databases.updateDocument(
      DATABASE_ID,
      NOTIFICATION_CAMPAIGNS_TABLE_ID,
      campaignId,
      updateData,
    );

    revalidatePath("/admin/notifications");
    // Serialize to plain object to avoid prototype issues in client components
    const plainCampaign = JSON.parse(JSON.stringify(campaign));
    return { success: true, campaign: plainCampaign };
  } catch (error: any) {
    console.error("[updateCampaign] Error:", error);
    return {
      success: false,
      error: error.message || "Failed to update campaign",
    };
  }
}

export async function deleteCampaign(campaignId: string) {
  try {
    const { databases } = await createAppwriteServerClient();

    await databases.deleteDocument(
      DATABASE_ID,
      NOTIFICATION_CAMPAIGNS_TABLE_ID,
      campaignId,
    );

    revalidatePath("/admin/notifications");
    return { success: true };
  } catch (error: any) {
    console.error("[deleteCampaign] Error:", error);
    return {
      success: false,
      error: error.message || "Failed to delete campaign",
    };
  }
}

export async function getCampaigns() {
  try {
    const { databases } = await createAppwriteServerClient();

    const response = await databases.listDocuments(
      DATABASE_ID,
      NOTIFICATION_CAMPAIGNS_TABLE_ID,
      [Query.orderDesc("$createdAt"), Query.limit(100)],
    );

    // Serialize to plain objects to avoid prototype issues in client components
    const plainCampaigns = JSON.parse(JSON.stringify(response.documents));
    return { success: true, campaigns: plainCampaigns };
  } catch (error: any) {
    console.error("[getCampaigns] Error:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch campaigns",
    };
  }
}

export async function uploadNotificationImage(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    const { storage } = await createAppwriteServerClient();
    const fileId = ID.unique();

    // Pass the File from FormData directly — it already has the correct MIME type.
    // InputFile.fromBuffer/fromPath lose the type, causing "File extension not allowed".
    const uploadedFile = await storage.createFile(
      NOTIFICATION_IMAGES_BUCKET_ID,
      fileId,
      file,
    );

    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
    const imageUrl = `${endpoint}/storage/buckets/${NOTIFICATION_IMAGES_BUCKET_ID}/files/${fileId}/view?project=${projectId}`;

    return { success: true, imageUrl, fileId: uploadedFile.$id };
  } catch (error: any) {
    console.error("[uploadNotificationImage] Error:", error);
    return { success: false, error: error.message || "Failed to upload image" };
  }
}

export async function sendCampaign(campaignId: string) {
  try {
    const { databases } = await createAppwriteServerClient();

    // Fetch campaign
    const campaign = await databases.getDocument(
      DATABASE_ID,
      NOTIFICATION_CAMPAIGNS_TABLE_ID,
      campaignId,
    );

    // Build notification payload
    const payload: NotificationPayload = {
      title: campaign.title,
      body: campaign.body,
      url: campaign.target_url || "/",
      icon: campaign.icon_url || "/logo.png",
      badge: campaign.badge_url || "/badge.png",
      image: campaign.image_url || undefined,
      tag: campaign.tag || "campaign",
      requireInteraction: campaign.require_interaction || false,
      actions: campaign.actions ? JSON.parse(campaign.actions) : undefined,
      ttl: 86400 * 3,
      urgency: "high",
    };

    // Update status to sending
    await databases.updateDocument(
      DATABASE_ID,
      NOTIFICATION_CAMPAIGNS_TABLE_ID,
      campaignId,
      { status: "sending", sent_at: new Date().toISOString() },
    );

    const sendOptions: any = {
      urgent: true,
      priority: "high",
      batchSize: 500,
      batchDelayMs: 0,
    };

    if (
      campaign.target_tags &&
      Array.isArray(campaign.target_tags) &&
      campaign.target_tags.length > 0
    ) {
      sendOptions.tags = campaign.target_tags;
    }

    try {
      const result = await sendPushNotifications(payload, sendOptions);

      // Update campaign with results
      await databases.updateDocument(
        DATABASE_ID,
        NOTIFICATION_CAMPAIGNS_TABLE_ID,
        campaignId,
        {
          status: "sent",
          sent_count: result.sent,
          failed_count: result.failed,
        },
      );

      return {
        success: true,
        result: JSON.parse(JSON.stringify(result)),
        message: `Campaign sent: ${result.sent}/${result.total} delivered`,
      };
    } catch (sendError: any) {
      await databases.updateDocument(
        DATABASE_ID,
        NOTIFICATION_CAMPAIGNS_TABLE_ID,
        campaignId,
        { status: "failed" },
      );
      throw sendError;
    }
  } catch (error: any) {
    console.error("[sendCampaign] Error:", error);
    return {
      success: false,
      error: error.message || "Failed to send campaign",
    };
  }
}
