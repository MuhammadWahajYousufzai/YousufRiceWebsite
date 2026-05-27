import { NextResponse } from "next/server";
import { removeSubscription } from "@/lib/push";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.endpoint || typeof body.endpoint !== "string") {
      return NextResponse.json(
        { success: false, error: "endpoint required" },
        { status: 400 },
      );
    }

    await removeSubscription(body.endpoint);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Push API] Unsubscribe error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
