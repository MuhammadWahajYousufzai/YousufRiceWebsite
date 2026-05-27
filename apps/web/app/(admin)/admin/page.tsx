"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  ShoppingBag,
  Users,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Image as ImageIcon,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  BarChart3,
  Activity,
  Calendar,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import { clearImageCache } from "@/lib/actions/cache-actions";
import AdminAuthGuard from "@/components/admin/AdminAuthGuard";
import ReadOnlyGuard from "@/components/admin/ReadOnlyGuard";
import {
  createAdminAuthHeaders,
  requestAdminGraphQL,
} from "@/lib/admin/graphql-client";
import { useAuthStore } from "@/lib/store/auth-store";

const ADMIN_DASHBOARD_QUERY = `
  query AdminDashboardOverview {
    adminDashboardOverview {
      stats {
        totalOrders
        monthlyRevenue
        lifetimeRevenue
        totalProducts
        totalCustomers
        availableProducts
        lowStockProducts
        revenueGrowth
        ordersGrowth
      }
      recentOrders {
        id
        createdAt
        totalPrice
      }
      topProducts {
        id
        name
        count
        revenue
      }
    }
  }
`;

type AdminDashboardResponse = {
  adminDashboardOverview: {
    stats: {
      totalOrders: number;
      monthlyRevenue: number;
      lifetimeRevenue: number;
      totalProducts: number;
      totalCustomers: number;
      availableProducts: number;
      lowStockProducts: number;
      revenueGrowth: number;
      ordersGrowth: number;
    };
    recentOrders: Array<{
      id: string;
      createdAt: string;
      totalPrice: number;
    }>;
    topProducts: Array<{
      id: string;
      name: string;
      count: number;
      revenue: number;
    }>;
  };
};

type DashboardTopProduct =
  AdminDashboardResponse["adminDashboardOverview"]["topProducts"][number];

type DashboardStats =
  AdminDashboardResponse["adminDashboardOverview"]["stats"];

type DashboardRecentOrder = {
  $id: string;
  $createdAt: string;
  total_price: number;
};

type LegacyDashboardStatsResponse = {
  stats?: {
    totalOrders?: number;
    totalRevenue?: number;
    monthlyRevenue?: number;
    lifetimeRevenue?: number;
    totalProducts?: number;
    totalCustomers?: number;
    availableProducts?: number;
    lowStockProducts?: number;
    revenueGrowth?: number;
    ordersGrowth?: number;
  };
};

const EMPTY_DASHBOARD_STATS: DashboardStats = {
  totalOrders: 0,
  monthlyRevenue: 0,
  lifetimeRevenue: 0,
  totalProducts: 0,
  totalCustomers: 0,
  availableProducts: 0,
  lowStockProducts: 0,
  revenueGrowth: 0,
  ordersGrowth: 0,
};

const DASHBOARD_RETRY_DELAY_MS = 900;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchDashboardOverviewWithRetry() {
  try {
    return await requestAdminGraphQL<AdminDashboardResponse>(
      ADMIN_DASHBOARD_QUERY
    );
  } catch (error) {
    await wait(DASHBOARD_RETRY_DELAY_MS);

    try {
      return await requestAdminGraphQL<AdminDashboardResponse>(
        ADMIN_DASHBOARD_QUERY
      );
    } catch {
      throw error;
    }
  }
}

async function fetchLegacyDashboardStats(): Promise<DashboardStats | null> {
  const authHeaders = await createAdminAuthHeaders();
  const response = await fetch("/api/admin/stats", {
    credentials: "include",
    headers: authHeaders,
  });

  if (!response.ok) {
    return null;
  }

  const payload =
    (await response.json().catch(() => ({}))) as LegacyDashboardStatsResponse;

  if (!payload.stats) {
    return null;
  }

  return {
    totalOrders: payload.stats.totalOrders ?? 0,
    monthlyRevenue:
      payload.stats.monthlyRevenue ?? payload.stats.totalRevenue ?? 0,
    lifetimeRevenue:
      payload.stats.lifetimeRevenue ?? payload.stats.totalRevenue ?? 0,
    totalProducts: payload.stats.totalProducts ?? 0,
    totalCustomers: payload.stats.totalCustomers ?? 0,
    availableProducts: payload.stats.availableProducts ?? 0,
    lowStockProducts: payload.stats.lowStockProducts ?? 0,
    revenueGrowth: payload.stats.revenueGrowth ?? 0,
    ordersGrowth: payload.stats.ordersGrowth ?? 0,
  };
}

function StatDisplay({
  children,
  className,
  loading,
  unavailable,
}: {
  children: ReactNode;
  className: string;
  loading: boolean;
  unavailable: boolean;
}) {
  return (
    <p className={className}>
      {loading ? (
        <span className="text-base font-semibold text-gray-500">Loading</span>
      ) : unavailable ? (
        <span className="text-base font-semibold text-red-600">Unavailable</span>
      ) : (
        children
      )}
    </p>
  );
}

export default function AdminDashboard() {
  const { hasReadPermission, loading: authLoading } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<DashboardRecentOrder[]>([]);
  const [topProducts, setTopProducts] = useState<DashboardTopProduct[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [revalidating, setRevalidating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      if (authLoading) return;

      if (!hasReadPermission()) {
        setDashboardLoading(false);
        return;
      }

      setDashboardLoading(true);
      setDashboardError(null);

      try {
        const data = await fetchDashboardOverviewWithRetry();
        const overview = data.adminDashboardOverview;

        if (cancelled) return;

        setStats({
          ...overview.stats,
        });

        setRecentOrders(
          overview.recentOrders.map((order) => ({
            $id: order.id,
            $createdAt: order.createdAt,
            total_price: order.totalPrice,
          }))
        );
        setTopProducts(overview.topProducts);
      } catch (error) {
        if (cancelled) return;

        console.error("Error fetching stats:", error);
        const message =
          error instanceof Error ? error.message : "Failed to load dashboard stats";
        const fallbackStats = await fetchLegacyDashboardStats().catch(() => null);

        if (cancelled) return;

        if (fallbackStats) {
          setStats(fallbackStats);
          setRecentOrders([]);
          setTopProducts([]);
          setDashboardError(null);
          return;
        }

        setDashboardError(message);
        toast.error(
          error instanceof Error
            ? `Failed to load dashboard stats: ${error.message}`
            : "Failed to load dashboard stats"
        );
      } finally {
        if (!cancelled) {
          setDashboardLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      cancelled = true;
    };
  }, [authLoading, hasReadPermission]);

  const currentStats = stats ?? EMPTY_DASHBOARD_STATS;
  const statsLoading = dashboardLoading && !stats;
  const statsUnavailable = Boolean(dashboardError && !stats);

  const handleRevalidateImages = async () => {
    setRevalidating(true);
    try {
      // Use Server Action with updateTag for immediate cache clearing
      const result = await clearImageCache();

      if (result.success) {
        toast.success(result.message || "Image cache cleared successfully!");
        // Force a page refresh to show the cleared cache immediately
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to clear image cache");
      }
    } catch (error) {
      console.error("Error clearing cache:", error);
      toast.error("Failed to clear image cache");
    } finally {
      setRevalidating(false);
    }
  };

  return (
    <AdminAuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Admin Dashboard
            </h1>
            <p className="text-lg text-gray-600 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Real-time business insights and analytics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success" className="text-sm px-3 py-1">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              System Online
            </Badge>
            <Badge variant="info" className="text-sm px-3 py-1">
              <Calendar className="w-3 h-3 mr-1" />
              {new Date().toLocaleDateString()}
            </Badge>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Monthly Revenue</p>
                  <StatDisplay
                    className="text-3xl font-bold text-green-600"
                    loading={statsLoading}
                    unavailable={statsUnavailable}
                  >
                    {formatCurrency(currentStats.monthlyRevenue)}
                  </StatDisplay>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="flex items-center text-sm">
                {statsLoading ? (
                  <span className="text-gray-500">Loading trends</span>
                ) : statsUnavailable ? (
                  <span className="text-red-600">Stats unavailable</span>
                ) : currentStats.revenueGrowth >= 0 ? (
                  <>
                    <ArrowUpRight className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-green-600 font-medium">
                      +{Math.round(currentStats.revenueGrowth)}%
                    </span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="w-4 h-4 text-red-600 mr-1" />
                    <span className="text-red-600 font-medium">
                      {Math.round(currentStats.revenueGrowth)}%
                    </span>
                  </>
                )}
                <span className="text-gray-500 ml-2">vs last month (MTD)</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Lifetime Revenue</p>
                  <StatDisplay
                    className="text-3xl font-bold text-emerald-600"
                    loading={statsLoading}
                    unavailable={statsUnavailable}
                  >
                    {formatCurrency(currentStats.lifetimeRevenue)}
                  </StatDisplay>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
              <div className="flex items-center text-sm">
                <TrendingUp className="w-4 h-4 text-emerald-600 mr-1" />
                <span className="text-gray-600">Total earnings</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Orders</p>
                  <StatDisplay
                    className="text-3xl font-bold text-blue-600"
                    loading={statsLoading}
                    unavailable={statsUnavailable}
                  >
                    {currentStats.totalOrders}
                  </StatDisplay>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="flex items-center text-sm">
                <BarChart3 className="w-4 h-4 text-blue-600 mr-1" />
                <span className="text-gray-600">
                  {statsLoading
                    ? "Loading"
                    : statsUnavailable
                      ? "Unavailable"
                      : "All orders"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Products</p>
                  <StatDisplay
                    className="text-3xl font-bold text-purple-600"
                    loading={statsLoading}
                    unavailable={statsUnavailable}
                  >
                    {currentStats.totalProducts}
                  </StatDisplay>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Package className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="flex items-center text-sm">
                <CheckCircle2 className="w-4 h-4 text-purple-600 mr-1" />
                <span className="text-gray-600">
                  {statsLoading
                    ? "Loading"
                    : statsUnavailable
                      ? "Unavailable"
                      : `${currentStats.availableProducts} available`}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Customers</p>
                  <StatDisplay
                    className="text-3xl font-bold text-orange-600"
                    loading={statsLoading}
                    unavailable={statsUnavailable}
                  >
                    {currentStats.totalCustomers}
                  </StatDisplay>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <div className="flex items-center text-sm">
                <TrendingUp className="w-4 h-4 text-orange-600 mr-1" />
                <span className="text-gray-600">Active users</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  Recent Orders
                </span>
                <ReadOnlyGuard>
                  <Link href="/admin/orders">
                    <Button variant="outline" size="sm">
                      View All
                    </Button>
                  </Link>
                </ReadOnlyGuard>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <p className="text-center text-gray-500 py-8">
                  Loading recent orders
                </p>
              ) : statsUnavailable ? (
                <p className="text-center text-red-600 py-8">
                  Recent orders unavailable
                </p>
              ) : recentOrders.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No recent orders
                </p>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div
                      key={order.$id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <div>
                          <p className="font-medium text-sm">
                            Order #{order.$id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(order.$createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(order.total_price)}
                        </p>
                        <ReadOnlyGuard>
                          <Link href={`/admin/orders/${order.$id}`}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs"
                            >
                              View
                            </Button>
                          </Link>
                        </ReadOnlyGuard>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Top Selling Products
                </span>
                <ReadOnlyGuard>
                  <Link href="/admin/products">
                    <Button variant="outline" size="sm">
                      View All
                    </Button>
                  </Link>
                </ReadOnlyGuard>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <p className="text-center text-gray-500 py-8">
                  Loading product data
                </p>
              ) : statsUnavailable ? (
                <p className="text-center text-red-600 py-8">
                  Product data unavailable
                </p>
              ) : topProducts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No product data available
                </p>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-gray-500">
                            {product.count} kg sold
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(product.revenue)}
                        </p>
                        <p className="text-xs text-gray-500">Revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              System Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <ReadOnlyGuard>
                <Button
                  onClick={handleRevalidateImages}
                  disabled={revalidating}
                  className="flex items-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  {revalidating ? "Clearing Cache..." : "Clear Cache"}
                </Button>
              </ReadOnlyGuard>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminAuthGuard>
  );
}
