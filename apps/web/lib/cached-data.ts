"use cache";

import {
  tablesDB,
  storage,
  DATABASE_ID,
  PRODUCTS_TABLE_ID,
  PRODUCT_IMAGES_TABLE_ID,
  STORAGE_BUCKET_ID,
} from "@/lib/appwrite";
import { Product, ProductImage } from "@/lib/types";
import { Query } from "appwrite";
import { cacheTag, cacheLife } from "next/cache";

/**
 * Cached function to fetch all available products
 * Uses Next.js 16 'use cache' directive with PPR for optimal performance
 */
export async function getCachedProducts() {
  "use cache";
  cacheLife("max");
  cacheTag("products");

  try {
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: PRODUCTS_TABLE_ID,
    });
    return JSON.parse(JSON.stringify(response.rows)) as Product[];
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

/**
 * Cached function to fetch regular products (excluding hotel/restaurant products)
 * Uses Next.js 16 'use cache' directive with PPR for optimal performance
 */
export async function getCachedRegularProducts() {
  "use cache";
  cacheLife("max");
  cacheTag("products", "regular-products");

  try {
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: PRODUCTS_TABLE_ID,
    });

    // Filter out products that contain "hotel" or "restaurant" in their name or description
    const allProducts = JSON.parse(JSON.stringify(response.rows)) as Product[];
    return allProducts.filter((product) => {
      const searchText = `${product.name} ${
        product.description || ""
      }`.toLowerCase();
      return (
        !searchText.includes("hotel") && !searchText.includes("restaurant")
      );
    });
  } catch (error) {
    console.error("Error fetching regular products:", error);
    return [];
  }
}

/**
 * Cached function to fetch product images
 * Uses Next.js 16 'use cache' directive with PPR for optimal performance
 */
export async function getCachedProductImages(productIds: string[]) {
  "use cache";
  cacheLife("max");
  cacheTag("product-images");

  if (productIds.length === 0) return [];

  try {
    // Fetch a larger set of images since we need both primary and bundle images
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: PRODUCT_IMAGES_TABLE_ID,
      queries: [Query.limit(200)],
    });

    // Filter to only include images for our products that are either primary or a bundle image
    const allImages = JSON.parse(
      JSON.stringify(response.rows),
    ) as ProductImage[];
    return allImages.filter(
      (img) =>
        productIds.includes(img.product_id) &&
        (img.is_primary || img.is_cold_drink_bundle),
    );
  } catch (error) {
    console.error("Error fetching product images:", error);
    return [];
  }
}

/**
 * Cached function to fetch a single product by ID
 * Uses Next.js 16 'use cache' directive with PPR for optimal performance
 */
export async function getCachedProduct(id: string) {
  "use cache";
  cacheLife("max");
  cacheTag("products", `product-${id}`);

  try {
    const product = await tablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId: PRODUCTS_TABLE_ID,
      rowId: id,
    });
    return JSON.parse(JSON.stringify(product)) as Product;
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
}

/**
 * Cached function to fetch all images for a specific product
 * Uses Next.js 16 'use cache' directive with PPR for optimal performance
 */
export async function getCachedProductImagesById(productId: string) {
  "use cache";
  cacheLife("max");
  cacheTag("product-images", `product-${productId}-images`);

  try {
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: PRODUCT_IMAGES_TABLE_ID,
      queries: [
        Query.equal("product_id", productId),
        Query.orderDesc("$createdAt"),
      ],
    });
    return JSON.parse(JSON.stringify(response.rows)) as ProductImage[];
  } catch (error) {
    console.error("Error fetching product images:", error);
    return [];
  }
}

// Note: Image URL generation should be done inline in components
// as it's a synchronous operation that doesn't benefit from caching
