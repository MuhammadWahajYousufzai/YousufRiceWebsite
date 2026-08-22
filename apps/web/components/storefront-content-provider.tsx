"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Product, ProductImage, StorefrontContent } from "@repo/types";
import {
  Channel,
  client,
  DATABASE_ID,
  PRODUCT_IMAGES_TABLE_ID,
  PRODUCTS_TABLE_ID,
  Query,
  STOREFRONT_CONTENT_TABLE_ID,
  tablesDB,
} from "@/lib/appwrite";

interface StorefrontContentContextValue {
  contents: StorefrontContent[];
  error: string | null;
  imageFileIds: Map<string, string>;
  loading: boolean;
  products: Product[];
  refresh: () => Promise<void>;
}

const StorefrontContentContext = createContext<StorefrontContentContextValue | null>(
  null,
);

function rowsFromResponse<T>(response: {
  rows?: unknown[];
  documents?: unknown[];
}): T[] {
  return (response.rows ?? response.documents ?? []) as T[];
}

export function StorefrontContentProvider({ children }: { children: ReactNode }) {
  const [contents, setContents] = useState<StorefrontContent[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (!DATABASE_ID || !STOREFRONT_CONTENT_TABLE_ID) {
      setLoading(false);
      return;
    }

    try {
      const [contentResponse, productResponse, imageResponse] = await Promise.all([
        tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: STOREFRONT_CONTENT_TABLE_ID,
          queries: [Query.limit(100)],
        }),
        tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: PRODUCTS_TABLE_ID,
          queries: [Query.limit(100)],
        }),
        tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: PRODUCT_IMAGES_TABLE_ID,
          queries: [Query.limit(200)],
        }),
      ]);

      setContents(rowsFromResponse<StorefrontContent>(contentResponse));
      setProducts(rowsFromResponse<Product>(productResponse));
      setImages(rowsFromResponse<ProductImage>(imageResponse));
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
    // This is the initial remote-data synchronization for the provider.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!DATABASE_ID) return;

    const channels = [
      STOREFRONT_CONTENT_TABLE_ID
        ? Channel.tablesdb(DATABASE_ID)
            .table(STOREFRONT_CONTENT_TABLE_ID)
            .row()
            .toString()
        : null,
      PRODUCTS_TABLE_ID
        ? Channel.tablesdb(DATABASE_ID).table(PRODUCTS_TABLE_ID).row().toString()
        : null,
      PRODUCT_IMAGES_TABLE_ID
        ? Channel.tablesdb(DATABASE_ID)
            .table(PRODUCT_IMAGES_TABLE_ID)
            .row()
            .toString()
        : null,
    ].filter((channel): channel is string => Boolean(channel));

    if (channels.length === 0) return;

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = client.subscribe(channels, scheduleRefresh);
    } catch (subscriptionError) {
      console.warn("Storefront realtime is unavailable:", subscriptionError);
    }

    return () => unsubscribe?.();
  }, [scheduleRefresh]);

  useEffect(() => {
    const interval = window.setInterval(() => void refresh(), 15_000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  useEffect(
    () => () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    },
    [],
  );

  const imageFileIds = useMemo(() => {
    const map = new Map<string, string>();
    for (const image of images) {
      if (image.is_cold_drink_bundle) continue;
      if (image.is_primary || !map.has(image.product_id)) {
        map.set(image.product_id, image.file_id);
      }
    }
    return map;
  }, [images]);

  const value = useMemo(
    () => ({ contents, error, imageFileIds, loading, products, refresh }),
    [contents, error, imageFileIds, loading, products, refresh],
  );

  return (
    <StorefrontContentContext.Provider value={value}>
      {children}
    </StorefrontContentContext.Provider>
  );
}

export function useStorefrontContent() {
  const value = useContext(StorefrontContentContext);
  if (!value) {
    throw new Error(
      "useStorefrontContent must be used inside StorefrontContentProvider.",
    );
  }
  return value;
}
