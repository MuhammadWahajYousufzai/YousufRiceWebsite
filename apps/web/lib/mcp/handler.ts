import { Client, TablesDB, Query, ID } from "node-appwrite";
import {
  calculateDeliveryFee,
  requireDeliveryCity,
} from "@/lib/delivery-policy";
import type { DeliveryCity } from "@/lib/delivery-policy";
import { getEveryGrainShanGiftCount } from "@repo/utils";
import { everyGrainShanOfferEnabled } from "@/lib/feature-flags";

function getTablesDB(): TablesDB {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!endpoint || !projectId || !apiKey) throw new Error("Missing Appwrite configuration");
  return new TablesDB(new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey));
}

function databaseId() {
  return process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
}

function productsTableId() {
  return process.env.NEXT_PUBLIC_APPWRITE_PRODUCTS_TABLE_ID!;
}

function ordersTableId() {
  return process.env.NEXT_PUBLIC_APPWRITE_ORDERS_TABLE_ID!;
}

function orderItemsTableId() {
  return process.env.NEXT_PUBLIC_APPWRITE_ORDER_ITEMS_TABLE_ID!;
}

function customersTableId() {
  return process.env.NEXT_PUBLIC_APPWRITE_CUSTOMERS_TABLE_ID!;
}

function addressesTableId() {
  return process.env.NEXT_PUBLIC_APPWRITE_ADDRESSES_TABLE_ID!;
}

export interface ProductRecord {
  $id: string;
  name: string;
  description?: string;
  base_price_per_kg: number;
  has_tier_pricing: boolean;
  tier_2_4kg_price?: number;
  tier_5_9kg_price?: number;
  tier_10kg_up_price?: number;
  available: boolean;
  primary_image_id?: string;
}

export function getPricePerKg(product: ProductRecord, quantity: number): number {
  if (!product.has_tier_pricing || quantity <= 0) return product.base_price_per_kg;
  if (quantity >= 10 && product.tier_10kg_up_price && product.tier_10kg_up_price > 0) return product.tier_10kg_up_price;
  if (quantity >= 5 && product.tier_5_9kg_price && product.tier_5_9kg_price > 0) return product.tier_5_9kg_price;
  if (quantity >= 2 && product.tier_2_4kg_price && product.tier_2_4kg_price > 0) return product.tier_2_4kg_price;
  return product.base_price_per_kg;
}

export function calculatePrice(product: ProductRecord, quantity: number) {
  const pricePerKg = getPricePerKg(product, quantity);
  const subtotal = pricePerKg * quantity;
  const baseTotal = product.base_price_per_kg * quantity;
  const discountAmount = baseTotal - subtotal;
  let tierApplied = "base";
  if (product.has_tier_pricing) {
    if (quantity >= 10 && product.tier_10kg_up_price && product.tier_10kg_up_price > 0) tierApplied = "10kg+";
    else if (quantity >= 5 && product.tier_5_9kg_price && product.tier_5_9kg_price > 0) tierApplied = "5-9kg";
    else if (quantity >= 2 && product.tier_2_4kg_price && product.tier_2_4kg_price > 0) tierApplied = "2-4kg";
  }
  const savingsPercent = baseTotal > 0 ? ((discountAmount / baseTotal) * 100).toFixed(1) : "0";
  return { pricePerKg, tierApplied, basePricePerKg: product.base_price_per_kg, quantity, subtotal, discountAmount, savingsPercent };
}

function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) {
    return `+92${digits.slice(1)}`;
  }
  if (digits.startsWith("92")) {
    return `+${digits}`;
  }
  return `+92${digits}`;
}

export async function listProducts(opts: { searchQuery?: string; inStockOnly?: boolean; forHotelsRestaurants?: boolean | null; limit?: number }): Promise<ProductRecord[]> {
  const db = getTablesDB();
  const queries: string[] = [];
  if (opts.searchQuery) queries.push(Query.search("name", opts.searchQuery));
  if (opts.inStockOnly) queries.push(Query.equal("available", true));
  queries.push(Query.limit(opts.limit || 50));
  const result = await db.listRows({ databaseId: databaseId(), tableId: productsTableId(), queries });
  let rows = result.rows as unknown as ProductRecord[];
  if (opts.forHotelsRestaurants !== null && opts.forHotelsRestaurants !== undefined) {
    rows = rows.filter((p: any) => p.for_hotels_restaurants === opts.forHotelsRestaurants);
  }
  return rows;
}

export async function getProductById(id: string): Promise<ProductRecord> {
  const db = getTablesDB();
  const row = await db.getRow({ databaseId: databaseId(), tableId: productsTableId(), rowId: id });
  return row as unknown as ProductRecord;
}

const QUOTE_TTL_MS = 30 * 60 * 1000;
const quotes = new Map<string, any>();
const idempotencyMap = new Map<string, string>();

export async function createQuote(items: Array<{ productId: string; quantity: number }>, requestedCity: DeliveryCity) {
  if (!items || items.length === 0) throw new Error("At least one item is required");
  if (items.length > 20) throw new Error("Maximum 20 items allowed");
  const db = getTablesDB();
  const quoteItems: any[] = [];
  let subtotal = 0;
  let totalWeightKg = 0;
  for (const item of items) {
    if (!item.productId) throw new Error("Each item must have a productId");
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error("Quantity must be greater than 0");
    if (item.quantity > 1000) throw new Error("Quantity exceeds maximum limit of 1000kg");
    const product = await db.getRow({ databaseId: databaseId(), tableId: productsTableId(), rowId: item.productId }) as unknown as ProductRecord;
    if (!product.available) throw new Error(`${product.name} is currently unavailable`);
    const calc = calculatePrice(product, item.quantity);
    quoteItems.push({ productId: product.$id, productName: product.name, quantity: item.quantity, pricePerKg: calc.pricePerKg, tierApplied: calc.tierApplied, subtotal: calc.subtotal, discountAmount: calc.discountAmount, savingsPercent: calc.savingsPercent });
    subtotal += calc.subtotal;
    totalWeightKg += item.quantity;
  }
  const city = requireDeliveryCity(requestedCity);
  const deliveryFee = calculateDeliveryFee(city, totalWeightKg);
  const now = Date.now();
  const quote = { id: ID.unique(), city, items: quoteItems, subtotal, deliveryFee, grandTotal: subtotal + deliveryFee, totalWeightKg, createdAt: new Date(now).toISOString(), expiresAt: new Date(now + QUOTE_TTL_MS).toISOString(), status: "active" };
  quotes.set(quote.id, quote);
  return quote;
}

export async function confirmOrder(input: { quoteId: string; customerName: string; phoneNumber: string; email?: string | null; deliveryAddress: string; city: string; idempotencyKey: string }) {
  const db = getTablesDB();
  if (idempotencyMap.has(input.idempotencyKey)) throw new Error(`Order already exists for idempotency key: ${input.idempotencyKey}`);
  const quote = quotes.get(input.quoteId);
  if (!quote) throw new Error(`Quote ${input.quoteId} not found`);
  if (quote.status === "consumed") throw new Error(`Quote ${input.quoteId} has already been used`);
  if (new Date(quote.expiresAt) < new Date()) throw new Error(`Quote ${input.quoteId} has expired`);
  const city = requireDeliveryCity(input.city);
  if (city !== quote.city) {
    throw new Error("The delivery city does not match the accepted quote. Create a new quote for this city.");
  }

  const phone = formatPhoneNumber(input.phoneNumber);
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 11 || phoneDigits.length > 13) throw new Error("Invalid phone number");

  const customerId = ID.unique();
  const customersResult = await db.listRows({ databaseId: databaseId(), tableId: customersTableId(), queries: [Query.equal("phone", phone)] });
  let customer: any;
  if (customersResult.rows.length > 0) {
    customer = customersResult.rows[0];
  } else {
    customer = { $id: customerId, user_id: phone, full_name: input.customerName, phone, email: input.email || "", created_at: new Date().toISOString() };
    await db.createRow({ databaseId: databaseId(), tableId: customersTableId(), rowId: customerId, data: { user_id: phone, full_name: input.customerName, phone, email: input.email || "" } });
    customer.$id = customerId;
  }

  const enrichedItems: any[] = [];
  let totalWeightKg = 0;
  for (const item of quote.items) {
    const product = await db.getRow({ databaseId: databaseId(), tableId: productsTableId(), rowId: item.productId }) as unknown as ProductRecord;
    let remaining = item.quantity;
    const bags25 = Math.floor(remaining / 25); remaining %= 25;
    const bags10 = Math.floor(remaining / 10); remaining %= 10;
    const bags5 = Math.floor(remaining / 5); remaining %= 5;
    const bags3 = Math.floor(remaining / 3);
    enrichedItems.push({ productId: product.$id, productName: product.name, quantity: item.quantity, pricePerKg: item.pricePerKg, basePricePerKg: product.base_price_per_kg, subtotal: item.subtotal, discountAmount: item.discountAmount, bags: { kg3: bags3, kg5: bags5, kg10: bags10, kg25: bags25 } });
    totalWeightKg += item.quantity;
  }

  const orderId = ID.unique();
  const orderItemsCSV = quote.items.map((item: any) => `${item.productId}:${item.quantity}kg`).join(",");
  await db.createRow({ databaseId: databaseId(), tableId: ordersTableId(), rowId: orderId, data: { customer_id: customer.$id, address_id: "", order_items: orderItemsCSV, total_price: quote.grandTotal, status: "pending", total_items_count: quote.items.length, total_weight_kg: totalWeightKg } });

  for (const item of enrichedItems) {
    const discountPct = item.basePricePerKg > 0 ? (item.discountAmount / (item.basePricePerKg * item.quantity)) * 100 : 0;
    const giftCount = everyGrainShanOfferEnabled
      ? getEveryGrainShanGiftCount({ name: item.productName }, item.bags)
      : 0;
    await db.createRow({ databaseId: databaseId(), tableId: orderItemsTableId(), rowId: ID.unique(), data: { order_id: orderId, product_id: item.productId, product_name: item.productName, product_description: "", quantity_kg: item.quantity, bags_3kg: item.bags.kg3, bags_5kg: item.bags.kg5, bags_10kg: item.bags.kg10, bags_25kg: item.bags.kg25, price_per_kg_at_order: item.pricePerKg, base_price_per_kg: item.basePricePerKg, tier_applied: item.pricePerKg < item.basePricePerKg ? "discount" : "base", discount_percentage: discountPct, discount_amount: item.discountAmount, subtotal_before_discount: item.basePricePerKg * item.quantity, total_after_discount: item.subtotal, notes: giftCount > 0 ? `(Every Grain 10kg Shan Gift Qualified: ${giftCount} set${giftCount === 1 ? "" : "s"})` : "" } });
  }

  const addressId = ID.unique();
  // The MCP never requests device location. These neutral Karachi coordinates
  // satisfy the existing required address-table columns for manually entered addresses.
  const lat = 24.8607;
  const lng = 67.0011;
  await db.createRow({ databaseId: databaseId(), tableId: addressesTableId(), rowId: addressId, data: { customer_id: customer.$id, order_id: orderId, address_line: input.deliveryAddress, city, latitude: lat, longitude: lng, maps_url: `https://www.google.com/maps?q=${lat},${lng}` } });
  await db.updateRow({ databaseId: databaseId(), tableId: ordersTableId(), rowId: orderId, data: { address_id: addressId } });

  quote.status = "consumed";
  idempotencyMap.set(input.idempotencyKey, orderId);

  return { orderId, customer, subtotal: quote.subtotal, deliveryFee: quote.deliveryFee, totalAmount: quote.grandTotal, status: "pending", items: enrichedItems.map((i: any) => ({ productId: i.productId, productName: i.productName, quantity: i.quantity, pricePerKg: i.pricePerKg, totalAfterDiscount: i.subtotal })), deliveryAddress: input.deliveryAddress, city };
}

export async function trackOrder(orderId: string, verifiedPhone?: string) {
  if (!orderId || orderId.trim().length === 0) throw new Error("Order ID is required");
  const db = getTablesDB();
  let order: any;
  try { order = await db.getRow({ databaseId: databaseId(), tableId: ordersTableId(), rowId: orderId.trim() }); } catch { throw new Error(`Order ${orderId} not found`); }
  let customerName = "Unknown", phoneNumber = "Unknown";
  try { const c = await db.getRow({ databaseId: databaseId(), tableId: customersTableId(), rowId: order.customer_id }); customerName = c.full_name; phoneNumber = c.phone; } catch {}
  if (verifiedPhone && phoneNumber !== "Unknown" && phoneNumber.replace(/\D/g, "") !== verifiedPhone.replace(/\D/g, "")) throw new Error("Phone number does not match the order");
  let deliveryAddress = "Address not available", city = "";
  if (order.address_id) { try { const a = await db.getRow({ databaseId: databaseId(), tableId: addressesTableId(), rowId: order.address_id }); deliveryAddress = a.address_line; city = a.city || ""; } catch {} }
  const itemsResponse = await db.listRows({ databaseId: databaseId(), tableId: orderItemsTableId(), queries: [Query.equal("order_id", order.$id)] });
  const items = (itemsResponse.rows as any[]).map((item: any) => ({ productName: item.product_name, quantity: item.quantity_kg, price: item.total_after_discount, pricePerKg: item.price_per_kg_at_order }));
  return { orderId: order.$id, status: order.status, totalAmount: order.total_price, customerName, phoneNumber, deliveryAddress, city, items, createdAt: order.$createdAt };
}
