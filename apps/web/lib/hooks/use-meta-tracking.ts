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

const NAVIGATION_PIXEL_FLUSH_MS = 800;
const NAVIGATION_PIXEL_READY_TIMEOUT_MS = 1000;
const PIXEL_READY_POLL_MS = 50;

// Extend Window interface for Meta Pixel
declare global {
  interface Window {
    fbq?: (
      action: string,
      eventName: string,
      data?: MetaCustomData,
      options?: { eventID: string },
    ) => void;
    __metaPageViewEventId?: string;
    __metaPixelInitialized?: boolean;
    __metaDebugMode?: boolean;
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

function createSynchronousEventId(eventName: string, stableKey: string): string {
  const eventPrefix = eventName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const stablePart = stableKey
    .trim()
    .replace(/[^a-zA-Z0-9_.:-]+/g, "_")
    .slice(0, 80);

  return `${eventPrefix}_${stablePart || Date.now()}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isInstagramBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  return ua.includes("Instagram") || ua.includes("FBAN") || ua.includes("FBAV");
}

function isDebugMode(): boolean {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  return url.searchParams.has("debug_pixel");
}

function debugLog(...args: unknown[]) {
  if (typeof window !== "undefined" && (window.__metaDebugMode || isDebugMode())) {
    console.log("[Meta Pixel Debug]", ...args);
  }
}

async function waitForFbq(timeoutMs: number) {
  if (typeof window === "undefined") return undefined;
  if (window.fbq || timeoutMs <= 0) return window.fbq;

  const deadline = Date.now() + timeoutMs;
  let attempts = 0;
  while (!window.fbq && Date.now() < deadline) {
    attempts++;
    await sleep(PIXEL_READY_POLL_MS);
  }

  debugLog(`waitForFbq: fbq ${window.fbq ? "found" : "not found"} after ${attempts * PIXEL_READY_POLL_MS}ms`);
  return window.fbq;
}

async function waitForPixelInit(timeoutMs: number): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.__metaPixelInitialized) return true;
  if (timeoutMs <= 0) return false;

  const deadline = Date.now() + timeoutMs;
  while (!window.__metaPixelInitialized && Date.now() < deadline) {
    await sleep(PIXEL_READY_POLL_MS);
  }

  debugLog(`waitForPixelInit: ${window.__metaPixelInitialized ? "initialized" : "not initialized"}`);
  return window.__metaPixelInitialized || false;
}

async function trackBrowserPixel({
  eventName,
  customData,
  eventId,
  waitForPixel,
}: {
  eventName: string;
  customData: MetaCustomData;
  eventId: string;
  waitForPixel: boolean;
}) {
  if (typeof window === "undefined") return false;

  const isInsta = isInstagramBrowser();
  const debug = isDebugMode();
  
  debugLog(`trackBrowserPixel: ${eventName}`, {
    eventId,
    isInstagram: isInsta,
    waitForPixel,
    fbqExists: !!window.fbq,
    pixelInitialized: window.__metaPixelInitialized,
  });

  // Wait for fbq to be available
  const fbq = await waitForFbq(
    waitForPixel ? NAVIGATION_PIXEL_READY_TIMEOUT_MS : 0,
  );
  if (!fbq) {
    if (waitForPixel) {
      console.warn(
        `[Meta Pixel] ${eventName} browser event skipped because fbq was not ready before navigation.`,
      );
      debugLog(`trackBrowserPixel: fbq not ready after ${NAVIGATION_PIXEL_READY_TIMEOUT_MS}ms`);
    }
    return false;
  }

  // For navigation events, also wait for Pixel initialization
  if (waitForPixel) {
    const isInitialized = await waitForPixelInit(NAVIGATION_PIXEL_READY_TIMEOUT_MS);
    if (!isInitialized) {
      console.warn(
        `[Meta Pixel] ${eventName} browser event skipped because Pixel was not initialized.`,
      );
      debugLog(`trackBrowserPixel: Pixel not initialized after ${NAVIGATION_PIXEL_READY_TIMEOUT_MS}ms`);
      // Still try to fire the event even if init flag is not set
    }
  }

  // Fire the Pixel event
  try {
    fbq("track", eventName, customData, { eventID: eventId });
    console.log(`[Meta Pixel] ${eventName} tracked with ID: ${eventId}`);
    debugLog(`trackBrowserPixel: Event fired successfully`, { eventId, eventName });
    
    // Dispatch event for debug component
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("metaPixelEvent", {
        detail: { eventName, eventId }
      }));
    }
    
    return true;
  } catch (error) {
    console.error(`[Meta Pixel] Error firing ${eventName}:`, error);
    debugLog(`trackBrowserPixel: Error firing event`, { error });
    return false;
  }
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
          `[Meta Tracking] Event: ${eventName}, URL: ${eventSourceUrl}, EventID: ${eventId}`,
        );
        debugLog(`trackEvent: Starting`, {
          eventName,
          eventId,
          eventSourceUrl,
          deliveryMode,
        });

        // Get Facebook cookies
        const { fbp, fbc } = getFacebookCookies();

        // 1. Browser-side: Track with Meta Pixel. Instagram's in-app browser
        // can drop Pixel requests if route navigation starts immediately.
        const browserPixelTracked = skipBrowserPixel
          ? false
          : await trackBrowserPixel({
              eventName,
              customData,
              eventId,
              waitForPixel: deliveryMode === "navigation",
            });

        debugLog(`trackEvent: Browser pixel result`, {
          eventName,
          eventId,
          browserPixelTracked,
          skipBrowserPixel,
          deliveryMode,
        });

        const waitForNavigationPixelFlush = async () => {
          if (deliveryMode === "navigation" && browserPixelTracked) {
            // Use longer delay for Instagram browser
            const flushDelay = isInstagramBrowser() ? 1200 : NAVIGATION_PIXEL_FLUSH_MS;
            debugLog(`waitForNavigationPixelFlush: Waiting ${flushDelay}ms`, {
              isInstagram: isInstagramBrowser(),
            });
            await sleep(flushDelay);
          }
        };

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
            await waitForNavigationPixelFlush();
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
          await waitForNavigationPixelFlush();
          return { success: true, eventId };
        }

        const response = await responsePromise;
        if (!response.ok) {
          return { success: false, error: `HTTP ${response.status}` };
        }

        console.log(
          `[Meta Conversions API] ${eventName} sent with ID: ${eventId}`,
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
    const win = typeof window !== "undefined" ? window : null;
    const initialEventId = win?.__metaPageViewEventId ?? undefined;
    if (win) win.__metaPageViewEventId = undefined;
    return trackEvent({
      eventName: "PageView",
      eventId: initialEventId,
      skipBrowserPixel: !!initialEventId,
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
      });
    },
    [trackEvent],
  );

  const trackInitiateCheckout = useCallback(
    (checkoutData: {
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
      const eventId = createSynchronousEventId(
        "InitiateCheckout",
        checkoutData.stableKey ||
          `${checkoutData.contentIds.join(":")}:${checkoutData.numItems}:${checkoutData.value}`,
      );

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
      });
    },
    [trackEvent],
  );

  const trackPurchase = useCallback(
    (purchaseData: {
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
      const eventId = createSynchronousEventId("Purchase", purchaseData.orderId);

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
        deliveryMode: "navigation",
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
