"use client";

import { useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  generateEventId,
  getFacebookCookies,
  hashPhoneForMeta,
  META_DATASET_ID,
  sanitizeCustomerNameForMeta,
} from "@/lib/meta-browser";
import type { MetaCustomData } from "@/lib/meta";

const NAVIGATION_PIXEL_FLUSH_MS = 800;
const NAVIGATION_PIXEL_READY_TIMEOUT_MS = 1000;
const PIXEL_READY_POLL_MS = 50;
const META_PIXEL_SCRIPT_URL = "https://connect.facebook.net/en_US/fbevents.js";
const META_PIXEL_FALLBACK_URL = "https://www.facebook.com/tr/";
const META_TEST_EVENT_CODE = process.env.NEXT_PUBLIC_META_TEST_EVENT_CODE;

type MetaFbq = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  push?: MetaFbq;
  loaded?: boolean;
  version?: string;
};

// Extend Window interface for Meta Pixel
declare global {
  interface Window {
    fbq?: MetaFbq;
    _fbq?: MetaFbq;
    __metaPageViewEventId?: string;
    __metaPixelInitialized?: boolean;
    __metaDebugMode?: boolean;
    __metaPixelBeacons?: HTMLImageElement[];
    __metaTestEventCode?: string;
    __metaTrackingDiagnostics?: {
      pixelScriptLoaded: boolean;
      fbqExists: boolean;
      fbqLoaded: boolean;
      pixelInitialized: boolean;
      lastEventName: string;
      lastEventId: string;
      lastBrowserResult: string;
      lastCapiResult: string;
      resourceTimings: string[];
      errors: string[];
    };
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

function isBrowserOnlyTestMode(): boolean {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  return (
    url.searchParams.get("meta_test_browser_only") === "true" ||
    url.searchParams.get("debug_pixel_browser_only") === "true"
  );
}

function debugLog(...args: unknown[]) {
  if (typeof window !== "undefined" && (window.__metaDebugMode || isDebugMode())) {
    console.log("[Meta Pixel Debug]", ...args);
  }
}

function getMetaResourceTimings(): string[] {
  if (typeof performance === "undefined") return [];

  return performance
    .getEntriesByType("resource")
    .filter((entry) => {
      const name = String(entry.name || "");
      return (
        name.includes("facebook") ||
        name.includes("fbevents") ||
        name.includes("connect.facebook")
      );
    })
    .map((entry) => {
      const resource = entry as PerformanceResourceTiming;
      return JSON.stringify({
        name: resource.name,
        type: resource.initiatorType,
        status: resource.responseStatus || "unknown",
        duration: Math.round(resource.duration),
        transferSize: resource.transferSize,
      });
    });
}

function updateTrackingDiagnostics(patch: Partial<
  NonNullable<Window["__metaTrackingDiagnostics"]>
>) {
  if (typeof window === "undefined") return;

  const previous = window.__metaTrackingDiagnostics;

  window.__metaTrackingDiagnostics = {
    pixelScriptLoaded: hasMetaPixelScript(),
    fbqExists: Boolean(window.fbq),
    fbqLoaded: Boolean(window.fbq?.callMethod),
    pixelInitialized: Boolean(window.__metaPixelInitialized),
    lastEventName: previous?.lastEventName || "",
    lastEventId: previous?.lastEventId || "",
    lastBrowserResult: previous?.lastBrowserResult || "",
    lastCapiResult: previous?.lastCapiResult || "",
    resourceTimings: getMetaResourceTimings(),
    errors: previous?.errors || [],
    ...previous,
    ...patch,
  };
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

function hasMetaPixelScript(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(
    document.querySelector(`script[src="${META_PIXEL_SCRIPT_URL}"]`) ||
      document.querySelector(
        'script[src*="connect.facebook.net"][src*="fbevents.js"]',
      ),
  );
}

function isFbeventsLoaded(): boolean {
  return Boolean(
    typeof window !== "undefined" &&
      window.fbq &&
      typeof window.fbq.callMethod === "function",
  );
}

async function waitForFbeventsLoaded(timeoutMs: number): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (isFbeventsLoaded()) return true;
  if (timeoutMs <= 0) return false;

  const deadline = Date.now() + timeoutMs;
  while (!isFbeventsLoaded() && Date.now() < deadline) {
    await sleep(PIXEL_READY_POLL_MS);
  }

  debugLog(
    `waitForFbeventsLoaded: ${isFbeventsLoaded() ? "loaded" : "not loaded"}`,
  );
  return isFbeventsLoaded();
}

function installMetaPixelBase(): MetaFbq | undefined {
  if (typeof window === "undefined") return undefined;
  if (window.fbq) return window.fbq;

  const fbq = function metaFbq(...args: unknown[]) {
    if (fbq.callMethod) {
      fbq.callMethod(...args);
      return;
    }

    fbq.queue?.push(args);
  } as MetaFbq;

  if (!window._fbq) window._fbq = fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;

  return fbq;
}

function injectMetaPixelScript(): boolean {
  if (typeof document === "undefined") return false;
  if (hasMetaPixelScript()) return true;

  const script = document.createElement("script");
  script.async = true;
  script.src = META_PIXEL_SCRIPT_URL;
  script.dataset.metaPixel = "true";
  script.dataset.metaPixelSource = "tracking-hook";
  document.head.appendChild(script);
  return true;
}

function initializeMetaPixel(): boolean {
  if (typeof window === "undefined" || !META_DATASET_ID) {
    return false;
  }

  try {
    const fbq = installMetaPixelBase();
    if (!fbq) return false;

    if (window.__metaPixelInitialized) return true;

    fbq("set", "autoConfig", false, META_DATASET_ID);
    fbq("init", META_DATASET_ID);
    if (META_TEST_EVENT_CODE) {
      fbq("set", "test_event_code", META_TEST_EVENT_CODE);
      window.__metaTestEventCode = META_TEST_EVENT_CODE;
    }
    window.__metaPixelInitialized = true;
    updateTrackingDiagnostics({ pixelInitialized: true });
    return true;
  } catch (error) {
    console.warn("[Meta Pixel] Failed to initialize Pixel:", error);
    return false;
  }
}

function ensureMetaPixel(): boolean {
  if (typeof window === "undefined" || !META_DATASET_ID) return false;
  if (window.fbq && window.__metaPixelInitialized) return true;

  installMetaPixelBase();
  if (!hasMetaPixelScript()) {
    injectMetaPixelScript();
  }
  return initializeMetaPixel();
}

function appendMetaPixelCustomData(
  params: URLSearchParams,
  customData: MetaCustomData,
) {
  if (customData.value !== undefined) params.set("cd[value]", String(customData.value));
  if (customData.currency) params.set("cd[currency]", customData.currency);
  if (customData.content_name) params.set("cd[content_name]", customData.content_name);
  if (customData.content_category) params.set("cd[content_category]", customData.content_category);
  if (customData.content_type) params.set("cd[content_type]", customData.content_type);
  if (customData.num_items !== undefined) params.set("cd[num_items]", String(customData.num_items));
  if (customData.order_id) params.set("cd[order_id]", customData.order_id);
  if (customData.search_string) params.set("cd[search_string]", customData.search_string);
  customData.content_ids?.forEach((contentId) =>
    params.append("cd[content_ids][]", contentId),
  );
  if (customData.contents) params.set("cd[contents]", JSON.stringify(customData.contents));
}

function buildMetaPixelFallbackUrl({
  eventName,
  customData,
  eventId,
  eventSourceUrl,
  eventTime,
}: {
  eventName: string;
  customData: MetaCustomData;
  eventId: string;
  eventSourceUrl: string;
  eventTime: number;
}): string {
  const params = new URLSearchParams({
    id: META_DATASET_ID || "",
    ev: eventName,
    eid: eventId,
    eventID: eventId,
    dl: eventSourceUrl,
    if: "false",
    ts: String(eventTime),
  });
  const { fbp, fbc } = getFacebookCookies();
  if (fbp) params.set("fbp", fbp);
  if (fbc) params.set("fbc", fbc);
  if (META_TEST_EVENT_CODE) params.set("test_event_code", META_TEST_EVENT_CODE);

  appendMetaPixelCustomData(params, customData);
  return `${META_PIXEL_FALLBACK_URL}?${params.toString()}`;
}

function sendMetaPixelFallback({
  eventName,
  customData,
  eventId,
  eventSourceUrl,
  eventTime,
}: {
  eventName: string;
  customData: MetaCustomData;
  eventId: string;
  eventSourceUrl: string;
  eventTime: number;
}): boolean {
  if (typeof window === "undefined" || !META_DATASET_ID) return false;

  const url = buildMetaPixelFallbackUrl({
    eventName,
    customData,
    eventId,
    eventSourceUrl,
    eventTime,
  });

  const image = new Image();
  window.__metaPixelBeacons = window.__metaPixelBeacons || [];
  window.__metaPixelBeacons.push(image);
  const releaseBeacon = () => {
    window.__metaPixelBeacons = window.__metaPixelBeacons?.filter(
      (beacon) => beacon !== image,
    );
  };
  image.onload = releaseBeacon;
  image.onerror = releaseBeacon;
  image.decoding = "async";
  image.referrerPolicy = "no-referrer-when-downgrade";
  image.src = url;
  return true;
}

async function trackBrowserPixel({
  eventName,
  customData,
  eventId,
  eventSourceUrl,
  eventTime,
  waitForPixel,
}: {
  eventName: string;
  customData: MetaCustomData;
  eventId: string;
  eventSourceUrl: string;
  eventTime: number;
  waitForPixel: boolean;
}) {
  if (typeof window === "undefined") return false;

  const isInsta = isInstagramBrowser();

  debugLog(`trackBrowserPixel: ${eventName}`, {
    eventId,
    isInstagram: isInsta,
    waitForPixel,
    fbqExists: !!window.fbq,
    pixelInitialized: window.__metaPixelInitialized,
    pixelScriptLoaded: hasMetaPixelScript(),
  });

  const pixelReady = ensureMetaPixel();
  updateTrackingDiagnostics({ pixelScriptLoaded: hasMetaPixelScript() });

  const fbq = window.fbq;

  if (!fbq) {
    const fallbackTracked = sendMetaPixelFallback({
      eventName,
      customData,
      eventId,
      eventSourceUrl,
      eventTime,
    });
    updateTrackingDiagnostics({
      lastEventName: eventName,
      lastEventId: eventId,
      lastBrowserResult: fallbackTracked ? "fallback-image" : "failed",
    });

    console.warn(`[Meta Pixel] ${eventName} used fallback because fbq is unavailable.`, {
      eventId,
      pixelReady,
      fallbackTracked,
    });
    return fallbackTracked;
  }

  let fallbackTracked = false;
  if (waitForPixel) {
    const isInitialized = await waitForPixelInit(NAVIGATION_PIXEL_READY_TIMEOUT_MS);
    if (!isInitialized) {
      initializeMetaPixel();
    }

    const remoteLoaded = await waitForFbeventsLoaded(
      NAVIGATION_PIXEL_READY_TIMEOUT_MS,
    );
    if (!remoteLoaded) {
      fallbackTracked = sendMetaPixelFallback({
        eventName,
        customData,
        eventId,
        eventSourceUrl,
        eventTime,
      });
      console.warn(
        `[Meta Pixel] ${eventName} queued before fbevents.js loaded; direct browser fallback ${
          fallbackTracked ? "scheduled" : "failed"
        }.`,
        { eventId },
      );
    }
  }

  try {
    fbq("track", eventName, customData, {
      eventID: eventId,
      ...(META_TEST_EVENT_CODE ? { test_event_code: META_TEST_EVENT_CODE } : {}),
    });
    if (!fallbackTracked) {
      // Keep an explicit browser-side /tr beacon visible in Network even when
      // fbq queues or silently delays its own transport in webviews.
      fallbackTracked = sendMetaPixelFallback({
        eventName,
        customData,
        eventId,
        eventSourceUrl,
        eventTime,
      });
    }
    console.log(
      `[Meta Pixel] ${eventName} tracked with ID: ${eventId} (direct beacon: ${
        fallbackTracked ? "scheduled" : "not scheduled"
      })`,
    );
    debugLog(`trackBrowserPixel: Event fired successfully`, { eventId, eventName });
    updateTrackingDiagnostics({
      lastEventName: eventName,
      lastEventId: eventId,
      lastBrowserResult: fallbackTracked ? "fbq-plus-fallback" : "fbq",
    });

    window.dispatchEvent(new CustomEvent("metaPixelEvent", {
      detail: { eventName, eventId }
    }));

    return true;
  } catch (error) {
    fallbackTracked = sendMetaPixelFallback({
      eventName,
      customData,
      eventId,
      eventSourceUrl,
      eventTime,
    });

    console.error(`[Meta Pixel] Error firing ${eventName}; fallback ${fallbackTracked ? "succeeded" : "failed"}:`, error);
    updateTrackingDiagnostics({
      lastEventName: eventName,
      lastEventId: eventId,
      lastBrowserResult: fallbackTracked ? "fallback-after-error" : "failed",
      errors: [
        ...(window.__metaTrackingDiagnostics?.errors || []),
        error instanceof Error ? error.message : String(error),
      ],
    });
    debugLog(`trackBrowserPixel: Error firing event`, { error, fallbackTracked });
    return fallbackTracked;
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
        const { phone: rawPhone, ...userDataWithoutPhone } = userData;
        const phoneHash = await hashPhoneForMeta(rawPhone);

        // 1. Browser-side: Track with Meta Pixel. Instagram's in-app browser
        // can drop Pixel requests if route navigation starts immediately.
        const browserPixelTracked = skipBrowserPixel
          ? false
          : await trackBrowserPixel({
              eventName,
              customData,
              eventId,
              eventSourceUrl,
              eventTime,
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

        if (isBrowserOnlyTestMode()) {
          updateTrackingDiagnostics({
            lastEventName: eventName,
            lastEventId: eventId,
            lastCapiResult: "skipped-browser-only-test",
          });
          await waitForNavigationPixelFlush();
          return { success: true, eventId, browserOnlyTest: true };
        }

        updateTrackingDiagnostics({
          lastEventName: eventName,
          lastEventId: eventId,
          lastCapiResult: "pending",
        });

        const payload = {
          event_name: eventName,
          event_id: eventId,
          event_time: eventTime,
          event_source_url: eventSourceUrl,
          user_data: {
            ...userDataWithoutPhone,
            firstName: userDataWithoutPhone.firstName
              ? sanitizeCustomerNameForMeta(userDataWithoutPhone.firstName)
              : undefined,
            lastName: userDataWithoutPhone.lastName
              ? sanitizeCustomerNameForMeta(userDataWithoutPhone.lastName)
              : undefined,
            phone_hash: phoneHash,
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
            updateTrackingDiagnostics({ lastCapiResult: "beacon-queued" });
            await waitForNavigationPixelFlush();
            return { success: true, eventId };
          }

          const message = `Meta CAPI ${eventName} was not queued: sendBeacon rejected the request.`;
          updateTrackingDiagnostics({ lastCapiResult: "beacon-rejected" });
          console.warn(`[Meta Conversions API] ${message}`, {
            eventName,
            eventId,
          });
        }

        const responsePromise = fetch("/api/meta-events", requestInit);

        if (deliveryMode !== "await") {
          responsePromise
            .then(async (response) => {
              if (!response.ok) {
                const responseText = await response.text().catch(() => "");
                const message = `Meta CAPI ${eventName} failed: HTTP ${response.status}`;
                updateTrackingDiagnostics({
                  lastCapiResult: `http-${response.status}`,
                  errors: [
                    ...(window.__metaTrackingDiagnostics?.errors || []),
                    message,
                  ],
                });
                console.warn(message, {
                  eventName,
                  eventId,
                  responseText,
                });
              } else {
                updateTrackingDiagnostics({ lastCapiResult: "sent" });
              }
            })
            .catch((error) => {
              const message = `Meta CAPI ${eventName} failed: ${error instanceof Error ? error.message : String(error)}`;
              updateTrackingDiagnostics({
                lastCapiResult: "failed",
                errors: [
                  ...(window.__metaTrackingDiagnostics?.errors || []),
                  message,
                ],
              });
              console.error(`[Meta Conversions API] ${message}`, {
                eventName,
                eventId,
              });
            });
          await waitForNavigationPixelFlush();
          return { success: true, eventId };
        }

        const response = await responsePromise;
        if (!response.ok) {
          const error = `HTTP ${response.status}`;
          const message = `Meta CAPI ${eventName} failed: ${error}`;
          updateTrackingDiagnostics({
            lastCapiResult: `http-${response.status}`,
            errors: [
              ...(window.__metaTrackingDiagnostics?.errors || []),
              message,
            ],
          });
          console.warn(`[Meta Conversions API] ${message}`, {
            eventName,
            eventId,
          });
          return { success: false, error };
        }

        updateTrackingDiagnostics({ lastCapiResult: "sent" });
        console.log(
          `[Meta Conversions API] ${eventName} sent with ID: ${eventId}`,
        );


        return { success: true, eventId };
      } catch (error) {
        const message = `Meta tracking failed: ${error instanceof Error ? error.message : String(error)}`;
        updateTrackingDiagnostics({
          lastCapiResult: "failed",
          errors: [
            ...(window.__metaTrackingDiagnostics?.errors || []),
            message,
          ],
        });
        console.error(`[Meta Tracking] ${message}`, {
          eventName,
        });
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
    }) => {
      return trackEvent({
        eventName: "ViewContent",
        userData: productData.userData,
        customData: {
          content_name: productData.contentName,
          content_ids: [productData.contentId],
          content_type: productData.contentType || "product",
          value: productData.value,
          currency: productData.currency || "PKR",
        },
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
    }) => {
      return trackEvent({
        eventName: "AddToCart",
        userData: cartData.userData,
        customData: {
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
        customData: {
          value: checkoutData.value,
          currency: checkoutData.currency || "PKR",
          num_items: checkoutData.numItems,
          content_ids: checkoutData.contentIds,
          content_type: "product",
        },
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
    }) => {
      const eventId = createSynchronousEventId("Purchase", purchaseData.orderId);

      return trackEvent({
        eventName: "Purchase",
        eventId,
        userData: purchaseData.userData,
        customData: {
          value: purchaseData.value,
          currency: purchaseData.currency || "PKR",
          order_id: purchaseData.orderId,
          content_ids: purchaseData.contentIds,
          content_type: "product",
          num_items: purchaseData.numItems,
          contents: purchaseData.contents,
        },
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
