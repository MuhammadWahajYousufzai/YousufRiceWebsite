import { NextResponse } from "next/server";
import { getHealthStatus, getPushStats, getMetrics, verifyPushSecret, checkRateLimit } from "@/lib/push-production";

// Detect if we're in a build/prerender environment
const isBuildTime = () => {
  return process.env.NODE_ENV === 'production' && typeof window === 'undefined' && process.env.NEXT_PHASE === 'phase-production-build';
};

// Dummy health data for build-time
const dummyHealth = {
  success: true,
  health: { status: 'healthy', database: 'connected', webPush: 'configured' },
  stats: { totalSubscriptions: 0, activeSubscriptions: 0, totalNotificationsSent: 0 },
  metrics: { totalSent: 0, totalFailed: 0, totalClicked: 0, totalDismissed: 0, averageLatencyMs: 0, recentErrors: [] },
  timestamp: new Date().toISOString(),
};

/**
 * Health check endpoint for push notification system
 * Returns system status, metrics, and diagnostics
 * Protected by PUSH_API_SECRET
 * Rate limited: 30 requests per minute per IP
 */
export async function GET(req: Request) {
  // During build time, return dummy data to avoid prerendering errors
  if (isBuildTime()) {
    console.log('[Push API] Build-time detected, returning dummy health data');
    return NextResponse.json(dummyHealth);
  }

  try {
    // Get client IP for rate limiting
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const clientIp = forwarded?.split(",")[0]?.trim() || realIp || "unknown";

    // Check rate limit
    const rateLimit = checkRateLimit(`health:${clientIp}`);
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

    // Verify admin secret
    const secret = req.headers.get("x-push-secret");
    if (!secret || !verifyPushSecret(secret)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get comprehensive health status
    const [health, stats, metrics] = await Promise.all([
      getHealthStatus(),
      getPushStats(),
      Promise.resolve(getMetrics()),
    ]);

    return NextResponse.json({
      success: true,
      health,
      stats,
      metrics: {
        totalSent: metrics.totalSent,
        totalFailed: metrics.totalFailed,
        totalClicked: metrics.totalClicked,
        totalDismissed: metrics.totalDismissed,
        averageLatencyMs: Math.round(metrics.averageLatencyMs * 100) / 100,
        recentErrors: Array.from(metrics.errorsByType.entries()).map(([type, count]) => ({ type, count })),
      },
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      }
    });
  } catch (error: any) {
    console.error("[Push API] Health check error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to get health status",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
