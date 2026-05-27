/**
 * Push Notification Utilities — MVP
 * Simple, reliable. One table: push_subscriptions
 */

import { Client, TablesDB, Query, ID } from "node-appwrite";
import webpush from "web-push";

// VAPID
const vapidEmail = process.env.VAPID_EMAIL || "mailto:admin@yousufrice.com";
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
}

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
const SUBS_TABLE =
  process.env.NEXT_PUBLIC_APPWRITE_PUSH_SUBSCRIPTIONS_TABLE_ID ||
  "push_subscriptions";

function getDB() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "")
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "")
    .setKey(process.env.APPWRITE_API_KEY || "");
  return new TablesDB(client);
}

export interface PushSub {
  $id?: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id?: string | null;
}

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  image?: string;
  tag?: string;
}

export async function saveSubscription(sub: Omit<PushSub, "$id">) {
  try {
    const db = getDB();
    const existing = await db.listRows(DB_ID, SUBS_TABLE, [
      Query.equal("endpoint", sub.endpoint),
      Query.limit(1),
    ]);
    if (existing.total > 0) {
      const row = existing.rows[0] as any;
      await db.updateRow(DB_ID, SUBS_TABLE, row.$id, {
        p256dh: sub.p256dh,
        auth: sub.auth,
        user_id: sub.user_id || row.user_id || null,
      });
      return { success: true, id: row.$id };
    }
    const doc = await db.createRow(DB_ID, SUBS_TABLE, ID.unique(), {
      ...sub,
      user_id: sub.user_id || null,
    });
    return { success: true, id: (doc as any).$id };
  } catch (err: any) {
    console.error("[Push] save error:", err);
    return { success: false, error: err.message };
  }
}

export async function removeSubscription(endpoint: string) {
  try {
    const db = getDB();
    const existing = await db.listRows(DB_ID, SUBS_TABLE, [
      Query.equal("endpoint", endpoint),
      Query.limit(1),
    ]);
    if (existing.total > 0) {
      const row = existing.rows[0] as any;
      await db.deleteRow(DB_ID, SUBS_TABLE, row.$id);
    }
    return { success: true };
  } catch (err: any) {
    console.error("[Push] remove error:", err);
    return { success: false, error: err.message };
  }
}

export async function getSubscriptions(): Promise<PushSub[]> {
  try {
    console.log("[Push] getSubscriptions: querying Appwrite...");
    const db = getDB();
    const result = await db.listRows(DB_ID, SUBS_TABLE, [Query.limit(10000)]);
    console.log("[Push] getSubscriptions: found", result.rows.length, "subs");
    return (result.rows as any[]).map((r) => ({
      $id: r.$id,
      endpoint: r.endpoint,
      p256dh: r.p256dh,
      auth: r.auth,
      user_id: r.user_id,
    }));
  } catch (err: any) {
    console.error("[Push] get subs error:", err);
    return [];
  }
}

export async function sendPushNotifications(payload: NotificationPayload) {
  console.log("[Push] sendPushNotifications: starting");
  const subs = await getSubscriptions();
  console.log("[Push] sendPushNotifications:", subs.length, "subs");
  if (subs.length === 0)
    return { sent: 0, failed: 0, total: 0, errors: [] as string[] };

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/",
    icon: payload.icon || "/icon-192x192.png",
    tag: payload.tag || "general",
  });
  console.log("[Push] payload:", notificationPayload.slice(0, 200));

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const sub of subs) {
    console.log("[Push] sending to", sub.endpoint.slice(0, 60), "...");
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        notificationPayload,
        { TTL: 86400 },
      );
      sent++;
      console.log("[Push] sent OK");
    } catch (err: any) {
      failed++;
      const msg = `Endpoint ${sub.endpoint.slice(0, 60)}... status=${err.statusCode} error=${err.message}`;
      console.error("[Push] send failed:", msg);
      errors.push(msg);
      if (
        err.statusCode === 410 ||
        err.statusCode === 404 ||
        err.statusCode === 403
      ) {
        console.log("[Push] removing stale subscription");
        await removeSubscription(sub.endpoint);
      }
    }
  }

  console.log("[Push] done. sent:", sent, "failed:", failed);
  return { sent, failed, total: subs.length, errors };
}
