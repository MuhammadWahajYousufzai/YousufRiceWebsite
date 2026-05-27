import { NextRequest, NextResponse } from "next/server";
import {
  sendMetaEvent,
  prepareUserData,
  getClientIp,
  getCurrentTimestamp,
  sanitizeCustomerNameForMeta,
  type MetaEvent,
  type MetaCustomData,
} from "@/lib/meta";

const SERVER_META_TEST_EVENT_CODE =
  process.env.META_TEST_EVENT_CODE ||
  process.env.NEXT_PUBLIC_META_TEST_EVENT_CODE ||
  "";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const body =
      contentType.includes("application/json")
        ? await request.json()
        : JSON.parse(await request.text());

    const {
      event_name,
      event_id,
      event_time,
      event_source_url,
      user_data,
      custom_data,
      test_event_code,
    } = body;

    console.log("[Meta API] Received event", {
      eventName: event_name,
      eventId: event_id,
      sourceUrl: event_source_url,
      referer: request.headers.get("referer"),
      orderChannel: custom_data?.order_channel,
      agentLabel: custom_data?.agent_label,
    });

    // Validate required fields
    if (!event_name || !event_id) {
      return NextResponse.json(
        { error: "Missing required fields: event_name, event_id" },
        { status: 400 },
      );
    }

    // Server-side guard: drop events from call center agent sessions
    // Agents (Kiran/Saima) calling past customers should never trigger Meta events.
    // This is a safety net — the client already suppresses these calls.
    if (custom_data?.order_channel === "call_center_agent") {
      console.log(
        `[Meta API] Suppressing ${event_name} event from call center agent (event_id: ${event_id})`,
      );
      return NextResponse.json({
        success: true,
        suppressed: true,
        event_id,
        message: "Event suppressed (call center agent)",
      });
    }

    // Get client IP and user agent from request headers
    const clientIp = getClientIp(request);
    const userAgent = request.headers.get("user-agent") || undefined;

    // Prepare user data with hashing
    const preparedUserData = prepareUserData({
      email: user_data?.email,
      phone: user_data?.phone,
      firstName: sanitizeCustomerNameForMeta(user_data?.firstName),
      lastName: sanitizeCustomerNameForMeta(user_data?.lastName),
      city: user_data?.city,
      state: user_data?.state,
      zipCode: user_data?.zipCode,
      country: user_data?.country,
      clientIp,
      userAgent,
      fbp: user_data?.fbp,
      fbc: user_data?.fbc,
      externalId: user_data?.externalId,
    });

    // Construct Meta event
    const metaEvent: MetaEvent = {
      event_name,
      event_time:
        typeof event_time === "number" && event_time > 0
          ? event_time
          : getCurrentTimestamp(),
      event_id,
      event_source_url:
        event_source_url || request.headers.get("referer") || undefined,
      action_source: "website",
      user_data: preparedUserData,
      custom_data: custom_data as MetaCustomData,
    };

    // Send to Meta Conversions API
    const result = await sendMetaEvent(
      metaEvent,
      test_event_code || SERVER_META_TEST_EVENT_CODE || undefined,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      event_id,
      message: "Event sent successfully",
    });
  } catch (error) {
    console.error("Meta Events API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
