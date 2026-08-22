import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import type { StorefrontContent } from "@repo/types";
import {
  Channel,
  DATABASE_ID,
  STOREFRONT_CONTENT_TABLE_ID,
  client,
} from "@/lib/appwrite";
import { listStorefrontContent } from "@/lib/catalog";

export function useLiveStorefrontContent() {
  const [contents, setContents] = useState<StorefrontContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      setContents(await listStorefrontContent());
      setError(null);
    } catch (refreshError) {
      console.warn("Could not refresh storefront content:", refreshError);
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Could not refresh storefront content.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => void refresh(), 200);
  }, [refresh]);

  useEffect(() => {
    // This is the initial remote-data synchronization for the hook.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!DATABASE_ID || !STOREFRONT_CONTENT_TABLE_ID) return;
    const channel = Channel.tablesdb(DATABASE_ID)
      .table(STOREFRONT_CONTENT_TABLE_ID)
      .row()
      .toString();
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = client.subscribe(channel, scheduleRefresh);
    } catch (subscriptionError) {
      console.warn("Storefront realtime unavailable:", subscriptionError);
    }
    return () => unsubscribe?.();
  }, [scheduleRefresh]);

  useEffect(() => {
    const interval = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") void refresh();
    };
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, [refresh]);

  useEffect(
    () => () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    },
    [],
  );

  return { contents, error, loading, refresh };
}
