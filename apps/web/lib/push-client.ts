/**
 * Client-side Push Notification Utilities
 * 
 * Browser-side functions for:
 * - Service Worker registration
 * - Push subscription management
 * - Permission handling
 */

import { webPushSupported, getNotificationPermission } from "@/lib/push-detection";

// Types
export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface SubscribeOptions {
  userAgent?: string;
  userId?: string;
  tags?: string[];
}

const API_BASE = "/api/push";

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return webPushSupported();
}

/**
 * Get current notification permission state
 */
export function getPushPermission(): NotificationPermission {
  return getNotificationPermission();
}

/**
 * Request notification permission from the user
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported in this browser");
  }

  const result = await Notification.requestPermission();
  return result;
}

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "imports",
    });

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;

    return registration;
  } catch (error) {
    console.error("Failed to register service worker:", error);
    return null;
  }
}

/**
 * Get existing push subscription
 */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.error("Failed to get subscription:", error);
    return null;
  }
}

/**
 * Subscribe to push notifications
 * Handles VAPID key changes by auto-unsubscribing and resubscribing
 */
export async function subscribeToPush(
  applicationServerKey: string,
  options: SubscribeOptions = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isPushSupported()) {
      return { success: false, error: "Push notifications not supported" };
    }

    // Request permission if not granted
    const permission = await requestPushPermission();
    if (permission !== "granted") {
      return { success: false, error: "Permission denied" };
    }

    // Register service worker
    const registration = await registerServiceWorker();
    if (!registration) {
      return { success: false, error: "Failed to register service worker" };
    }

    // Check for existing subscription
    const existingSub = await registration.pushManager.getSubscription();

    let subscription: PushSubscription;

    try {
      // Try to subscribe directly
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(applicationServerKey) as BufferSource,
      });
    } catch (subError: any) {
      // Handle "different applicationServerKey already exists" error
      if (subError?.message?.includes("applicationServerKey") || 
          subError?.message?.includes("gcm_sender_id") ||
          subError?.name === "InvalidStateError") {
        console.log("[Push] Detected existing subscription with different keys, resubscribing...");
        
        // Unsubscribe existing subscription
        if (existingSub) {
          await existingSub.unsubscribe();
          // Notify server to clean up old subscription
          await fetch(`${API_BASE}/unsubscribe`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: existingSub.endpoint }),
          }).catch(() => {}); // Ignore errors, we'll re-subscribe anyway
        }

        // Try subscribing again
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(applicationServerKey) as BufferSource,
        });
      } else {
        throw subError;
      }
    }

    // Extract subscription data
    const subData = extractSubscriptionData(subscription);
    if (!subData) {
      return { success: false, error: "Failed to extract subscription data" };
    }

    // Send to server
    const response = await fetch(`${API_BASE}/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...subData,
        user_agent: options.userAgent || navigator.userAgent,
        user_id: options.userId,
        tags: options.tags || [], // Send as array
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Subscribe error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<{ success: boolean; error?: string }> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      return { success: true }; // Already unsubscribed
    }

    // Unsubscribe from push manager
    await subscription.unsubscribe();

    // Notify server
    await fetch(`${API_BASE}/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });

    return { success: true };
  } catch (error: any) {
    console.error("Unsubscribe error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Extract subscription data from PushSubscription object
 */
function extractSubscriptionData(
  subscription: PushSubscription
): PushSubscriptionData | null {
  const json = subscription.toJSON();
  
  if (!json.keys || !json.keys.p256dh || !json.keys.auth) {
    return null;
  }

  return {
    endpoint: subscription.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  };
}

/**
 * Convert URL base64 to Uint8Array for applicationServerKey
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Track notification interaction (click or dismiss)
 */
export async function trackNotification(
  subscriptionId: string,
  action: "click" | "dismiss",
  url?: string
): Promise<void> {
  try {
    await fetch(`${API_BASE}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription_id: subscriptionId,
        action,
        url,
      }),
    });
  } catch (error) {
    console.error("Failed to track notification:", error);
  }
}

/**
 * Check if user has already dismissed the prompt
 */
export function hasUserDismissedPrompt(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("push_prompt_dismissed") === "true";
}

/**
 * Mark prompt as dismissed by user
 */
export function dismissPushPrompt(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("push_prompt_dismissed", "true");
  localStorage.setItem("push_prompt_dismissed_at", new Date().toISOString());
}

/**
 * Reset prompt dismissal (for testing or after long time)
 */
export function resetPushPrompt(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("push_prompt_dismissed");
  localStorage.removeItem("push_prompt_dismissed_at");
}

/**
 * Get subscription status from server
 */
export async function getSubscriptionStatus(): Promise<{
  subscribed: boolean;
  subscription?: PushSubscriptionData;
}> {
  try {
    const existingSub = await getExistingSubscription();
    
    if (!existingSub) {
      return { subscribed: false };
    }

    // Verify with server
    const response = await fetch(`${API_BASE}/status?endpoint=${encodeURIComponent(existingSub.endpoint)}`);
    const data = await response.json();
    
    return {
      subscribed: data.exists && data.active,
      subscription: extractSubscriptionData(existingSub) || undefined,
    };
  } catch (error) {
    console.error("Failed to get subscription status:", error);
    return { subscribed: false };
  }
}
