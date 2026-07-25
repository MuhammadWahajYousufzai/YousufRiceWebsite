import { createInterface } from "readline";
import { products, orders } from "@yousuf-rice/domain";

export function startStdioServer(): void {
  console.error("Yousuf Rice MCP Server (stdio mode)");

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on("line", async (line) => {
    try {
      const request = JSON.parse(line);
      const { method, params, id } = request;

      const response = await handleStdioRequest(method, params, id);
      console.log(JSON.stringify(response));
    } catch (error) {
      console.error("Error processing request:", error);
    }
  });

  process.on("SIGINT", () => {
    console.error("Shutting down stdio server...");
    process.exit(0);
  });
}

async function handleStdioRequest(method: string, params: any, id: string): Promise<any> {
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
          serverInfo: { name: "yousuf-rice-mcp", version: "0.1.0" },
        },
        id: id || "1",
      };

    case "tools/list":
      return {
        jsonrpc: "2.0",
        result: {
          tools: [
            { name: "list_products", description: "List all currently available products with their pricing tiers", inputSchema: { type: "object", properties: { inStockOnly: { type: "boolean" }, forHotelsRestaurants: { type: "boolean" }, limit: { type: "number" } } } },
            { name: "search_products", description: "Search for products by name or description", inputSchema: { type: "object", properties: { searchQuery: { type: "string" }, inStockOnly: { type: "boolean" }, forHotelsRestaurants: { type: "boolean" } }, required: ["searchQuery"] } },
            { name: "get_product_details", description: "Get detailed product information", inputSchema: { type: "object", properties: { productId: { type: "string" } }, required: ["productId"] } },
            { name: "quote_order", description: "Create a price quote for an order", inputSchema: { type: "object", properties: { items: { type: "array", items: { type: "object", properties: { productId: { type: "string" }, quantity: { type: "number" } }, required: ["productId", "quantity"] } } }, required: ["items"] } },
            { name: "confirm_order", description: "Confirm and create an order from a quote", inputSchema: { type: "object", properties: { quoteId: { type: "string" }, customerName: { type: "string" }, phoneNumber: { type: "string" }, deliveryAddress: { type: "string" }, city: { type: "string" }, customerEmail: { type: "string" }, latitude: { type: "number" }, longitude: { type: "number" }, idempotencyKey: { type: "string" } }, required: ["quoteId", "customerName", "phoneNumber", "deliveryAddress", "city", "idempotencyKey"] } },
            { name: "track_order", description: "Track the status of an order by order ID", inputSchema: { type: "object", properties: { orderId: { type: "string" }, phoneNumber: { type: "string" } }, required: ["orderId"] } },
            { name: "request_human_support", description: "Request human support escalation", inputSchema: { type: "object", properties: { customerName: { type: "string" }, phoneNumber: { type: "string" }, reason: { type: "string" }, severity: { type: "string", enum: ["low", "medium", "high", "urgent"] }, conversationSummary: { type: "string" }, orderId: { type: "string" } }, required: ["customerName", "phoneNumber", "reason", "severity", "conversationSummary"] } },
          ],
        },
        id: id || "1",
      };

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

    case "prompts/list":
      return {
        jsonrpc: "2.0",
        result: {
          prompts: [{ name: "yousuf_rice_customer_service", description: "Operational instructions for a Yousuf Rice customer-support and order-taking agent" }],
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
