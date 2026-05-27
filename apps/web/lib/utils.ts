import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Product } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculatePrice(product: Product, quantity: number): number {
  if (!product.has_tier_pricing) {
    return product.base_price_per_kg * quantity;
  }

  let pricePerKg = product.base_price_per_kg;

  if (quantity >= 10 && product.tier_10kg_up_price && product.tier_10kg_up_price > 0) {
    pricePerKg = product.tier_10kg_up_price;
  } else if (quantity >= 5 && product.tier_5_9kg_price && product.tier_5_9kg_price > 0) {
    pricePerKg = product.tier_5_9kg_price;
  } else if (quantity >= 2 && product.tier_2_4kg_price && product.tier_2_4kg_price > 0) {
    pricePerKg = product.tier_2_4kg_price;
  }

  return pricePerKg * quantity;
}

export function getPricePerKg(product: Product, quantity: number): number {
  if (!product.has_tier_pricing) {
    return product.base_price_per_kg;
  }

  if (quantity >= 10 && product.tier_10kg_up_price && product.tier_10kg_up_price > 0) {
    return product.tier_10kg_up_price;
  } else if (quantity >= 5 && product.tier_5_9kg_price && product.tier_5_9kg_price > 0) {
    return product.tier_5_9kg_price;
  } else if (quantity >= 2 && product.tier_2_4kg_price && product.tier_2_4kg_price > 0) {
    return product.tier_2_4kg_price;
  }

  return product.base_price_per_kg;
}

export function formatCurrency(amount: number): string {
  return `Rs. ${amount.toLocaleString()}`;
}

export function calculateSavings(
  product: Product,
  quantity: number
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
  const savingsPercentage =
    originalPrice > 0 ? (savings / originalPrice) * 100 : 0;

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

export function generateMapsUrl(
  latitude: number,
  longitude: number,
  platform: "ios" | "android" | "web" = "web"
): string {
  if (platform === "ios") {
    return `https://maps.apple.com/?q=${latitude},${longitude}`;
  }
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

export function parseOrderItems(
  orderItemsCSV: string
): Array<{ productId: string; quantity: number }> {
  return orderItemsCSV.split(",").map((item) => {
    const [productId, quantityStr] = item.split(":");
    return {
      productId,
      quantity: parseFloat(quantityStr.replace("kg", "")),
    };
  });
}

export function formatOrderItems(
  items: Array<{ productId: string; quantity: number }>
): string {
  return items.map((item) => `${item.productId}:${item.quantity}kg`).join(",");
}

// New utility functions for enhanced order system
export function calculateTierPricing(
  product: Product,
  quantity: number
): {
  pricePerKg: number;
  tierApplied: string;
  originalPrice: number;
  discountAmount: number;
} {
  const originalPrice = product.base_price_per_kg;
  let pricePerKg = originalPrice;
  let tierApplied = "base";

  if (product.has_tier_pricing) {
    if (quantity >= 10 && product.tier_10kg_up_price && product.tier_10kg_up_price > 0) {
      pricePerKg = product.tier_10kg_up_price;
      tierApplied = "10kg+";
    } else if (quantity >= 5 && product.tier_5_9kg_price && product.tier_5_9kg_price > 0) {
      pricePerKg = product.tier_5_9kg_price;
      tierApplied = "5-9kg";
    } else if (quantity >= 2 && product.tier_2_4kg_price && product.tier_2_4kg_price > 0) {
      pricePerKg = product.tier_2_4kg_price;
      tierApplied = "2-4kg";
    }
  }

  const discountAmount = (originalPrice - pricePerKg) * quantity;

  return {
    pricePerKg,
    tierApplied,
    originalPrice,
    discountAmount,
  };
}

export function calculateItemTotal(
  pricePerKg: number,
  quantity: number,
  discountPercentage: number = 0
): {
  subtotal: number;
  discountAmount: number;
  total: number;
} {
  const subtotal = pricePerKg * quantity;
  const discountAmount = (subtotal * discountPercentage) / 100;
  const total = subtotal - discountAmount;

  return {
    subtotal,
    discountAmount,
    total,
  };
}

export function calculateBagsFromQuantity(quantity: number): {
  kg3: number;
  kg5: number;
  kg10: number;
  kg25: number;
} {
  // This is a simple implementation - you might want to optimize bag distribution
  let remaining = quantity;
  const kg25 = Math.floor(remaining / 25);
  remaining = remaining % 25;

  const kg10 = Math.floor(remaining / 10);
  remaining = remaining % 10;

  const kg5 = Math.floor(remaining / 5);
  remaining = remaining % 5;

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
  // Remove spaces and dashes automatically
  const cleanedPhone = phone.replace(/[\s-]/g, "");

  // Check if starts with +92
  if (cleanedPhone.startsWith("+92")) {
    return {
      isValid: false,
      error: "Please enter number starting with 0, not +92.",
    };
  }

  // Check if contains non-digits after cleaning
  if (/\D/.test(cleanedPhone)) {
    return {
      isValid: false,
      error: "Phone number must contain only digits.",
    };
  }

  // Check length and starting digit
  if (cleanedPhone.length !== 11 || !cleanedPhone.startsWith("0")) {
    return {
      isValid: false,
      error: "Number must be 11 digits starting with 0 (e.g. 03001234567).",
    };
  }

  return { isValid: true, cleanedPhone };
}

export function formatPhoneNumber(phone: string): string {
  // This function assumes the input has been validated or is at least close to valid
  // But we'll keep it robust just in case
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // If starts with 0, replace with +92
  if (digits.startsWith("0") && digits.length === 11) {
    return "+92" + digits.substring(1);
  }

  // Fallback for existing data or other formats (though validation should prevent this for new input)
  if (digits.startsWith("92")) {
    return "+" + digits;
  }
  
  return "+92" + digits;
}

export function formatPhoneNumberForDisplay(phone: string): string {
  if (!phone) return "";
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");
  
  // If starts with 92 (e.g. 923001234567), replace 92 with 0
  if (digits.startsWith("92") && digits.length === 12) {
    return "0" + digits.substring(2);
  }
  
  // If it's already in 03 format (11 digits starting with 0), return as is
  if (digits.startsWith("0") && digits.length === 11) {
    return digits;
  }
  
  // If it's just the local part (10 digits), add 0
  if (digits.length === 10) {
    return "0" + digits;
  }
  
  // Fallback: return original
  return phone;
}
