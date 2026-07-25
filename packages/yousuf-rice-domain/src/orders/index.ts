import { Query, ID } from "node-appwrite";
import { getTablesDB, getConfig } from "../appwrite/client";
import { ValidationError, NotFoundError, QuoteExpiredError, QuoteConsumedError, PriceChangedError, DuplicateOrderError, UnavailableError } from "../errors";
import { getProductRecord, ProductRecord } from "../products";
import { calculatePrice, calculateBagsFromQuantity, ProductPricing } from "../pricing";
import { findOrCreateCustomer, CustomerResult } from "../customers";
import { createAddress } from "../addresses";

export interface QuoteItem {
  productId: string;
  productName: string;
  quantity: number;
  pricePerKg: number;
  tierApplied: string;
  subtotal: number;
  discountAmount: number;
  savingsPercent: string;
}

export interface Quote {
  id: string;
  items: QuoteItem[];
  subtotal: number;
  deliveryFee: number;
  grandTotal: number;
  createdAt: string;
  expiresAt: string;
  status: "active" | "consumed" | "expired";
}

export interface OrderConfirmationInput {
  quoteId: string;
  customerName: string;
  phoneNumber: string;
  email?: string | null;
  deliveryAddress: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  idempotencyKey: string;
  userId?: string | null;
}

export interface OrderResult {
  orderId: string;
  customer: CustomerResult;
  totalAmount: number;
  status: string;
  items: Array<{ productId: string; productName: string; quantity: number; pricePerKg: number; totalAfterDiscount: number }>;
  deliveryAddress: string;
  city: string;
}

const QUOTE_TTL_MS = 30 * 60 * 1000;
const DELIVERY_FEE = 0;

const quotes = new Map<string, Quote & { idempotencyKey?: string }>();
const idempotencyMap = new Map<string, string>();

function mapProductToPricing(product: ProductRecord): ProductPricing {
  return {
    basePricePerKg: product.base_price_per_kg,
    hasTierPricing: product.has_tier_pricing,
    tier_2_4kg_price: product.tier_2_4kg_price || null,
    tier_5_9kg_price: product.tier_5_9kg_price || null,
    tier_10kg_up_price: product.tier_10kg_up_price || null,
  };
}

function validateQuantity(quantity: number): void {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new ValidationError("Quantity must be greater than 0");
  }
  if (quantity > 1000) {
    throw new ValidationError("Quantity exceeds maximum limit of 1000kg. Please contact us for bulk orders.");
  }
}

function validateItems(items: Array<{ productId: string; quantity: number }>): void {
  if (!items || items.length === 0) {
    throw new ValidationError("At least one item is required");
  }
  if (items.length > 20) {
    throw new ValidationError("Maximum 20 items allowed per order");
  }
  for (const item of items) {
    if (!item.productId) throw new ValidationError("Each item must have a productId");
    validateQuantity(item.quantity);
  }
}

export async function createQuote(items: Array<{ productId: string; quantity: number }>): Promise<Quote> {
  validateItems(items);

  const quoteItems: QuoteItem[] = [];
  let subtotal = 0;

  for (const item of items) {
    const product = await getProductRecord(item.productId);

    if (!product.available) {
      throw new UnavailableError(product.name);
    }

    const pricing = mapProductToPricing(product);
    const calc = calculatePrice(pricing, item.quantity);

    quoteItems.push({
      productId: product.$id,
      productName: product.name,
      quantity: item.quantity,
      pricePerKg: calc.pricePerKg,
      tierApplied: calc.tierApplied,
      subtotal: calc.subtotal,
      discountAmount: calc.discountAmount,
      savingsPercent: calc.savingsPercent,
    });

    subtotal += calc.subtotal;
  }

  const grandTotal = subtotal + DELIVERY_FEE;
  const now = Date.now();

  const quote: Quote = {
    id: ID.unique(),
    items: quoteItems,
    subtotal,
    deliveryFee: DELIVERY_FEE,
    grandTotal,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + QUOTE_TTL_MS).toISOString(),
    status: "active",
  };

  quotes.set(quote.id, quote);
  return quote;
}

export async function getQuote(quoteId: string): Promise<Quote> {
  const quote = quotes.get(quoteId);
  if (!quote) {
    throw new NotFoundError("Quote", quoteId);
  }

  if (quote.status === "consumed") {
    throw new QuoteConsumedError(quoteId);
  }

  if (new Date(quote.expiresAt) < new Date()) {
    quote.status = "expired";
    throw new QuoteExpiredError(quoteId);
  }

  return quote;
}

export async function confirmOrder(input: OrderConfirmationInput): Promise<OrderResult> {
  const db = getTablesDB();
  const config = getConfig();

  if (idempotencyMap.has(input.idempotencyKey)) {
    const existingOrderId = idempotencyMap.get(input.idempotencyKey)!;
    throw new DuplicateOrderError(input.idempotencyKey);
  }

  const quote = await getQuote(input.quoteId);

  const customerResult = await findOrCreateCustomer({
    name: input.customerName,
    phoneNumber: input.phoneNumber,
    email: input.email,
    userId: input.userId,
  });

  const enrichedItems: Array<{
    productId: string;
    productName: string;
    quantity: number;
    pricePerKg: number;
    tierApplied: string;
    basePricePerKg: number;
    subtotal: number;
    discountAmount: number;
    bags: { kg3: number; kg5: number; kg10: number; kg25: number };
  }> = [];

  let totalItemsCount = 0;
  let totalWeightKg = 0;
  let subtotalBeforeDiscount = 0;
  let totalDiscountAmount = 0;

  for (const item of quote.items) {
    const product = await getProductRecord(item.productId);

    if (!product.available) {
      throw new UnavailableError(product.name);
    }

    const pricing = mapProductToPricing(product);
    const calc = calculatePrice(pricing, item.quantity);
    const bags = calculateBagsFromQuantity(item.quantity);
    const itemBaseSubtotal = product.base_price_per_kg * item.quantity;

    enrichedItems.push({
      productId: product.$id,
      productName: product.name,
      quantity: item.quantity,
      pricePerKg: calc.pricePerKg,
      tierApplied: calc.tierApplied,
      basePricePerKg: product.base_price_per_kg,
      subtotal: calc.subtotal,
      discountAmount: calc.discountAmount,
      bags,
    });

    totalItemsCount += 1;
    totalWeightKg += item.quantity;
    subtotalBeforeDiscount += itemBaseSubtotal;
    totalDiscountAmount += calc.discountAmount;
  }

  const finalTotalPrice = subtotalBeforeDiscount - totalDiscountAmount;

  if (finalTotalPrice !== quote.grandTotal) {
    const newQuote = await createQuote(
      quote.items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
    );
    throw new PriceChangedError(input.quoteId, quote.grandTotal, newQuote.grandTotal);
  }

  const orderId = ID.unique();

  try {
    const orderItemsCSV = quote.items
      .map((item) => `${item.productId}:${item.quantity}kg`)
      .join(",");

    await db.createRow({
      databaseId: config.databaseId,
      tableId: config.ordersTableId,
      rowId: orderId,
      data: {
        customer_id: customerResult.customer.id,
        address_id: "",
        order_items: orderItemsCSV,
        total_price: finalTotalPrice,
        status: "pending",
        total_items_count: totalItemsCount,
        total_weight_kg: totalWeightKg,
        subtotal_before_discount: subtotalBeforeDiscount,
        total_discount_amount: totalDiscountAmount,
      },
    });

    for (const item of enrichedItems) {
      const itemTotalAfterDiscount = item.subtotal;

      await db.createRow({
        databaseId: config.databaseId,
        tableId: config.orderItemsTableId,
        rowId: ID.unique(),
        data: {
          order_id: orderId,
          product_id: item.productId,
          product_name: item.productName,
          product_description: "",
          quantity_kg: item.quantity,
          bags_3kg: item.bags.kg3,
          bags_5kg: item.bags.kg5,
          bags_10kg: item.bags.kg10,
          bags_25kg: item.bags.kg25,
          price_per_kg_at_order: item.pricePerKg,
          base_price_per_kg: item.basePricePerKg,
          tier_applied: item.tierApplied,
          discount_percentage:
            item.basePricePerKg > 0
              ? (item.discountAmount / (item.basePricePerKg * item.quantity)) * 100
              : 0,
          discount_amount: item.discountAmount,
          subtotal_before_discount: item.basePricePerKg * item.quantity,
          total_after_discount: itemTotalAfterDiscount,
          notes: "",
        },
      });
    }

    const address = await createAddress({
      customerId: customerResult.customer.id,
      orderId,
      addressLine: input.deliveryAddress,
      city: input.city,
      latitude: input.latitude,
      longitude: input.longitude,
    });

    await db.updateRow({
      databaseId: config.databaseId,
      tableId: config.ordersTableId,
      rowId: orderId,
      data: { address_id: address.$id },
    });

    quote.status = "consumed";
    idempotencyMap.set(input.idempotencyKey, orderId);

    return {
      orderId,
      customer: customerResult.customer,
      totalAmount: finalTotalPrice,
      status: "pending",
      items: enrichedItems.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        pricePerKg: i.pricePerKg,
        totalAfterDiscount: i.subtotal,
      })),
      deliveryAddress: input.deliveryAddress,
      city: input.city,
    };
  } catch (error) {
    throw error;
  }
}

export interface OrderTrackingResult {
  orderId: string;
  status: string;
  totalAmount: number;
  customerName: string;
  phoneNumber: string;
  deliveryAddress: string;
  city: string;
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
    pricePerKg: number;
  }>;
  createdAt: string;
}

export async function trackOrder(orderId: string, verifiedPhone?: string): Promise<OrderTrackingResult> {
  const db = getTablesDB();
  const config = getConfig();

  if (!orderId || orderId.trim().length === 0) {
    throw new ValidationError("Order ID is required");
  }

  let order: any;
  try {
    order = await db.getRow({
      databaseId: config.databaseId,
      tableId: config.ordersTableId,
      rowId: orderId.trim(),
    });
  } catch {
    throw new NotFoundError("Order", orderId);
  }

  let customerName = "Unknown";
  let phoneNumber = "Unknown";
  try {
    const customer = await db.getRow({
      databaseId: config.databaseId,
      tableId: config.customersTableId,
      rowId: order.customer_id,
    });
    customerName = customer.full_name;
    phoneNumber = customer.phone;
  } catch {
    // Customer not found
  }

  if (verifiedPhone && phoneNumber !== "Unknown") {
    const normalizedVerified = phoneNumber.replace(/\D/g, "");
    const normalizedOrder = phoneNumber.replace(/\D/g, "");
    if (normalizedVerified !== normalizedOrder) {
      throw new ValidationError("Phone number does not match the order");
    }
  }

  let deliveryAddress = "Address not available";
  let city = "";
  if (order.address_id) {
    try {
      const address = await db.getRow({
        databaseId: config.databaseId,
        tableId: config.addressesTableId,
        rowId: order.address_id,
      });
      deliveryAddress = address.address_line;
      city = address.city || "";
    } catch {
      // Address not found
    }
  }

  const itemsResponse = await db.listRows({
    databaseId: config.databaseId,
    tableId: config.orderItemsTableId,
    queries: [Query.equal("order_id", order.$id)],
  });

  const items = (itemsResponse.rows as any[]).map((item: any) => ({
    productName: item.product_name,
    quantity: item.quantity_kg,
    price: item.total_after_discount,
    pricePerKg: item.price_per_kg_at_order,
  }));

  return {
    orderId: order.$id,
    status: order.status,
    totalAmount: order.total_price,
    customerName,
    phoneNumber,
    deliveryAddress,
    city,
    items,
    createdAt: order.$createdAt,
  };
}

export async function setDeliveryFee(fee: number): Promise<void> {
  (globalThis as any).__yousuf_rice_delivery_fee = fee;
}
