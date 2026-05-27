import {
  tablesDB,
  DATABASE_ID,
  DISCOUNT_MANAGEMENT_TABLE_ID,
  ID,
  Query,
} from "@/lib/appwrite";
import { Order } from "@/lib/types";

export interface LoyaltyDiscount {
  $id: string;
  type: string;
  customer_id: string;
  customer_name: string;
  card_status: string;
  total_purchases: number;
  total_purchase_amount: number;
  eligible_for_extra_discount: boolean;
  extra_discount_percentage: number;
  rule_name: string;
  discount_percentage: number;
  rule_active: boolean;
  discount_code: string;
  code_status: string;
  order_id: string; // Order that generated this discount
  used_in_order_id: string; // Order where this discount was used
  code_generated_at: string;
  code_used_at: string;
}

export class LoyaltyService {
  /**
   * Check if customer is eligible for loyalty discount based on purchase amount
   * Excludes hotel/restaurant product purchases
   */
  static async checkLoyaltyEligibility(
    customerId: string,
    orderAmount: number,
    hasHotelRestaurantProduct: boolean
  ): Promise<boolean> {
    // Exclude hotel/restaurant purchases from loyalty eligibility
    if (hasHotelRestaurantProduct) {
      return false;
    }

    // Check if order amount meets minimum threshold (5000 rupees)
    if (orderAmount < 5000) {
      return false;
    }

    return true;
  }

  /**
   * Generate a unique discount code for loyalty program
   */
  static generateDiscountCode(): string {
    const prefix = "LOYALTY";
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${random}`;
  }

  /**
   * Create or update loyalty discount record for customer
   */
  static async createLoyaltyDiscount(
    customerId: string,
    customerName: string,
    orderAmount: number,
    hasHotelRestaurantProduct: boolean,
    orderId: string // Order that generated this discount
  ): Promise<LoyaltyDiscount | null> {
    try {
      // Check eligibility
      const isEligible = await this.checkLoyaltyEligibility(
        customerId,
        orderAmount,
        hasHotelRestaurantProduct
      );
      
      if (!isEligible) {
        return null;
      }

      // Generate discount code
      const discountCode = this.generateDiscountCode();

      // Get existing loyalty record for customer
      const existingRecords = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: DISCOUNT_MANAGEMENT_TABLE_ID, queries: [Query.equal("customer_id", customerId)] });

      let loyaltyRecord: LoyaltyDiscount;

      if (existingRecords.rows.length > 0) {
        // Update existing record
        const existingRecord = existingRecords
          .rows[0] as unknown as LoyaltyDiscount;
        const updatedRecord = await tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: DISCOUNT_MANAGEMENT_TABLE_ID, rowId: existingRecord.$id, data: {
                        total_purchases: existingRecord.total_purchases + 1,
                        total_purchase_amount:
                          existingRecord.total_purchase_amount + orderAmount,
                        eligible_for_extra_discount: true,
                        extra_discount_percentage: 3.0, // 3% loyalty discount
                        discount_code: discountCode,
                        code_status: "active",
                        order_id: orderId, // Track which order generated this discount
                        used_in_order_id: "",
                        code_generated_at: new Date().toISOString(),
                        code_used_at: "",
                        rule_active: true,
                      } });
        loyaltyRecord = updatedRecord as unknown as LoyaltyDiscount;
      } else {
        // Create new record
        const newRecord = await tablesDB.createRow({ databaseId: DATABASE_ID, tableId: DISCOUNT_MANAGEMENT_TABLE_ID, rowId: ID.unique(), data: {
                        type: "loyalty",
                        customer_id: customerId,
                        customer_name: customerName,
                        card_status: "active",
                        total_purchases: 1,
                        total_purchase_amount: orderAmount,
                        eligible_for_extra_discount: true,
                        extra_discount_percentage: 3.0,
                        rule_name: "Loyalty Discount Program",
                        discount_percentage: 3.0,
                        rule_active: true,
                        discount_code: discountCode,
                        code_status: "active",
                        order_id: orderId, // Track which order generated this discount
                        used_in_order_id: "",
                        code_generated_at: new Date().toISOString(),
                        code_used_at: "",
                      } });
        loyaltyRecord = newRecord as unknown as LoyaltyDiscount;
      }

      return loyaltyRecord;
    } catch (error) {
      console.error("Error creating loyalty discount:", error);
      throw error;
    }
  }

  /**
   * Validate and use a discount code
   */
  static async validateAndUseDiscountCode(
    discountCode: string,
    orderId: string
  ): Promise<LoyaltyDiscount | null> {
    const isLoyaltyEnabled = process.env.NEXT_PUBLIC_ENABLE_LOYALTY_DISCOUNT === 'true';
    if (!isLoyaltyEnabled) {
      throw new Error("Loyalty discount feature is currently disabled");
    }

    try {
      // Find the discount record
      const records = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: DISCOUNT_MANAGEMENT_TABLE_ID, queries: [Query.equal("discount_code", discountCode)] });

      if (records.rows.length === 0) {
        throw new Error("Invalid discount code");
      }

      const loyaltyRecord = records.rows[0] as unknown as LoyaltyDiscount;

      // Check if code is already used
      if (loyaltyRecord.code_status === "used") {
        throw new Error("Discount code has already been used");
      }

      // Check if code is active
      if (loyaltyRecord.code_status !== "active") {
        throw new Error("Discount code is not active");
      }

      // Mark code as used
      const updatedRecord = await tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: DISCOUNT_MANAGEMENT_TABLE_ID, rowId: loyaltyRecord.$id, data: {
                    code_status: "used",
                    used_in_order_id: orderId,
                    code_used_at: new Date().toISOString(),
                  } });

      return updatedRecord as unknown as LoyaltyDiscount;
    } catch (error) {
      console.error("Error validating discount code:", error);
      throw error;
    }
  }

  /**
   * Get customer's loyalty discount information
   */
  static async getCustomerLoyaltyInfo(
    customerId: string
  ): Promise<LoyaltyDiscount | null> {
    const isLoyaltyEnabled = process.env.NEXT_PUBLIC_ENABLE_LOYALTY_DISCOUNT === 'true';
    if (!isLoyaltyEnabled) {
      return null;
    }

    try {
      const records = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: DISCOUNT_MANAGEMENT_TABLE_ID, queries: [
                    Query.equal("customer_id", customerId),
                    Query.orderDesc("$createdAt"), // Get the latest one
                    Query.limit(1)
                  ] });

      if (records.rows.length === 0) {
        return null;
      }

      return records.rows[0] as unknown as LoyaltyDiscount;
    } catch (error) {
      console.error("Error getting customer loyalty info:", error);
      throw error;
    }
  }

  /**
   * Find loyalty discount by discount code
   */
  static async findLoyaltyDiscountByCode(
    discountCode: string
  ): Promise<LoyaltyDiscount | null> {
    const isLoyaltyEnabled = process.env.NEXT_PUBLIC_ENABLE_LOYALTY_DISCOUNT === 'true';
    if (!isLoyaltyEnabled) {
      return null;
    }

    try {
      const records = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: DISCOUNT_MANAGEMENT_TABLE_ID, queries: [Query.equal("discount_code", discountCode)] });

      if (records.rows.length === 0) {
        return null;
      }

      return records.rows[0] as unknown as LoyaltyDiscount;
    } catch (error) {
      console.error("Error finding loyalty discount by code:", error);
      throw error;
    }
  }

  /**
   * Check if order contains hotel/restaurant products
   */
  static hasHotelRestaurantProduct(productName: string): boolean {
    const hotelRestaurantKeywords = [
      "hotel",
      "restaurant",
      "Hotel & Restaurant Deals",
    ];
    return hotelRestaurantKeywords.some((keyword) =>
      productName.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Process loyalty discount after order completion
   */
  static async processLoyaltyDiscount(
    customerId: string,
    customerName: string,
    orderAmount: number,
    productNames: string[],
    orderId: string // Order that generated this discount
  ): Promise<LoyaltyDiscount | null> {
    try {
      // Check if loyalty discount feature is enabled
      const isLoyaltyEnabled = process.env.NEXT_PUBLIC_ENABLE_LOYALTY_DISCOUNT === 'true';
      if (!isLoyaltyEnabled) {
        console.log("Loyalty discount feature is currently disabled");
        return null;
      }

      // Check if any product is hotel/restaurant product
      const hasHotelRestaurantProduct = productNames.some((name) =>
        this.hasHotelRestaurantProduct(name)
      );

      // Create loyalty discount if eligible
      return await this.createLoyaltyDiscount(
        customerId,
        customerName,
        orderAmount,
        hasHotelRestaurantProduct,
        orderId
      );
    } catch (error) {
      console.error("Error processing loyalty discount:", error);
      throw error;
    }
  }

  /**
   * Delete loyalty discount by order ID (when order is deleted)
   */
  static async deleteLoyaltyDiscountByOrderId(
    orderId: string
  ): Promise<void> {
    try {
      // Find discount records generated by this order
      const records = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: DISCOUNT_MANAGEMENT_TABLE_ID, queries: [Query.equal("order_id", orderId)] });

      // Delete all matching records
      for (const record of records.rows) {
        await tablesDB.deleteRow({ databaseId: DATABASE_ID, tableId: DISCOUNT_MANAGEMENT_TABLE_ID, rowId: record.$id });
        console.log(
          `Deleted loyalty discount ${record.$id} generated by order ${orderId}`
        );
      }
    } catch (error) {
      console.error(
        `Error deleting loyalty discount for order ${orderId}:`,
        error
      );
      throw error;
    }
  }
}
