import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculatePrice, getPricePerKg, buildPriceTiers, calculateBagsFromQuantity, formatPhoneNumber, validatePhoneNumber } from "@yousuf-rice/domain";
import type { ProductPricing } from "@yousuf-rice/domain";

const flatPricing: ProductPricing = {
  basePricePerKg: 495,
  hasTierPricing: false,
  tier_2_4kg_price: null,
  tier_5_9kg_price: null,
  tier_10kg_up_price: null,
};

const tierPricing: ProductPricing = {
  basePricePerKg: 500,
  hasTierPricing: true,
  tier_2_4kg_price: 475,
  tier_5_9kg_price: 450,
  tier_10kg_up_price: 425,
};

describe("getPricePerKg", () => {
  it("returns base price for flat-priced products", () => {
    expect(getPricePerKg(flatPricing, 1)).toBe(495);
    expect(getPricePerKg(flatPricing, 10)).toBe(495);
  });

  it("returns base price for quantity below 2", () => {
    expect(getPricePerKg(tierPricing, 1)).toBe(500);
  });

  it("applies 2-4kg tier for quantity 2-4", () => {
    expect(getPricePerKg(tierPricing, 2)).toBe(475);
    expect(getPricePerKg(tierPricing, 4)).toBe(475);
  });

  it("applies 5-9kg tier for quantity 5-9", () => {
    expect(getPricePerKg(tierPricing, 5)).toBe(450);
    expect(getPricePerKg(tierPricing, 9)).toBe(450);
  });

  it("applies 10kg+ tier for quantity 10 and above", () => {
    expect(getPricePerKg(tierPricing, 10)).toBe(425);
    expect(getPricePerKg(tierPricing, 50)).toBe(425);
  });

  it("handles zero quantity gracefully", () => {
    expect(getPricePerKg(flatPricing, 0)).toBe(495);
    expect(getPricePerKg(tierPricing, 0)).toBe(500);
  });
});

describe("calculatePrice", () => {
  it("calculates flat pricing correctly", () => {
    const result = calculatePrice(flatPricing, 5);
    expect(result.subtotal).toBe(2475);
    expect(result.discountAmount).toBe(0);
    expect(result.tierApplied).toBe("base");
  });

  it("calculates tier pricing with discount", () => {
    const result = calculatePrice(tierPricing, 10);
    expect(result.subtotal).toBe(4250);
    expect(result.discountAmount).toBe(750);
    expect(result.tierApplied).toBe("10kg+");
    expect(result.savingsPercent).toBe("15.0");
  });

  it("calculates 5-9kg tier correctly", () => {
    const result = calculatePrice(tierPricing, 7);
    expect(result.subtotal).toBe(3150);
    expect(result.pricePerKg).toBe(450);
    expect(result.tierApplied).toBe("5-9kg");
  });

  it("calculates 2-4kg tier correctly", () => {
    const result = calculatePrice(tierPricing, 3);
    expect(result.subtotal).toBe(1425);
    expect(result.pricePerKg).toBe(475);
    expect(result.tierApplied).toBe("2-4kg");
  });
});

describe("buildPriceTiers", () => {
  it("returns empty array for flat-priced products", () => {
    expect(buildPriceTiers(flatPricing)).toEqual([]);
  });

  it("returns tiers for tier-priced products", () => {
    const tiers = buildPriceTiers(tierPricing);
    expect(tiers).toHaveLength(3);
    expect(tiers[0].tierRange).toBe("2-4kg");
    expect(tiers[0].pricePerKg).toBe(475);
    expect(tiers[1].tierRange).toBe("5-9kg");
    expect(tiers[1].pricePerKg).toBe(450);
    expect(tiers[2].tierRange).toBe("10kg+");
    expect(tiers[2].pricePerKg).toBe(425);
  });
});

describe("calculateBagsFromQuantity", () => {
  it("calculates 0 bags for 0 quantity", () => {
    const bags = calculateBagsFromQuantity(0);
    expect(bags).toEqual({ kg3: 0, kg5: 0, kg10: 0, kg25: 0 });
  });

  it("fills 25kg bags first", () => {
    const bags = calculateBagsFromQuantity(50);
    expect(bags.kg25).toBe(2);
    expect(bags.kg10).toBe(0);
    expect(bags.kg5).toBe(0);
    expect(bags.kg3).toBe(0);
  });

  it("fills 10kg bags after 25kg", () => {
    const bags = calculateBagsFromQuantity(35);
    expect(bags.kg25).toBe(1);
    expect(bags.kg10).toBe(1);
    expect(bags.kg5).toBe(0);
    expect(bags.kg3).toBe(0);
  });

  it("handles mixed bag sizes", () => {
    const bags = calculateBagsFromQuantity(43);
    expect(bags.kg25).toBe(1);
    expect(bags.kg10).toBe(1);
    expect(bags.kg5).toBe(1);
    expect(bags.kg3).toBe(1);
  });

  it("fills remaining with 3kg bags", () => {
    const bags = calculateBagsFromQuantity(3);
    expect(bags.kg3).toBe(1);
    expect(bags.kg25).toBe(0);
    expect(bags.kg10).toBe(0);
    expect(bags.kg5).toBe(0);
  });
});

describe("formatPhoneNumber", () => {
  it("formats 03XXXXXXXXX to +92XXXXXXXXXX", () => {
    expect(formatPhoneNumber("03001234567")).toBe("+923001234567");
  });

  it("formats 92XXXXXXXXXX to +92XXXXXXXXXX", () => {
    expect(formatPhoneNumber("923001234567")).toBe("+923001234567");
  });

  it("formats raw digits with +92 prefix", () => {
    expect(formatPhoneNumber("3001234567")).toBe("+923001234567");
  });

  it("strips non-digit characters", () => {
    expect(formatPhoneNumber("+92 300 1234567")).toBe("+923001234567");
  });
});

describe("validatePhoneNumber", () => {
  it("accepts valid 11-digit Pakistani numbers", () => {
    const result = validatePhoneNumber("03001234567");
    expect(result.valid).toBe(true);
  });

  it("accepts numbers with country code prefix", () => {
    const result = validatePhoneNumber("+923001234567");
    expect(result.valid).toBe(true);
  });
});
