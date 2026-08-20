import { timingSafeEqual } from "node:crypto";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  confirmOrder,
  createQuote,
  getProductById,
  listProducts,
  trackOrder,
} from "@/lib/mcp/handler";
import { DELIVERY_CITIES } from "@/lib/delivery-policy";

const SERVER_INFO = { name: "yousuf-rice-mcp", version: "1.0.0" };

const customerServiceInstructions = `# Yousuf Rice Customer Service Guidelines

- Match the customer's language and remain warm, respectful, concise, and professional.
- Always use list_products or search_products before making product claims.
- Never invent product, price, stock, or order information.
- Always call quote_order before confirm_order and show the complete quote first.
- Never call confirm_order until the customer explicitly agrees.
- Delivery is available only in Karachi and Bahria Town Karachi (the Bahria Town near Karachi, not Lahore or Islamabad).
- Ask for the city before quoting. For delivery details, ask only for the written address and city. Never ask for coordinates, GPS, or live location.
- Karachi delivery has a flat Rs. 200 charge per order, regardless of weight. Bahria Town Karachi delivery is Rs. 500 per started 10 kg: Rs. 500 up to 10 kg, Rs. 1,000 up to 20 kg, and so on.
- Current offer: each Every Grain 10 kg bag includes one free Shan Biryani Masala and Kheer Mix gift set. Other products and bag sizes do not qualify.
- Use track_order only with sufficient customer verification.
- Payment is Cash on Delivery only.
- Delivery normally takes 2-3 business days.
- For unresolved, sensitive, or angry-customer cases, provide the official support phone number.`;

const deliveryPolicy = {
  deliveryAreas: [...DELIVERY_CITIES],
  deliveryFees: {
    Karachi: {
      flatPerOrder: 200,
    },
    "Bahria Town Karachi": {
      upTo10Kg: 500,
      above10KgUpTo20Kg: 1000,
      additionalStarted10Kg: 500,
    },
  },
  deliveryTimeline: "2-3 business days after order is placed",
  sameDayAvailable: false,
};

const paymentPolicy = {
  methods: ["Cash on Delivery (COD)"],
  codAvailable: true,
};

const contactInformation = {
  companyName: "Yousuf Rice",
  supportEmail: "support@yousufrice.com",
  supportPhone: "03041117423",
  businessHours: "Monday-Saturday, 9 AM - 6 PM (PKT)",
  website: "https://yousufrice.com",
};

function textResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
  };
}

function createServer(): McpServer {
  const server = new McpServer(SERVER_INFO, {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
    instructions:
      "Yousuf Rice product discovery, quoting, COD ordering, tracking, and customer-support server.",
  });

  server.registerTool(
    "list_products",
    {
      description: "List available rice products with their pricing tiers.",
      inputSchema: z.object({
        inStockOnly: z.boolean().optional().default(false),
        forHotelsRestaurants: z.boolean().nullable().optional().default(null),
        limit: z.number().int().min(1).max(100).optional().default(50),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ inStockOnly, forHotelsRestaurants, limit }) =>
      textResult(
        await listProducts({ inStockOnly, forHotelsRestaurants, limit }),
      ),
  );

  server.registerTool(
    "search_products",
    {
      description: "Search available products by name or description.",
      inputSchema: z.object({
        searchQuery: z.string().trim().min(1),
        inStockOnly: z.boolean().optional().default(false),
        forHotelsRestaurants: z.boolean().nullable().optional().default(null),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ searchQuery, inStockOnly, forHotelsRestaurants }) =>
      textResult(
        await listProducts({
          searchQuery,
          inStockOnly,
          forHotelsRestaurants,
        }),
      ),
  );

  server.registerTool(
    "get_product_details",
    {
      description:
        "Get detailed product information, including all pricing tiers.",
      inputSchema: z.object({ productId: z.string().trim().min(1) }),
      annotations: { readOnlyHint: true },
    },
    async ({ productId }) => textResult(await getProductById(productId)),
  );

  server.registerTool(
    "quote_order",
    {
      description:
        "Create a price quote. Always call this before confirm_order.",
      inputSchema: z.object({
        city: z.enum(DELIVERY_CITIES),
        items: z
          .array(
            z.object({
              productId: z.string().trim().min(1),
              quantity: z.number().positive().max(1000),
            }),
          )
          .min(1)
          .max(20),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ city, items }) =>
      textResult({ success: true, quote: await createQuote(items, city) }),
  );

  server.registerTool(
    "confirm_order",
    {
      description:
        "Create an order from a previously accepted quote. Call quote_order first.",
      inputSchema: z.object({
        quoteId: z.string().trim().min(1),
        customerName: z.string().trim().min(1),
        phoneNumber: z.string().trim().min(10),
        deliveryAddress: z.string().trim().min(1),
        city: z.enum(DELIVERY_CITIES),
        customerEmail: z.string().email().optional(),
        idempotencyKey: z.string().trim().min(1),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({
      quoteId,
      customerName,
      phoneNumber,
      deliveryAddress,
      city,
      customerEmail,
      idempotencyKey,
    }) =>
      textResult({
        success: true,
        order: await confirmOrder({
          quoteId,
          customerName,
          phoneNumber,
          email: customerEmail ?? null,
          deliveryAddress,
          city,
          idempotencyKey,
        }),
      }),
  );

  server.registerTool(
    "track_order",
    {
      description: "Track an order by order ID with optional phone verification.",
      inputSchema: z.object({
        orderId: z.string().trim().min(1),
        phoneNumber: z.string().trim().optional(),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ orderId, phoneNumber }) =>
      textResult({
        success: true,
        order: await trackOrder(orderId, phoneNumber),
      }),
  );

  server.registerResource(
    "customer-service-guidelines",
    "yousuf-rice://policies/customer-service",
    { title: "Customer Service Guidelines", mimeType: "text/markdown" },
    async (uri) => ({
      contents: [
        { uri: uri.href, mimeType: "text/markdown", text: customerServiceInstructions },
      ],
    }),
  );

  const jsonResources = [
    {
      name: "delivery-policy",
      uri: "yousuf-rice://policies/delivery",
      title: "Delivery Policy",
      value: deliveryPolicy,
    },
    {
      name: "payment-policy",
      uri: "yousuf-rice://policies/payment",
      title: "Payment Policy",
      value: paymentPolicy,
    },
    {
      name: "contact-information",
      uri: "yousuf-rice://company/contact-information",
      title: "Contact Information",
      value: contactInformation,
    },
  ] as const;

  for (const resource of jsonResources) {
    server.registerResource(
      resource.name,
      resource.uri,
      { title: resource.title, mimeType: "application/json" },
      async (uri) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(resource.value),
          },
        ],
      }),
    );
  }

  server.registerPrompt(
    "yousuf_rice_customer_service",
    {
      description:
        "Operational instructions for a Yousuf Rice customer-service and order-taking agent.",
      argsSchema: z.object({}),
    },
    async () => ({
      messages: [
        {
          role: "user",
          content: { type: "text", text: customerServiceInstructions },
        },
      ],
    }),
  );

  return server;
}

const mcpHandler = createMcpHandler(createServer, {
  legacy: "stateless",
  responseMode: "auto",
  onerror: (error) => console.error("[MCP Error]", error),
});

function isAuthorized(request: Request): boolean {
  const expected = process.env.MCP_AUTH_TOKEN;
  if (!expected) return true;

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;

  const actual = authorization.slice(7);
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

async function handleMcpRequest(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return Response.json(
      {
        jsonrpc: "2.0",
        error: { code: -32001, message: "Unauthorized" },
        id: null,
      },
      {
        status: 401,
        headers: { "WWW-Authenticate": "Bearer" },
      },
    );
  }

  return mcpHandler.fetch(request);
}

export const GET = handleMcpRequest;
export const POST = handleMcpRequest;
export const DELETE = handleMcpRequest;
