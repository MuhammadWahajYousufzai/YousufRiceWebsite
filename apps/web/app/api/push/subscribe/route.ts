import { NextResponse } from "next/server";
import { saveSubscription } from "@/lib/push";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.endpoint || !body.p256dh || !body.auth) {
      return NextResponse.json(
        { success: false, error: "endpoint, p256dh, auth required" },
        { status: 400 },
      );
    }

    const result = await saveSubscription({
      endpoint: body.endpoint,
      p256dh: body.p256dh,
      auth: body.auth,
      user_id: body.user_id || null,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to save subscription",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    console.error("[Push API] Subscription error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
