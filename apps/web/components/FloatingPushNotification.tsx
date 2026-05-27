"use client";

/**
 * Floating Push Notification Button
 * 
 * Google Maps-style floating pill at bottom-right
 * - Appears after delay (smart prompting)
 * - Can be dismissed (one-time ask)
 * - Shows different states: idle, loading, subscribed, denied
 */

import { usePushNotifications } from "@/lib/hooks/usePushNotifications";
import { cn } from "@/lib/utils";
import { Bell, Check, X, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

export function FloatingPushNotification() {
  const { status, supported, isLoading, canPrompt, subscribe, error, dismissPrompt } = usePushNotifications();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Delayed appearance with smooth animation
  useEffect(() => {
    if (canPrompt && !dismissed) {
      const timer = setTimeout(() => setVisible(true), 100);
      return () => clearTimeout(timer);
    }
  }, [canPrompt, dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
    dismissPrompt();
  };

  const handleSubscribe = async () => {
    await subscribe();
  };

  // Don't render if not supported or already subscribed/denied
  if (!supported || status === "subscribed" || status === "denied" || !canPrompt) {
    return null;
  }

  return (
    <>
      {/* Floating Pill Button */}
      <div
        className={cn(
          "fixed bottom-24 right-4 z-50 transition-all duration-500 ease-out",
          visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"
        )}
      >
        <div className="flex items-center gap-2 bg-white rounded-full shadow-lg border border-gray-200/80 p-2 pr-4 hover:shadow-xl transition-shadow">
          {/* Icon Button */}
          <button
            onClick={handleSubscribe}
            disabled={isLoading || status === "loading"}
            className={cn(
              "relative flex items-center justify-center w-10 h-10 rounded-full transition-colors",
              status === "loading"
                ? "bg-gray-100"
                : "bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            )}
            aria-label="Enable notifications for deals and offers"
          >
            {status === "loading" ? (
              <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
            ) : (
              <Bell className="w-5 h-5 text-white" />
            )}
            
            {/* Pulse animation for idle state */}
            {status === "idle" && (
              <span className="absolute inset-0 rounded-full animate-ping bg-orange-400/30" />
            )}
          </button>

          {/* Text Content */}
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900 leading-tight">
              Get Best Deals
            </span>
            <span className="text-xs text-gray-500 leading-tight">
              {status === "loading" ? "Enabling..." : "Offers & discounts"}
            </span>
          </div>

          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="ml-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Dismiss notification prompt"
          >
            <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </button>
        </div>
      </div>

      {/* Error Toast */}
      {error && visible && (
        <div className="fixed bottom-36 right-4 z-50 bg-red-50 border border-red-200 rounded-lg px-4 py-2 shadow-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </>
  );
}

/**
 * Subscribed State Indicator
 * Shows a subtle checkmark when subscribed (optional)
 */
export function PushSubscribedIndicator() {
  const { isSubscribed } = usePushNotifications();

  if (!isSubscribed) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50">
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full shadow-sm px-3 py-1.5">
        <Check className="w-4 h-4 text-green-600" />
        <span className="text-sm font-medium text-green-700">Notifications on</span>
      </div>
    </div>
  );
}
