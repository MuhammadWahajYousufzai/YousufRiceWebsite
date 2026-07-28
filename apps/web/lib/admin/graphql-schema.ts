import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from "graphql";
import {
  getAdminCustomers,
  getDashboardOverview,
  getStaffPerformance,
} from "./graphql-data";

const DashboardStatsType = new GraphQLObjectType({
  name: "DashboardStats",
  fields: {
    totalOrders: { type: new GraphQLNonNull(GraphQLInt) },
    monthlyRevenue: { type: new GraphQLNonNull(GraphQLFloat) },
    lifetimeRevenue: { type: new GraphQLNonNull(GraphQLFloat) },
    websiteMonthlyRevenue: { type: new GraphQLNonNull(GraphQLFloat) },
    websiteLifetimeRevenue: { type: new GraphQLNonNull(GraphQLFloat) },
    agentMonthlyRevenue: { type: new GraphQLNonNull(GraphQLFloat) },
    agentLifetimeRevenue: { type: new GraphQLNonNull(GraphQLFloat) },
    totalProducts: { type: new GraphQLNonNull(GraphQLInt) },
    totalCustomers: { type: new GraphQLNonNull(GraphQLInt) },
    pendingOrders: { type: new GraphQLNonNull(GraphQLInt) },
    acceptedOrders: { type: new GraphQLNonNull(GraphQLInt) },
    outForDeliveryOrders: { type: new GraphQLNonNull(GraphQLInt) },
    deliveredOrders: { type: new GraphQLNonNull(GraphQLInt) },
    availableProducts: { type: new GraphQLNonNull(GraphQLInt) },
    lowStockProducts: { type: new GraphQLNonNull(GraphQLInt) },
    revenueGrowth: { type: new GraphQLNonNull(GraphQLFloat) },
    ordersGrowth: { type: new GraphQLNonNull(GraphQLFloat) },
    analyticsTruncated: { type: new GraphQLNonNull(GraphQLBoolean) },
  },
});

const RecentOrderType = new GraphQLObjectType({
  name: "RecentOrder",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    status: { type: new GraphQLNonNull(GraphQLString) },
    totalPrice: { type: new GraphQLNonNull(GraphQLFloat) },
  },
});

const TopProductType = new GraphQLObjectType({
  name: "TopProduct",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    count: { type: new GraphQLNonNull(GraphQLFloat) },
    revenue: { type: new GraphQLNonNull(GraphQLFloat) },
  },
});

const DashboardOverviewType = new GraphQLObjectType({
  name: "DashboardOverview",
  fields: {
    stats: { type: new GraphQLNonNull(DashboardStatsType) },
    recentOrders: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(RecentOrderType))
      ),
    },
    topProducts: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(TopProductType))
      ),
    },
    generatedAt: { type: new GraphQLNonNull(GraphQLString) },
  },
});

const CustomerWithStatsType = new GraphQLObjectType({
  name: "CustomerWithStats",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    fullName: { type: new GraphQLNonNull(GraphQLString) },
    phone: { type: new GraphQLNonNull(GraphQLString) },
    email: { type: GraphQLString },
    orderCount: { type: new GraphQLNonNull(GraphQLInt) },
    totalSpent: { type: new GraphQLNonNull(GraphQLFloat) },
    city: { type: GraphQLString },
  },
});

const AdminCustomersPayloadType = new GraphQLObjectType({
  name: "AdminCustomersPayload",
  fields: {
    customers: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(CustomerWithStatsType))
      ),
    },
    total: { type: new GraphQLNonNull(GraphQLInt) },
    totalRevenue: { type: new GraphQLNonNull(GraphQLFloat) },
    avgOrdersPerCustomer: { type: new GraphQLNonNull(GraphQLFloat) },
    topCustomer: { type: CustomerWithStatsType },
    truncated: { type: new GraphQLNonNull(GraphQLBoolean) },
    generatedAt: { type: new GraphQLNonNull(GraphQLString) },
  },
});

const AgentStatsType = new GraphQLObjectType({
  name: "AgentStats",
  fields: {
    totalOrders: { type: new GraphQLNonNull(GraphQLInt) },
    totalRevenue: { type: new GraphQLNonNull(GraphQLFloat) },
    totalWeight: { type: new GraphQLNonNull(GraphQLFloat) },
  },
});

const StaffStatsType = new GraphQLObjectType({
  name: "StaffStats",
  fields: {
    sAgent: { type: new GraphQLNonNull(AgentStatsType) },
    kAgent: { type: new GraphQLNonNull(AgentStatsType) },
    direct: { type: new GraphQLNonNull(AgentStatsType) },
    total: { type: new GraphQLNonNull(AgentStatsType) },
  },
});

const StaffPerformancePayloadType = new GraphQLObjectType({
  name: "StaffPerformancePayload",
  fields: {
    stats: { type: new GraphQLNonNull(StaffStatsType) },
    generatedAt: { type: new GraphQLNonNull(GraphQLString) },
    truncated: { type: new GraphQLNonNull(GraphQLBoolean) },
  },
});

const StaffDateFilterEnum = new GraphQLEnumType({
  name: "StaffDateFilter",
  values: {
    TODAY: { value: "today" },
    WEEK: { value: "week" },
    MONTH: { value: "month" },
    CUSTOM: { value: "custom" },
  },
});

const QueryType = new GraphQLObjectType({
  name: "Query",
  fields: {
    adminDashboardOverview: {
      type: new GraphQLNonNull(DashboardOverviewType),
      resolve: () => getDashboardOverview(),
    },
    adminCustomers: {
      type: new GraphQLNonNull(AdminCustomersPayloadType),
      resolve: () => getAdminCustomers(),
    },
    staffPerformance: {
      type: new GraphQLNonNull(StaffPerformancePayloadType),
      args: {
        dateFilter: { type: new GraphQLNonNull(StaffDateFilterEnum) },
        startDate: { type: GraphQLString },
        endDate: { type: GraphQLString },
      },
      resolve: (_source, args) =>
        getStaffPerformance({
          dateFilter: args.dateFilter,
          startDate: args.startDate,
          endDate: args.endDate,
        }),
    },
  },
});

export const adminGraphQLSchema = new GraphQLSchema({
  query: QueryType,
});
