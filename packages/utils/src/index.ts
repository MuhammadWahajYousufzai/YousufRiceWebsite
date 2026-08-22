import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Product, StorefrontContent } from "@repo/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculatePrice(product: Product, quantity: number): number {
  return getPricePerKg(product, quantity) * quantity;
}

export function getPricePerKg(product: Product, quantity: number): number {
  if (!product.has_tier_pricing) {
    return product.base_price_per_kg;
  }

  if (quantity >= 10 && product.tier_10kg_up_price && product.tier_10kg_up_price > 0) {
    return product.tier_10kg_up_price;
  }

  if (quantity >= 5 && product.tier_5_9kg_price && product.tier_5_9kg_price > 0) {
    return product.tier_5_9kg_price;
  }

  if (quantity >= 2 && product.tier_2_4kg_price && product.tier_2_4kg_price > 0) {
    return product.tier_2_4kg_price;
  }

  return product.base_price_per_kg;
}

export function formatCurrency(amount: number): string {
  return `Rs. ${amount.toLocaleString()}`;
}

export const DELIVERY_CITIES = ["Karachi", "Bahria Town Karachi"] as const;

export type DeliveryCity = (typeof DELIVERY_CITIES)[number];

export function isDeliveryCity(city: string): city is DeliveryCity {
  return DELIVERY_CITIES.includes(city.trim() as DeliveryCity);
}

export function requireDeliveryCity(city: string): DeliveryCity {
  const normalized = city.trim();
  if (!isDeliveryCity(normalized)) {
    throw new Error(
      "Delivery is available only in Karachi and Bahria Town Karachi.",
    );
  }
  return normalized;
}

export function calculateDeliveryFee(
  city: string,
  totalWeightKg: number,
): number {
  if (totalWeightKg <= 0) return 0;
  if (city === "Karachi") return 200;
  if (city === "Bahria Town Karachi") {
    return Math.ceil(totalWeightKg / 10) * 500;
  }
  return 0;
}

export function calculateSavings(
  product: Product,
  quantity: number,
): {
  originalPrice: number;
  discountedPrice: number;
  savings: number;
  savingsPercentage: number;
  tierApplied: string | null;
} {
  const originalPrice = product.base_price_per_kg * quantity;
  const discountedPrice = calculatePrice(product, quantity);
  const savings = originalPrice - discountedPrice;
  const savingsPercentage = originalPrice > 0 ? (savings / originalPrice) * 100 : 0;

  let tierApplied: string | null = null;
  if (product.has_tier_pricing && savings > 0) {
    if (quantity >= 10 && product.tier_10kg_up_price && product.tier_10kg_up_price > 0) {
      tierApplied = "10+ kg tier";
    } else if (quantity >= 5 && product.tier_5_9kg_price && product.tier_5_9kg_price > 0) {
      tierApplied = "5-9 kg tier";
    } else if (quantity >= 2 && product.tier_2_4kg_price && product.tier_2_4kg_price > 0) {
      tierApplied = "2-4 kg tier";
    }
  }

  return {
    originalPrice,
    discountedPrice,
    savings,
    savingsPercentage,
    tierApplied,
  };
}

export function calculateTierPricing(
  product: Product,
  quantity: number,
): {
  pricePerKg: number;
  tierApplied: "base" | "2-4kg" | "5-9kg" | "10kg+";
  originalPrice: number;
  discountAmount: number;
} {
  const originalPrice = product.base_price_per_kg;
  const pricePerKg = getPricePerKg(product, quantity);
  let tierApplied: "base" | "2-4kg" | "5-9kg" | "10kg+" = "base";

  if (product.has_tier_pricing) {
    if (quantity >= 10 && product.tier_10kg_up_price && product.tier_10kg_up_price > 0) {
      tierApplied = "10kg+";
    } else if (quantity >= 5 && product.tier_5_9kg_price && product.tier_5_9kg_price > 0) {
      tierApplied = "5-9kg";
    } else if (quantity >= 2 && product.tier_2_4kg_price && product.tier_2_4kg_price > 0) {
      tierApplied = "2-4kg";
    }
  }

  return {
    pricePerKg,
    tierApplied,
    originalPrice,
    discountAmount: (originalPrice - pricePerKg) * quantity,
  };
}

export function calculateItemTotal(
  pricePerKg: number,
  quantity: number,
  discountPercentage = 0,
): {
  subtotal: number;
  discountAmount: number;
  total: number;
} {
  const subtotal = pricePerKg * quantity;
  const discountAmount = (subtotal * discountPercentage) / 100;
  return {
    subtotal,
    discountAmount,
    total: subtotal - discountAmount,
  };
}

export function generateMapsUrl(
  latitude: number,
  longitude: number,
  platform: "ios" | "android" | "web" = "web",
): string {
  if (platform === "ios") {
    return `https://maps.apple.com/?q=${latitude},${longitude}`;
  }

  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

export function parseOrderItems(
  orderItemsCSV: string,
): Array<{ productId: string; quantity: number }> {
  return orderItemsCSV.split(",").map((item) => {
    const [productId, quantityStr] = item.split(":");
    return {
      productId,
      quantity: Number.parseFloat(quantityStr.replace("kg", "")),
    };
  });
}

export function formatOrderItems(
  items: Array<{ productId: string; quantity: number }>,
): string {
  return items.map((item) => `${item.productId}:${item.quantity}kg`).join(",");
}

export function getCatalogProductPriority(name: string): number {
  const normalized = name.toLowerCase();
  if (normalized.includes("every grain")) return 1;
  if (normalized.includes("steam")) return 2;
  if (normalized.includes("sella")) return 3;
  if (normalized.includes("bachat") && normalized.includes("basmati")) return 4;
  if (normalized.includes("bachat")) return 5;
  return 6;
}

export function sortProductsForCatalog<T extends Pick<Product, "name">>(products: T[]): T[] {
  return [...products].sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const aPriority = getCatalogProductPriority(aName);
    const bPriority = getCatalogProductPriority(bName);

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    if (aPriority === 2 && bPriority === 2) {
      const getSteamPriority = (name: string) => {
        if (name.includes("x-steam") || name.includes("x steam")) return 1;
        if (name.includes("platinum")) return 2;
        if (name.includes("premium")) return 3;
        return 4;
      };
      return getSteamPriority(aName) - getSteamPriority(bName);
    }

    if (aPriority === 3 && bPriority === 3) {
      const getSellaPriority = (name: string) => {
        if (name.includes("ultimate")) return 1;
        if (name.includes("platinum")) return 2;
        if (name.includes("gold")) return 3;
        return 4;
      };
      return getSellaPriority(aName) - getSellaPriority(bName);
    }

    return 0;
  });
}

export function getCatalogCategory(productName: string): string {
  const normalized = productName.toLowerCase();

  if (normalized.includes("every grain")) {
    return "Every Grain Rice XXXL";
  }

  if (normalized.includes("steam")) {
    return "Basmati Steam Rice";
  }

  if (normalized.includes("sella")) {
    return "Sella Rice";
  }

  if (normalized.includes("bachat") || normalized.includes("regular")) {
    return "Bachat Rice";
  }

  return "Other";
}

export function groupProductsByCatalogCategory<T extends Pick<Product, "name">>(
  products: T[],
): Array<{ category: string; products: T[] }> {
  const groups = new Map<string, T[]>();

  products.forEach((product) => {
    const category = getCatalogCategory(product.name);
    const current = groups.get(category) ?? [];
    current.push(product);
    groups.set(category, current);
  });

  return Array.from(groups.entries()).map(([category, groupedProducts]) => ({
    category,
    products: groupedProducts,
  }));
}

export function isRegularCatalogProduct(product: Pick<Product, "name" | "description">): boolean {
  const searchText = `${product.name} ${product.description || ""}`.toLowerCase();
  return !searchText.includes("hotel") && !searchText.includes("restaurant");
}

export function isEveryGrainProduct(product: Pick<Product, "name">): boolean {
  const normalizedName = product.name.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    normalizedName.includes("every grain") ||
    normalizedName.includes("everygrain")
  );
}

export function getEveryGrainShanGiftCount(
  product: Pick<Product, "name">,
  bags: { kg10?: number } | null | undefined,
): number {
  if (!isEveryGrainProduct(product)) return 0;

  const tenKgBags = Number(bags?.kg10 ?? 0);
  return Number.isFinite(tenKgBags) && tenKgBags > 0
    ? Math.floor(tenKgBags)
    : 0;
}

export type StorefrontPlatform = "web" | "mobile";

export function isStorefrontContentActive(
  content: StorefrontContent,
  platform: StorefrontPlatform,
  now?: Date,
): boolean {
  if (!content.enabled) return false;
  if (platform === "web" && !content.show_on_web) return false;
  if (platform === "mobile" && !content.show_on_mobile) return false;

  let nowTime: number | undefined;
  const getNowTime = () => {
    nowTime ??= now?.getTime() ?? Date.now();
    return nowTime;
  };
  if (content.starts_at) {
    const startsAt = new Date(content.starts_at).getTime();
    if (Number.isFinite(startsAt) && startsAt > getNowTime()) return false;
  }
  if (content.ends_at) {
    const endsAt = new Date(content.ends_at).getTime();
    if (Number.isFinite(endsAt) && endsAt < getNowTime()) return false;
  }

  return true;
}

export function getActiveStorefrontContent(
  contents: StorefrontContent[],
  platform: StorefrontPlatform,
  placement?: StorefrontContent["placement"],
  now?: Date,
): StorefrontContent[] {
  return contents
    .filter(
      (content) =>
        (!placement || content.placement === placement) &&
        isStorefrontContentActive(content, platform, now),
    )
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function getProductPromotion(
  contents: StorefrontContent[],
  productId: string,
  platform: StorefrontPlatform,
): StorefrontContent | undefined {
  return getActiveStorefrontContent(contents, platform, "promotion").find(
    (content) => content.product_id === productId,
  );
}

export function getPromotionRewardCount(
  promotion: StorefrontContent | null | undefined,
  bags:
    | { kg3?: number; kg5?: number; kg10?: number; kg25?: number }
    | null
    | undefined,
): number {
  if (
    !promotion?.reward_text ||
    !promotion.qualifying_bag_size_kg ||
    promotion.placement !== "promotion"
  ) {
    return 0;
  }

  const bagCountBySize: Record<number, number> = {
    3: Number(bags?.kg3 ?? 0),
    5: Number(bags?.kg5 ?? 0),
    10: Number(bags?.kg10 ?? 0),
    25: Number(bags?.kg25 ?? 0),
  };
  const qualifyingBags = bagCountBySize[promotion.qualifying_bag_size_kg] ?? 0;
  if (!Number.isFinite(qualifyingBags) || qualifyingBags <= 0) return 0;

  return (
    Math.floor(qualifyingBags) *
    Math.max(1, Math.floor(promotion.reward_quantity ?? 1))
  );
}

export function shouldHideThreeKgBag(product: Pick<Product, "name">): boolean {
  return product.name.toLowerCase().includes("every");
}

export function shouldShowPremiumBadge(product: Pick<Product, "name">): boolean {
  const name = product.name.toLowerCase();
  return !name.includes("bachat") && !name.includes("mota") && !name.includes("regular");
}

export function calculateBagsFromQuantity(quantity: number): {
  kg3: number;
  kg5: number;
  kg10: number;
  kg25: number;
} {
  let remaining = quantity;
  const kg25 = Math.floor(remaining / 25);
  remaining %= 25;

  const kg10 = Math.floor(remaining / 10);
  remaining %= 10;

  const kg5 = Math.floor(remaining / 5);
  remaining %= 5;

  const kg3 = Math.floor(remaining / 3);

  return { kg3, kg5, kg10, kg25 };
}

export function calculateQuantityFromBags(bags: {
  kg3: number;
  kg5: number;
  kg10: number;
  kg25: number;
}): number {
  return bags.kg3 * 3 + bags.kg5 * 5 + bags.kg10 * 10 + bags.kg25 * 25;
}

export function validatePakistaniPhoneNumber(phone: string): {
  isValid: boolean;
  error?: string;
  cleanedPhone?: string;
} {
  const cleanedPhone = phone.replace(/[\s-]/g, "");

  if (cleanedPhone.startsWith("+92")) {
    return {
      isValid: false,
      error: "Please enter number starting with 0, not +92.",
    };
  }

  if (/\D/.test(cleanedPhone)) {
    return {
      isValid: false,
      error: "Phone number must contain only digits.",
    };
  }

  if (cleanedPhone.length !== 11 || !cleanedPhone.startsWith("0")) {
    return {
      isValid: false,
      error: "Number must be 11 digits starting with 0 (e.g. 03001234567).",
    };
  }

  return { isValid: true, cleanedPhone };
}

export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("0") && digits.length === 11) {
    return `+92${digits.substring(1)}`;
  }

  if (digits.startsWith("92")) {
    return `+${digits}`;
  }

  return `+92${digits}`;
}

export function formatPhoneNumberForDisplay(phone: string): string {
  if (!phone) return "";

  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("92") && digits.length === 12) {
    return `0${digits.substring(2)}`;
  }

  if (digits.startsWith("0") && digits.length === 11) {
    return digits;
  }

  if (digits.length === 10) {
    return `0${digits}`;
  }

  return phone;
}
