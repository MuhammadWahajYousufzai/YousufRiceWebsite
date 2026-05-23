"use client";

import { useEffect, useState } from "react";
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
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  BarChart3,
  Activity,
  Calendar,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import { clearImageCache } from "@/lib/actions/cache-actions";
import { Order } from "@/lib/types";
import AdminAuthGuard from "@/components/admin/AdminAuthGuard";
import ReadOnlyGuard from "@/components/admin/ReadOnlyGuard";
import { requestAdminGraphQL } from "@/lib/admin/graphql-client";
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
        pendingOrders
        acceptedOrders
        outForDeliveryOrders
        deliveredOrders
        availableProducts
        lowStockProducts
        revenueGrowth
        ordersGrowth
      }
      recentOrders {
        id
        createdAt
        status
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
      pendingOrders: number;
      acceptedOrders: number;
      outForDeliveryOrders: number;
      deliveredOrders: number;
      availableProducts: number;
      lowStockProducts: number;
      revenueGrowth: number;
      ordersGrowth: number;
    };
    recentOrders: Array<{
      id: string;
      createdAt: string;
      status: Order["status"];
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

export default function AdminDashboard() {
  const { hasReadPermission, loading: authLoading } = useAuthStore();
  const [stats, setStats] = useState({
    totalOrders: 0,
    monthlyRevenue: 0,
    lifetimeRevenue: 0,
    totalProducts: 0,
    totalCustomers: 0,
    pendingOrders: 0,
    acceptedOrders: 0,
    outForDeliveryOrders: 0,
    deliveredOrders: 0,
    availableProducts: 0,
    lowStockProducts: 0,
    revenueGrowth: 0,
    ordersGrowth: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topProducts, setTopProducts] = useState<DashboardTopProduct[]>([]);
  const [revalidating, setRevalidating] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (authLoading || !hasReadPermission()) return;

      try {
        const data = await requestAdminGraphQL<AdminDashboardResponse>(
          ADMIN_DASHBOARD_QUERY
        );
        const overview = data.adminDashboardOverview;

        setStats({
          ...overview.stats,
        });

        setRecentOrders(
          overview.recentOrders.map((order) => ({
            $id: order.id,
            $createdAt: order.createdAt,
            status: order.status,
            total_price: order.totalPrice,
          })) as Order[]
        );
        setTopProducts(overview.topProducts);
      } catch (error) {
        console.error("Error fetching stats:", error);
        toast.error(
          error instanceof Error
            ? `Failed to load dashboard stats: ${error.message}`
            : "Failed to load dashboard stats"
        );
      }
    };

    fetchStats();
  }, [authLoading, hasReadPermission]);

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
                  <p className="text-3xl font-bold text-green-600">
                    {formatCurrency(stats.monthlyRevenue)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="flex items-center text-sm">
                {stats.revenueGrowth >= 0 ? (
                  <>
                    <ArrowUpRight className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-green-600 font-medium">
                      +{Math.round(stats.revenueGrowth)}%
                    </span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="w-4 h-4 text-red-600 mr-1" />
                    <span className="text-red-600 font-medium">
                      {Math.round(stats.revenueGrowth)}%
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
                  <p className="text-3xl font-bold text-emerald-600">
                    {formatCurrency(stats.lifetimeRevenue)}
                  </p>
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
                  <p className="text-3xl font-bold text-blue-600">
                    {stats.totalOrders}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="flex items-center text-sm">
                <BarChart3 className="w-4 h-4 text-blue-600 mr-1" />
                <span className="text-gray-600">
                  {stats.deliveredOrders} delivered
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Products</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {stats.totalProducts}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Package className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="flex items-center text-sm">
                <CheckCircle2 className="w-4 h-4 text-purple-600 mr-1" />
                <span className="text-gray-600">
                  {stats.availableProducts} available
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Customers</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {stats.totalCustomers}
                  </p>
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

        {/* Order Status Pipeline */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Order Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-900">
                    {stats.pendingOrders}
                  </p>
                  <p className="text-sm text-yellow-700">Pending</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-900">
                    {stats.acceptedOrders}
                  </p>
                  <p className="text-sm text-blue-700">Accepted</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Truck className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-900">
                    {stats.outForDeliveryOrders}
                  </p>
                  <p className="text-sm text-purple-700">Out for Delivery</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-900">
                    {stats.deliveredOrders}
                  </p>
                  <p className="text-sm text-green-700">Delivered</p>
                </div>
              </div>
            </div>
            {stats.pendingOrders > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-900">
                    {stats.pendingOrders} order
                    {stats.pendingOrders !== 1 ? "s" : ""} need
                    {stats.pendingOrders === 1 ? "s" : ""} your attention
                  </span>
                </div>
                <ReadOnlyGuard>
                  <Link href="/admin/orders">
                    <Button
                      size="sm"
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      Review Orders
                    </Button>
                  </Link>
                </ReadOnlyGuard>
              </div>
            )}
          </CardContent>
        </Card>

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
              {recentOrders.length === 0 ? (
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
                        <div
                          className={`w-2 h-2 rounded-full ${order.status === "pending"
                            ? "bg-yellow-500"
                            : order.status === "accepted"
                              ? "bg-blue-500"
                              : order.status === "out_for_delivery"
                                ? "bg-purple-500"
                                : "bg-green-500"
                            }`}
                        />
                        <div>
                          <p className="font-medium text-sm">
                            Order #{order.$id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(order.$createdAt).toLocaleDateString()} •{" "}
                            {order.status.replace("_", " ")}
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
              {topProducts.length === 0 ? (
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
