import { NextResponse } from "next/server";
import { cleanupOldLogs, cleanupInactiveSubscriptions, verifyPushSecret, checkRateLimit } from "@/lib/push-production";

/**
 * Cleanup endpoint for push notification system
 * Removes old logs and inactive subscriptions
 * Protected by PUSH_API_SECRET
 * Rate limited: 5 requests per hour per IP
 */
export async function POST(req: Request) {
  try {
    // Get client IP for rate limiting
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const clientIp = forwarded?.split(",")[0]?.trim() || realIp || "unknown";

    // Check rate limit (very strict for cleanup)
    const rateLimit = checkRateLimit(`cleanup:${clientIp}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Rate limit exceeded. Cleanup operations are limited to 5 per hour.",
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
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body for optional parameters
    let logRetentionDays = 30;
    let subscriptionRetentionDays = 30;
    
    try {
      const body = await req.json();
      if (typeof body?.logRetentionDays === "number" && body.logRetentionDays >= 7) {
        logRetentionDays = body.logRetentionDays;
      }
      if (typeof body?.subscriptionRetentionDays === "number" && body.subscriptionRetentionDays >= 7) {
        subscriptionRetentionDays = body.subscriptionRetentionDays;
      }
    } catch {
      // No body or invalid JSON - use defaults
    }

    // Perform cleanup operations
    const startTime = Date.now();
    
    const [logResult, subscriptionResult] = await Promise.all([
      cleanupOldLogs(logRetentionDays),
      cleanupInactiveSubscriptions(subscriptionRetentionDays),
    ]);

    const durationMs = Date.now() - startTime;

    // Build response
    const response: Record<string, unknown> = {
      success: true,
      durationMs,
      cleanup: {
        logs: {
          deleted: logResult.deleted,
          retentionDays: logRetentionDays,
          error: logResult.error,
        },
        subscriptions: {
          deleted: subscriptionResult.deleted,
          retentionDays: subscriptionRetentionDays,
          error: subscriptionResult.error,
        },
      },
      timestamp: new Date().toISOString(),
    };

    // If there were errors, mark as partial success
    if (logResult.error || subscriptionResult.error) {
      response.partialSuccess = true;
      response.warnings = [
        logResult.error && `Log cleanup error: ${logResult.error}`,
        subscriptionResult.error && `Subscription cleanup error: ${subscriptionResult.error}`,
      ].filter(Boolean);
    }

    return NextResponse.json(response, {
      headers: {
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      }
    });
  } catch (error: any) {
    console.error("[Push API] Cleanup error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to perform cleanup",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
