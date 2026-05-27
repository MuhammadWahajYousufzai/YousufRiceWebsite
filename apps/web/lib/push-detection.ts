/**
 * Push Notification Detection Utilities
 * 
 * Detect browser capabilities for push notifications
 * Handles iOS 16.4+ PWA requirements, browser differences, etc.
 */

/**
 * Check if the browser supports push notifications
 */
export function webPushSupported(): boolean {
  if (typeof window === "undefined") return false;

  // Check for service worker support
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  // Check for PushManager support
  if (!("PushManager" in window)) {
    return false;
  }

  // Check for notification support
  if (!("Notification" in window)) {
    return false;
  }

  // iOS 16.4+ supports push only in standalone (PWA) mode
  if (isIOS()) {
    return isStandalone();
  }

  return true;
}

/**
 * Check if running on iOS
 */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    /iphone|ipad|ipod/.test(userAgent) ||
    (userAgent.includes("macintosh") && "ontouchend" in document)
  );
}

/**
 * Check if running in standalone/PWA mode
 */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;

  // iOS standalone check
  if ((window.navigator as Navigator & { standalone?: boolean }).standalone) {
    return true;
  }

  // Android/Chrome standalone check
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }

  return false;
}

/**
 * Get current notification permission state
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "default";
  }

  return Notification.permission;
}

/**
 * Check if notification permission is granted
 */
export function hasNotificationPermission(): boolean {
  return getNotificationPermission() === "granted";
}

/**
 * Check if notification permission is denied
 */
export function isNotificationDenied(): boolean {
  return getNotificationPermission() === "denied";
}

/**
 * Check if notification permission is in default state (not asked yet)
 */
export function isNotificationDefault(): boolean {
  return getNotificationPermission() === "default";
}

/**
 * Get detailed browser support info
 */
export function getPushSupportInfo(): {
  supported: boolean;
  reason?: string;
  isIOS: boolean;
  isStandalone: boolean;
  permission: NotificationPermission;
  canSubscribe: boolean;
} {
  const ios = isIOS();
  const standalone = isStandalone();
  const permission = getNotificationPermission();
  
  let supported = true;
  let reason: string | undefined;

  if (typeof window === "undefined") {
    supported = false;
    reason = "Not in browser environment";
  } else if (!("serviceWorker" in navigator)) {
    supported = false;
    reason = "Service Worker not supported";
  } else if (!("PushManager" in window)) {
    supported = false;
    reason = "Push API not supported";
  } else if (!("Notification" in window)) {
    supported = false;
    reason = "Notifications not supported";
  } else if (ios && !standalone) {
    supported = false;
    reason = "iOS requires app to be added to Home Screen";
  }

  const canSubscribe = supported && permission !== "denied";

  return {
    supported,
    reason,
    isIOS: ios,
    isStandalone: standalone,
    permission,
    canSubscribe,
  };
}

/**
 * Get iOS version if on iOS
 */
export function getIOSVersion(): number | null {
  if (!isIOS()) return null;

  const match = navigator.userAgent.match(/OS (\d+)_?(\d+)_?(\d+)?/);
  if (match) {
    return parseInt(match[1], 10);
  }

  return null;
}

/**
 * Check if iOS version supports web push (16.4+)
 */
export function iOSSupportsPush(): boolean {
  const version = getIOSVersion();
  if (version === null) return false;
  return version >= 16;
}

/**
 * Get user-friendly message about push support status
 */
export function getPushStatusMessage(): string {
  const info = getPushSupportInfo();

  if (!info.supported) {
    if (info.isIOS && !info.isStandalone) {
      return "Add this app to your Home Screen to enable notifications on iOS";
    }
    return info.reason || "Push notifications not supported";
  }

  if (info.permission === "denied") {
    return "Notifications blocked. Enable in browser settings.";
  }

  if (info.permission === "granted") {
    return "Notifications enabled";
  }

  return "Tap to enable notifications";
}
