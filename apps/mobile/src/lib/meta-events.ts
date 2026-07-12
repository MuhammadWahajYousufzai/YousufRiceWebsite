import * as Crypto from "expo-crypto";
import Constants from "expo-constants";
import { Platform } from "react-native";

const META_EVENTS_ENDPOINT =
  process.env.EXPO_PUBLIC_META_EVENTS_URL ||
  "https://yousufrice.com/api/meta-events";
const APP_VERSION = Constants.expoConfig?.version || "1.0.0";

type MetaContents = Array<{
  id: string;
  quantity: number;
  item_price?: number;
}>;

export interface MobileMetaCustomData {
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  contents?: MetaContents;
  num_items?: number;
  order_id?: string;
  search_string?: string;
}

interface MobileMetaEventOptions {
  eventId?: string;
  phone?: string;
  customData?: MobileMetaCustomData;
}

function normalizePhone(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return undefined;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11)
    digits = `92${digits.slice(1)}`;
  return digits;
}

async function hashPhone(
  phone: string | undefined,
): Promise<string | undefined> {
  const normalized = normalizePhone(phone);
  if (!normalized) return undefined;

  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    normalized,
    { encoding: Crypto.CryptoEncoding.HEX },
  );
}

function eventIdFor(eventName: string): string {
  return `${eventName.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function trackMobileMetaEvent(
  eventName: string,
  options: MobileMetaEventOptions = {},
): Promise<boolean> {
  try {
    const phoneHash = await hashPhone(options.phone);
    const response = await fetch(META_EVENTS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Yousuf-App-Platform": Platform.OS,
        "X-Yousuf-App-Version": APP_VERSION,
      },
      body: JSON.stringify({
        action_source: "app",
        app_platform: Platform.OS,
        app_version: APP_VERSION,
        event_name: eventName,
        event_id: options.eventId || eventIdFor(eventName),
        event_time: Math.floor(Date.now() / 1000),
        user_data: {
          phone_hash: phoneHash,
        },
        custom_data: options.customData,
      }),
    });

    if (!response.ok) {
      console.warn(
        `[Meta App Events] ${eventName} failed with HTTP ${response.status}`,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn(`[Meta App Events] ${eventName} failed`, error);
    return false;
  }
}

export function trackMobilePageView() {
  return trackMobileMetaEvent("PageView");
}

export function trackMobileViewContent(data: {
  contentName: string;
  contentId: string;
  value?: number;
}) {
  return trackMobileMetaEvent("ViewContent", {
    customData: {
      content_name: data.contentName,
      content_ids: [data.contentId],
      content_type: "product",
      value: data.value,
      currency: "PKR",
    },
  });
}

export function trackMobileAddToCart(data: {
  contentName: string;
  contentId: string;
  value: number;
  quantity?: number;
}) {
  return trackMobileMetaEvent("AddToCart", {
    customData: {
      content_name: data.contentName,
      content_ids: [data.contentId],
      content_type: "product",
      value: data.value,
      currency: "PKR",
      contents: [
        {
          id: data.contentId,
          quantity: data.quantity || 1,
          item_price: data.value,
        },
      ],
    },
  });
}

export function trackMobileInitiateCheckout(data: {
  value: number;
  numItems: number;
  contentIds: string[];
}) {
  return trackMobileMetaEvent("InitiateCheckout", {
    customData: {
      value: data.value,
      currency: "PKR",
      num_items: data.numItems,
      content_ids: data.contentIds,
      content_type: "product",
    },
  });
}

export function trackMobilePurchase(data: {
  orderId: string;
  value: number;
  numItems: number;
  contentIds: string[];
  contents: MetaContents;
  phone?: string;
}) {
  return trackMobileMetaEvent("Purchase", {
    eventId: `purchase_${data.orderId}`,
    phone: data.phone,
    customData: {
      value: data.value,
      currency: "PKR",
      order_id: data.orderId,
      num_items: data.numItems,
      content_ids: data.contentIds,
      content_type: "product",
      contents: data.contents,
    },
  });
}
