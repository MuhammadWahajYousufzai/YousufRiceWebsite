import { NextRequest, NextResponse } from "next/server";
import { getPushStats, checkRateLimit } from "@/lib/push-production";
import { checkAdminPermissions } from "@/lib/auth-utils";

// Detect if we're in a build/prerender environment
const isBuildTime = () => {
  return process.env.NODE_ENV === 'production' && typeof window === 'undefined' && process.env.NEXT_PHASE === 'phase-production-build';
};

// Dummy stats for build-time
const dummyStats = {
  totalSubscriptions: 0,
  activeSubscriptions: 0,
  totalNotifications: 0,
  totalClicked: 0,
  clickRate: 0,
};

/**
 * GET: Push notification statistics for admin dashboard
 * Returns subscriber counts, notification totals, and click metrics
 */
export async function GET(req: NextRequest) {
  // During build time, return dummy data to avoid prerendering errors
  if (isBuildTime()) {
    console.log('[Push Stats API] Build-time detected, returning dummy stats');
    return NextResponse.json(dummyStats);
  }

  // Check admin permissions (read-only is sufficient)
  const authError = await checkAdminPermissions(req, false, false);
  if (authError) return authError;

  try {
    // Get client IP for rate limiting
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const clientIp = forwarded?.split(",")[0]?.trim() || realIp || "unknown";

    // Check rate limit
    const rateLimit = checkRateLimit(`stats:${clientIp}`);
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

    const stats = await getPushStats();

    return NextResponse.json({
      totalSubscriptions: stats.totalSubscriptions,
      activeSubscriptions: stats.activeSubscriptions,
      totalNotifications: stats.totalNotifications,
      totalClicked: stats.clickedNotifications,
      clickRate: stats.clickRate,
    }, {
      headers: {
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      }
    });
  } catch (error: any) {
    console.error("[Push Stats API] Error:", error);
    return NextResponse.json(
      {
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        totalNotifications: 0,
        totalClicked: 0,
        clickRate: 0,
        error: error.message || "Failed to fetch push stats",
      },
      { status: 500 }
    );
  }
}
