import { tool } from "@openai/agents";
import { z } from "zod";
import { headers } from "next/headers";
import {
  tablesDB,
  DATABASE_ID,
  PRODUCTS_TABLE_ID,
  ORDERS_TABLE_ID,
  CUSTOMERS_TABLE_ID,
  ADDRESSES_TABLE_ID,
  ORDER_ITEMS_TABLE_ID,
} from "@/lib/appwrite";
import { calculateBagsFromQuantity } from "@/lib/utils";
import { Query, ID } from "appwrite";
import { sendOrderConfirmation } from "@/lib/email";
import {
  trackAgentPurchase,
  trackAgentInitiateCheckout,
} from "@/lib/meta-agent-tracking";
import { LoyaltyService } from "@/lib/services/loyalty-service";

/**
 * Helper function to get current URL from Next.js headers
 * This is needed for server-side Meta tracking to send the actual current URL
 */
async function getCurrentUrl(): Promise<string> {
  try {
    const headersList = await headers();
    const host =
      headersList.get("host") ||
      process.env.NEXT_PUBLIC_PRIMARY_DOMAIN ||
      "yousufrice.com";
    const protocol = headersList.get("x-forwarded-proto") || "https";
    const pathname = headersList.get("x-pathname") || "/";
    return `${protocol}://${host}${pathname}`;
  } catch (error) {
    // Fallback if headers are not available (e.g., in non-request context)
    return process.env.NEXT_PUBLIC_PRIMARY_DOMAIN || "https://yousufrice.com";
  }
}

/**
 * Helper function to build price tiers from product data
 * Returns available tier ranges and their prices per kg
 */
function buildPriceTiers(product: any) {
  const tiers: Array<{
    tierRange: string;
    pricePerKg: number;
    discountPercent: string;
  }> = [];

  if (!product.has_tier_pricing) {
    return tiers;
  }

  const basePrice = product.base_price_per_kg;

  // 2-4kg tier
  if (product.tier_2_4kg_price && product.tier_2_4kg_price > 0) {
    const discount = (
      ((basePrice - product.tier_2_4kg_price) / basePrice) *
      100
    ).toFixed(1);
    tiers.push({
      tierRange: "2-4kg",
      pricePerKg: product.tier_2_4kg_price,
      discountPercent: discount,
    });
  }

  // 5-9kg tier
  if (product.tier_5_9kg_price && product.tier_5_9kg_price > 0) {
    const discount = (
      ((basePrice - product.tier_5_9kg_price) / basePrice) *
      100
    ).toFixed(1);
    tiers.push({
      tierRange: "5-9kg",
      pricePerKg: product.tier_5_9kg_price,
      discountPercent: discount,
    });
  }

  // 10kg+ tier
  if (product.tier_10kg_up_price && product.tier_10kg_up_price > 0) {
    const discount = (
      ((basePrice - product.tier_10kg_up_price) / basePrice) *
      100
    ).toFixed(1);
    tiers.push({
      tierRange: "10kg+",
      pricePerKg: product.tier_10kg_up_price,
      discountPercent: discount,
    });
  }

  return tiers;
}

/**
 * Helper function to calculate price per kg based on quantity and tier pricing
 * Matches frontend logic in lib/utils.ts
 */
function getPricePerKg(product: any, quantity: number): number {
  if (!product.has_tier_pricing || quantity <= 0) {
    return product.base_price_per_kg;
  }

  if (
    quantity >= 10 &&
    product.tier_10kg_up_price &&
    product.tier_10kg_up_price > 0
  ) {
    return product.tier_10kg_up_price;
  } else if (
    quantity >= 5 &&
    product.tier_5_9kg_price &&
    product.tier_5_9kg_price > 0
  ) {
    return product.tier_5_9kg_price;
  } else if (
    quantity >= 2 &&
    product.tier_2_4kg_price &&
    product.tier_2_4kg_price > 0
  ) {
    return product.tier_2_4kg_price;
  }

  return product.base_price_per_kg;
}

/**
 * Helper function to format and validate phone numbers
 * Ensures consistent format: +92XXXXXXXXXX
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // If starts with 92, add +
  if (digits.startsWith("92")) {
    return "+" + digits;
  }

  // If starts with 0, replace with +92
  if (digits.startsWith("0")) {
    return "+92" + digits.substring(1);
  }

  // Otherwise assume it's missing country code
  return "+92" + digits;
}

/**
 * Helper function to validate quantity
 */
function validateQuantity(quantity: number): {
  valid: boolean;
  error?: string;
} {
  if (quantity <= 0) {
    return { valid: false, error: "Quantity must be greater than 0" };
  }
  if (quantity > 1000) {
    return {
      valid: false,
      error:
        "Quantity exceeds maximum limit of 1000kg. Please contact us for bulk orders.",
    };
  }
  if (!Number.isFinite(quantity)) {
    return { valid: false, error: "Invalid quantity value" };
  }
  return { valid: true };
}

/**
 * Tool to search and browse products with detailed information
 * Returns comprehensive product details including pricing tiers
 */
export const searchProductsTool = tool({
  name: "search_products",
  description:
    "Search and browse products with full details including name, description, base price, price tiers for different quantities, specifications, and availability. Use this to help customers find products.",
  parameters: z.object({
    searchQuery: z
      .string()
      .nullable()
      .default(null)
      .describe("Search by product name or description keywords."),
    inStockOnly: z
      .boolean()
      .default(false)
      .describe("Set true to show only in-stock products."),
    forHotelsRestaurants: z
      .boolean()
      .nullable()
      .default(null)
      .describe(
        "Set true to show only hotel/restaurant products (filtered by name), false for regular products, null for all.",
      ),
    limit: z
      .number()
      .default(10)
      .describe("Maximum products to return (1-50)."),
  }),
  async execute({
    searchQuery,
    inStockOnly,
    forHotelsRestaurants,
    limit,
  }: {
    searchQuery: string | null;
    inStockOnly: boolean;
    forHotelsRestaurants: boolean | null;
    limit: number;
  }) {
    try {
      // Validate limit
      const validLimit = Math.max(1, Math.min(limit, 50));
      // Fetch more to account for filtering
      const fetchLimit =
        forHotelsRestaurants !== null
          ? Math.min(validLimit * 3, 100)
          : validLimit;
      const queries: any[] = [
        Query.limit(fetchLimit),
        Query.orderDesc("$createdAt"),
      ];

      // Apply search query
      if (searchQuery && searchQuery.trim().length > 0) {
        queries.push(Query.search("name", searchQuery.trim()));
      }

      // Apply stock filter
      if (inStockOnly) {
        queries.push(Query.equal("available", true));
      }

      const response = (await Promise.race([
        tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: PRODUCTS_TABLE_ID,
          queries: queries,
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Database request timeout")),
            15000,
          ),
        ),
      ])) as any;

      // Filter by hotel/restaurant in-memory (since field doesn't exist in DB)
      let filteredDocs = response.rows;
      if (forHotelsRestaurants !== null) {
        filteredDocs = response.rows.filter((doc: any) => {
          const searchText = `${doc.name} ${
            doc.description || ""
          }`.toLowerCase();
          const isHotelRestaurant =
            searchText.includes("hotel") || searchText.includes("restaurant");
          return forHotelsRestaurants ? isHotelRestaurant : !isHotelRestaurant;
        });
      }

      // Apply limit after filtering
      const limitedDocs = filteredDocs.slice(0, validLimit);

      return {
        success: true,
        products: limitedDocs.map((doc: any) => ({
          id: doc.$id,
          name: doc.name,
          description: doc.description || "Premium quality rice",
          basePricePerKg: doc.base_price_per_kg,
          hasTierPricing: doc.has_tier_pricing,
          priceTiers: buildPriceTiers(doc),
          available: doc.available,
          primaryImageId: doc.primary_image_id || null,
        })),
        total: limitedDocs.length,
        message: `Found ${limitedDocs.length} product(s)${
          inStockOnly ? " (in stock)" : ""
        }${
          forHotelsRestaurants === true
            ? " for hotels/restaurants"
            : forHotelsRestaurants === false
              ? " (regular products)"
              : ""
        }.`,
      };
    } catch (error: any) {
      console.error("searchProductsTool error:", error);

      // Provide more specific error messages
      let errorMessage = "Failed to search products";
      if (error.message?.includes("timeout")) {
        errorMessage = "Database connection timeout. Please try again.";
      } else if (
        error.message?.includes("network") ||
        error.message?.includes("fetch")
      ) {
        errorMessage =
          "Network connection issue. Please check your internet connection.";
      } else if (error.code === "ENOTFOUND") {
        errorMessage = "Database server not reachable. Please try again later.";
      }

      return {
        success: false,
        error: errorMessage,
        products: [],
        total: 0,
      };
    }
  },
});

/**
 * Tool to get complete product details by ID
 */
export const getProductDetailsTool = tool({
  name: "get_product_details",
  description:
    "Get complete detailed information about a specific product including all pricing tiers, specifications, and availability. Use this when customer asks about a specific product.",
  parameters: z.object({
    productId: z.string().describe("The unique product ID"),
  }),
  async execute({ productId }) {
    try {
      // Validate productId
      if (!productId || productId.trim().length === 0) {
        return {
          success: false,
          error: "Product ID is required",
          product: null,
        };
      }

      const product = await tablesDB.getRow({
        databaseId: DATABASE_ID,
        tableId: PRODUCTS_TABLE_ID,
        rowId: productId.trim(),
      });

      return {
        success: true,
        product: {
          id: product.$id,
          name: product.name,
          description: product.description || "Premium quality rice",
          basePricePerKg: product.base_price_per_kg,
          hasTierPricing: product.has_tier_pricing,
          priceTiers: buildPriceTiers(product),
          available: product.available,
          primaryImageId: product.primary_image_id || null,
        },
        message: `${product.name} - ${
          product.available ? "Available" : "Out of Stock"
        }`,
      };
    } catch (error: any) {
      console.error("getProductDetailsTool error:", error);
      return {
        success: false,
        error: error.message || "Product not found",
        product: null,
      };
    }
  },
});

/**
 * Tool to track orders and get order history
 */
export const trackOrdersTool = tool({
  name: "track_orders",
  description:
    "Track order status and get order history by order ID or customer phone number. Shows detailed order information including items, delivery address, and current status.",
  parameters: z.object({
    orderId: z
      .string()
      .nullable()
      .default(null)
      .describe("Specific order ID to track. Provide this OR phoneNumber."),
    phoneNumber: z
      .string()
      .nullable()
      .default(null)
      .describe(
        "Customer phone number to get all their orders. Provide this OR orderId.",
      ),
  }),
  async execute({
    orderId,
    phoneNumber,
  }: {
    orderId: string | null;
    phoneNumber: string | null;
  }) {
    try {
      // Validate inputs
      if (!orderId && !phoneNumber) {
        return {
          success: false,
          error:
            "Please provide either an order ID or phone number to track orders",
          orders: [],
          message: "Missing required information.",
        };
      }

      if (orderId) {
        // Validate and trim order ID
        const trimmedOrderId = orderId.trim();
        if (trimmedOrderId.length === 0) {
          return {
            success: false,
            error: "Invalid order ID",
            orders: [],
            message: "Order ID cannot be empty.",
          };
        }

        const order = await tablesDB.getRow({
          databaseId: DATABASE_ID,
          tableId: ORDERS_TABLE_ID,
          rowId: trimmedOrderId,
        });

        // Fetch customer details
        let customerName = "Unknown";
        let phoneNumber = "Unknown";
        try {
          const customer = await tablesDB.getRow({
            databaseId: DATABASE_ID,
            tableId: CUSTOMERS_TABLE_ID,
            rowId: order.customer_id,
          });
          customerName = customer.full_name;
          phoneNumber = customer.phone;
        } catch (e) {
          // Customer not found
        }

        // Fetch address details
        let addressLine = "Address not available";
        if (order.address_id) {
          try {
            const address = await tablesDB.getRow({
              databaseId: DATABASE_ID,
              tableId: ADDRESSES_TABLE_ID,
              rowId: order.address_id,
            });
            addressLine = address.address_line;
          } catch (e) {
            // Address not found
          }
        }

        // Fetch actual order items
        const orderItemsResponse = await tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: ORDER_ITEMS_TABLE_ID,
          queries: [Query.equal("order_id", order.$id)],
        });

        const items = orderItemsResponse.rows.map((item: any) => ({
          productName: item.product_name,
          quantity: item.quantity_kg,
          price: item.total_after_discount,
          pricePerKg: item.price_per_kg_at_order,
        }));

        return {
          success: true,
          orders: [
            {
              id: order.$id,
              status: order.status,
              totalAmount: order.total_price,
              items: items, // Structured items
              deliveryAddress: addressLine,
              phoneNumber,
              customerName,
              createdAt: order.$createdAt,
            },
          ],
          message: `Order ${order.$id} is ${order.status}.`,
        };
      }

      if (phoneNumber) {
        // Format phone number for consistent querying
        const formattedPhone = formatPhoneNumber(phoneNumber);

        // First find customer by phone
        const customerResponse = await tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: CUSTOMERS_TABLE_ID,
          queries: [Query.equal("phone", formattedPhone)],
        });

        if (customerResponse.total === 0) {
          return {
            success: true,
            orders: [],
            message: `No customer found with phone number ${formattedPhone}.`,
          };
        }

        const customer = customerResponse.rows[0];

        // Then find orders by customer_id
        const orderResponse = await tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: ORDERS_TABLE_ID,
          queries: [
            Query.equal("customer_id", customer.$id),
            Query.orderDesc("$createdAt"),
            Query.limit(5),
          ],
        });

        if (orderResponse.total === 0) {
          return {
            success: true,
            orders: [],
            message: `No orders found for ${customer.full_name}.`,
          };
        }

        // Fetch addresses and items for each order
        const ordersWithDetails = await Promise.all(
          orderResponse.rows.map(async (order) => {
            let addressLine = "Address not available";
            if (order.address_id) {
              try {
                const address = await tablesDB.getRow({
                  databaseId: DATABASE_ID,
                  tableId: ADDRESSES_TABLE_ID,
                  rowId: order.address_id,
                });
                addressLine = address.address_line;
              } catch (e) {
                // Address not found
              }
            }

            // Fetch actual order items
            const orderItemsResponse = await tablesDB.listRows({
              databaseId: DATABASE_ID,
              tableId: ORDER_ITEMS_TABLE_ID,
              queries: [Query.equal("order_id", order.$id)],
            });

            const items = orderItemsResponse.rows.map((item: any) => ({
              productName: item.product_name,
              quantity: item.quantity_kg,
              price: item.total_after_discount,
              pricePerKg: item.price_per_kg_at_order,
            }));

            return {
              id: order.$id,
              status: order.status,
              totalAmount: order.total_price,
              items: items, // Structured items
              deliveryAddress: addressLine,
              phoneNumber: customer.phone,
              customerName: customer.full_name,
              createdAt: order.$createdAt,
            };
          }),
        );

        return {
          success: true,
          orders: ordersWithDetails,
          message: `Found ${orderResponse.total} order(s) for ${customer.full_name}.`,
        };
      }

      return {
        success: false,
        error:
          "Please provide either an order ID or phone number to track orders",
        orders: [],
        message: "Missing required information.",
      };
    } catch (error: any) {
      console.error("trackOrdersTool error:", error);
      return {
        success: false,
        error: error.message || "Failed to track orders",
        orders: [],
        message: "Unable to retrieve order information.",
      };
    }
  },
});

/**
 * Tool to get customer information
 * Provide either phoneNumber or email
 */
export const getCustomerTool = tool({
  name: "get_customer",
  description: "Get customer information by phone number or email.",
  parameters: z.object({
    phoneNumber: z
      .string()
      .nullable()
      .default(null)
      .describe("Customer phone number. Provide this OR email."),
    email: z
      .string()
      .nullable()
      .default(null)
      .describe("Customer email address. Provide this OR phoneNumber."),
  }),
  async execute({
    phoneNumber,
    email,
  }: {
    phoneNumber: string | null;
    email: string | null;
  }) {
    try {
      // Validate inputs
      if (!phoneNumber && !email) {
        return {
          success: false,
          error: "Please provide either phone number or email",
          customer: null,
        };
      }

      const queries: any[] = [];

      if (phoneNumber) {
        const formattedPhone = formatPhoneNumber(phoneNumber);
        queries.push(Query.equal("phone", formattedPhone));
      } else if (email) {
        const trimmedEmail = email.trim().toLowerCase();
        if (trimmedEmail.length === 0) {
          return {
            success: false,
            error: "Email cannot be empty",
            customer: null,
          };
        }
        queries.push(Query.equal("email", trimmedEmail));
      }

      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: CUSTOMERS_TABLE_ID,
        queries: queries,
      });

      if (response.rows.length === 0) {
        return {
          success: false,
          error: "Customer not found",
          customer: null,
          message: phoneNumber
            ? `No customer found with phone number ${formatPhoneNumber(
                phoneNumber,
              )}`
            : `No customer found with email ${email?.trim()}`,
        };
      }

      const customer = response.rows[0];

      return {
        success: true,
        customer: {
          id: customer.$id,
          name: customer.full_name,
          phoneNumber: customer.phone,
          email: customer.email,
        },
        message: `Found customer: ${customer.full_name}`,
      };
    } catch (error: any) {
      console.error("getCustomerTool error:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch customer",
        customer: null,
      };
    }
  },
});

/**
 * Tool to create or update customer record
 */
export const manageCustomerTool = tool({
  name: "manage_customer",
  description:
    "Create a new customer record or update existing customer information. Use this when customer provides their contact details for the first time or wants to update their info.",
  parameters: z.object({
    name: z.string().describe("Customer full name"),
    phoneNumber: z
      .string()
      .describe(
        "Customer phone number (with country code, e.g., +923001234567)",
      ),
    email: z
      .string()
      .nullable()
      .default(null)
      .describe("Customer email address (optional)"),
    userId: z
      .string()
      .nullable()
      .default(null)
      .describe(
        "Optional Appwrite auth user ID. If provided, will be stored in user_id field; otherwise 'guest' will be used.",
      ),
  }),
  async execute({ name, phoneNumber, email, userId }) {
    try {
      // Validate inputs
      if (!name || name.trim().length === 0) {
        return {
          success: false,
          error: "Customer name is required",
          customer: null,
        };
      }

      if (!phoneNumber || phoneNumber.trim().length === 0) {
        return {
          success: false,
          error: "Phone number is required",
          customer: null,
        };
      }

      // Format and validate phone number
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const phoneDigits = formattedPhone.replace(/\D/g, "");
      if (phoneDigits.length < 11 || phoneDigits.length > 13) {
        return {
          success: false,
          error:
            "Invalid phone number format. Please provide a valid Pakistani phone number.",
          customer: null,
        };
      }

      // Validate email if provided
      let validatedEmail = "";
      if (email && email.trim().length > 0) {
        validatedEmail = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(validatedEmail)) {
          return {
            success: false,
            error: "Invalid email format",
            customer: null,
          };
        }
      }

      // Check if customer exists
      const existingCustomers = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: CUSTOMERS_TABLE_ID,
        queries: [Query.equal("phone", formattedPhone)],
      });

      if (existingCustomers.rows.length > 0) {
        // Update existing customer
        const customerId = existingCustomers.rows[0].$id;
        const updated = await tablesDB.updateRow({
          databaseId: DATABASE_ID,
          tableId: CUSTOMERS_TABLE_ID,
          rowId: customerId,
          data: {
            full_name: name.trim(),
            user_id: userId || existingCustomers.rows[0].user_id || "guest",
            email: validatedEmail || existingCustomers.rows[0].email,
          },
        });

        return {
          success: true,
          customer: {
            id: updated.$id,
            name: updated.full_name,
            phoneNumber: updated.phone,
            email: updated.email,
          },
          isNew: false,
          message: `Updated customer profile for ${name.trim()}.`,
        };
      } else {
        // Create new customer
        const newCustomer = await tablesDB.createRow({
          databaseId: DATABASE_ID,
          tableId: CUSTOMERS_TABLE_ID,
          rowId: ID.unique(),
          data: {
            user_id: userId || "guest",
            full_name: name.trim(),
            phone: formattedPhone,
            email: validatedEmail,
          },
        });

        return {
          success: true,
          customer: {
            id: newCustomer.$id,
            name: newCustomer.full_name,
            phoneNumber: newCustomer.phone,
            email: newCustomer.email,
          },
          isNew: true,
          message: `Created new customer profile for ${name.trim()}. Welcome to Yousuf Rice!`,
        };
      }
    } catch (error: any) {
      console.error("manageCustomerTool error:", error);
      return {
        success: false,
        error: error.message || "Failed to manage customer",
        customer: null,
      };
    }
  },
});

/**
 * Tool to calculate order total with price tiers
 */
export const calculateOrderPriceTool = tool({
  name: "calculate_order_price",
  description:
    "Calculate the total price for an order based on products and quantities. Shows price breakdown with any applicable discounts from bulk purchase tiers. Use this before creating an order to show customer the total cost.",
  parameters: z.object({
    items: z
      .array(
        z.object({
          productId: z.string().describe("Product ID"),
          quantity: z.number().describe("Quantity in kg"),
        }),
      )
      .describe("Array of items with productId and quantity"),
    discountCode: z
      .string()
      .nullable()
      .default(null)
      .describe("Optional loyalty discount code to apply"),
  }),
  async execute({ items, discountCode }) {
    try {
      // Validate items array
      if (!items || items.length === 0) {
        return {
          success: false,
          error: "At least one item is required",
          calculation: null,
        };
      }

      if (items.length > 20) {
        return {
          success: false,
          error:
            "Maximum 20 items allowed per order. Please contact us for larger orders.",
          calculation: null,
        };
      }

      let totalPrice = 0;
      const itemsBreakdown: any[] = [];
      const unavailableProducts: string[] = [];

      for (const item of items) {
        // Validate item structure
        if (!item.productId || !item.quantity) {
          return {
            success: false,
            error: "Each item must have productId and quantity",
            calculation: null,
          };
        }

        // Validate quantity
        const quantityValidation = validateQuantity(item.quantity);
        if (!quantityValidation.valid) {
          return {
            success: false,
            error: `Invalid quantity for product ${item.productId}: ${quantityValidation.error}`,
            calculation: null,
          };
        }

        // Fetch product from database
        const product = await tablesDB.getRow({
          databaseId: DATABASE_ID,
          tableId: PRODUCTS_TABLE_ID,
          rowId: item.productId.trim(),
        });

        // Check product availability
        if (!product.available) {
          unavailableProducts.push(product.name);
          continue;
        }

        // Calculate price per kg using helper function (matches frontend logic)
        const pricePerKg = getPricePerKg(product, item.quantity);

        // Determine which tier was applied
        let tierApplied = "Base price";
        if (product.has_tier_pricing) {
          if (
            item.quantity >= 10 &&
            product.tier_10kg_up_price &&
            product.tier_10kg_up_price > 0
          ) {
            tierApplied = "10kg+ tier";
          } else if (
            item.quantity >= 5 &&
            product.tier_5_9kg_price &&
            product.tier_5_9kg_price > 0
          ) {
            tierApplied = "5-9kg tier";
          } else if (
            item.quantity >= 2 &&
            product.tier_2_4kg_price &&
            product.tier_2_4kg_price > 0
          ) {
            tierApplied = "2-4kg tier";
          }
        }

        const itemTotal = pricePerKg * item.quantity;
        totalPrice += itemTotal;

        // Calculate savings compared to base price
        const basePriceTotal = product.base_price_per_kg * item.quantity;
        const savings = basePriceTotal - itemTotal;
        const savingsPercent =
          basePriceTotal > 0 && savings > 0
            ? ((savings / basePriceTotal) * 100).toFixed(1)
            : "0";

        itemsBreakdown.push({
          productId: product.$id,
          productName: product.name,
          quantity: item.quantity,
          basePricePerKg: product.base_price_per_kg,
          appliedPricePerKg: pricePerKg,
          tierApplied,
          subtotal: itemTotal,
          savings:
            savings > 0
              ? `PKR ${savings.toFixed(2)} (${savingsPercent}% off)`
              : "No discount",
        });
      }

      // Check if any products are unavailable
      if (unavailableProducts.length > 0) {
        return {
          success: false,
          error: `The following products are currently unavailable: ${unavailableProducts.join(
            ", ",
          )}`,
          calculation: null,
        };
      }

      // Free delivery on all orders
      const deliveryFee = 0;
      let grandTotal = totalPrice;
      let discountAmount = 0;
      let appliedDiscountCode = null;
      let discountPercentage = 0;

      // Apply discount code if provided
      if (
        discountCode &&
        process.env.NEXT_PUBLIC_ENABLE_LOYALTY_DISCOUNT === "true"
      ) {
        try {
          const loyaltyDiscount =
            await LoyaltyService.findLoyaltyDiscountByCode(discountCode);

          if (loyaltyDiscount && loyaltyDiscount.code_status === "active") {
            discountPercentage = loyaltyDiscount.extra_discount_percentage || 3;
            discountAmount = Math.round(
              (grandTotal * discountPercentage) / 100,
            );
            grandTotal = Math.round(grandTotal - discountAmount);
            appliedDiscountCode = discountCode;
          }
        } catch (e) {
          console.error("Error applying discount code:", e);
          // Continue without discount if invalid
        }
      }

      // Note: Meta InitiateCheckout tracking removed from price calculation
      // because it requires customer information which is not available at this stage.
      // InitiateCheckout events will be tracked when customer provides their details
      // and confirms the order in the createOrderTool.

      return {
        success: true,
        calculation: {
          items: itemsBreakdown,
          subtotal: totalPrice,
          deliveryFee,
          discountAmount,
          discountCode: appliedDiscountCode,
          discountPercentage,
          grandTotal,
        },
        message: `Total: PKR ${grandTotal.toFixed(2)} (Free delivery!)${
          appliedDiscountCode
            ? ` - Includes ${discountPercentage}% loyalty discount`
            : ""
        }`,
      };
    } catch (error: any) {
      console.error("calculateOrderPriceTool error:", error);
      return {
        success: false,
        error: error.message || "Failed to calculate price",
        calculation: null,
      };
    }
  },
});

/**
 * Tool to create a new order (REQUIRES CONFIRMATION)
 */
export const createOrderTool = tool({
  name: "create_order",
  description:
    'Create a new order in the system. IMPORTANT: Always get explicit customer confirmation before using this tool. Confirm: customer name, phone, delivery address, items, quantities, and total price. Ask "Shall I place this order for you?" and wait for YES.',
  parameters: z.object({
    customerName: z.string().describe("Customer full name"),
    phoneNumber: z.string().describe("Customer phone number with country code"),
    deliveryAddress: z.string().describe("Complete delivery address"),
    city: z
      .string()
      .describe(
        "Delivery city or town. Required for every order, e.g. Karachi, Lahore, Islamabad.",
      ),
    items: z
      .array(
        z.object({
          productId: z.string().describe("Product ID"),
          productName: z.string().describe("Product name"),
          quantity: z.number().describe("Quantity in kg"),
          price: z.number().describe("Price per unit"),
        }),
      )
      .describe("Array of order items"),
    totalAmount: z.number().describe("Total order amount in PKR"),
    customerEmail: z
      .string()
      .nullable()
      .default(null)
      .describe("Customer email (optional)"),
    latitude: z
      .number()
      .nullable()
      .default(null)
      .describe("Delivery location latitude (optional, from GPS)"),
    longitude: z
      .number()
      .nullable()
      .default(null)
      .describe("Delivery location longitude (optional, from GPS)"),
    userId: z
      .string()
      .nullable()
      .default(null)
      .describe(
        "Optional Appwrite auth user ID. If provided, will be stored in user_id for the customer; otherwise 'guest' will be used.",
      ),
    discountCode: z
      .string()
      .nullable()
      .default(null)
      .describe("Optional loyalty discount code to redeem"),
  }),
  async execute({
    customerName,
    phoneNumber,
    deliveryAddress,
    city,
    items,
    totalAmount,
    customerEmail,
    latitude,
    longitude,
    userId,
    discountCode,
  }) {
    try {
      // Validate customer name
      if (!customerName || customerName.trim().length === 0) {
        return {
          success: false,
          error: "Customer name is required",
          order: null,
          message: "Please provide customer name.",
        };
      }

      if (customerName.trim().length < 3) {
        return {
          success: false,
          error: "Customer name must be at least 3 characters",
          order: null,
          message: "Please provide a valid customer name.",
        };
      }

      // Validate and format phone number
      if (!phoneNumber || phoneNumber.trim().length === 0) {
        return {
          success: false,
          error: "Phone number is required",
          order: null,
          message: "Please provide customer phone number.",
        };
      }

      const formattedPhone = formatPhoneNumber(phoneNumber);
      const phoneDigits = formattedPhone.replace(/\D/g, "");
      if (phoneDigits.length < 11 || phoneDigits.length > 13) {
        return {
          success: false,
          error: "Invalid phone number format",
          order: null,
          message: "Please provide a valid Pakistani phone number.",
        };
      }

      // Validate delivery address
      if (!deliveryAddress || deliveryAddress.trim().length === 0) {
        return {
          success: false,
          error: "Delivery address is required",
          order: null,
          message: "Please provide delivery address.",
        };
      }

      if (deliveryAddress.trim().length < 10) {
        return {
          success: false,
          error:
            "Delivery address is too short. Please provide complete address.",
          order: null,
          message:
            "Please provide a complete delivery address with area and city.",
        };
      }

      const normalizedCity = city.trim();
      if (!normalizedCity) {
        return {
          success: false,
          error: "City is required",
          order: null,
          message: "Please provide the delivery city before placing the order.",
        };
      }

      // Validate items
      if (!items || items.length === 0) {
        return {
          success: false,
          error: "Order must contain at least one item",
          order: null,
          message: "Please add items to the order.",
        };
      }

      if (items.length > 20) {
        return {
          success: false,
          error: "Maximum 20 items allowed per order",
          order: null,
          message: "Please contact us for bulk orders with more than 20 items.",
        };
      }

      // Validate each item
      for (const item of items) {
        if (
          !item.productId ||
          !item.productName ||
          !item.quantity ||
          !item.price
        ) {
          return {
            success: false,
            error:
              "Invalid item data. Each item must have productId, productName, quantity, and price.",
            order: null,
            message: "Order data is incomplete.",
          };
        }

        const quantityValidation = validateQuantity(item.quantity);
        if (!quantityValidation.valid) {
          return {
            success: false,
            error: `Invalid quantity for ${item.productName}: ${quantityValidation.error}`,
            order: null,
            message: "Please check item quantities.",
          };
        }
      }

      // Validate total amount
      if (!totalAmount || totalAmount <= 0) {
        return {
          success: false,
          error: "Invalid total amount",
          order: null,
          message: "Order total must be greater than 0.",
        };
      }

      // Validate email if provided
      let validatedEmail = "";
      if (customerEmail && customerEmail.trim().length > 0) {
        validatedEmail = customerEmail.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(validatedEmail)) {
          return {
            success: false,
            error: "Invalid email format",
            order: null,
            message: "Please provide a valid email address.",
          };
        }
      }

      // --- PRE-CALCULATION & VALIDATION ---
      // We need to fetch all products to calculate accurate totals and discounts
      // This ensures data integrity regardless of what was passed in 'totalAmount' or 'price'
      let totalItemsCount = 0;
      let totalWeightKg = 0;
      let subtotalBeforeDiscount = 0;
      let totalTierDiscountAmount = 0;
      const enrichedItems: any[] = [];

      for (const item of items) {
        const product = await tablesDB.getRow({
          databaseId: DATABASE_ID,
          tableId: PRODUCTS_TABLE_ID,
          rowId: item.productId,
        });

        if (!product.available) {
          return {
            success: false,
            error: `${product.name} is currently unavailable`,
            order: null,
            message: `Sorry, ${product.name} is out of stock. Please remove it from your order.`,
          };
        }

        // Calculate pricing for this item
        const basePrice = product.base_price_per_kg;
        const tierPrice = getPricePerKg(product, item.quantity);

        const itemBaseSubtotal = basePrice * item.quantity;
        const itemTierSubtotal = tierPrice * item.quantity;
        const itemTierDiscount = itemBaseSubtotal - itemTierSubtotal;

        // Update order-level totals
        totalItemsCount += 1;
        totalWeightKg += item.quantity;
        subtotalBeforeDiscount += itemBaseSubtotal;
        totalTierDiscountAmount += itemTierDiscount;

        enrichedItems.push({
          ...item,
          product,
          basePrice,
          tierPrice,
          itemBaseSubtotal,
          itemTierSubtotal,
          itemTierDiscount,
          tierApplied: product.has_tier_pricing
            ? item.quantity >= 10
              ? "10kg+"
              : item.quantity >= 5
                ? "5-9kg"
                : item.quantity >= 2
                  ? "2-4kg"
                  : "base"
            : "base",
          bags: calculateBagsFromQuantity(item.quantity),
        });
      }

      // --- LOYALTY DISCOUNT CALCULATION ---
      let extraDiscountAmount = 0;
      let extraDiscountPercentage = 0;
      let loyaltyRecord = null;

      if (
        discountCode &&
        process.env.NEXT_PUBLIC_ENABLE_LOYALTY_DISCOUNT === "true"
      ) {
        try {
          // Just check validity first, don't use it yet
          loyaltyRecord =
            await LoyaltyService.findLoyaltyDiscountByCode(discountCode);

          if (loyaltyRecord && loyaltyRecord.code_status === "active") {
            extraDiscountPercentage =
              loyaltyRecord.extra_discount_percentage || 3;
            // Calculate extra discount on the TIERED subtotal (price after tier discount)
            // totalTierSubtotal = subtotalBeforeDiscount - totalTierDiscountAmount
            const totalTierSubtotal =
              subtotalBeforeDiscount - totalTierDiscountAmount;
            extraDiscountAmount = Math.round(
              (totalTierSubtotal * extraDiscountPercentage) / 100,
            );
          }
        } catch (e) {
          console.error("Error validating discount code:", e);
          // Continue without extra discount
        }
      }

      const totalDiscountAmount = totalTierDiscountAmount + extraDiscountAmount;
      const finalTotalPrice = subtotalBeforeDiscount - totalDiscountAmount;

      // --- CUSTOMER MANAGEMENT ---
      // Find or create customer
      const customerResponse = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: CUSTOMERS_TABLE_ID,
        queries: [Query.equal("phone", formattedPhone)],
      });

      let customerId: string;

      if (customerResponse.rows.length > 0) {
        const existingCustomer = customerResponse.rows[0];
        customerId = existingCustomer.$id;

        // Update existing customer details (name/email) and user_id
        await tablesDB.updateRow({
          databaseId: DATABASE_ID,
          tableId: CUSTOMERS_TABLE_ID,
          rowId: customerId,
          data: {
            full_name: customerName.trim(),
            user_id: userId || existingCustomer.user_id || "guest",
            email: customerEmail || existingCustomer.email,
          },
        });
      } else {
        // Create new customer record
        const newCustomer = await tablesDB.createRow({
          databaseId: DATABASE_ID,
          tableId: CUSTOMERS_TABLE_ID,
          rowId: ID.unique(),
          data: {
            user_id: userId || "guest",
            full_name: customerName.trim(),
            phone: formattedPhone,
            email: customerEmail || "",
          },
        });
        customerId = newCustomer.$id;
      }

      // Format order items as CSV: productId:quantity,productId:quantity
      const orderItemsCSV = items
        .map((item) => `${item.productId}:${item.quantity}kg`)
        .join(",");

      // --- TRACKING ---
      // Track Meta InitiateCheckout event before creating order (non-blocking)
      console.log(
        `[DEBUG] Starting Meta InitiateCheckout tracking for customer ${customerName.trim()}`,
      );
      const currentUrlPromise = getCurrentUrl();
      currentUrlPromise
        .then((eventSourceUrl) =>
          trackAgentInitiateCheckout({
            customerName: customerName.trim(),
            customerEmail: validatedEmail || undefined,
            customerPhone: formattedPhone,
            totalAmount: finalTotalPrice,
            currency: "PKR",
            items: items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
            })),
            eventSourceUrl,
            placedByUserId: userId || undefined,
            customerUserId: customerId,
            stableKey: `${customerId}:${finalTotalPrice}:${items.length}`,
          }),
        )
        .then((result) => {
          if (result.success) {
            console.log(
              `✅ Meta InitiateCheckout event tracked for agent order with event ID: ${result.eventId}`,
            );
          }
        })
        .catch((trackingError) => {
          console.error(
            "💥 Error tracking Meta InitiateCheckout event:",
            trackingError,
          );
        });

      // --- ORDER CREATION ---
      const orderId = ID.unique();
      const order = await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: ORDERS_TABLE_ID,
        rowId: orderId,
        data: {
          customer_id: customerId,
          address_id: "", // Will be updated after address creation
          order_items: orderItemsCSV,
          total_price: finalTotalPrice,
          status: "pending",
          total_items_count: totalItemsCount,
          total_weight_kg: totalWeightKg,
          subtotal_before_discount: subtotalBeforeDiscount,
          total_discount_amount: totalDiscountAmount,
        },
      });

      // Mark discount code as used if applicable
      if (
        discountCode &&
        loyaltyRecord &&
        process.env.NEXT_PUBLIC_ENABLE_LOYALTY_DISCOUNT === "true"
      ) {
        try {
          await LoyaltyService.validateAndUseDiscountCode(
            discountCode,
            orderId,
          );
        } catch (e) {
          console.error("Error marking discount code as used:", e);
        }
      }

      // --- ORDER ITEMS CREATION ---
      for (const item of enrichedItems) {
        // Calculate this item's share of the extra discount
        // Proportional to its tiered subtotal
        let itemExtraDiscount = 0;
        if (extraDiscountAmount > 0) {
          const totalTierSubtotal =
            subtotalBeforeDiscount - totalTierDiscountAmount;
          if (totalTierSubtotal > 0) {
            const itemShare = item.itemTierSubtotal / totalTierSubtotal;
            itemExtraDiscount = itemShare * extraDiscountAmount;
          }
        }

        const totalItemDiscount = item.itemTierDiscount + itemExtraDiscount;
        const itemTotalAfterDiscount =
          item.itemBaseSubtotal - totalItemDiscount;

        await tablesDB.createRow({
          databaseId: DATABASE_ID,
          tableId: ORDER_ITEMS_TABLE_ID,
          rowId: ID.unique(),
          data: {
            order_id: orderId,
            product_id: item.productId,
            product_name: item.product.name,
            product_description: item.product.description || "",
            quantity_kg: item.quantity,
            bags_3kg: item.bags?.kg3 || 0,
            bags_5kg: item.bags?.kg5 || 0,
            bags_10kg: item.bags?.kg10 || 0,
            bags_25kg: item.bags?.kg25 || 0,
            price_per_kg_at_order: item.tierPrice, // Store the tier price as the effective unit price
            base_price_per_kg: item.basePrice,
            tier_applied: item.tierApplied,
            discount_percentage:
              item.itemBaseSubtotal > 0
                ? (totalItemDiscount / item.itemBaseSubtotal) * 100
                : 0,
            discount_amount: totalItemDiscount, // Total discount (tier + extra)
            subtotal_before_discount: item.itemBaseSubtotal, // Base price * quantity
            total_after_discount: itemTotalAfterDiscount,
            notes: "",
          },
        });
      }

      // Create address
      const addressId = ID.unique();
      const hasCoordinates = latitude !== null && longitude !== null;
      const mapsUrl = hasCoordinates
        ? `https://www.google.com/maps?q=${latitude},${longitude}`
        : "";

      await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: ADDRESSES_TABLE_ID,
        rowId: addressId,
        data: {
          customer_id: customerId,
          order_id: orderId,
          address_line: deliveryAddress.trim(),
          city: normalizedCity,
          latitude: (hasCoordinates ? latitude : 0) || 0,
          longitude: (hasCoordinates ? longitude : 0) || 0,
          maps_url: mapsUrl,
        },
      });

      // Update order with address_id
      await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: ORDERS_TABLE_ID,
        rowId: orderId,
        data: {
          address_id: addressId,
        },
      });

      // Send order confirmation email
      if (validatedEmail && validatedEmail.length > 0) {
        sendOrderConfirmation({
          orderId,
          customerName: customerName.trim(),
          customerEmail: validatedEmail,
          customerPhone: formattedPhone,
          deliveryAddress: deliveryAddress.trim(),
          mapsUrl:
            mapsUrl ||
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              deliveryAddress.trim(),
            )}`,
          items: items.map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
            price: item.price * item.quantity, // This is just for email display
          })),
          totalPrice: finalTotalPrice,
        })
          .then(() => {
            console.log(
              "Order confirmation email sent successfully to:",
              validatedEmail,
            );
          })
          .catch((emailError) => {
            console.error(
              "Error sending order confirmation email:",
              emailError,
            );
          });
      }

      // Track Meta Purchase event
      console.log(
        `[DEBUG] Starting Meta Purchase tracking for order ${orderId}`,
      );
      currentUrlPromise
        .then((eventSourceUrl) =>
          trackAgentPurchase({
            orderId,
            customerName: customerName.trim(),
            customerEmail: validatedEmail || undefined,
            customerPhone: formattedPhone,
            totalAmount: finalTotalPrice,
            currency: "PKR",
            items: items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              price: item.price,
            })),
            deliveryAddress: deliveryAddress.trim(),
            eventSourceUrl,
            placedByUserId: userId || undefined,
            customerUserId: customerId,
          }),
        )
        .then((result) => {
          if (result.success) {
            console.log(
              `✅ Meta Purchase event tracked for agent order ${orderId} with event ID: ${result.eventId}`,
            );
          }
        })
        .catch((trackingError) => {
          console.error(
            "💥 Error tracking Meta Purchase event for agent order:",
            trackingError,
          );
        });

      // Process loyalty discount (for NEXT order)
      try {
        const productNames = enrichedItems.map((item) => item.product.name);
        await LoyaltyService.processLoyaltyDiscount(
          customerId,
          customerName.trim(),
          finalTotalPrice,
          productNames,
          orderId,
        );
      } catch (loyaltyError) {
        console.error("Error processing loyalty discount:", loyaltyError);
        // Don't block the flow if loyalty processing fails
      }

      return {
        success: true,
        order: {
          id: orderId,
          customerName: customerName.trim(),
          phoneNumber: formattedPhone,
          deliveryAddress: deliveryAddress.trim(),
          items,
          totalAmount: finalTotalPrice,
          status: "pending",
        },
        message: `Order ${orderId} created successfully! We'll deliver in 2-3 business days. You'll receive a confirmation call shortly.${
          validatedEmail ? " Check your email for order confirmation." : ""
        }`,
      };
    } catch (error: any) {
      console.error("createOrderTool error:", error);
      return {
        success: false,
        error: error.message || "Failed to create order",
        order: null,
        message: "Unable to place order. Please try again or contact support.",
      };
    }
  },
});

/**
 * Tool to get ALL products at once (since catalog is small)
 */
export const getAllProductsTool = tool({
  name: "get_all_products",
  description:
    "Get a list of ALL available products in the catalog. Use this tool immediately when the conversation starts or when asked about 'what products do you have', 'show all rice', or 'prices'. This provides the full context of all products including their prices and stock status.",
  parameters: z.object({}),
  async execute() {
    try {
      // Fetch up to 100 products (we expect ~10)
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: PRODUCTS_TABLE_ID,
        queries: [
          Query.limit(100),
          Query.orderDesc("$createdAt"),
          Query.equal("available", true), // Only show available products by default
        ],
      });

      const products = response.rows.map((doc: any) => ({
        id: doc.$id,
        name: doc.name,
        // Identify if it's a hotel/restaurant product
        type:
          (doc.name + doc.description).toLowerCase().includes("hotel") ||
          (doc.name + doc.description).toLowerCase().includes("restaurant")
            ? "HOTEL_RESTAURANT_ONLY"
            : "RETAIL_CUSTOMER",
        basePrice: doc.base_price_per_kg,
        priceTiers: buildPriceTiers(doc),
        available: doc.available,
      }));

      return {
        success: true,
        total: products.length,
        products: products,
        message: `Found all ${products.length} available products.`,
      };
    } catch (error: any) {
      console.error("getAllProductsTool error:", error);
      return {
        success: false,
        error: "Failed to fetch product catalog",
        products: [],
      };
    }
  },
});
