import { LoyaltyService, LoyaltyDiscount } from "./loyalty-service";
import { tablesDB, DATABASE_ID, Query, DISCOUNT_MANAGEMENT_TABLE_ID } from "@/lib/appwrite";

export interface DiscountValidationResult {
  isValid: boolean;
  discountPercentage: number;
  message: string;
  loyaltyDiscount?: LoyaltyDiscount;
}

export class DiscountService {
  /**
   * Validate discount code and apply to order
   */
  static async validateDiscountCode(
    discountCode: string
  ): Promise<DiscountValidationResult> {
    try {
      // Check if it's a loyalty discount code (starts with LOYALTY)
      if (discountCode.toUpperCase().startsWith("LOYALTY")) {
        return await this.validateLoyaltyDiscountCode(discountCode);
      }

      // Add other discount code types here in the future
      return {
        isValid: false,
        discountPercentage: 0,
        message: "Invalid discount code",
      };
    } catch (error) {
      console.error("Error validating discount code:", error);
      return {
        isValid: false,
        discountPercentage: 0,
        message: "Error validating discount code",
      };
    }
  }

  /**
   * Validate loyalty discount code specifically
   */
  private static async validateLoyaltyDiscountCode(
    discountCode: string
  ): Promise<DiscountValidationResult> {
    try {
      // Find the loyalty discount record
      const loyaltyDiscount = await this.findLoyaltyDiscountByCode(
        discountCode
      );

      if (!loyaltyDiscount) {
        return {
          isValid: false,
          discountPercentage: 0,
          message: "Invalid loyalty discount code",
        };
      }

      // Check if code is already used
      if (loyaltyDiscount.code_status === "used") {
        return {
          isValid: false,
          discountPercentage: 0,
          message: "This discount code has already been used",
        };
      }

      // Check if code is active
      if (loyaltyDiscount.code_status !== "active") {
        return {
          isValid: false,
          discountPercentage: 0,
          message: "Discount code is not active",
        };
      }

      // Check if the rule is active
      if (!loyaltyDiscount.rule_active) {
        return {
          isValid: false,
          discountPercentage: 0,
          message: "Discount code is no longer valid",
        };
      }

      // Code is valid
      return {
        isValid: true,
        discountPercentage: loyaltyDiscount.discount_percentage,
        message: `Loyalty discount of ${loyaltyDiscount.discount_percentage}% applied`,
        loyaltyDiscount,
      };
    } catch (error) {
      console.error("Error validating loyalty discount code:", error);
      return {
        isValid: false,
        discountPercentage: 0,
        message: "Error validating loyalty discount code",
      };
    }
  }

  /**
   * Find loyalty discount by code
   */
  private static async findLoyaltyDiscountByCode(
    discountCode: string
  ): Promise<LoyaltyDiscount | null> {
    return await LoyaltyService.findLoyaltyDiscountByCode(discountCode);
  }

  /**
   * Apply discount code to order (mark as used)
   */
  static async applyDiscountCode(
    discountCode: string,
    orderId: string
  ): Promise<DiscountValidationResult> {
    try {
      // First validate the code
      const validationResult = await this.validateDiscountCode(discountCode);

      if (!validationResult.isValid) {
        return validationResult;
      }

      // If it's a loyalty discount, mark it as used
      if (validationResult.loyaltyDiscount) {
        await LoyaltyService.validateAndUseDiscountCode(discountCode, orderId);
      }

      return {
        ...validationResult,
        message: `Discount code applied successfully! You saved ${validationResult.discountPercentage}%`,
      };
    } catch (error) {
      console.error("Error applying discount code:", error);
      return {
        isValid: false,
        discountPercentage: 0,
        message: "Error applying discount code",
      };
    }
  }

  /**
   * Check if customer has any active loyalty discount codes
   */
  static async getCustomerActiveDiscountCodes(
    customerId: string
  ): Promise<LoyaltyDiscount[]> {
    try {
      const records = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: DISCOUNT_MANAGEMENT_TABLE_ID, queries: [
                    Query.equal("customer_id", customerId),
                    Query.equal("code_status", "active"),
                    Query.orderDesc("$createdAt")
                  ] });

      if (records.rows.length === 0) {
        return [];
      }

      return records.rows.map(doc => doc as unknown as LoyaltyDiscount);
    } catch (error) {
      console.error("Error getting customer discount codes:", error);
      return [];
    }
  }
}
