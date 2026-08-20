import * as Crypto from "expo-crypto";
import Constants from "expo-constants";
import { AppState, Platform } from "react-native";

const META_EVENTS_ENDPOINT =
  process.env.EXPO_PUBLIC_META_EVENTS_URL ||
  "https://yousufrice.com/api/meta-events";
const APP_VERSION = Constants.expoConfig?.version || "1.0.0";
let inFlightTrackingPermissionRequest: Promise<MobileAdTrackingPermission> | null =
  null;

type MetaContents = {
  id: string;
  quantity: number;
  item_price?: number;
}[];

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

export type MobileAdTrackingStatus =
  | "granted"
  | "denied"
  | "undetermined"
  | "unavailable";

export interface MobileAdTrackingPermission {
  canAskAgain: boolean;
  granted: boolean;
  status: MobileAdTrackingStatus;
}

const unavailableTrackingPermission: MobileAdTrackingPermission = {
  canAskAgain: false,
  granted: false,
  status: "unavailable",
};

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

function normalizeTrackingPermission(permission: {
  canAskAgain: boolean;
  granted: boolean;
  status: string;
}): MobileAdTrackingPermission {
  const status: MobileAdTrackingStatus = permission.granted
    ? "granted"
    : permission.status === "undetermined"
      ? "undetermined"
      : "denied";

  return {
    canAskAgain: permission.canAskAgain,
    granted: permission.granted,
    status,
  };
}

function waitForActiveApp(timeoutMs = 5000): Promise<boolean> {
  if (AppState.currentState === "active") return Promise.resolve(true);

  return new Promise((resolve) => {
    let finished = false;
    const finish = (active: boolean) => {
      if (finished) return;
      finished = true;
      subscription.remove();
      clearTimeout(timeout);
      resolve(active);
    };
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") finish(true);
    });
    const timeout = setTimeout(() => finish(false), timeoutMs);
  });
}

const waitForPermissionDialogWindow = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 450));

const loadTrackingTransparency = () => import("expo-tracking-transparency");

export async function getMobileAdTrackingPermission(): Promise<MobileAdTrackingPermission> {
  if (Platform.OS !== "ios") {
    return { canAskAgain: false, granted: true, status: "granted" };
  }

  try {
    const trackingTransparency = await loadTrackingTransparency();
    if (!trackingTransparency.isAvailable())
      return unavailableTrackingPermission;
    return normalizeTrackingPermission(
      await trackingTransparency.getTrackingPermissionsAsync(),
    );
  } catch (error) {
    console.warn("[Meta App Events] ATT permission check failed", error);
    return unavailableTrackingPermission;
  }
}

async function performMobileAdTrackingPermissionRequest(): Promise<MobileAdTrackingPermission> {
  const currentPermission = await getMobileAdTrackingPermission();
  if (
    Platform.OS !== "ios" ||
    currentPermission.granted ||
    currentPermission.status !== "undetermined"
  ) {
    return currentPermission;
  }

  try {
    // Apple only displays ATT while the app is fully active and no other
    // permission sheet is being dismissed. The short delay lets the initial
    // native launch transition finish before presenting Apple's dialog.
    if (!(await waitForActiveApp())) return currentPermission;
    await waitForPermissionDialogWindow();

    // Re-check after the delay because the user may have changed the setting
    // while the app was inactive. Only `notDetermined` can show the native ATT
    // sheet; denied/restricted choices must be changed in iPhone Settings.
    const readyPermission = await getMobileAdTrackingPermission();
    if (readyPermission.status !== "undetermined") return readyPermission;

    const trackingTransparency = await loadTrackingTransparency();
    return normalizeTrackingPermission(
      await trackingTransparency.requestTrackingPermissionsAsync(),
    );
  } catch (error) {
    console.warn("[Meta App Events] ATT permission request failed", error);
    return getMobileAdTrackingPermission();
  }
}

export async function requestMobileAdTrackingPermission(): Promise<MobileAdTrackingPermission> {
  // React development builds may mount effects twice. Coalesce overlapping
  // startup calls so iOS receives only one ATT request at a time.
  inFlightTrackingPermissionRequest ??=
    performMobileAdTrackingPermissionRequest();

  try {
    return await inFlightTrackingPermissionRequest;
  } finally {
    inFlightTrackingPermissionRequest = null;
  }
}

async function isMetaTrackingAuthorized(): Promise<boolean> {
  return (await getMobileAdTrackingPermission()).granted;
}

export async function trackMobileMetaEvent(
  eventName: string,
  options: MobileMetaEventOptions = {},
): Promise<boolean> {
  try {
    // Meta app events are advertising tracking. On iOS, do not collect or
    // transmit any event or contact data until ATT authorization is granted.
    if (!(await isMetaTrackingAuthorized())) return false;

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
      const responseBody = await response.text().catch(() => "");
      console.warn(
        `[Meta App Events] ${eventName} failed with HTTP ${response.status}`,
        responseBody,
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
