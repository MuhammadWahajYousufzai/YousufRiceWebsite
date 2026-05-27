import type { Product, ProductImage } from "@repo/types";
import {
  isRegularCatalogProduct,
  sortProductsForCatalog,
} from "@repo/utils";
import {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  BANNER_STORAGE_BUCKET_ID,
  DATABASE_ID,
  PRODUCT_IMAGES_TABLE_ID,
  PRODUCTS_TABLE_ID,
  Query,
  STORAGE_BUCKET_ID,
  storage,
  tablesDB,
} from "@/lib/appwrite";

export interface BannerImage {
  $id: string;
  name: string;
  url: string;
}

export interface ProductWithImage extends Product {
  bundleImage?: ProductImage;
  bundleImageUrl?: string;
  imageUrl?: string;
  primaryImage?: ProductImage;
}

interface RowList<T> {
  rows?: T[];
  documents?: T[];
}

function rowsFromResponse<T>(response: RowList<T>): T[] {
  return response.rows ?? response.documents ?? [];
}

function assertCatalogConfig() {
  const missing = [
    ["EXPO_PUBLIC_APPWRITE_ENDPOINT", APPWRITE_ENDPOINT],
    ["EXPO_PUBLIC_APPWRITE_PROJECT_ID", APPWRITE_PROJECT_ID],
    ["EXPO_PUBLIC_APPWRITE_DATABASE_ID", DATABASE_ID],
    ["EXPO_PUBLIC_APPWRITE_PRODUCTS_TABLE_ID", PRODUCTS_TABLE_ID],
    ["EXPO_PUBLIC_APPWRITE_PRODUCT_IMAGES_TABLE_ID", PRODUCT_IMAGES_TABLE_ID],
    ["EXPO_PUBLIC_APPWRITE_STORAGE_BUCKET_ID", STORAGE_BUCKET_ID],
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new Error(`Missing mobile Appwrite env: ${missing.map(([key]) => key).join(", ")}`);
  }
}

export function getStorageFileViewUrl(bucketId: string, fileId: string) {
  return `${APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${fileId}/view?project=${APPWRITE_PROJECT_ID}`;
}

export async function listAvailableProducts() {
  assertCatalogConfig();

  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: PRODUCTS_TABLE_ID,
    queries: [Query.limit(100)],
  });

  return sortProductsForCatalog(
    rowsFromResponse<Product>(response as unknown as RowList<Product>).filter(
      (product) => product.available && isRegularCatalogProduct(product),
    ),
  );
}

export async function listProductImages() {
  assertCatalogConfig();

  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: PRODUCT_IMAGES_TABLE_ID,
    queries: [Query.limit(200)],
  });

  return rowsFromResponse<ProductImage>(response as unknown as RowList<ProductImage>);
}

export async function listProductsWithPrimaryImages(): Promise<ProductWithImage[]> {
  const [products, images] = await Promise.all([listAvailableProducts(), listProductImages()]);

  return products.map((product) => {
    const primaryImage =
      images.find((image) => image.product_id === product.$id && image.is_primary) ??
      images.find((image) => image.product_id === product.$id);
    const bundleImage = images.find(
      (image) => image.product_id === product.$id && image.is_cold_drink_bundle,
    );

    return {
      ...product,
      bundleImage,
      bundleImageUrl: bundleImage
        ? getStorageFileViewUrl(STORAGE_BUCKET_ID, bundleImage.file_id)
        : undefined,
      primaryImage,
      imageUrl: primaryImage
        ? getStorageFileViewUrl(STORAGE_BUCKET_ID, primaryImage.file_id)
        : undefined,
    };
  });
}

export async function listBannerImages(): Promise<BannerImage[]> {
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !BANNER_STORAGE_BUCKET_ID) {
    return [];
  }

  const result = await storage.listFiles({
    bucketId: BANNER_STORAGE_BUCKET_ID,
    queries: [Query.limit(20)],
  });

  return result.files.map((file) => ({
    $id: file.$id,
    name: file.name,
    url: getStorageFileViewUrl(BANNER_STORAGE_BUCKET_ID, file.$id),
  }));
}

export async function loadCatalogSnapshot() {
  const [products, banners] = await Promise.all([
    listProductsWithPrimaryImages(),
    listBannerImages(),
  ]);

  return { products, banners };
}
