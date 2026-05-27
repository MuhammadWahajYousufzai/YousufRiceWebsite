import { NextResponse } from "next/server";
import { getSubscriptionByEndpoint, checkRateLimit } from "@/lib/push-production";

/**
 * Check subscription status
 * Rate limited: 60 requests per minute per IP
 */
export async function GET(req: Request) {
  try {
    // Get client IP for rate limiting
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const clientIp = forwarded?.split(",")[0]?.trim() || realIp || "unknown";

    // Check rate limit
    const rateLimit = checkRateLimit(`status:${clientIp}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Rate limit exceeded. Please try again later.",
          resetTime: rateLimit.resetTime,
        },
        { 
          status: 429,
          headers: {
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": String(rateLimit.resetTime),
          }
        }
      );
    }

    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint");

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: "endpoint query param is required" },
        { status: 400 }
      );
    }

    // Validate endpoint format
    try {
      new URL(endpoint);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid endpoint URL format" },
        { status: 400 }
      );
    }

    const result = await getSubscriptionByEndpoint(endpoint);

    return NextResponse.json({
      exists: result.exists,
      active: result.active,
      status: result.subscription?.status,
    }, {
      headers: {
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      }
    });
  } catch (error: any) {
    console.error("[Push API] Status check error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to check status" },
      { status: 500 }
    );
  }
}
