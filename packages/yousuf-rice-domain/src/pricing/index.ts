export interface PriceTier {
  tierRange: "2-4kg" | "5-9kg" | "10kg+";
  pricePerKg: number;
  discountPercent: string;
}

export interface ProductPricing {
  basePricePerKg: number;
  hasTierPricing: boolean;
  tier_2_4kg_price: number | null;
  tier_5_9kg_price: number | null;
  tier_10kg_up_price: number | null;
}

export interface PriceCalculation {
  pricePerKg: number;
  tierApplied: "base" | "2-4kg" | "5-9kg" | "10kg+";
  basePricePerKg: number;
  quantity: number;
  subtotal: number;
  discountAmount: number;
  savingsPercent: string;
}

export function getPricePerKg(pricing: ProductPricing, quantity: number): number {
  if (!pricing.hasTierPricing || quantity <= 0) {
    return pricing.basePricePerKg;
  }

  if (quantity >= 10 && pricing.tier_10kg_up_price && pricing.tier_10kg_up_price > 0) {
    return pricing.tier_10kg_up_price;
  }

  if (quantity >= 5 && pricing.tier_5_9kg_price && pricing.tier_5_9kg_price > 0) {
    return pricing.tier_5_9kg_price;
  }

  if (quantity >= 2 && pricing.tier_2_4kg_price && pricing.tier_2_4kg_price > 0) {
    return pricing.tier_2_4kg_price;
  }

  return pricing.basePricePerKg;
}

export function calculatePrice(pricing: ProductPricing, quantity: number): PriceCalculation {
  const pricePerKg = getPricePerKg(pricing, quantity);
  const subtotal = pricePerKg * quantity;
  const baseTotal = pricing.basePricePerKg * quantity;
  const discountAmount = baseTotal - subtotal;

  let tierApplied: PriceCalculation["tierApplied"] = "base";
  if (pricing.hasTierPricing) {
    if (quantity >= 10 && pricing.tier_10kg_up_price && pricing.tier_10kg_up_price > 0) {
      tierApplied = "10kg+";
    } else if (quantity >= 5 && pricing.tier_5_9kg_price && pricing.tier_5_9kg_price > 0) {
      tierApplied = "5-9kg";
    } else if (quantity >= 2 && pricing.tier_2_4kg_price && pricing.tier_2_4kg_price > 0) {
      tierApplied = "2-4kg";
    }
  }

  const savingsPercent = baseTotal > 0
    ? ((discountAmount / baseTotal) * 100).toFixed(1)
    : "0";

  return {
    pricePerKg,
    tierApplied,
    basePricePerKg: pricing.basePricePerKg,
    quantity,
    subtotal,
    discountAmount,
    savingsPercent,
  };
}

export function buildPriceTiers(pricing: ProductPricing): PriceTier[] {
  const tiers: PriceTier[] = [];

  if (!pricing.hasTierPricing) {
    return tiers;
  }

  if (pricing.tier_2_4kg_price && pricing.tier_2_4kg_price > 0) {
    const discount = (((pricing.basePricePerKg - pricing.tier_2_4kg_price) / pricing.basePricePerKg) * 100).toFixed(1);
    tiers.push({ tierRange: "2-4kg", pricePerKg: pricing.tier_2_4kg_price, discountPercent: discount });
  }

  if (pricing.tier_5_9kg_price && pricing.tier_5_9kg_price > 0) {
    const discount = (((pricing.basePricePerKg - pricing.tier_5_9kg_price) / pricing.basePricePerKg) * 100).toFixed(1);
    tiers.push({ tierRange: "5-9kg", pricePerKg: pricing.tier_5_9kg_price, discountPercent: discount });
  }

  if (pricing.tier_10kg_up_price && pricing.tier_10kg_up_price > 0) {
    const discount = (((pricing.basePricePerKg - pricing.tier_10kg_up_price) / pricing.basePricePerKg) * 100).toFixed(1);
    tiers.push({ tierRange: "10kg+", pricePerKg: pricing.tier_10kg_up_price, discountPercent: discount });
  }

  return tiers;
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
