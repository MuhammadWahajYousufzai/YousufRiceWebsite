import { NextResponse } from "next/server";
import { sendPushNotifications, getSubscriptions } from "@/lib/push";

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

    console.log("[Push API] calling sendPushNotifications...");
    const result = await sendPushNotifications({
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
  const subs = await getSubscriptions();
  return NextResponse.json({
    count: subs.length,
    endpoints: subs.map((s) => s.endpoint.slice(0, 80)),
  });
}
