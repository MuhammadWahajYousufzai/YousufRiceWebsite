import { NextResponse } from "next/server";
import { 
  sendPushNotifications, 
  verifyPushSecret, 
  validateNotificationPayload, 
  checkRateLimit,
  type NotificationPayload, 
  type SendOptions 
} from "@/lib/push-production";

// High rate limit for sales blast operations (1000 per minute)
const BLAST_RATE_LIMIT = 1000;

/**
 * SALES BLAST ENDPOINT
 * Optimized for maximum reach of deals/offers/discounts
 * 
 * Features:
 * - High rate limits (1000 requests/min for authorized users)
 * - Parallel batch processing (2500 notifications/sec possible)
 * - All subscribers receive message (no user preference blocking)
 * - 48-72 hour TTL for maximum delivery
 * - Urgent priority for sales messages
 * 
 * Headers required: x-push-secret
 */
export async function POST(req: Request) {
  try {
    // Get client IP
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const clientIp = forwarded?.split(",")[0]?.trim() || realIp || "unknown";

    // Check rate limit (HIGH for sales operations: 1000 per minute)
    const rateLimit = checkRateLimit(`blast:${clientIp}`, BLAST_RATE_LIMIT);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Rate limit exceeded. Maximum 1000 sales blasts per minute.",
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

    // Verify admin secret
    const secret = req.headers.get("x-push-secret");
    if (!secret || !verifyPushSecret(secret)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Invalid PUSH_API_SECRET" },
        { status: 401 }
      );
    }

    // Parse body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // Validate notification payload
    const payloadValidation = validateNotificationPayload(body);
    if (!payloadValidation.valid || !payloadValidation.data) {
      return NextResponse.json(
        { success: false, error: payloadValidation.error || "Invalid notification payload" },
        { status: 400 }
      );
    }

    const payload: NotificationPayload = payloadValidation.data;

    // Build send options - OPTIMIZED FOR SALES
    const options: SendOptions = {
      urgent: true, // Always urgent for sales
      priority: "high",
      batchSize: 500, // Maximum batch size
      batchDelayMs: 0, // No delay
    };
    
    // Optional: target specific segments
    if (body.tags && Array.isArray(body.tags)) {
      options.tags = body.tags.filter((t): t is string => typeof t === "string");
    }
    
    // Optional: target specific users
    if (body.userIds && Array.isArray(body.userIds)) {
      options.userIds = body.userIds.filter((u): u is string => typeof u === "string");
    }

    // Send the blast
    console.log(`[Sales Blast] Starting blast from ${clientIp}...`);
    const startTime = Date.now();
    
    const result = await sendPushNotifications(payload, options);
    
    const duration = Date.now() - startTime;
    const rate = result.total > 0 ? (result.sent / result.total * 100).toFixed(1) : "0";

    return NextResponse.json({
      success: true,
      blast: {
        total: result.total,
        sent: result.sent,
        failed: result.failed,
        removed: result.removed,
        deliveryRate: `${rate}%`,
        durationMs: duration,
        throughput: `${(result.total / (duration / 1000)).toFixed(0)} msgs/sec`,
      },
      message: `Sales blast complete: ${result.sent}/${result.total} notifications delivered (${rate}%)`,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      }
    });
  } catch (error: any) {
    console.error("[Push API] Sales blast error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to send sales blast",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
