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

const unavailablePermission: MobileAdTrackingPermission = {
  canAskAgain: false,
  granted: false,
  status: "unavailable",
};

// ATT is an iOS-native framework. The Expo web preview intentionally uses a
// no-op implementation so it never loads the native module or sends app events.
export async function getMobileAdTrackingPermission() {
  return unavailablePermission;
}

export async function requestMobileAdTrackingPermission() {
  return unavailablePermission;
}

export async function trackMobileMetaEvent() {
  return false;
}

export function trackMobilePageView() {
  return trackMobileMetaEvent();
}

export function trackMobileViewContent(_data: {
  contentName: string;
  contentId: string;
  value?: number;
}) {
  return trackMobileMetaEvent();
}

export function trackMobileAddToCart(_data: {
  contentName: string;
  contentId: string;
  value: number;
  quantity?: number;
}) {
  return trackMobileMetaEvent();
}

export function trackMobileInitiateCheckout(_data: {
  value: number;
  numItems: number;
  contentIds: string[];
}) {
  return trackMobileMetaEvent();
}

export function trackMobilePurchase(_data: {
  orderId: string;
  value: number;
  numItems: number;
  contentIds: string[];
  contents: { id: string; quantity: number; item_price?: number }[];
  phone?: string;
}) {
  return trackMobileMetaEvent();
}
