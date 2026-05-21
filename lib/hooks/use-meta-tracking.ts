"use client";

import { useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  generateEventId,
  getFacebookCookies,
  sanitizeCustomerNameForMeta,
  type MetaCustomData,
} from "@/lib/meta";
import type { AgentLabel, OrderChannel } from "@/lib/tracking/order-channel";

// Get test event code from environment variable
const TEST_EVENT_CODE = process.env.NEXT_PUBLIC_META_TEST_EVENT_CODE || "";

// Extend Window interface for Meta Pixel
declare global {
  interface Window {
    fbq?: (
      action: string,
      eventName: string,
      data?: Record<string, any>,
      options?: { eventID: string },
    ) => void;
  }
}

interface TrackEventParams {
  eventName: string;
  eventId?: string;
  userData?: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    externalId?: string;
  };
  customData?: MetaCustomData;
  testEventCode?: string;
  deliveryMode?: "await" | "background" | "navigation";
  skipBrowserPixel?: boolean;
}

interface TrackingContext {
  orderChannel: OrderChannel;
  agentLabel?: AgentLabel | null;
  placedByUserId?: string;
  customerUserId?: string;
}

function buildTrackingCustomData(
  customData: MetaCustomData,
  trackingContext?: TrackingContext,
): MetaCustomData {
  if (!trackingContext) return customData;
  return {
    ...customData,
    order_channel: trackingContext.orderChannel,
    agent_label: trackingContext.agentLabel ?? undefined,
    placed_by_user_id: trackingContext.placedByUserId,
    customer_user_id: trackingContext.customerUserId,
  };
}

export function useMetaTracking() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track event on both browser (Pixel) and server (Conversions API)
  const trackEvent = useCallback(
    async ({
      eventName,
      eventId: providedEventId,
      userData = {},
      customData = {},
      testEventCode,
      deliveryMode = "await",
      skipBrowserPixel = false,
    }: TrackEventParams) => {
      try {
        // Generate unique event ID for deduplication
        const eventId = providedEventId ?? await generateEventId({ eventName });
        const eventTime = Math.floor(Date.now() / 1000);

        // Construct current URL using actual browser origin
        const origin =
          typeof window !== "undefined"
            ? window.location.origin
            : process.env.NEXT_PUBLIC_PRIMARY_DOMAIN ||
              "https://yousufrice.com";
        const queryString = searchParams.toString();
        const eventSourceUrl = queryString
          ? `${origin}${pathname}?${queryString}`
          : `${origin}${pathname}`;

        console.log(
          `[Meta Tracking] Event: ${eventName}, URL: ${eventSourceUrl}`,
        );

        // Get Facebook cookies
        const { fbp, fbc } = getFacebookCookies();

        // 1. Browser-side: Track with Meta Pixel
        if (!skipBrowserPixel && typeof window !== "undefined" && window.fbq) {
          window.fbq("track", eventName, customData, { eventID: eventId });
          console.log(`[Meta Pixel] ${eventName} tracked with ID: ${eventId}`);
        }

        const payload = {
          event_name: eventName,
          event_id: eventId,
          event_time: eventTime,
          event_source_url: eventSourceUrl,
          user_data: {
            ...userData,
            firstName: userData.firstName
              ? sanitizeCustomerNameForMeta(userData.firstName)
              : undefined,
            lastName: userData.lastName
              ? sanitizeCustomerNameForMeta(userData.lastName)
              : undefined,
            fbp,
            fbc,
          },
          custom_data: customData,
          test_event_code: testEventCode,
        };

        // 2. Server-side: Send to Conversions API via our endpoint
        const requestInit: RequestInit = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          keepalive: deliveryMode !== "await",
        };

        if (
          deliveryMode === "navigation" &&
          typeof navigator !== "undefined" &&
          typeof navigator.sendBeacon === "function"
        ) {
          const beaconOk = navigator.sendBeacon(
            "/api/meta-events",
            new Blob([JSON.stringify(payload)], { type: "application/json" }),
          );
          if (beaconOk) {
            return { success: true, eventId };
          }
        }

        const responsePromise = fetch("/api/meta-events", requestInit);

        if (deliveryMode !== "await") {
          responsePromise
            .then(async (response) => {
              if (!response.ok) {
                const responseText = await response.text().catch(() => "");
                console.warn("[Meta Conversions API] Background send returned error:", {
                  eventName,
                  eventId,
                  status: response.status,
                  responseText,
                });
              }
            })
            .catch((error) => {
              console.error("[Meta Conversions API] Background send failed:", {
                eventName,
                eventId,
                error,
              });
            });
          return { success: true, eventId };
        }

        const response = await responsePromise;
        if (!response.ok) {
          return { success: false, error: `HTTP ${response.status}` };
        }

        const testModeIndicator = testEventCode ? " [TEST MODE]" : "";
        console.log(
          `[Meta Conversions API] ${eventName} sent with ID: ${eventId}${testModeIndicator}`,
        );

        return { success: true, eventId };
      } catch (error) {
        console.error("[Meta Tracking] Error:", error);
        return { success: false, error: "Tracking failed" };
      }
    },
    [pathname, searchParams],
  );

  // Convenience methods for common events
  const trackPageView = useCallback(() => {
    const win = typeof window !== "undefined" ? (window as any) : null;
    const initialEventId = win?.__metaPageViewEventId ?? undefined;
    if (win) win.__metaPageViewEventId = undefined;
    return trackEvent({
      eventName: "PageView",
      eventId: initialEventId,
      skipBrowserPixel: !!initialEventId,
      testEventCode: TEST_EVENT_CODE || undefined,
    });
  }, [trackEvent]);

  const trackViewContent = useCallback(
    (productData: {
      contentName: string;
      contentId: string;
      contentType?: string;
      value?: number;
      currency?: string;
      userData?: {
        email?: string;
        phone?: string;
        firstName?: string;
        lastName?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
        externalId?: string;
      };
      trackingContext?: TrackingContext;
    }) => {
      return trackEvent({
        eventName: "ViewContent",
        userData: productData.userData,
        customData: buildTrackingCustomData(
          {
            content_name: productData.contentName,
            content_ids: [productData.contentId],
            content_type: productData.contentType || "product",
            value: productData.value,
            currency: productData.currency || "PKR",
          },
          productData.trackingContext,
        ),
        deliveryMode: "background",
        testEventCode: TEST_EVENT_CODE || undefined,
      });
    },
    [trackEvent],
  );

  const trackAddToCart = useCallback(
    (cartData: {
      contentName: string;
      contentId: string;
      value: number;
      currency?: string;
      quantity?: number;
      userData?: {
        email?: string;
        phone?: string;
        firstName?: string;
        lastName?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
        externalId?: string;
      };
      trackingContext?: TrackingContext;
    }) => {
      return trackEvent({
        eventName: "AddToCart",
        userData: cartData.userData,
        customData: buildTrackingCustomData(
          {
            content_name: cartData.contentName,
            content_ids: [cartData.contentId],
            content_type: "product",
            value: cartData.value,
            currency: cartData.currency || "PKR",
            contents: [
              {
                id: cartData.contentId,
                quantity: cartData.quantity || 1,
                item_price: cartData.value,
              },
            ],
          },
          cartData.trackingContext,
        ),
        deliveryMode: "await",
        testEventCode: TEST_EVENT_CODE || undefined,
      });
    },
    [trackEvent],
  );

  const trackInitiateCheckout = useCallback(
    async (checkoutData: {
      value: number;
      currency?: string;
      numItems: number;
      contentIds: string[];
      userData?: {
        email?: string;
        phone?: string;
        firstName?: string;
        lastName?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
        externalId?: string;
      };
      trackingContext?: TrackingContext;
      stableKey?: string;
    }) => {
      const eventId = await generateEventId({
        eventName: "InitiateCheckout",
        stableKey: checkoutData.stableKey,
      });
      return trackEvent({
        eventName: "InitiateCheckout",
        eventId,
        userData: checkoutData.userData,
        customData: buildTrackingCustomData(
          {
            value: checkoutData.value,
            currency: checkoutData.currency || "PKR",
            num_items: checkoutData.numItems,
            content_ids: checkoutData.contentIds,
            content_type: "product",
          },
          checkoutData.trackingContext,
        ),
        deliveryMode: "navigation",
        testEventCode: TEST_EVENT_CODE || undefined,
      });
    },
    [trackEvent],
  );

  const trackPurchase = useCallback(
    async (purchaseData: {
      value: number;
      currency?: string;
      orderId: string;
      numItems: number;
      contentIds: string[];
      contents: Array<{
        id: string;
        quantity: number;
        item_price: number;
      }>;
      userData?: {
        email?: string;
        phone?: string;
        firstName?: string;
        lastName?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
        externalId?: string;
      };
      trackingContext?: TrackingContext;
    }) => {
      const eventId = await generateEventId({
        eventName: "Purchase",
        stableKey: purchaseData.orderId,
      });
      return trackEvent({
        eventName: "Purchase",
        eventId,
        userData: purchaseData.userData,
        customData: buildTrackingCustomData(
          {
            value: purchaseData.value,
            currency: purchaseData.currency || "PKR",
            order_id: purchaseData.orderId,
            content_ids: purchaseData.contentIds,
            content_type: "product",
            num_items: purchaseData.numItems,
            contents: purchaseData.contents,
          },
          purchaseData.trackingContext,
        ),
        deliveryMode: "background",
        testEventCode: TEST_EVENT_CODE || undefined,
      });
    },
    [trackEvent],
  );

  const trackSearch = useCallback(
    (searchQuery: string) => {
      return trackEvent({
        eventName: "Search",
        customData: {
          search_string: searchQuery,
        },
        testEventCode: TEST_EVENT_CODE || undefined,
      });
    },
    [trackEvent],
  );

  return {
    trackEvent,
    trackPageView,
    trackViewContent,
    trackAddToCart,
    trackInitiateCheckout,
    trackPurchase,
    trackSearch,
  };
}
