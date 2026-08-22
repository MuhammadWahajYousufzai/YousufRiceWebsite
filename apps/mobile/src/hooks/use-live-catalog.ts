import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import type { ProductWithImage } from "@/lib/catalog";
import { loadCatalogSnapshot } from "@/lib/catalog";
import {
  Channel,
  APPWRITE_REALTIME_ENABLED,
  DATABASE_ID,
  PRODUCT_IMAGES_TABLE_ID,
  PRODUCTS_TABLE_ID,
  STORAGE_BUCKET_ID,
  client,
} from "@/lib/appwrite";

interface CatalogState {
  error: string | null;
  loading: boolean;
  products: ProductWithImage[];
  refreshing: boolean;
  updatedAt: string | null;
}

const initialState: CatalogState = {
  error: null,
  loading: true,
  products: [],
  refreshing: false,
  updatedAt: null,
};

function catalogChannels() {
  const channels = [
    DATABASE_ID && PRODUCTS_TABLE_ID
      ? Channel.tablesdb(DATABASE_ID).table(PRODUCTS_TABLE_ID).row()
      : null,
    DATABASE_ID && PRODUCT_IMAGES_TABLE_ID
      ? Channel.tablesdb(DATABASE_ID).table(PRODUCT_IMAGES_TABLE_ID).row()
      : null,
    STORAGE_BUCKET_ID ? Channel.bucket(STORAGE_BUCKET_ID).file() : null,
  ];

  return channels
    .filter((channel): channel is NonNullable<(typeof channels)[number]> =>
      Boolean(channel),
    )
    .map((channel) => channel.toString());
}

export function useLiveCatalog() {
  const [state, setState] = useState<CatalogState>(initialState);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(
    async (mode: "initial" | "manual" | "realtime" = "manual") => {
      setState((current) => ({
        ...current,
        error: null,
        loading: mode === "initial" ? true : current.loading,
        refreshing: mode !== "initial",
      }));

      try {
        const snapshot = await loadCatalogSnapshot();
        setState({
          ...snapshot,
          error: null,
          loading: false,
          refreshing: false,
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        setState((current) => ({
          ...current,
          error:
            error instanceof Error ? error.message : "Could not load catalog.",
          loading: false,
          refreshing: false,
        }));
      }
    },
    [],
  );

  const scheduleRealtimeRefresh = useCallback(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
    }

    refreshTimer.current = setTimeout(() => {
      refresh("realtime");
    }, 250);
  }, [refresh]);

  useEffect(() => {
    refresh("initial");
  }, [refresh]);

  useEffect(() => {
    const channels = catalogChannels();

    if (!APPWRITE_REALTIME_ENABLED || channels.length === 0) {
      return;
    }

    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = client.subscribe(channels, scheduleRealtimeRefresh);
    } catch (error) {
      console.warn("Realtime catalog refresh unavailable:", error);
    }

    return () => {
      unsubscribe?.();
    };
  }, [scheduleRealtimeRefresh]);

  useEffect(() => {
    const interval = setInterval(() => {
      refresh("realtime");
    }, 15000);

    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        refresh("manual");
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, [refresh]);

  useEffect(() => {
    return () => {
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
      }
    };
  }, []);

  return {
    ...state,
    refresh,
  };
}
