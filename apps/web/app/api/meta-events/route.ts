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

const SERVER_META_TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE || "";

function getRequestSourceUrl(request: NextRequest): string | undefined {
  const referer = request.headers.get("referer");
  if (referer) return referer;

  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host");
  if (!host) return undefined;

  const protocol =
    request.headers.get("x-forwarded-proto") ||
    request.headers.get("cf-visitor")?.match(/"scheme":"([^"]+)"/)?.[1] ||
    "https";

  return `${protocol}://${host}${request.nextUrl.pathname}`;
}

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
      action_source,
      app_platform,
      app_version,
      user_data,
      custom_data,
    } = body;

    const resolvedActionSource = action_source === "app" ? "app" : "website";

    console.log("[Meta API] Received event", {
      eventName: event_name,
      eventId: event_id,
      sourceUrl: event_source_url,
      referer: request.headers.get("referer"),
    });

    // Validate required fields
    if (!event_name || !event_id) {
      return NextResponse.json(
        { error: "Missing required fields: event_name, event_id" },
        { status: 400 },
      );
    }

    // Get client IP and user agent from request headers
    const clientIp = getClientIp(request);
    const userAgent =
      request.headers.get("user-agent") ||
      (resolvedActionSource === "app"
        ? `YousufRice/${app_version || "unknown"} (${app_platform || "mobile"})`
        : undefined);

    // Prepare user data with hashing
    const preparedUserData = prepareUserData({
      email: user_data?.email,
      // The browser sends only phone_hash. Ignore raw phone fields so a
      // malformed or older client payload can never forward them to Meta.
      phoneHash: user_data?.phone_hash,
      firstName: sanitizeCustomerNameForMeta(user_data?.firstName),
      lastName: sanitizeCustomerNameForMeta(user_data?.lastName),
      city: user_data?.city,
      state: user_data?.state,
      zipCode: user_data?.zipCode,
      country: user_data?.country,
      // Mobile requests reach this endpoint only after ATT authorization.
      // Send IP + user agent so app events without customer contact fields
      // still satisfy Meta's required customer-matching parameters.
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
        resolvedActionSource === "website"
          ? event_source_url || getRequestSourceUrl(request)
          : undefined,
      action_source: resolvedActionSource,
      user_data: preparedUserData,
      custom_data: custom_data as MetaCustomData,
    };

    // Send to Meta Conversions API
    const result = await sendMetaEvent(
      metaEvent,
      SERVER_META_TEST_EVENT_CODE || undefined,
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
