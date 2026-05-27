import { NextRequest, NextResponse } from "next/server";
import {
  tablesDB,
  DATABASE_ID,
  NOTIFICATION_CAMPAIGNS_TABLE_ID,
} from "@/lib/appwrite";
import { Query, ID } from "appwrite";
import { sendPushNotifications, type NotificationPayload } from "@/lib/push-production";
import { checkAdminPermissions } from "@/lib/auth-utils";

// ============================================================================
// GET: List campaigns with optional filters
// ============================================================================
export async function GET(req: NextRequest) {
  const authError = await checkAdminPermissions(req, false, false);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const queries: string[] = [Query.orderDesc("$createdAt"), Query.limit(limit)];
    if (offset > 0) queries.push(Query.offset(offset));
    if (status) queries.push(Query.equal("status", status));

    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: NOTIFICATION_CAMPAIGNS_TABLE_ID,
      queries,
    });

    return NextResponse.json({ success: true, campaigns: response.rows, total: response.total });
  } catch (error: any) {
    console.error("[Campaigns API] List error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list campaigns" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST: Create new campaign or send existing campaign
// ============================================================================
export async function POST(req: NextRequest) {
  const authError = await checkAdminPermissions(req, true, true);
  if (authError) return authError;

  try {
    const body = await req.json();
    const action = body.action || "create";

    if (action === "create") {
      // Create new campaign
      const { title, body: messageBody, image_url, target_url, icon_url, badge_url, tag, campaign_type, target_segment, target_tags, require_interaction, actions, scheduled_at } = body;

      if (!title || !messageBody) {
        return NextResponse.json(
          { success: false, error: "Title and body are required" },
          { status: 400 }
        );
      }

      const campaignId = ID.unique();
      const now = new Date().toISOString();

      await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: NOTIFICATION_CAMPAIGNS_TABLE_ID,
        rowId: campaignId,
        data: {
          title,
          body: messageBody,
          image_url: image_url || null,
          target_url: target_url || "/",
          icon_url: icon_url || "/logo.png",
          badge_url: badge_url || "/badge.png",
          tag: tag || "general",
          campaign_type: campaign_type || "push",
          status: scheduled_at ? "scheduled" : "draft",
          is_active: true,
          sent_count: 0,
          clicked_count: 0,
          failed_count: 0,
          delivered_count: 0,
          dismissed_count: 0,
          scheduled_at: scheduled_at || null,
          sent_at: null,
          target_segment: target_segment || "all",
          target_tags: target_tags || [],
          actions: actions ? JSON.stringify(actions) : null,
          require_interaction: !!require_interaction,
        },
      });

      return NextResponse.json({ success: true, campaignId, message: "Campaign created successfully" });
    }

    if (action === "send") {
      // Send campaign
      const { campaignId } = body;
      if (!campaignId) {
        return NextResponse.json(
          { success: false, error: "campaignId is required" },
          { status: 400 }
        );
      }

      // Fetch campaign
      const campaign = await tablesDB.getRow({
        databaseId: DATABASE_ID,
        tableId: NOTIFICATION_CAMPAIGNS_TABLE_ID,
        rowId: campaignId,
      }) as any;

      if (!campaign) {
        return NextResponse.json(
          { success: false, error: "Campaign not found" },
          { status: 404 }
        );
      }

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
      await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: NOTIFICATION_CAMPAIGNS_TABLE_ID,
        rowId: campaignId,
        data: { status: "sending", sent_at: new Date().toISOString() },
      });

      // Send push notifications
      const sendOptions: any = {
        urgent: true,
        priority: "high",
        batchSize: 500,
        batchDelayMs: 0,
      };

      if (campaign.target_tags && Array.isArray(campaign.target_tags) && campaign.target_tags.length > 0) {
        sendOptions.tags = campaign.target_tags;
      }

      try {
        const result = await sendPushNotifications(payload, sendOptions);

        // Update campaign with results
        await tablesDB.updateRow({
          databaseId: DATABASE_ID,
          tableId: NOTIFICATION_CAMPAIGNS_TABLE_ID,
          rowId: campaignId,
          data: {
            status: "sent",
            sent_count: result.sent,
            failed_count: result.failed,
          },
        });

        return NextResponse.json({
          success: true,
          result,
          message: `Campaign sent: ${result.sent}/${result.total} delivered`,
        });
      } catch (sendError: any) {
        await tablesDB.updateRow({
          databaseId: DATABASE_ID,
          tableId: NOTIFICATION_CAMPAIGNS_TABLE_ID,
          rowId: campaignId,
          data: { status: "failed" },
        });
        throw sendError;
      }
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[Campaigns API] POST error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process campaign" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH: Update campaign
// ============================================================================
export async function PATCH(req: NextRequest) {
  const authError = await checkAdminPermissions(req, true, true);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { campaignId, ...updates } = body;

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: "campaignId is required" },
        { status: 400 }
      );
    }

    // Prevent updating sent campaigns status directly
    const allowedFields = [
      "title", "body", "image_url", "target_url", "icon_url", "badge_url",
      "tag", "campaign_type", "is_active", "target_segment", "target_tags",
      "require_interaction", "actions", "scheduled_at", "status",
    ];

    const data: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in updates) {
        if (key === "actions" || key === "target_tags") {
          data[key] = Array.isArray(updates[key]) ? updates[key] : JSON.stringify(updates[key]);
        } else {
          data[key] = updates[key];
        }
      }
    }

    await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: NOTIFICATION_CAMPAIGNS_TABLE_ID,
      rowId: campaignId,
      data,
    });

    return NextResponse.json({ success: true, message: "Campaign updated successfully" });
  } catch (error: any) {
    console.error("[Campaigns API] PATCH error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update campaign" },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE: Delete campaign
// ============================================================================
export async function DELETE(req: NextRequest) {
  const authError = await checkAdminPermissions(req, true, true);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: "campaignId is required" },
        { status: 400 }
      );
    }

    await tablesDB.deleteRow({
      databaseId: DATABASE_ID,
      tableId: NOTIFICATION_CAMPAIGNS_TABLE_ID,
      rowId: campaignId,
    });

    return NextResponse.json({ success: true, message: "Campaign deleted successfully" });
  } catch (error: any) {
    console.error("[Campaigns API] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
