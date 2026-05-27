import { NextResponse } from "next/server";
import { Client, TablesDB, Query } from "node-appwrite";
import { checkRateLimit, getMetrics } from "@/lib/push-production";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
const PUSH_LOG_TABLE_ID = process.env.NEXT_PUBLIC_APPWRITE_PUSH_LOG_TABLE_ID || "push_notification_log";

function createClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "")
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "")
    .setKey(process.env.APPWRITE_API_KEY || "");
  return new TablesDB(client);
}

/**
 * Track notification interaction (click or dismiss)
 * Rate limited: 120 requests per minute per IP
 */
export async function POST(req: Request) {
  try {
    // Get client IP for rate limiting
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const clientIp = forwarded?.split(",")[0]?.trim() || realIp || "unknown";

    // Check rate limit
    const rateLimit = checkRateLimit(`track:${clientIp}`);
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

    // Parse body
    let body: { subscription_id?: string; action?: string; url?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    
    const { subscription_id, action, url } = body;

    // Validate required fields
    if (!subscription_id || typeof subscription_id !== "string") {
      return NextResponse.json(
        { success: false, error: "subscription_id is required and must be a string" },
        { status: 400 }
      );
    }

    if (!action || !["click", "dismiss"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "action must be 'click' or 'dismiss'" },
        { status: 400 }
      );
    }

    const tablesDB = createClient();

    // Find the most recent log entry for this subscription with sent/delivered status
    const logs = await tablesDB.listRows(
      DATABASE_ID,
      PUSH_LOG_TABLE_ID,
      [
        Query.equal("subscription_id", subscription_id),
        Query.orderDesc("$createdAt"),
        Query.limit(1),
      ]
    );

    if (logs.total === 0) {
      return NextResponse.json(
        { success: false, error: "No log entry found for this subscription" },
        { status: 404 }
      );
    }

    const logEntry = logs.rows[0] as { $id: string };
    const now = new Date().toISOString();

    // Update the log entry based on the action
    if (action === "click") {
      await tablesDB.updateRow(DATABASE_ID, PUSH_LOG_TABLE_ID, logEntry.$id, {
        status: "clicked",
        clicked_at: now,
      });
      // Update metrics
      const metrics = getMetrics();
      metrics.totalClicked++;
    } else if (action === "dismiss") {
      await tablesDB.updateRow(DATABASE_ID, PUSH_LOG_TABLE_ID, logEntry.$id, {
        status: "dismissed",
        dismissed_at: now,
      });
      // Update metrics
      const metrics = getMetrics();
      metrics.totalDismissed++;
    }

    return NextResponse.json({ 
      success: true,
    }, {
      headers: {
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      }
    });
  } catch (error: any) {
    console.error("[Push API] Track notification error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to track notification" },
      { status: 500 }
    );
  }
}
