import { NextRequest, NextResponse } from "next/server";
import {
  tablesDB,
  DATABASE_ID,
  NOTIFICATION_CAMPAIGNS_TABLE_ID,
  NOTIFICATION_ANALYTICS_TABLE_ID,
  PUSH_SUBSCRIPTIONS_TABLE_ID,
  PUSH_LOG_TABLE_ID,
} from "@/lib/appwrite";
import { Query } from "appwrite";
import { checkAdminPermissions } from "@/lib/auth-utils";

// Detect if we're in a build/prerender environment
const isBuildTime = () => {
  return process.env.NODE_ENV === 'production' && typeof window === 'undefined' && process.env.NEXT_PHASE === 'phase-production-build';
};

// Dummy stats for build-time
const dummyStats = {
  totalCampaigns: 0,
  activeCampaigns: 0,
  totalSubscriptions: 0,
  activeSubscriptions: 0,
  totalNotifications: 0,
  totalClicked: 0,
  clickRate: 0,
};

// ============================================================================
// GET: Get analytics for campaigns and overall stats
// ============================================================================
export async function GET(req: NextRequest) {
  // During build time, return dummy data to avoid prerendering errors
  if (isBuildTime()) {
    console.log('[Analytics API] Build-time detected, returning dummy stats');
    return NextResponse.json({
      success: true,
      stats: dummyStats,
    });
  }

  const authError = await checkAdminPermissions(req, false, false);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");

    if (campaignId) {
      // Get analytics for specific campaign
      const [campaign, analytics] = await Promise.all([
        tablesDB.getRow({
          databaseId: DATABASE_ID,
          tableId: NOTIFICATION_CAMPAIGNS_TABLE_ID,
          rowId: campaignId,
        }).catch(() => null),
        tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: NOTIFICATION_ANALYTICS_TABLE_ID,
          queries: [Query.equal("campaign_id", campaignId), Query.limit(1)],
        }).catch(() => ({ total: 0, rows: [] })),
      ]);

      return NextResponse.json({
        success: true,
        campaign,
        analytics: {
          totalEvents: analytics.total,
        },
      });
    }

    // Get overall stats
    const [
      campaignsRes,
      activeCampaignsRes,
      totalSubscriptionsRes,
      activeSubscriptionsRes,
      totalLogsRes,
      clickedLogsRes,
    ] = await Promise.all([
      tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: NOTIFICATION_CAMPAIGNS_TABLE_ID,
        queries: [Query.limit(1)],
      }).catch(() => ({ total: 0 })),
      tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: NOTIFICATION_CAMPAIGNS_TABLE_ID,
        queries: [Query.equal("is_active", true), Query.limit(1)],
      }).catch(() => ({ total: 0 })),
      tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: PUSH_SUBSCRIPTIONS_TABLE_ID,
        queries: [Query.limit(1)],
      }).catch(() => ({ total: 0 })),
      tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: PUSH_SUBSCRIPTIONS_TABLE_ID,
        queries: [Query.equal("status", "active"), Query.limit(1)],
      }).catch(() => ({ total: 0 })),
      tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: PUSH_LOG_TABLE_ID,
        queries: [Query.limit(1)],
      }).catch(() => ({ total: 0 })),
      tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: PUSH_LOG_TABLE_ID,
        queries: [Query.equal("status", "clicked"), Query.limit(1)],
      }).catch(() => ({ total: 0 })),
    ]);

    const totalCampaigns = campaignsRes.total;
    const activeCampaigns = activeCampaignsRes.total;
    const totalSubscriptions = totalSubscriptionsRes.total;
    const activeSubscriptions = activeSubscriptionsRes.total;
    const totalNotifications = totalLogsRes.total;
    const totalClicked = clickedLogsRes.total;
    const clickRate = totalNotifications > 0 ? (totalClicked / totalNotifications) * 100 : 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalCampaigns,
        activeCampaigns,
        totalSubscriptions,
        activeSubscriptions,
        totalNotifications,
        totalClicked,
        clickRate: Math.round(clickRate * 100) / 100,
      },
    });
  } catch (error: any) {
    console.error("[Analytics API] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
