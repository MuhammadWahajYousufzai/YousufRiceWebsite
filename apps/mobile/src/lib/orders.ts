import type { CartItem } from "@repo/types";
import {
  calculateItemTotal,
  calculateTierPricing,
  formatOrderItems,
  formatPhoneNumber,
  generateMapsUrl,
} from "@repo/utils";
import { Platform } from "react-native";
import {
  ADDRESSES_TABLE_ID,
  CUSTOMERS_TABLE_ID,
  DATABASE_ID,
  ID,
  ORDER_ITEMS_TABLE_ID,
  ORDERS_TABLE_ID,
  Query,
  tablesDB,
} from "@/lib/appwrite";

export interface CheckoutFormData {
  addressLine: string;
  city: string;
  email?: string;
  fullName: string;
  latitude: number;
  longitude: number;
  notes?: string;
  phone: string;
}

export interface PlaceOrderResult {
  customerId: string;
  orderId: string;
  totalPrice: number;
}

interface RowList<T> {
  rows?: T[];
  documents?: T[];
}

interface ExistingCustomer {
  $id: string;
  email?: string | null;
  user_id?: string | null;
}

function rowsFromResponse<T>(response: RowList<T>): T[] {
  return response.rows ?? response.documents ?? [];
}

function assertOrderConfig() {
  const missing = [
    ["EXPO_PUBLIC_APPWRITE_DATABASE_ID", DATABASE_ID],
    ["EXPO_PUBLIC_APPWRITE_CUSTOMERS_TABLE_ID", CUSTOMERS_TABLE_ID],
    ["EXPO_PUBLIC_APPWRITE_ORDERS_TABLE_ID", ORDERS_TABLE_ID],
    ["EXPO_PUBLIC_APPWRITE_ORDER_ITEMS_TABLE_ID", ORDER_ITEMS_TABLE_ID],
    ["EXPO_PUBLIC_APPWRITE_ADDRESSES_TABLE_ID", ADDRESSES_TABLE_ID],
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new Error(`Missing mobile order env: ${missing.map(([key]) => key).join(", ")}`);
  }
}

export async function placeCodOrder(
  formData: CheckoutFormData,
  items: CartItem[],
): Promise<PlaceOrderResult> {
  assertOrderConfig();

  if (items.length === 0) {
    throw new Error("Your cart is empty.");
  }

  const fullName = formData.fullName.trim();
  const phone = formData.phone.trim();
  const addressLine = formData.addressLine.trim();
  const city = formData.city.trim();
  const email = formData.email?.trim().toLowerCase() || "";
  const notes = formData.notes?.trim() || "";

  if (!fullName || !phone || !addressLine || !city) {
    throw new Error("Please fill in name, phone, city, and address.");
  }

  const zeroPriceProducts = items.filter((item) => item.product.base_price_per_kg <= 0);
  if (zeroPriceProducts.length > 0) {
    throw new Error(
      `Cannot place order: invalid pricing for ${zeroPriceProducts
        .map((item) => item.product.name)
        .join(", ")}.`,
    );
  }

  const formattedPhone = formatPhoneNumber(phone);
  const existingCustomers = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: CUSTOMERS_TABLE_ID,
    queries: [Query.equal("phone", formattedPhone), Query.limit(1)],
  });

  const existingCustomer = rowsFromResponse<ExistingCustomer>(
    existingCustomers as unknown as RowList<ExistingCustomer>,
  )[0];

  let customerId: string;

  if (existingCustomer?.$id) {
    customerId = existingCustomer.$id;
    await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: CUSTOMERS_TABLE_ID,
      rowId: customerId,
      data: {
        email: email || existingCustomer.email || null,
        full_name: fullName,
        phone: formattedPhone,
        user_id:
          existingCustomer.user_id && existingCustomer.user_id !== "guest"
            ? existingCustomer.user_id
            : "guest",
      },
    });
  } else {
    customerId = ID.unique();
    await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: CUSTOMERS_TABLE_ID,
      rowId: customerId,
      data: {
        email: email || null,
        full_name: fullName,
        phone: formattedPhone,
        user_id: "guest",
      },
    });
  }

  const orderId = ID.unique();
  const addressId = ID.unique();
  const createdItemIds: string[] = [];

  let totalItemsCount = 0;
  let totalWeightKg = 0;
  let subtotalBeforeDiscount = 0;
  let totalDiscountAmount = 0;
  let finalTotalPrice = 0;

  const processedItems = items.map((item) => {
    const tierPricing = calculateTierPricing(item.product, item.quantity);
    const itemCalculation = calculateItemTotal(tierPricing.pricePerKg, item.quantity);
    const tierDiscountAmount = item.isColdDrinkBundle ? 0 : tierPricing.discountAmount;
    const totalItemDiscount = Math.round(tierDiscountAmount + itemCalculation.discountAmount);
    const itemSubtotal = Math.round(item.product.base_price_per_kg * item.quantity);
    const itemTotal = Math.round(itemCalculation.total);

    totalItemsCount += 1;
    totalWeightKg += item.quantity;
    subtotalBeforeDiscount += itemSubtotal;
    totalDiscountAmount += totalItemDiscount;
    finalTotalPrice += itemTotal;

    return {
      item,
      itemSubtotal,
      itemTotal,
      tierPricing,
      totalItemDiscount,
    };
  });

  if (finalTotalPrice <= 0) {
    throw new Error("Cannot place an order with a zero total.");
  }

  try {
    for (const processed of processedItems) {
      const { item, itemSubtotal, itemTotal, tierPricing, totalItemDiscount } = processed;
      const itemId = ID.unique();

      await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: ORDER_ITEMS_TABLE_ID,
        rowId: itemId,
        data: {
          base_price_per_kg: item.product.base_price_per_kg,
          bags_10kg: item.bags.kg10 || 0,
          bags_25kg: item.bags.kg25 || 0,
          bags_3kg: item.bags.kg3 || 0,
          bags_5kg: item.bags.kg5 || 0,
          discount_amount: totalItemDiscount,
          discount_percentage:
            item.product.base_price_per_kg * item.quantity > 0
              ? (totalItemDiscount / (item.product.base_price_per_kg * item.quantity)) * 100
              : 0,
          notes:
            notes +
            (item.isColdDrinkBundle && item.quantity >= 10
              ? "\n(Free Cold Drink Deal Qualified)"
              : ""),
          order_id: orderId,
          price_per_kg_at_order: tierPricing.pricePerKg,
          product_description: item.product.description || "",
          product_id: item.product.$id,
          product_name: item.product.name,
          quantity_kg: item.quantity,
          subtotal_before_discount: itemSubtotal,
          tier_applied: tierPricing.tierApplied,
          total_after_discount: itemTotal,
        },
      });

      createdItemIds.push(itemId);
    }

    await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: ADDRESSES_TABLE_ID,
      rowId: addressId,
      data: {
        address_line: addressLine,
        city,
        customer_id: customerId,
        latitude: formData.latitude || 0,
        longitude: formData.longitude || 0,
        maps_url: generateMapsUrl(
          formData.latitude || 0,
          formData.longitude || 0,
          Platform.OS === "ios" ? "ios" : "android",
        ),
        order_id: orderId,
      },
    });

    await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: ORDERS_TABLE_ID,
      rowId: orderId,
      data: {
        address_id: addressId,
        customer_id: customerId,
        order_items: formatOrderItems(
          items.map((item) => ({
            productId: item.product.$id,
            quantity: item.quantity,
          })),
        ),
        status: "pending",
        subtotal_before_discount: subtotalBeforeDiscount,
        total_discount_amount: totalDiscountAmount,
        total_items_count: totalItemsCount,
        total_price: finalTotalPrice,
        total_weight_kg: totalWeightKg,
      },
    });
  } catch (error) {
    await Promise.allSettled(
      createdItemIds.map((rowId) =>
        tablesDB.deleteRow({
          databaseId: DATABASE_ID,
          tableId: ORDER_ITEMS_TABLE_ID,
          rowId,
        }),
      ),
    );

    await tablesDB
      .deleteRow({
        databaseId: DATABASE_ID,
        tableId: ADDRESSES_TABLE_ID,
        rowId: addressId,
      })
      .catch(() => undefined);

    throw error;
  }

  return {
    customerId,
    orderId,
    totalPrice: finalTotalPrice,
  };
}
