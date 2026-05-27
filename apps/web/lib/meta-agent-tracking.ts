import {
  generateEventId,
  sanitizeCustomerNameForMeta,
} from "@/lib/meta";
import type { AgentLabel } from "@/lib/tracking/order-channel";

const TEST_EVENT_CODE =
  process.env.META_TEST_EVENT_CODE ||
  process.env.NEXT_PUBLIC_META_TEST_EVENT_CODE ||
  "";
const BASE_URL = process.env.NEXT_PUBLIC_PRIMARY_DOMAIN || "https://yousufrice.com";

interface AgentOrderData {
  orderId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  totalAmount: number;
  currency?: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
  deliveryAddress: string;
  userAgent?: string;
  clientIp?: string;
  eventSourceUrl?: string;
  placedByUserId?: string;
  customerUserId?: string;
  agentLabel?: AgentLabel | null;
}

async function sendAgentEvent(payload: Record<string, any>): Promise<{
  success: boolean;
  error?: string;
  eventId?: string;
}> {
  try {
    const response = await fetch(`${BASE_URL}/api/meta-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        test_event_code: TEST_EVENT_CODE || undefined,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("[Meta Agent Tracking] API route error:", result);
      return { success: false, error: result.error || `HTTP ${response.status}` };
    }
    return { success: true, eventId: payload.event_id };
  } catch (error) {
    console.error("[Meta Agent Tracking] Network error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function trackAgentPurchase(orderData: AgentOrderData): Promise<{
  success: boolean;
  error?: string;
  eventId?: string;
}> {
  const eventId = await generateEventId({
    eventName: "Purchase",
    stableKey: orderData.orderId,
  });

  const cleanedName =
    sanitizeCustomerNameForMeta(orderData.customerName) ||
    orderData.customerName;

  return sendAgentEvent({
    event_name: "Purchase",
    event_id: eventId,
    event_source_url:
      orderData.eventSourceUrl || `${BASE_URL}/agent-order`,
    user_data: {
      email: orderData.customerEmail,
      phone: orderData.customerPhone,
      firstName: cleanedName.split(" ")[0],
      lastName: cleanedName.split(" ").slice(1).join(" "),
      externalId: orderData.orderId,
    },
    custom_data: {
      value: orderData.totalAmount,
      currency: orderData.currency || "PKR",
      content_type: "product",
      content_ids: orderData.items.map((i) => i.productId),
      contents: orderData.items.map((i) => ({
        id: i.productId,
        quantity: i.quantity,
        item_price: i.price,
      })),
      num_items: orderData.items.length,
      order_id: orderData.orderId,
      order_channel: "ai_agent",
      agent_label: orderData.agentLabel ?? undefined,
      placed_by_user_id: orderData.placedByUserId,
      customer_user_id: orderData.customerUserId,
    },
  });
}

export async function trackAgentInitiateCheckout(orderData: {
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  totalAmount: number;
  currency?: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
  }>;
  userAgent?: string;
  clientIp?: string;
  eventSourceUrl?: string;
  placedByUserId?: string;
  customerUserId?: string;
  agentLabel?: AgentLabel | null;
  stableKey?: string;
}): Promise<{
  success: boolean;
  error?: string;
  eventId?: string;
}> {
  const eventId = await generateEventId({
    eventName: "InitiateCheckout",
    stableKey: orderData.stableKey,
  });

  const cleanedName =
    sanitizeCustomerNameForMeta(orderData.customerName) ||
    orderData.customerName;

  return sendAgentEvent({
    event_name: "InitiateCheckout",
    event_id: eventId,
    event_source_url:
      orderData.eventSourceUrl || `${BASE_URL}/agent-checkout`,
    user_data: {
      email: orderData.customerEmail,
      phone: orderData.customerPhone,
      firstName: cleanedName.split(" ")[0],
      lastName: cleanedName.split(" ").slice(1).join(" "),
    },
    custom_data: {
      value: orderData.totalAmount,
      currency: orderData.currency || "PKR",
      content_type: "product",
      content_ids: orderData.items.map((i) => i.productId),
      num_items: orderData.items.length,
      order_channel: "ai_agent",
      agent_label: orderData.agentLabel ?? undefined,
      placed_by_user_id: orderData.placedByUserId,
      customer_user_id: orderData.customerUserId,
    },
  });
}
