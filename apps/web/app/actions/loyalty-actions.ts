"use server";

import { LoyaltyService } from "@/lib/services/loyalty-service";

/**
 * Server Action to process loyalty discount securely on the server.
 * This ensures access to APPWRITE_API_KEY environment variable.
 */
export async function processLoyaltyReward(
  customerId: string,
  customerName: string,
  orderAmount: number,
  productNames: string[],
  orderId: string
) {
  try {
    console.log("[Server Action] Processing loyalty reward for:", {
      customerId,
      customerName,
      orderAmount,
      productNames,
      orderId,
    });

    const result = await LoyaltyService.processLoyaltyDiscount(
      customerId,
      customerName,
      orderAmount,
      productNames,
      orderId
    );

    console.log("[Server Action] Result:", result);
    
    // We must return plain objects from Server Actions
    if (!result) return null;

    return {
      discount_code: result.discount_code,
      discount_percentage: result.discount_percentage,
      extra_discount_percentage: result.extra_discount_percentage,
    };
  } catch (error) {
    console.error("[Server Action] Error processing loyalty reward:", error);
    // Return null on error so we don't break the client flow
    return null;
  }
}
