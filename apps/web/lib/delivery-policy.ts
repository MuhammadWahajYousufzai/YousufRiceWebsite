export const DELIVERY_CITIES = ["Karachi", "Bahria Town Karachi"] as const;

export const KARACHI_DELIVERY_FEE = 200;
export const BAHRIA_TOWN_DELIVERY_FEE_PER_STARTED_10_KG = 500;

export type DeliveryCity = (typeof DELIVERY_CITIES)[number];

export function isDeliveryCity(city: string): city is DeliveryCity {
  return DELIVERY_CITIES.includes(city as DeliveryCity);
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

  if (city === "Karachi") return KARACHI_DELIVERY_FEE;

  if (city !== "Bahria Town Karachi") return 0;

  // Bahria Town Karachi: Rs. 500 for up to 10 kg, then another
  // Rs. 500 for each additional started 10 kg (Rs. 1,000 up to 20 kg).
  return (
    Math.ceil(totalWeightKg / 10) *
    BAHRIA_TOWN_DELIVERY_FEE_PER_STARTED_10_KG
  );
}
