import { NextResponse } from "next/server";
import {
  listAppwritePushTargets,
  sendAppwritePushNotifications,
} from "@/lib/appwrite-messaging-push";

export async function POST(req: Request) {
  console.log("[Push API] POST /api/push/send received");
  try {
    const body = await req.json();
    console.log("[Push API] body:", {
      title: body.title,
      bodyLen: body.body?.length,
      url: body.url,
    });

    if (!body.title || !body.body) {
      return NextResponse.json(
        { success: false, error: "title and body required" },
        { status: 400 },
      );
    }

    console.log("[Push API] calling Appwrite Messaging...");
    const result = await sendAppwritePushNotifications({
      title: body.title,
      body: body.body,
      url: body.url || "/",
      icon: body.icon || "/logo.png",
      tag: body.tag || "general",
    });
    console.log("[Push API] result:", result);

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("[Push API] Send error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to send" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const subscriptions = await listAppwritePushTargets();
    return NextResponse.json({
      count: subscriptions.targets.length,
      users: subscriptions.users.length,
      endpoints: subscriptions.targets.map((target) => target.targetId),
      providerIds: [
        ...new Set(
          subscriptions.targets
            .map((target) => target.providerId)
            .filter(Boolean),
        ),
      ],
      backend: "appwrite-messaging",
    });
  } catch (error: any) {
    console.error("[Push API] Diagnostics error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to load Appwrite Messaging targets",
      },
      { status: 500 },
    );
  }
}
