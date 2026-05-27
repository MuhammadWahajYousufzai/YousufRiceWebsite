import { Query } from "appwrite";
import {
  tablesDB,
  DATABASE_ID,
  ORDERS_TABLE_ID,
  ORDER_ITEMS_TABLE_ID,
  CUSTOMERS_TABLE_ID,
  PRODUCTS_TABLE_ID,
} from "../appwrite";
import { OrderWithDetails, OrderItem, Customer, Product } from "../types";
import { OrderService } from "./order-service";

export class AdminService {
  /**
   * Get all orders with pagination and filtering
   */
  static async getOrders(
    page: number = 1,
    limit: number = 20,
    status?: string,
    searchTerm?: string
  ): Promise<{
    orders: OrderWithDetails[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const offset = (page - 1) * limit;
      const queries: string[] = [];

      if (status && status !== "all") {
        queries.push(`status=${status}`);
      }

      // If search term is provided, we'll filter after fetching
      // (Appwrite doesn't support complex text search on orders directly)

      const ordersResponse = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: ORDERS_TABLE_ID, queries: queries });

      let allOrders: OrderWithDetails[] = [];

      // Get detailed order information
      for (const order of ordersResponse.rows) {
        const orderDetails = await OrderService.getOrderWithDetails(order.$id);
        if (orderDetails) {
          allOrders.push(orderDetails);
        }
      }

      // Apply search filter if provided
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        allOrders = allOrders.filter(
          (order) =>
            order.$id.toLowerCase().includes(searchLower) ||
            order.customer.full_name.toLowerCase().includes(searchLower) ||
            order.customer.phone.includes(searchTerm) ||
            (order.address?.address_line || "").toLowerCase().includes(searchLower) ||
            order.items.some((item) =>
              item.product_name.toLowerCase().includes(searchLower)
            )
        );
      }

      // Sort by creation date (newest first)
      allOrders.sort(
        (a, b) =>
          new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
      );

      // Apply pagination
      const total = allOrders.length;
      const totalPages = Math.ceil(total / limit);
      const paginatedOrders = allOrders.slice(offset, offset + limit);

      return {
        orders: paginatedOrders,
        total,
        totalPages,
        currentPage: page,
      };
    } catch (error) {
      console.error("Error fetching orders:", error);
      return {
        orders: [],
        total: 0,
        totalPages: 0,
        currentPage: page,
      };
    }
  }

  /**
   * Get order analytics and statistics
   */
  static async getOrderAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalOrders: number;
    totalRevenue: number;
    totalWeight: number;
    averageOrderValue: number;
    statusBreakdown: Record<string, number>;
    topProducts: Array<{
      product_name: string;
      total_quantity: number;
      total_revenue: number;
      order_count: number;
    }>;
    revenueByDay: Array<{
      date: string;
      revenue: number;
      orders: number;
    }>;
  }> {
    try {
      const queries: string[] = [];

      if (startDate) {
        queries.push(`$createdAt>=${startDate.toISOString()}`);
      }
      if (endDate) {
        queries.push(`$createdAt<=${endDate.toISOString()}`);
      }

      const ordersResponse = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: ORDERS_TABLE_ID, queries: queries });

      const orders = ordersResponse.rows as any[];

      // Filter out returned orders for revenue calculations
      const activeOrders = orders.filter(
        (order) => order.status !== "returned"
      );

      // Basic statistics
      const totalOrders = orders.length;
      const totalRevenue = activeOrders.reduce(
        (sum, order) => sum + (order.total_price || 0),
        0
      );
      const totalWeight = activeOrders.reduce(
        (sum, order) => sum + (order.total_weight_kg || 0),
        0
      );
      const averageOrderValue =
        activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0;

      // Status breakdown
      const statusBreakdown: Record<string, number> = {};
      orders.forEach((order) => {
        statusBreakdown[order.status] =
          (statusBreakdown[order.status] || 0) + 1;
      });

      // Get all order items for product analysis (exclude returned orders)
      const allOrderIds = activeOrders.map((order) => order.$id);
      const orderItemsQueries =
        allOrderIds.length > 0 ? allOrderIds.map((id) => `order_id=${id}`) : [];

      let allOrderItems: OrderItem[] = [];
      if (orderItemsQueries.length > 0) {
        // Note: This might need to be done in batches for large datasets
        const itemsResponse = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: ORDER_ITEMS_TABLE_ID, queries: orderItemsQueries.slice(0, 100) });
        allOrderItems = itemsResponse.rows as any[];
      }

      // Top products analysis
      const productStats: Record<
        string,
        {
          product_name: string;
          total_quantity: number;
          total_revenue: number;
          order_count: number;
        }
      > = {};

      allOrderItems.forEach((item) => {
        const productId = item.product_id;
        if (!productStats[productId]) {
          productStats[productId] = {
            product_name: item.product_name,
            total_quantity: 0,
            total_revenue: 0,
            order_count: 0,
          };
        }

        productStats[productId].total_quantity += item.quantity_kg;
        productStats[productId].total_revenue += item.total_after_discount;
        productStats[productId].order_count += 1;
      });

      const topProducts = Object.values(productStats)
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 10);

      // Revenue by day (exclude returned orders)
      const revenueByDay: Record<string, { revenue: number; orders: number }> =
        {};
      activeOrders.forEach((order) => {
        const date = new Date(order.$createdAt).toISOString().split("T")[0];
        if (!revenueByDay[date]) {
          revenueByDay[date] = { revenue: 0, orders: 0 };
        }
        revenueByDay[date].revenue += order.total_price || 0;
        revenueByDay[date].orders += 1;
      });

      const revenueByDayArray = Object.entries(revenueByDay)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalOrders,
        totalRevenue,
        totalWeight,
        averageOrderValue,
        statusBreakdown,
        topProducts,
        revenueByDay: revenueByDayArray,
      };
    } catch (error) {
      console.error("Error fetching order analytics:", error);
      return {
        totalOrders: 0,
        totalRevenue: 0,
        totalWeight: 0,
        averageOrderValue: 0,
        statusBreakdown: {},
        topProducts: [],
        revenueByDay: [],
      };
    }
  }

  /**
   * Update order status with validation
   */
  static async updateOrderStatus(
    orderId: string,
    newStatus:
      | "pending"
      | "accepted"
      | "out_for_delivery"
      | "delivered"
      | "returned",
    adminNotes?: string
  ): Promise<OrderWithDetails | null> {
    try {
      // Get current order to validate status transition
      const currentOrder = await OrderService.getOrderWithDetails(orderId);
      if (!currentOrder) {
        throw new Error("Order not found");
      }

      // Validate status transition
      const validTransitions: Record<string, string[]> = {
        pending: ["accepted"],
        accepted: ["out_for_delivery"],
        out_for_delivery: ["delivered"],
        delivered: ["returned"], // Allow delivered orders to be returned
        returned: [], // No further transitions after return
      };

      const currentStatus = currentOrder.status;
      if (
        !validTransitions[currentStatus]?.includes(newStatus) &&
        currentStatus !== newStatus
      ) {
        throw new Error(
          `Invalid status transition from ${currentStatus} to ${newStatus}`
        );
      }

      // Update the order status
      await OrderService.updateOrderStatus(orderId, newStatus);

      // Get updated order details
      const updatedOrder = await OrderService.getOrderWithDetails(orderId);

      // TODO: Add notification/email logic here
      // - Send SMS to customer about status update
      // - Send email if email is available
      // - Log the status change for audit trail

      return updatedOrder;
    } catch (error) {
      console.error("Error updating order status:", error);
      throw error;
    }
  }

  /**
   * Get customer details with order history
   */
  static async getCustomerWithOrders(customerId: string): Promise<{
    customer: Customer;
    orders: OrderWithDetails[];
    stats: {
      totalOrders: number;
      totalSpent: number;
      averageOrderValue: number;
      totalWeight: number;
    };
  } | null> {
    try {
      // Get customer details
      const customer = (await tablesDB.getRow({ databaseId: DATABASE_ID, tableId: CUSTOMERS_TABLE_ID, rowId: customerId })) as unknown as Customer;

      // Get customer orders
      const orders = await OrderService.getCustomerOrders(customerId);

      // Calculate stats
      const totalOrders = orders.length;
      const totalSpent = orders.reduce(
        (sum, order) => sum + order.total_price,
        0
      );
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
      const totalWeight = orders.reduce(
        (sum, order) => sum + (order.total_weight_kg || 0),
        0
      );

      return {
        customer,
        orders,
        stats: {
          totalOrders,
          totalSpent,
          averageOrderValue,
          totalWeight,
        },
      };
    } catch (error) {
      console.error("Error fetching customer with orders:", error);
      return null;
    }
  }

  /**
   * Search customers
   */
  static async searchCustomers(searchTerm: string): Promise<Customer[]> {
    try {
      // Search by phone (exact match)
      const phoneResults = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: CUSTOMERS_TABLE_ID, queries: [Query.equal("phone", searchTerm)] });

      // Search by name (this is limited in Appwrite, so we'll get all and filter)
      const allCustomers = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: CUSTOMERS_TABLE_ID, queries: [] });

      const searchLower = searchTerm.toLowerCase();
      const nameResults = allCustomers.rows.filter(
        (customer: any) =>
          customer.full_name.toLowerCase().includes(searchLower) ||
          customer.email?.toLowerCase().includes(searchLower)
      );

      // Combine and deduplicate results
      const allResults = [...phoneResults.rows, ...nameResults];
      const uniqueResults = allResults.filter(
        (customer, index, self) =>
          index === self.findIndex((c) => c.$id === customer.$id)
      );

      return uniqueResults as unknown as Customer[];
    } catch (error) {
      console.error("Error searching customers:", error);
      return [];
    }
  }

  /**
   * Get product sales analytics
   */
  static async getProductAnalytics(productId?: string): Promise<{
    products: Array<{
      product: Product;
      totalSold: number;
      totalRevenue: number;
      orderCount: number;
      averagePrice: number;
      lastOrderDate: string;
    }>;
  }> {
    try {
      const queries: string[] = [];
      if (productId) {
        queries.push(`product_id=${productId}`);
      }

      const orderItemsResponse = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: ORDER_ITEMS_TABLE_ID, queries: queries });

      const orderItems = orderItemsResponse.rows as any[];

      // Group by product
      const productStats: Record<
        string,
        {
          totalSold: number;
          totalRevenue: number;
          orderCount: number;
          priceSum: number;
          lastOrderDate: string;
          productName: string;
        }
      > = {};

      orderItems.forEach((item) => {
        const pid = item.product_id;
        if (!productStats[pid]) {
          productStats[pid] = {
            totalSold: 0,
            totalRevenue: 0,
            orderCount: 0,
            priceSum: 0,
            lastOrderDate: item.$createdAt,
            productName: item.product_name,
          };
        }

        productStats[pid].totalSold += item.quantity_kg;
        productStats[pid].totalRevenue += item.total_after_discount;
        productStats[pid].orderCount += 1;
        productStats[pid].priceSum += item.price_per_kg_at_order;

        if (
          new Date(item.$createdAt) > new Date(productStats[pid].lastOrderDate)
        ) {
          productStats[pid].lastOrderDate = item.$createdAt;
        }
      });

      // Get product details and combine with stats
      const products = [];
      for (const [productId, stats] of Object.entries(productStats)) {
        try {
          const product = (await tablesDB.getRow({ databaseId: DATABASE_ID, tableId: PRODUCTS_TABLE_ID, rowId: productId })) as unknown as Product;

          products.push({
            product,
            totalSold: stats.totalSold,
            totalRevenue: stats.totalRevenue,
            orderCount: stats.orderCount,
            averagePrice: stats.priceSum / stats.orderCount,
            lastOrderDate: stats.lastOrderDate,
          });
        } catch (error) {
          // Product might be deleted, use cached name
          products.push({
            product: {
              $id: productId,
              name: stats.productName,
              description: "Product deleted",
              base_price_per_kg: 0,
              has_tier_pricing: false,
              available: false,
              $createdAt: "",
            } as Product,
            totalSold: stats.totalSold,
            totalRevenue: stats.totalRevenue,
            orderCount: stats.orderCount,
            averagePrice: stats.priceSum / stats.orderCount,
            lastOrderDate: stats.lastOrderDate,
          });
        }
      }

      // Sort by total revenue
      products.sort((a, b) => b.totalRevenue - a.totalRevenue);

      return { products };
    } catch (error) {
      console.error("Error fetching product analytics:", error);
      return { products: [] };
    }
  }

  /**
   * Export orders to CSV format
   */
  static async exportOrdersToCSV(
    startDate?: Date,
    endDate?: Date,
    status?: string
  ): Promise<string> {
    try {
      const { orders } = await this.getOrders(1, 1000, status); // Get up to 1000 orders

      let filteredOrders = orders;
      if (startDate || endDate) {
        filteredOrders = orders.filter((order) => {
          const orderDate = new Date(order.$createdAt);
          if (startDate && orderDate < startDate) return false;
          if (endDate && orderDate > endDate) return false;
          return true;
        });
      }

      // CSV headers
      const headers = [
        "Order ID",
        "Date",
        "Customer Name",
        "Phone",
        "Email",
        "Status",
        "Items",
        "Total Weight (kg)",
        "Total Price",
        "Address",
        "Coordinates",
      ];

      // CSV rows
      const rows = filteredOrders.map((order) => [
        order.$id,
        new Date(order.$createdAt).toLocaleDateString(),
        order.customer.full_name,
        order.customer.phone,
        order.customer.email || "",
        order.status,
        order.items
          .map((item) => `${item.product_name} (${item.quantity_kg}kg)`)
          .join("; "),
        order.total_weight_kg || 0,
        order.total_price,
        order.address?.address_line || "N/A",
        order.address ? `${order.address.latitude}, ${order.address.longitude}` : "N/A",
      ]);

      // Combine headers and rows
      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

      return csvContent;
    } catch (error) {
      console.error("Error exporting orders to CSV:", error);
      throw error;
    }
  }
}
