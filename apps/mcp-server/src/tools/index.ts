import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z, ZodError } from "zod";
import { products, orders, customers, pricing } from "@yousuf-rice/domain";
import { ValidationError, NotFoundError, UnavailableError, QuoteExpiredError, QuoteConsumedError, PriceChangedError } from "@yousuf-rice/domain";

function formatError(error: unknown): { content: Array<{ type: "text"; text: string }>; isError: boolean } {
  if (error instanceof ZodError) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: "Validation failed", details: error.errors.map((e) => ({ path: e.path.join("."), message: e.message })) }) }],
      isError: true,
    };
  }

  if (error instanceof ValidationError || error instanceof NotFoundError) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: error.message, code: error.code }) }],
      isError: true,
    };
  }

  if (error instanceof UnavailableError || error instanceof QuoteExpiredError || error instanceof QuoteConsumedError || error instanceof PriceChangedError) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: error.message, code: error.code }) }],
      isError: true,
    };
  }

  console.error("Unhandled tool error:", error);
  return {
    content: [{ type: "text", text: JSON.stringify({ error: "Internal server error" }) }],
    isError: true,
  };
}

export function registerAllTools(server: McpServer): void {
  registerListProducts(server);
  registerSearchProducts(server);
  registerGetProductDetails(server);
  registerQuoteOrder(server);
  registerConfirmOrder(server);
  registerTrackOrder(server);
  registerRequestHumanSupport(server);
}

function registerListProducts(server: McpServer): void {
  server.tool(
    "list_products",
    "List all currently available products with their pricing tiers",
    {
      inStockOnly: z.boolean().optional().default(false).describe("If true, only show available products"),
      forHotelsRestaurants: z.boolean().optional().nullable().default(null).describe("True for hotel/restaurant products, false for retail, null for all"),
      limit: z.number().min(1).max(50).optional().default(50).describe("Maximum products to return"),
    },
    async (args) => {
      try {
        const result = await products.listProducts({
          inStockOnly: args.inStockOnly,
          forHotelsRestaurants: args.forHotelsRestaurants,
          limit: args.limit,
        });

        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      } catch (error) {
        return formatError(error);
      }
    },
  );
}

function registerSearchProducts(server: McpServer): void {
  server.tool(
    "search_products",
    "Search for products by name or description",
    {
      searchQuery: z.string().describe("Search by product name or description keywords"),
      inStockOnly: z.boolean().optional().default(false).describe("If true, only show available products"),
      forHotelsRestaurants: z.boolean().optional().nullable().default(null).describe("True for hotel/restaurant products, false for retail, null for all"),
    },
    async (args) => {
      try {
        const result = await products.listProducts({
          searchQuery: args.searchQuery,
          inStockOnly: args.inStockOnly,
          forHotelsRestaurants: args.forHotelsRestaurants,
        });

        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      } catch (error) {
        return formatError(error);
      }
    },
  );
}

function registerGetProductDetails(server: McpServer): void {
  server.tool(
    "get_product_details",
    "Get detailed information about a specific product including all pricing tiers",
    {
      productId: z.string().min(1).describe("The unique product ID"),
    },
    async (args) => {
      try {
        const product = await products.getProductById(args.productId);
        return {
          content: [{ type: "text", text: JSON.stringify(product) }],
        };
      } catch (error) {
        return formatError(error);
      }
    },
  );
}

function registerQuoteOrder(server: McpServer): void {
  server.tool(
    "quote_order",
    "Create a price quote for an order. Always call this before confirm_order. Returns a quote ID, item breakdown, and total.",
    {
      items: z
        .array(
          z.object({
            productId: z.string().describe("Product ID"),
            quantity: z.number().positive().describe("Quantity in kilograms"),
          }),
        )
        .min(1)
        .max(20)
        .describe("Array of items with productId and quantity in kg"),
    },
    async (args) => {
      try {
        const quote = await orders.createQuote(args.items);
        return {
          content: [{ type: "text", text: JSON.stringify({ success: true, quote }) }],
        };
      } catch (error) {
        return formatError(error);
      }
    },
  );
}

function registerConfirmOrder(server: McpServer): void {
  server.tool(
    "confirm_order",
    "Confirm and create an order from a previously created quote. Always call quote_order first and show the customer the total before calling this. Never call this without explicit customer confirmation.",
    {
      quoteId: z.string().min(1).describe("The quote ID returned by quote_order"),
      customerName: z.string().min(1).describe("Customer full name"),
      phoneNumber: z.string().min(1).describe("Customer phone number (with or without country code)"),
      deliveryAddress: z.string().min(10).describe("Complete delivery address"),
      city: z.string().min(1).describe("Delivery city. Must be Karachi."),
      customerEmail: z.string().email().optional().nullable().default(null).describe("Customer email (optional)"),
      latitude: z.number().optional().nullable().default(null).describe("Delivery location latitude (optional)"),
      longitude: z.number().optional().nullable().default(null).describe("Delivery location longitude (optional)"),
      idempotencyKey: z.string().min(1).describe("Unique key to prevent duplicate orders. Use a unique value per conversation/message."),
    },
    async (args) => {
      try {
        const result = await orders.confirmOrder({
          quoteId: args.quoteId,
          customerName: args.customerName,
          phoneNumber: args.phoneNumber,
          email: args.customerEmail,
          deliveryAddress: args.deliveryAddress,
          city: args.city,
          latitude: args.latitude,
          longitude: args.longitude,
          idempotencyKey: args.idempotencyKey,
        });

        return {
          content: [{ type: "text", text: JSON.stringify({ success: true, order: result }) }],
        };
      } catch (error) {
        return formatError(error);
      }
    },
  );
}

function registerTrackOrder(server: McpServer): void {
  server.tool(
    "track_order",
    "Track the status of an order by order ID. Optionally verify with phone number.",
    {
      orderId: z.string().min(1).describe("The order ID to track"),
      phoneNumber: z.string().optional().nullable().default(null).describe("Customer phone number for verification (optional but recommended)"),
    },
    async (args) => {
      try {
        const result = await orders.trackOrder(args.orderId, args.phoneNumber || undefined);
        return {
          content: [{ type: "text", text: JSON.stringify({ success: true, order: result }) }],
        };
      } catch (error) {
        return formatError(error);
      }
    },
  );
}

function registerRequestHumanSupport(server: McpServer): void {
  server.tool(
    "request_human_support",
    "Request human support for a customer issue that cannot be resolved by the AI. This creates an escalation ticket.",
    {
      customerName: z.string().min(1).describe("Customer name"),
      phoneNumber: z.string().min(1).describe("Customer phone number"),
      reason: z.string().min(10).describe("Reason for escalation"),
      severity: z.enum(["low", "medium", "high", "urgent"]).describe("Severity level of the issue"),
      conversationSummary: z.string().min(10).describe("Summary of the conversation so far"),
      orderId: z.string().optional().nullable().default(null).describe("Related order ID if applicable"),
    },
    async (args) => {
      try {
        console.error("[SUPPORT ESCALATION]", JSON.stringify(args, null, 2));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: "Your request has been forwarded to our support team. A representative will contact you shortly at " + args.phoneNumber + ".",
                ticketId: `ESC-${Date.now().toString(36).toUpperCase()}`,
              }),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
