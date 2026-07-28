import { NextRequest, NextResponse } from "next/server";
import { listProducts, getProductById, createQuote, confirmOrder, trackOrder } from "@/lib/mcp/handler";

const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;
const sseConnections = new Map<string, ReadableStreamDefaultController>();

function authenticate(request: NextRequest): boolean {
  if (!MCP_AUTH_TOKEN) return true;
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return false;
  return auth.slice(7) === MCP_AUTH_TOKEN;
}

function sendSSE(controller: ReadableStreamDefaultController, event: string, data: string) {
  controller.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${data}\n\n`));
}

const mcpTools = [
  {
    name: "list_products",
    description: "List all available products with pricing tiers",
    inputSchema: {
      type: "object",
      properties: {
        inStockOnly: { type: "boolean", description: "Only show available products" },
        forHotelsRestaurants: { type: "boolean", description: "True for hotel/restaurant, false for retail, null for all" },
        limit: { type: "number", description: "Maximum products to return" },
      },
    },
  },
  {
    name: "search_products",
    description: "Search products by name or description",
    inputSchema: {
      type: "object",
      properties: {
        searchQuery: { type: "string", description: "Search keywords" },
        inStockOnly: { type: "boolean" },
        forHotelsRestaurants: { type: "boolean" },
      },
      required: ["searchQuery"],
    },
  },
  {
    name: "get_product_details",
    description: "Get detailed product info including all pricing tiers",
    inputSchema: {
      type: "object",
      properties: { productId: { type: "string" } },
      required: ["productId"],
    },
  },
  {
    name: "quote_order",
    description: "Create a price quote. Always call this before confirm_order.",
    inputSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: { productId: { type: "string" }, quantity: { type: "number", description: "Quantity in kg" } },
            required: ["productId", "quantity"],
          },
        },
      },
      required: ["items"],
    },
  },
  {
    name: "confirm_order",
    description: "Confirm and create an order from a quote. Call quote_order first.",
    inputSchema: {
      type: "object",
      properties: {
        quoteId: { type: "string" },
        customerName: { type: "string" },
        phoneNumber: { type: "string" },
        deliveryAddress: { type: "string" },
        city: { type: "string" },
        customerEmail: { type: "string" },
        latitude: { type: "number" },
        longitude: { type: "number" },
        idempotencyKey: { type: "string" },
      },
      required: ["quoteId", "customerName", "phoneNumber", "deliveryAddress", "city", "idempotencyKey"],
    },
  },
  {
    name: "track_order",
    description: "Track order status by order ID",
    inputSchema: {
      type: "object",
      properties: { orderId: { type: "string" }, phoneNumber: { type: "string", description: "For verification (optional)" } },
      required: ["orderId"],
    },
  },
  {
    name: "request_human_support",
    description: "Escalate to human support when the AI cannot resolve the issue",
    inputSchema: {
      type: "object",
      properties: {
        customerName: { type: "string" },
        phoneNumber: { type: "string" },
        reason: { type: "string" },
        severity: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        conversationSummary: { type: "string" },
        orderId: { type: "string" },
      },
      required: ["customerName", "phoneNumber", "reason", "severity", "conversationSummary"],
    },
  },
];

const mcpResources = [
  { uri: "yousuf-rice://policies/customer-service", name: "Customer Service Guidelines", mimeType: "text/markdown" },
  { uri: "yousuf-rice://policies/delivery", name: "Delivery Policy", mimeType: "application/json" },
  { uri: "yousuf-rice://policies/payment", name: "Payment Policy", mimeType: "application/json" },
  { uri: "yousuf-rice://company/contact-information", name: "Contact Information", mimeType: "application/json" },
];

const mcpPrompts = [
  { name: "yousuf_rice_customer_service", description: "Operational instructions for a Yousuf Rice customer-support and order-taking agent" },
];

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" }, id: null },
      { status: 401 }
    );
  }

  const sessionId = crypto.randomUUID();
  const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  const endpointUrl = `${baseUrl}/api/mcp?sessionId=${sessionId}`;

  const stream = new ReadableStream({
    start(controller) {
      sseConnections.set(sessionId, controller);
      sendSSE(controller, "endpoint", endpointUrl);
      sendSSE(controller, "session", sessionId);

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepAlive);
        }
      }, 15000);

      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        sseConnections.delete(sessionId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-SSE-Session-Id": sessionId,
    },
  });
}

function sendJsonRpcResponse(sessionId: string | null, response: any) {
  if (sessionId && sseConnections.has(sessionId)) {
    const controller = sseConnections.get(sessionId)!;
    try {
      sendSSE(controller, "message", JSON.stringify(response));
    } catch {
      sseConnections.delete(sessionId);
    }
  }
}

async function handleJsonRpc(body: any, sessionId: string | null): Promise<any> {
  const { method, params, id } = body;

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        result: { protocolVersion: "2025-06-18", capabilities: { tools: {}, resources: {}, prompts: {} }, serverInfo: { name: "yousuf-rice-mcp", version: "0.1.0" } },
        id: id || "1",
      };

    case "tools/list":
      return { jsonrpc: "2.0", result: { tools: mcpTools }, id: id || "1" };

    case "tools/call": {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      let result;

      try {
        switch (toolName) {
          case "list_products": {
            const r = await listProducts({ inStockOnly: toolArgs.inStockOnly || false, forHotelsRestaurants: toolArgs.forHotelsRestaurants ?? null, limit: toolArgs.limit || 50 });
            result = { content: [{ type: "text", text: JSON.stringify(r) }] };
            break;
          }
          case "search_products": {
            const r = await listProducts({ searchQuery: toolArgs.searchQuery, inStockOnly: toolArgs.inStockOnly || false, forHotelsRestaurants: toolArgs.forHotelsRestaurants ?? null });
            result = { content: [{ type: "text", text: JSON.stringify(r) }] };
            break;
          }
          case "get_product_details": {
            const r = await getProductById(toolArgs.productId);
            result = { content: [{ type: "text", text: JSON.stringify(r) }] };
            break;
          }
          case "quote_order": {
            const quote = await createQuote(toolArgs.items);
            result = { content: [{ type: "text", text: JSON.stringify({ success: true, quote }) }] };
            break;
          }
          case "confirm_order": {
            const order = await confirmOrder({
              quoteId: toolArgs.quoteId, customerName: toolArgs.customerName, phoneNumber: toolArgs.phoneNumber,
              email: toolArgs.customerEmail || null, deliveryAddress: toolArgs.deliveryAddress, city: toolArgs.city,
              latitude: toolArgs.latitude ?? null, longitude: toolArgs.longitude ?? null, idempotencyKey: toolArgs.idempotencyKey,
            });
            result = { content: [{ type: "text", text: JSON.stringify({ success: true, order }) }] };
            break;
          }
          case "track_order": {
            const order = await trackOrder(toolArgs.orderId, toolArgs.phoneNumber || undefined);
            result = { content: [{ type: "text", text: JSON.stringify({ success: true, order }) }] };
            break;
          }
          case "request_human_support": {
            console.error("[SUPPORT ESCALATION]", JSON.stringify(toolArgs));
            result = { content: [{ type: "text", text: JSON.stringify({ success: true, message: "Your request has been forwarded to our support team. A representative will contact you shortly.", ticketId: `ESC-${Date.now().toString(36).toUpperCase()}` }) }] };
            break;
          }
          default:
            return { jsonrpc: "2.0", error: { code: -32601, message: `Tool not found: ${toolName}` }, id: id || "1" };
        }
        return { jsonrpc: "2.0", result, id: id || "1" };
      } catch (e: any) {
        return { jsonrpc: "2.0", error: { code: -32603, message: e.message || "Internal error" }, id: id || "1" };
      }
    }

    case "resources/list":
      return { jsonrpc: "2.0", result: { resources: mcpResources }, id: id || "1" };

    case "resources/read":
      return { jsonrpc: "2.0", result: { contents: [{ uri: params?.uri, text: "Resource content available", mimeType: "text/plain" }] }, id: id || "1" };

    case "prompts/list":
      return { jsonrpc: "2.0", result: { prompts: mcpPrompts }, id: id || "1" };

    case "prompts/get":
      return { jsonrpc: "2.0", result: { messages: [{ role: "user", content: { type: "text", text: "Customer service instructions placeholder" } }] }, id: id || "1" };

    default:
      return { jsonrpc: "2.0", error: { code: -32601, message: `Method not found: ${method}` }, id: id || "1" };
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!authenticate(request)) {
      const err = { jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" }, id: null };
      return NextResponse.json(err, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    const body = await request.json();
    const response = await handleJsonRpc(body, sessionId);

    if (sessionId && sseConnections.has(sessionId)) {
      sendJsonRpcResponse(sessionId, response);
      return new NextResponse(null, { status: 202 });
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[MCP Error]", error);
    const err = { jsonrpc: "2.0", error: { code: -32603, message: error.message || "Internal error" }, id: null };
    return NextResponse.json(err, { status: 500 });
  }
}
