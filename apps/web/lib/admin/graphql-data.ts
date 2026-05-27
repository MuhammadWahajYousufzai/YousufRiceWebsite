import { Client, Query, TablesDB } from "node-appwrite";

type AppwriteRow = {
  $id: string;
  $createdAt: string;
  [key: string]: unknown;
};

type RowListResult<T extends AppwriteRow> = {
  rows: T[];
  total: number;
  truncated: boolean;
};

type CacheEntry<T> = {
  expiresAt: number;
  value?: T;
  promise?: Promise<T>;
};

export type DashboardStats = {
  totalOrders: number;
  monthlyRevenue: number;
  lifetimeRevenue: number;
  totalProducts: number;
  totalCustomers: number;
  pendingOrders: number;
  acceptedOrders: number;
  outForDeliveryOrders: number;
  deliveredOrders: number;
  availableProducts: number;
  lowStockProducts: number;
  revenueGrowth: number;
  ordersGrowth: number;
  analyticsTruncated: boolean;
};

export type DashboardRecentOrder = {
  id: string;
  createdAt: string;
  status: string;
  totalPrice: number;
};

export type DashboardTopProduct = {
  id: string;
  name: string;
  count: number;
  revenue: number;
};

export type DashboardOverview = {
  stats: DashboardStats;
  recentOrders: DashboardRecentOrder[];
  topProducts: DashboardTopProduct[];
  generatedAt: string;
};

export type CustomerWithStats = {
  id: string;
  createdAt: string;
  fullName: string;
  phone: string;
  email: string | null;
  orderCount: number;
  totalSpent: number;
  city: string | null;
};

export type AdminCustomersPayload = {
  customers: CustomerWithStats[];
  total: number;
  totalRevenue: number;
  avgOrdersPerCustomer: number;
  topCustomer: CustomerWithStats | null;
  truncated: boolean;
  generatedAt: string;
};

export type AgentStats = {
  totalOrders: number;
  totalRevenue: number;
  totalWeight: number;
};

export type StaffPerformancePayload = {
  stats: {
    sAgent: AgentStats;
    kAgent: AgentStats;
    direct: AgentStats;
    total: AgentStats;
  };
  generatedAt: string;
  truncated: boolean;
};

type OrderSummaryRow = AppwriteRow & {
  customer_id?: string;
  address_id?: string;
  order_items?: string;
  status?: string;
  total_price?: number;
  total_weight_kg?: number;
};

type OrderItemSummaryRow = AppwriteRow & {
  product_id?: string;
  product_name?: string;
  quantity_kg?: number;
  total_after_discount?: number;
};

type ProductSummaryRow = AppwriteRow & {
  name?: string;
  available?: boolean;
};

type CustomerSummaryRow = AppwriteRow & {
  full_name?: string;
  phone?: string;
  email?: string | null;
};

type AddressSummaryRow = AppwriteRow & {
  customer_id?: string;
  city?: string | null;
};

const PAGE_SIZE = 100;
const DASHBOARD_TTL_MS = 45_000;
const CUSTOMERS_TTL_MS = 60_000;
const STAFF_TTL_MS = 45_000;
const CUSTOMER_NAMES_TTL_MS = 120_000;
const MAX_ANALYTICS_ROWS = numberFromEnv("ADMIN_GRAPHQL_MAX_ANALYTICS_ROWS", 10_000);
const MAX_ORDER_ITEM_ROWS = numberFromEnv("ADMIN_GRAPHQL_MAX_ORDER_ITEM_ROWS", 20_000);
const MAX_CUSTOMER_ROWS = numberFromEnv("ADMIN_GRAPHQL_MAX_CUSTOMER_ROWS", 10_000);
const MAX_ADDRESS_ROWS = numberFromEnv("ADMIN_GRAPHQL_MAX_ADDRESS_ROWS", 10_000);

const cache = new Map<string, CacheEntry<unknown>>();
let tablesDB: TablesDB | null = null;

function numberFromEnv(key: string, fallback: number) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getTablesDB() {
  if (tablesDB) return tablesDB;

  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;

  if (!endpoint || !projectId || !apiKey) {
    throw new Error("Missing Appwrite server configuration for admin GraphQL");
  }

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  tablesDB = new TablesDB(client);
  return tablesDB;
}

function databaseId() {
  const id = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
  if (!id) throw new Error("Missing NEXT_PUBLIC_APPWRITE_DATABASE_ID");
  return id;
}

function tableId(key: string) {
  const id = process.env[key];
  if (!id) throw new Error(`Missing ${key}`);
  return id;
}

function ordersTableId() {
  return tableId("NEXT_PUBLIC_APPWRITE_ORDERS_TABLE_ID");
}

function orderItemsTableId() {
  return tableId("NEXT_PUBLIC_APPWRITE_ORDER_ITEMS_TABLE_ID");
}

function productsTableId() {
  return tableId("NEXT_PUBLIC_APPWRITE_PRODUCTS_TABLE_ID");
}

function customersTableId() {
  return tableId("NEXT_PUBLIC_APPWRITE_CUSTOMERS_TABLE_ID");
}

function addressesTableId() {
  return tableId("NEXT_PUBLIC_APPWRITE_ADDRESSES_TABLE_ID");
}

async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key) as CacheEntry<T> | undefined;

  if (entry?.value && entry.expiresAt > now) {
    return entry.value;
  }

  if (entry?.promise) {
    return entry.promise;
  }

  const promise = loader()
    .then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      pruneCache();
      return value;
    })
    .catch((error) => {
      cache.delete(key);
      throw error;
    });

  cache.set(key, { promise, expiresAt: now + ttlMs });
  return promise;
}

function pruneCache() {
  if (cache.size <= 50) return;

  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now && !entry.promise) {
      cache.delete(key);
    }
  }

  while (cache.size > 50) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) return;
    cache.delete(oldestKey);
  }
}

async function listRowsPage<T extends AppwriteRow>(
  tableIdValue: string,
  queries: string[]
) {
  const response = await getTablesDB().listRows({
    databaseId: databaseId(),
    tableId: tableIdValue,
    queries,
  });

  return {
    rows: response.rows as unknown as T[],
    total: response.total ?? response.rows.length,
  };
}

async function fetchAllRows<T extends AppwriteRow>({
  tableIdValue,
  queries = [],
  select,
  maxRows,
}: {
  tableIdValue: string;
  queries?: string[];
  select?: string[];
  maxRows: number;
}): Promise<RowListResult<T>> {
  const rows: T[] = [];
  let cursor: string | null = null;
  let total = 0;

  while (rows.length < maxRows) {
    const pageLimit = Math.min(PAGE_SIZE, maxRows - rows.length);
    const pageQueries = [...queries, Query.limit(pageLimit)];

    if (select) {
      pageQueries.push(Query.select(select));
    }

    if (cursor) {
      pageQueries.push(Query.cursorAfter(cursor));
    }

    const page = await listRowsPage<T>(tableIdValue, pageQueries);
    total = page.total;

    if (page.rows.length === 0) {
      break;
    }

    rows.push(...page.rows);
    cursor = page.rows[page.rows.length - 1].$id;

    if (page.rows.length < pageLimit) {
      break;
    }
  }

  return {
    rows,
    total,
    truncated: rows.length < total,
  };
}

async function countRows(tableIdValue: string, queries: string[] = []) {
  const response = await listRowsPage<AppwriteRow>(tableIdValue, [
    ...queries,
    Query.limit(1),
  ]);

  return response.total;
}

function activeRevenue(orders: OrderSummaryRow[]) {
  return orders.reduce((sum, order) => {
    if (order.status === "returned") return sum;
    return sum + toNumber(order.total_price);
  }, 0);
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function buildMonthWindows(now: Date) {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();

  const thisMonthStart = new Date(currentYear, currentMonth, 1);
  const nextMonthStart = new Date(currentYear, currentMonth + 1, 1);
  const lastMonthStart = new Date(currentYear, currentMonth - 1, 1);
  const daysInLastMonth = new Date(currentYear, currentMonth, 0).getDate();
  const compareDate = Math.min(currentDate, daysInLastMonth);
  const lastMonthEnd = new Date(
    currentYear,
    currentMonth - 1,
    compareDate,
    23,
    59,
    59,
    999
  );

  return {
    thisMonthStart,
    nextMonthStart,
    lastMonthStart,
    lastMonthEnd,
  };
}

function inWindow(value: string | undefined, start: Date, end: Date) {
  if (!value) return false;
  const date = new Date(value);
  return date >= start && date < end;
}

function inClosedWindow(value: string | undefined, start: Date, end: Date) {
  if (!value) return false;
  const date = new Date(value);
  return date >= start && date <= end;
}

async function fetchOrderSummaries(maxRows = MAX_ANALYTICS_ROWS) {
  return fetchAllRows<OrderSummaryRow>({
    tableIdValue: ordersTableId(),
    queries: [Query.orderDesc("$createdAt")],
    select: [
      "$id",
      "$createdAt",
      "customer_id",
      "address_id",
      "status",
      "total_price",
      "total_weight_kg",
    ],
    maxRows,
  });
}

async function fetchDashboardOrderSummaries(maxRows = MAX_ANALYTICS_ROWS) {
  return fetchAllRows<OrderSummaryRow>({
    tableIdValue: ordersTableId(),
    queries: [Query.orderDesc("$createdAt")],
    select: [
      "$id",
      "$createdAt",
      "customer_id",
      "address_id",
      "order_items",
      "total_price",
    ],
    maxRows,
  });
}

async function fetchProductSummaries() {
  return fetchAllRows<ProductSummaryRow>({
    tableIdValue: productsTableId(),
    queries: [Query.orderDesc("$createdAt")],
    select: ["$id", "$createdAt", "name", "available"],
    maxRows: 2_000,
  });
}

async function fetchOrderItemSummaries() {
  return fetchAllRows<OrderItemSummaryRow>({
    tableIdValue: orderItemsTableId(),
    queries: [Query.orderDesc("$createdAt")],
    select: [
      "$id",
      "$createdAt",
      "product_id",
      "product_name",
      "quantity_kg",
      "total_after_discount",
    ],
    maxRows: MAX_ORDER_ITEM_ROWS,
  });
}

async function fetchOptionalOrderItemSummaries() {
  try {
    return await fetchOrderItemSummaries();
  } catch (error) {
    console.warn("Dashboard top products unavailable:", error);
    return {
      rows: [] as OrderItemSummaryRow[],
      total: 0,
      truncated: false,
    };
  }
}

async function fetchCustomerSummaries() {
  return fetchAllRows<CustomerSummaryRow>({
    tableIdValue: customersTableId(),
    queries: [Query.orderDesc("$createdAt")],
    select: ["$id", "$createdAt", "full_name", "phone", "email"],
    maxRows: MAX_CUSTOMER_ROWS,
  });
}

async function fetchAddressSummaries() {
  return fetchAllRows<AddressSummaryRow>({
    tableIdValue: addressesTableId(),
    queries: [Query.orderDesc("$createdAt")],
    select: ["$id", "$createdAt", "customer_id", "city"],
    maxRows: MAX_ADDRESS_ROWS,
  });
}

function addTopProductCount(
  productCounts: Map<string, { count: number; revenue: number; name: string }>,
  productId: string,
  count: number,
  revenue: number,
  name: string
) {
  const current =
    productCounts.get(productId) ??
    {
      count: 0,
      revenue: 0,
      name,
    };

  current.count += count;
  current.revenue += revenue;
  productCounts.set(productId, current);
}

function parseOrderItemsSnapshot(orderItems: string | undefined) {
  if (!orderItems) return [];

  return orderItems
    .split(",")
    .map((item) => {
      const [productId, quantityText] = item.split(":");
      const quantity = Number.parseFloat((quantityText || "").replace("kg", ""));

      if (!productId || !Number.isFinite(quantity)) {
        return null;
      }

      return {
        productId,
        quantity,
      };
    })
    .filter((item): item is { productId: string; quantity: number } => Boolean(item));
}

export async function getDashboardOverview() {
  return cached<DashboardOverview>("dashboard-overview", DASHBOARD_TTL_MS, async () => {
    const ordersTable = ordersTableId();
    const now = new Date();

    const [
      ordersResult,
      productsResult,
      customersCount,
      recentOrdersPage,
      orderItemsResult,
    ] = await Promise.all([
      fetchDashboardOrderSummaries(),
      fetchProductSummaries(),
      countRows(customersTableId()),
      listRowsPage<OrderSummaryRow>(ordersTable, [
        Query.orderDesc("$createdAt"),
        Query.limit(5),
        Query.select(["$id", "$createdAt", "total_price"]),
      ]),
      fetchOptionalOrderItemSummaries(),
    ]);

    const orders = ordersResult.rows;
    const products = productsResult.rows;
    const { thisMonthStart, nextMonthStart, lastMonthStart, lastMonthEnd } =
      buildMonthWindows(now);

    const thisMonthOrders = orders.filter((order) =>
      inWindow(order.$createdAt, thisMonthStart, nextMonthStart)
    );
    const lastMonthOrdersMTD = orders.filter((order) =>
      inClosedWindow(order.$createdAt, lastMonthStart, lastMonthEnd)
    );

    const monthlyRevenue = activeRevenue(thisMonthOrders);
    const lastMonthRevenueMTD = activeRevenue(lastMonthOrdersMTD);
    const revenueGrowth =
      lastMonthRevenueMTD > 0
        ? ((monthlyRevenue - lastMonthRevenueMTD) / lastMonthRevenueMTD) * 100
        : 0;

    const ordersGrowth =
      lastMonthOrdersMTD.length > 0
        ? ((thisMonthOrders.length - lastMonthOrdersMTD.length) /
            lastMonthOrdersMTD.length) *
          100
        : 0;

    const productLookup = new Map(
      products.map((product) => [product.$id, product.name || `Product ${product.$id.slice(0, 8)}`])
    );

    const productCounts = new Map<
      string,
      { count: number; revenue: number; name: string }
    >();

    for (const item of orderItemsResult.rows) {
      const productId = item.product_id;
      if (!productId) continue;

      addTopProductCount(
        productCounts,
        productId,
        toNumber(item.quantity_kg),
        toNumber(item.total_after_discount),
        productLookup.get(productId) ||
          item.product_name ||
          `Product ${productId.slice(0, 8)}`
      );
    }

    if (productCounts.size === 0) {
      for (const order of orders) {
        for (const item of parseOrderItemsSnapshot(order.order_items)) {
          addTopProductCount(
            productCounts,
            item.productId,
            item.quantity,
            0,
            productLookup.get(item.productId) ||
              `Product ${item.productId.slice(0, 8)}`
          );
        }
      }
    }

    const topProducts = Array.from(productCounts.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      stats: {
        totalOrders: ordersResult.total,
        monthlyRevenue,
        lifetimeRevenue: activeRevenue(orders),
        totalProducts: productsResult.total,
        totalCustomers: customersCount,
        pendingOrders: 0,
        acceptedOrders: 0,
        outForDeliveryOrders: 0,
        deliveredOrders: 0,
        availableProducts: products.filter((product) => Boolean(product.available)).length,
        lowStockProducts: 0,
        revenueGrowth: roundOne(revenueGrowth),
        ordersGrowth: roundOne(ordersGrowth),
        analyticsTruncated: ordersResult.truncated || orderItemsResult.truncated,
      },
      recentOrders: recentOrdersPage.rows.map((order) => ({
        id: order.$id,
        createdAt: order.$createdAt,
        status: order.status || "pending",
        totalPrice: toNumber(order.total_price),
      })),
      topProducts,
      generatedAt: now.toISOString(),
    };
  });
}

export async function getAdminCustomers() {
  return cached<AdminCustomersPayload>("admin-customers", CUSTOMERS_TTL_MS, async () => {
    const [customersResult, ordersResult, addressesResult] = await Promise.all([
      fetchCustomerSummaries(),
      fetchOrderSummaries(),
      fetchAddressSummaries(),
    ]);

    const statsByCustomer = new Map<string, { orderCount: number; totalSpent: number }>();

    for (const order of ordersResult.rows) {
      if (!order.customer_id) continue;

      const current =
        statsByCustomer.get(order.customer_id) ?? { orderCount: 0, totalSpent: 0 };
      current.orderCount += 1;

      if (order.status !== "returned") {
        current.totalSpent += toNumber(order.total_price);
      }

      statsByCustomer.set(order.customer_id, current);
    }

    const cityByCustomer = new Map<string, string>();
    for (const address of addressesResult.rows) {
      if (!address.customer_id || !address.city || cityByCustomer.has(address.customer_id)) {
        continue;
      }

      cityByCustomer.set(address.customer_id, address.city);
    }

    const customers = customersResult.rows.map<CustomerWithStats>((customer) => {
      const customerStats =
        statsByCustomer.get(customer.$id) ?? { orderCount: 0, totalSpent: 0 };

      return {
        id: customer.$id,
        createdAt: customer.$createdAt,
        fullName: customer.full_name || "Unknown",
        phone: customer.phone || "",
        email: customer.email ?? null,
        orderCount: customerStats.orderCount,
        totalSpent: customerStats.totalSpent,
        city: cityByCustomer.get(customer.$id) ?? null,
      };
    });

    const totalRevenue = customers.reduce((sum, customer) => sum + customer.totalSpent, 0);
    const totalOrders = customers.reduce((sum, customer) => sum + customer.orderCount, 0);
    const topCustomer =
      customers.length > 0
        ? customers.reduce((max, customer) =>
            customer.totalSpent > max.totalSpent ? customer : max
          )
        : null;

    return {
      customers,
      total: customersResult.total,
      totalRevenue,
      avgOrdersPerCustomer: customers.length > 0 ? totalOrders / customers.length : 0,
      topCustomer,
      truncated:
        customersResult.truncated || ordersResult.truncated || addressesResult.truncated,
      generatedAt: new Date().toISOString(),
    };
  });
}

function getAgentType(name = ""): "sAgent" | "kAgent" | "direct" {
  const sPattern = /\s*-\s*[sS]\s*|\s*\(\s*[sS]\s*\)\s*|\b[sS]\b/;
  const kPattern = /\s*-\s*[kK]\s*|\s*\(\s*[kK]\s*\)\s*|\b[kK]\b/;

  if (sPattern.test(name)) return "sAgent";
  if (kPattern.test(name)) return "kAgent";
  return "direct";
}

function initialAgentStats(): AgentStats {
  return {
    totalOrders: 0,
    totalRevenue: 0,
    totalWeight: 0,
  };
}

function dateRangeForFilter(
  dateFilter: "today" | "week" | "month" | "custom",
  startDate?: string | null,
  endDate?: string | null
) {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  if (dateFilter === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (dateFilter === "week") {
    start.setDate(now.getDate() - 7);
  } else if (dateFilter === "month") {
    start.setMonth(now.getMonth() - 1);
  } else {
    if (!startDate || !endDate) {
      throw new Error("Custom staff performance range requires startDate and endDate");
    }

    start = new Date(startDate);
    end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

async function getCustomerNameMap() {
  return cached<Map<string, string>>(
    "customer-name-map",
    CUSTOMER_NAMES_TTL_MS,
    async () => {
      const customersResult = await fetchCustomerSummaries();
      return new Map(
        customersResult.rows.map((customer) => [
          customer.$id,
          customer.full_name || "",
        ])
      );
    }
  );
}

export async function getStaffPerformance(args: {
  dateFilter: "today" | "week" | "month" | "custom";
  startDate?: string | null;
  endDate?: string | null;
}) {
  const cacheKey = `staff-performance:${args.dateFilter}:${args.startDate || ""}:${args.endDate || ""}`;

  return cached<StaffPerformancePayload>(cacheKey, STAFF_TTL_MS, async () => {
    const { start, end } = dateRangeForFilter(
      args.dateFilter,
      args.startDate,
      args.endDate
    );

    const [ordersResult, customerNameMap] = await Promise.all([
      fetchAllRows<OrderSummaryRow>({
        tableIdValue: ordersTableId(),
        queries: [
          Query.greaterThanEqual("$createdAt", start.toISOString()),
          Query.lessThanEqual("$createdAt", end.toISOString()),
          Query.orderDesc("$createdAt"),
        ],
        select: [
          "$id",
          "$createdAt",
          "customer_id",
          "status",
          "total_price",
          "total_weight_kg",
        ],
        maxRows: MAX_ANALYTICS_ROWS,
      }),
      getCustomerNameMap(),
    ]);

    const stats = {
      sAgent: initialAgentStats(),
      kAgent: initialAgentStats(),
      direct: initialAgentStats(),
      total: initialAgentStats(),
    };

    for (const order of ordersResult.rows) {
      if (order.status === "returned") continue;

      const customerName = order.customer_id
        ? customerNameMap.get(order.customer_id) || ""
        : "";
      const agentType = getAgentType(customerName);
      const revenue = toNumber(order.total_price);
      const weight = toNumber(order.total_weight_kg);

      stats[agentType].totalOrders += 1;
      stats[agentType].totalRevenue += revenue;
      stats[agentType].totalWeight += weight;

      stats.total.totalOrders += 1;
      stats.total.totalRevenue += revenue;
      stats.total.totalWeight += weight;
    }

    return {
      stats,
      generatedAt: new Date().toISOString(),
      truncated: ordersResult.truncated,
    };
  });
}
