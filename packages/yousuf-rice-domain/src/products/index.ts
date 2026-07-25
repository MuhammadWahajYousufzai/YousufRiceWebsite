import { Query } from "node-appwrite";
import { getTablesDB, getConfig } from "../appwrite/client";
import { NotFoundError } from "../errors";
import { ProductPricing, buildPriceTiers } from "../pricing";

export interface ProductRecord {
  $id: string;
  name: string;
  description?: string;
  base_price_per_kg: number;
  has_tier_pricing: boolean;
  tier_2_4kg_price?: number;
  tier_5_9kg_price?: number;
  tier_10kg_up_price?: number;
  available: boolean;
  primary_image_id?: string;
  $createdAt: string;
}

export interface ProductResult {
  id: string;
  name: string;
  description: string;
  basePricePerKg: number;
  hasTierPricing: boolean;
  priceTiers: Array<{ tierRange: string; pricePerKg: number; discountPercent: string }>;
  available: boolean;
  primaryImageId: string | null;
  isHotelRestaurant: boolean;
}

function isHotelRestaurantProduct(product: ProductRecord): boolean {
  const searchText = `${product.name} ${product.description || ""}`.toLowerCase();
  return searchText.includes("hotel") || searchText.includes("restaurant");
}

export async function listProducts(options: {
  searchQuery?: string | null;
  inStockOnly?: boolean;
  forHotelsRestaurants?: boolean | null;
  limit?: number;
}): Promise<{ products: ProductResult[]; total: number }> {
  const db = getTablesDB();
  const config = getConfig();
  const { searchQuery, inStockOnly, forHotelsRestaurants, limit = 50 } = options;

  const validLimit = Math.max(1, Math.min(limit, 50));
  const fetchLimit = forHotelsRestaurants !== null ? Math.min(validLimit * 3, 100) : validLimit;

  const queries: any[] = [Query.limit(fetchLimit), Query.orderDesc("$createdAt")];

  if (searchQuery && searchQuery.trim().length > 0) {
    queries.push(Query.search("name", searchQuery.trim()));
  }

  if (inStockOnly) {
    queries.push(Query.equal("available", true));
  }

  const response = await db.listRows({
    databaseId: config.databaseId,
    tableId: config.productsTableId,
    queries,
  });

  let filteredDocs = response.rows as unknown as ProductRecord[];

  if (forHotelsRestaurants !== null) {
    filteredDocs = filteredDocs.filter((doc) => {
      const isHotel = isHotelRestaurantProduct(doc);
      return forHotelsRestaurants ? isHotel : !isHotel;
    });
  }

  const limitedDocs = filteredDocs.slice(0, validLimit);

  return {
    products: limitedDocs.map(mapProduct),
    total: limitedDocs.length,
  };
}

export async function getProductById(productId: string): Promise<ProductResult> {
  const db = getTablesDB();
  const config = getConfig();

  if (!productId || productId.trim().length === 0) {
    throw new NotFoundError("Product", productId);
  }

  try {
    const product = await db.getRow({
      databaseId: config.databaseId,
      tableId: config.productsTableId,
      rowId: productId.trim(),
    });
    return mapProduct(product as unknown as ProductRecord);
  } catch {
    throw new NotFoundError("Product", productId);
  }
}

export async function getProductRecord(productId: string): Promise<ProductRecord> {
  const db = getTablesDB();
  const config = getConfig();

  try {
    return (await db.getRow({
      databaseId: config.databaseId,
      tableId: config.productsTableId,
      rowId: productId,
    })) as unknown as ProductRecord;
  } catch {
    throw new NotFoundError("Product", productId);
  }
}

function mapProduct(doc: ProductRecord): ProductResult {
  const pricing: ProductPricing = {
    basePricePerKg: doc.base_price_per_kg,
    hasTierPricing: doc.has_tier_pricing,
    tier_2_4kg_price: doc.tier_2_4kg_price || null,
    tier_5_9kg_price: doc.tier_5_9kg_price || null,
    tier_10kg_up_price: doc.tier_10kg_up_price || null,
  };

  return {
    id: doc.$id,
    name: doc.name,
    description: doc.description || "Premium quality rice",
    basePricePerKg: doc.base_price_per_kg,
    hasTierPricing: doc.has_tier_pricing,
    priceTiers: buildPriceTiers(pricing),
    available: doc.available,
    primaryImageId: doc.primary_image_id || null,
    isHotelRestaurant: isHotelRestaurantProduct(doc),
  };
}
