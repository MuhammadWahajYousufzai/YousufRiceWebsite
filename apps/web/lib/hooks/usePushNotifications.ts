"use client";

/**
 * Push Notification Hook
 * 
 * Manages the entire push notification lifecycle:
 * - Detection of support
 * - Permission state
 * - Subscription management
 * - Smart prompting (delayed, one-time-ask)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  isPushSupported,
  getPushPermission,
  requestPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getSubscriptionStatus,
  getExistingSubscription,
  hasUserDismissedPrompt,
  dismissPushPrompt,
  resetPushPrompt,
} from "@/lib/push-client";
import { getPushSupportInfo } from "@/lib/push-detection";

type PushStatus = "idle" | "loading" | "subscribed" | "denied" | "unsupported" | "blocked";

interface UsePushNotificationsReturn {
  status: PushStatus;
  supported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  canPrompt: boolean;
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  dismissPrompt: () => void;
  resetPrompt: () => void;
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const PROMPT_DELAY_MS = 8000; // 8 seconds

export function usePushNotifications(): UsePushNotificationsReturn {
  const [status, setStatus] = useState<PushStatus>("idle");
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);

  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasCheckedRef = useRef(false);

  // Initialize - check support and current state
  useEffect(() => {
    const init = async () => {
      if (!isPushSupported()) {
        setStatus("unsupported");
        setPermission("denied");
        return;
      }

      const currentPermission = getPushPermission();
      setPermission(currentPermission);

      if (currentPermission === "denied") {
        setStatus("denied");
        setCanPrompt(false);
        return;
      }

      // Check if already subscribed
      const subStatus = await getSubscriptionStatus();
      if (subStatus.subscribed) {
        setIsSubscribed(true);
        setStatus("subscribed");
        return;
      }

      // If permission is granted but not subscribed, prompt
      if (currentPermission === "granted") {
        setCanPrompt(true);
        return;
      }

      // Default state - delay prompt
      if (!hasUserDismissedPrompt()) {
        promptTimerRef.current = setTimeout(() => {
          setCanPrompt(true);
        }, PROMPT_DELAY_MS);
      }
    };

    if (!hasCheckedRef.current) {
      hasCheckedRef.current = true;
      init();
    }

    return () => {
      if (promptTimerRef.current) {
        clearTimeout(promptTimerRef.current);
      }
    };
  }, []);

  // Listen for permission changes (when user changes in browser settings)
  useEffect(() => {
    if (!isPushSupported()) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        const currentPermission = getPushPermission();
        if (currentPermission !== permission) {
          setPermission(currentPermission);

          if (currentPermission === "denied") {
            setStatus("denied");
            setCanPrompt(false);
            setIsSubscribed(false);
          } else if (currentPermission === "granted") {
            const subStatus = await getSubscriptionStatus();
            if (subStatus.subscribed) {
              setIsSubscribed(true);
              setStatus("subscribed");
            } else {
              setCanPrompt(true);
            }
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [permission]);

  const subscribe = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) {
      setError("Push notifications not configured");
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatus("loading");

    try {
      // If permission is default, request it first
      if (permission === "default") {
        const newPermission = await requestPushPermission();
        setPermission(newPermission);

        if (newPermission !== "granted") {
          setStatus("denied");
          setError("Permission denied by user");
          return;
        }
      }

      const result = await subscribeToPush(VAPID_PUBLIC_KEY, {
        tags: ["deals", "offers"],
      });

      if (result.success) {
        setIsSubscribed(true);
        setStatus("subscribed");
        setCanPrompt(false);
      } else {
        setError(result.error || "Failed to subscribe");
        setStatus("idle");
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
      setStatus("idle");
    } finally {
      setIsLoading(false);
    }
  }, [permission]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await unsubscribeFromPush();
      if (result.success) {
        setIsSubscribed(false);
        setStatus("idle");
        setPermission("default");
      } else {
        setError(result.error || "Failed to unsubscribe");
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const dismissPrompt = useCallback(() => {
    dismissPushPrompt();
    setCanPrompt(false);
  }, []);

  const resetPrompt = useCallback(() => {
    resetPushPrompt();
    setCanPrompt(true);
    setStatus("idle");
    setError(null);
  }, []);

  return {
    status,
    supported: isPushSupported(),
    permission,
    isSubscribed,
    isLoading,
    canPrompt: canPrompt && !isSubscribed && permission !== "denied",
    error,
    subscribe,
    unsubscribe,
    dismissPrompt,
    resetPrompt,
  };
}

/**
 * Hook for checking if push should be shown (for conditional rendering)
 */
export function usePushAvailability(): {
  supported: boolean;
  shouldShow: boolean;
  isReady: boolean;
} {
  const [info, setInfo] = useState({
    supported: false,
    shouldShow: false,
    isReady: false,
  });

  useEffect(() => {
    const supportInfo = getPushSupportInfo();
    setInfo({
      supported: supportInfo.supported,
      shouldShow:
        supportInfo.supported &&
        supportInfo.permission !== "denied" &&
        (supportInfo.permission === "default" || supportInfo.permission === "granted"),
      isReady: true,
    });
  }, []);

  return info;
}
