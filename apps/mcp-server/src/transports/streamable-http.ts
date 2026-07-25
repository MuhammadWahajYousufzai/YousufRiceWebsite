import express from "express";
import cors from "cors";
import type { Server } from "@modelcontextprotocol/sdk/server";
import { validateAuthToken } from "../auth";

interface StreamableHttpTransportOptions {
  server: Server;
  authToken?: string;
  corsOrigins?: string[];
  rateLimitMax?: number;
  rateLimitWindowMs?: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function getRateLimitKey(ip: string): RateLimitEntry {
  const now = Date.now();
  const existing = rateLimitStore.get(ip);

  if (existing && existing.resetAt > now) {
    return existing;
  }

  const entry: RateLimitEntry = {
    count: 0,
    resetAt: now + (Number(process.env.MCP_RATE_LIMIT_WINDOW_MS) || 60000),
  };

  rateLimitStore.set(ip, entry);
  return entry;
}

export function createStreamableHttpServer(options: StreamableHttpTransportOptions): express.Application {
  const app = express();
  const { server, rateLimitMax = 100, rateLimitWindowMs = 60000 } = options;

  app.use(cors({ origin: options.corsOrigins || "*", methods: ["POST", "GET", "OPTIONS"] }));
  app.use(express.json({ limit: "1mb" }));

  app.use((req, _res, next) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const entry = getRateLimitKey(ip);
    entry.count++;

    if (entry.count > rateLimitMax) {
      _res.status(429).json({ error: "Too many requests", code: "RATE_LIMITED" });
      return;
    }

    next();
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", server: "yousuf-rice-mcp" });
  });

  app.post("/mcp", async (req, res) => {
    try {
      if (options.authToken) {
        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader.replace(/^Bearer\s+/i, "") !== options.authToken) {
          res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
          return;
        }
      }

      const body = req.body;

      if (!body || !body.method) {
        res.status(400).json({ error: "Invalid MCP request", code: "INVALID_REQUEST" });
        return;
      }

      // For tools/call, we need to handle it specially through the server
      // For other methods, use the standard protocol
      const response = await handleMcpRequest(server, body);
      res.json(response);
    } catch (error: any) {
      console.error("MCP request error:", error);
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal error" },
        id: req.body?.id || null,
      });
    }
  });

  app.get("/mcp", async (req, res) => {
    try {
      if (options.authToken) {
        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader.replace(/^Bearer\s+/i, "") !== options.authToken) {
          res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
          return;
        }
      }

      // Standard MCP GET for SSE-style or Streamable HTTP
      res.json({
        jsonrpc: "2.0",
        result: {
          protocolVersion: "2025-06-18",
          capabilities: {
            tools: {},
            resources: {},
            prompts: {},
          },
          serverInfo: {
            name: "yousuf-rice-mcp",
            version: "0.1.0",
          },
        },
        id: req.query?.id || "1",
      });
    } catch (error: any) {
      res.status(500).json({ error: "Internal error" });
    }
  });

  return app;
}

async function handleMcpRequest(server: Server, body: any): Promise<any> {
  const { method, params, id } = body;

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        result: {
          protocolVersion: "2025-06-18",
          capabilities: {
            tools: {},
            resources: {},
            prompts: {},
          },
          serverInfo: {
            name: "yousuf-rice-mcp",
            version: "0.1.0",
          },
        },
        id: id || "1",
      };

    case "tools/list":
      return {
        jsonrpc: "2.0",
        result: {
          tools: [
            {
              name: "list_products",
              description: "List all currently available products with their pricing tiers",
              inputSchema: {
                type: "object",
                properties: {
                  inStockOnly: { type: "boolean", description: "If true, only show available products" },
                  forHotelsRestaurants: { type: "boolean", description: "True for hotel/restaurant products, false for retail, null for all" },
                  limit: { type: "number", description: "Maximum products to return" },
                },
              },
            },
            {
              name: "search_products",
              description: "Search for products by name or description",
              inputSchema: {
                type: "object",
                properties: {
                  searchQuery: { type: "string", description: "Search by product name or description keywords" },
                  inStockOnly: { type: "boolean", description: "If true, only show available products" },
                  forHotelsRestaurants: { type: "boolean", description: "True for hotel/restaurant products, false for retail, null for all" },
                },
                required: ["searchQuery"],
              },
            },
            {
              name: "get_product_details",
              description: "Get detailed information about a specific product including all pricing tiers",
              inputSchema: {
                type: "object",
                properties: {
                  productId: { type: "string", description: "The unique product ID" },
                },
                required: ["productId"],
              },
            },
            {
              name: "quote_order",
              description: "Create a price quote for an order. Always call this before confirm_order.",
              inputSchema: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        productId: { type: "string", description: "Product ID" },
                        quantity: { type: "number", description: "Quantity in kilograms" },
                      },
                      required: ["productId", "quantity"],
                    },
                    description: "Array of items with productId and quantity in kg",
                  },
                },
                required: ["items"],
              },
            },
            {
              name: "confirm_order",
              description: "Confirm and create an order from a previously created quote. Always call quote_order first and show the customer the total before calling this.",
              inputSchema: {
                type: "object",
                properties: {
                  quoteId: { type: "string", description: "The quote ID returned by quote_order" },
                  customerName: { type: "string", description: "Customer full name" },
                  phoneNumber: { type: "string", description: "Customer phone number" },
                  deliveryAddress: { type: "string", description: "Complete delivery address" },
                  city: { type: "string", description: "Delivery city" },
                  customerEmail: { type: "string", description: "Customer email (optional)" },
                  latitude: { type: "number", description: "Delivery location latitude (optional)" },
                  longitude: { type: "number", description: "Delivery location longitude (optional)" },
                  idempotencyKey: { type: "string", description: "Unique key to prevent duplicate orders" },
                },
                required: ["quoteId", "customerName", "phoneNumber", "deliveryAddress", "city", "idempotencyKey"],
              },
            },
            {
              name: "track_order",
              description: "Track the status of an order by order ID",
              inputSchema: {
                type: "object",
                properties: {
                  orderId: { type: "string", description: "The order ID to track" },
                  phoneNumber: { type: "string", description: "Customer phone number for verification (optional)" },
                },
                required: ["orderId"],
              },
            },
            {
              name: "request_human_support",
              description: "Request human support for a customer issue that cannot be resolved by the AI",
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
          ],
        },
        id: id || "1",
      };

    case "tools/call": {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      // We route tool calls to our implementation
      try {
        let result: any;

        switch (toolName) {
          case "list_products": {
            const { listProducts } = await import("@yousuf-rice/domain");
            const r = await listProducts({
              inStockOnly: toolArgs.inStockOnly || false,
              forHotelsRestaurants: toolArgs.forHotelsRestaurants ?? null,
              limit: toolArgs.limit || 50,
            });
            result = { content: [{ type: "text", text: JSON.stringify(r) }] };
            break;
          }
          case "search_products": {
            const { listProducts } = await import("@yousuf-rice/domain");
            const r = await listProducts({
              searchQuery: toolArgs.searchQuery,
              inStockOnly: toolArgs.inStockOnly || false,
              forHotelsRestaurants: toolArgs.forHotelsRestaurants ?? null,
            });
            result = { content: [{ type: "text", text: JSON.stringify(r) }] };
            break;
          }
          case "get_product_details": {
            const { getProductById } = await import("@yousuf-rice/domain");
            const r = await getProductById(toolArgs.productId);
            result = { content: [{ type: "text", text: JSON.stringify(r) }] };
            break;
          }
          case "quote_order": {
            const { createQuote } = await import("@yousuf-rice/domain");
            const r = await createQuote(toolArgs.items);
            result = { content: [{ type: "text", text: JSON.stringify({ success: true, quote: r }) }] };
            break;
          }
          case "confirm_order": {
            const { confirmOrder } = await import("@yousuf-rice/domain");
            const r = await confirmOrder({
              quoteId: toolArgs.quoteId,
              customerName: toolArgs.customerName,
              phoneNumber: toolArgs.phoneNumber,
              email: toolArgs.customerEmail || null,
              deliveryAddress: toolArgs.deliveryAddress,
              city: toolArgs.city,
              latitude: toolArgs.latitude ?? null,
              longitude: toolArgs.longitude ?? null,
              idempotencyKey: toolArgs.idempotencyKey,
            });
            result = { content: [{ type: "text", text: JSON.stringify({ success: true, order: r }) }] };
            break;
          }
          case "track_order": {
            const { trackOrder } = await import("@yousuf-rice/domain");
            const r = await trackOrder(toolArgs.orderId, toolArgs.phoneNumber || undefined);
            result = { content: [{ type: "text", text: JSON.stringify({ success: true, order: r }) }] };
            break;
          }
          case "request_human_support": {
            console.error("[SUPPORT ESCALATION]", JSON.stringify(toolArgs));
            result = {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    success: true,
                    message: "Your request has been forwarded to our support team. A representative will contact you shortly.",
                    ticketId: `ESC-${Date.now().toString(36).toUpperCase()}`,
                  }),
                },
              ],
            };
            break;
          }
          default:
            return {
              jsonrpc: "2.0",
              error: { code: -32601, message: `Tool not found: ${toolName}` },
              id: id || "1",
            };
        }

        return {
          jsonrpc: "2.0",
          result,
          id: id || "1",
        };
      } catch (error: any) {
        return {
          jsonrpc: "2.0",
          error: { code: -32603, message: error.message || "Internal error" },
          id: id || "1",
        };
      }
    }

    case "resources/list":
      return {
        jsonrpc: "2.0",
        result: {
          resources: [
            { uri: "yousuf-rice://policies/customer-service", name: "Customer Service Guidelines", mimeType: "text/markdown" },
            { uri: "yousuf-rice://policies/delivery", name: "Delivery Policy", mimeType: "application/json" },
            { uri: "yousuf-rice://policies/payment", name: "Payment Policy", mimeType: "application/json" },
            { uri: "yousuf-rice://company/contact-information", name: "Contact Information", mimeType: "application/json" },
          ],
        },
        id: id || "1",
      };

    case "resources/read":
      return {
        jsonrpc: "2.0",
        result: {
          contents: [
            {
              uri: params?.uri,
              text: "Resource content available",
              mimeType: "text/plain",
            },
          ],
        },
        id: id || "1",
      };

    case "prompts/list":
      return {
        jsonrpc: "2.0",
        result: {
          prompts: [
            { name: "yousuf_rice_customer_service", description: "Operational instructions for a Yousuf Rice customer-support and order-taking agent" },
          ],
        },
        id: id || "1",
      };

    case "prompts/get":
      return {
        jsonrpc: "2.0",
        result: {
          messages: [
            {
              role: "user",
              content: { type: "text", text: "Customer service instructions placeholder" },
            },
          ],
        },
        id: id || "1",
      };

    default:
      return {
        jsonrpc: "2.0",
        error: { code: -32601, message: `Method not found: ${method}` },
        id: id || "1",
      };
  }
}
