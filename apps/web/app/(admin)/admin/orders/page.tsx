"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore, AdminPermission } from "@/lib/store/auth-store";
import AdminAuthGuard from "@/components/admin/AdminAuthGuard";
import ReadOnlyGuard from "@/components/admin/ReadOnlyGuard";
import {
  tablesDB,
  DATABASE_ID,
  ORDERS_TABLE_ID,
  CUSTOMERS_TABLE_ID,
  ADDRESSES_TABLE_ID,
  ORDER_ITEMS_TABLE_ID,
} from "@/lib/appwrite";
import { Order, Customer, Address } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import {
  Clock,
  Package,
  Truck,
  CheckCircle,
  ExternalLink,
  Search,
  Filter,
  Download,
  Calendar,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  CheckCircle2,
  RotateCcw,
  Pencil,
  Trash2,
  MapPin,
  Scale,
  Copy,
} from "lucide-react";
import { Query } from "appwrite";
import toast from "react-hot-toast";
import DeleteOrderDialog from "@/components/admin/DeleteOrderDialog";
import EditOrderDialog from "@/components/admin/EditOrderDialog";
import { Loader2 } from "lucide-react";

interface OrderWithCustomer extends Order {
  customer?: Customer;
  address?: Address;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const { hasWritePermission } = useAuthStore();
  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<"all" | Order["status"]>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "week" | "month" | "custom"
  >("all");
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const ORDERS_PER_PAGE = 50;

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithCustomer | null>(
    null
  );

  // Track which orders are currently updating to show specific loading states
  const [updatingOrderIds, setUpdatingOrderIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Reset pagination and reload when filter changes
    setOrders([]);
    setFilteredOrders([]);
    setCurrentPage(1);
    fetchOrders(true);
  }, [filter]);

  useEffect(() => {
    // When search, date filter, or sort changes, reset and reload
    if (dateFilter === "custom" && (!customDateRange.start || !customDateRange.end)) {
      return;
    }
    if (orders.length > 0 || filteredOrders.length > 0) {
      setOrders([]);
      setFilteredOrders([]);
      setCurrentPage(1);
      fetchOrders(true);
    }
  }, [searchQuery, dateFilter, sortBy, customDateRange.start, customDateRange.end]);

  // Handle page changes
  useEffect(() => {
    if (currentPage > 1 || orders.length > 0) {
      fetchOrders(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const fetchOrders = async (reset: boolean = false) => {
    try {
      const isInitialLoad = reset || currentPage === 1;

      if (isInitialLoad) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const queries: string[] = [
        Query.limit(ORDERS_PER_PAGE),
        Query.offset((reset ? 0 : currentPage - 1) * ORDERS_PER_PAGE),
      ];

      // Add status filter
      if (filter !== "all") {
        queries.push(Query.equal("status", filter));
      }

      // Add date filter
      if (dateFilter !== "all") {
        const now = new Date();
        const filterDate = new Date();

        if (dateFilter === "today") {
          filterDate.setHours(0, 0, 0, 0);
          queries.push(Query.greaterThanEqual("$createdAt", filterDate.toISOString()));
        } else if (dateFilter === "week") {
          filterDate.setDate(now.getDate() - 7);
          queries.push(Query.greaterThanEqual("$createdAt", filterDate.toISOString()));
        } else if (dateFilter === "month") {
          filterDate.setMonth(now.getMonth() - 1);
          queries.push(Query.greaterThanEqual("$createdAt", filterDate.toISOString()));
        } else if (dateFilter === "custom" && customDateRange.start && customDateRange.end) {
          const startDate = new Date(customDateRange.start);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(customDateRange.end);
          endDate.setHours(23, 59, 59, 999);
          queries.push(Query.greaterThanEqual("$createdAt", startDate.toISOString()));
          queries.push(Query.lessThanEqual("$createdAt", endDate.toISOString()));
        }
      }

      // Add sorting
      if (sortBy === "amount") {
        queries.push(Query.orderDesc("total_price"));
      } else {
        queries.push(Query.orderDesc("$createdAt"));
      }

      const ordersResponse = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: ORDERS_TABLE_ID, queries: queries });

      const ordersWithCustomers = await Promise.all(
        ordersResponse.rows.map(async (order: any) => {
          try {
            // Fetch Customer
            const customerPromise = tablesDB.getRow({ databaseId: DATABASE_ID, tableId: CUSTOMERS_TABLE_ID, rowId: order.customer_id }).catch(() => undefined);

            // Fetch Address with Fallback
            const addressPromise = order.address_id
              ? tablesDB.getRow({ databaseId: DATABASE_ID, tableId: ADDRESSES_TABLE_ID, rowId: order.address_id }).catch(() => undefined)
              : tablesDB.listRows({ databaseId: DATABASE_ID, tableId: ADDRESSES_TABLE_ID, queries: [Query.equal("order_id", order.$id), Query.limit(1)] }).then((res) => res.rows[0] || undefined).catch(() => undefined);

            const [customer, address] = await Promise.all([customerPromise, addressPromise]);

            return {
              ...order,
              customer: customer as Customer | undefined,
              address: address as Address | undefined
            } as OrderWithCustomer;
          } catch {
            return order as OrderWithCustomer;
          }
        })
      );

      // Apply client-side search filter if needed (since Appwrite doesn't support full-text search easily)
      let finalOrders = ordersWithCustomers;
      if (searchQuery) {
        const isPakistaniPhoneSearch = searchQuery.startsWith('0');
        const formattedPhoneSearch = isPakistaniPhoneSearch ? '+92' + searchQuery.slice(1) : searchQuery;

        finalOrders = ordersWithCustomers.filter(
          (order) =>
            order.$id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.customer?.full_name
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            order.customer?.phone.includes(searchQuery) ||
            (isPakistaniPhoneSearch && order.customer?.phone?.includes(formattedPhoneSearch))
        );
      }

      if (isInitialLoad) {
        setOrders(finalOrders);
        setFilteredOrders(finalOrders);
      } else {
        // Page changes replace the list instead of appending
        setOrders(finalOrders);
        setFilteredOrders(finalOrders);
      }

      // Update pagination state
      setTotalOrders(ordersResponse.total);
      setTotalPages(Math.max(1, Math.ceil(ordersResponse.total / ORDERS_PER_PAGE)));

    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Order ID",
      "Customer",
      "Phone",
      "Address",
      "Weight (kg)",
      "Date",
      "Status",
      "Total",
    ];
    const rows = filteredOrders.map((order) => [
      order.$id,
      order.customer?.full_name || "Unknown",
      order.customer?.phone || "",
      order.address ? `${order.address.address_line}${order.address.city ? `, ${order.address.city}` : ""}` : "No Address",
      order.total_weight_kg || "0",
      new Date(order.$createdAt).toLocaleDateString(),
      order.status,
      order.total_price,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Orders exported successfully!");
  };

  const updateOrderStatus = async (
    orderId: string,
    newStatus: Order["status"]
  ) => {
    // Prevent multiple updates for the same order
    if (updatingOrderIds.has(orderId)) return;

    // Add to updating set
    setUpdatingOrderIds((prev) => new Set(prev).add(orderId));

    try {
      await tablesDB.updateRow({
        databaseId: DATABASE_ID, tableId: ORDERS_TABLE_ID, rowId: orderId, data: {
          status: newStatus,
        }
      });

      // Optimistic update: Update local state immediately
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.$id === orderId ? { ...order, status: newStatus } : order
        )
      );

      setFilteredOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.$id === orderId ? { ...order, status: newStatus } : order
        )
      );

      toast.success(`Order updated to ${newStatus.replace("_", " ")}`);

      // We do NOT call fetchOrders() here to preserve the list state and enable rapid updates
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order status");
    } finally {
      // Remove from updating set
      setUpdatingOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const getStatusIcon = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "accepted":
        return <Package className="w-5 h-5 text-blue-500" />;
      case "out_for_delivery":
        return <Truck className="w-5 h-5 text-purple-500" />;
      case "delivered":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "returned":
        return <RotateCcw className="w-5 h-5 text-red-500" />;
    }
  };

  const stats = {
    total: orders.length,
    totalRevenue: orders.reduce((sum, order) => {
      // Exclude returned orders from revenue calculation
      if (order.status === "returned") return sum;
      return sum + order.total_price;
    }, 0),
    pending: orders.filter((o) => o.status === "pending").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    avgOrderValue:
      orders.length > 0
        ? orders.reduce((sum, order) => {
          // Exclude returned orders from average calculation
          if (order.status === "returned") return sum;
          return sum + order.total_price;
        }, 0) / orders.filter((o) => o.status !== "returned").length
        : 0,
  };

  const handleEditClick = (order: OrderWithCustomer) => {
    setSelectedOrder(order);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (order: OrderWithCustomer) => {
    setSelectedOrder(order);
    setDeleteDialogOpen(true);
  };

  const handleCopyDetails = async (order: OrderWithCustomer) => {
    try {
      const { rows: items } = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: ORDER_ITEMS_TABLE_ID, queries: [Query.equal("order_id", order.$id), Query.limit(1)] });

      const note = items.length > 0 && items[0].notes ? items[0].notes : "";
      const parts = [
        order.customer?.full_name,
        order.customer?.phone,
        note
      ].filter(Boolean); // Remove null/undefined/empty strings

      const textToCopy = parts.join("  ");

      await navigator.clipboard.writeText(textToCopy);
      toast.success("Details copied to clipboard");
    } catch (error) {
      console.error("Failed to copy details:", error);
      toast.error("Failed to copy details");
    }
  };

  return (
    <AdminAuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Order Management
              </h1>
              <p className="text-lg text-gray-600 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Track and manage all customer orders
              </p>
            </div>
            <ReadOnlyGuard>
              <Button onClick={exportToCSV} variant="outline" size="lg">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </ReadOnlyGuard>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.total}
                    </p>
                  </div>
                  <ShoppingBag className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(stats.totalRevenue)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {stats.pending}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Avg Order Value</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(stats.avgOrderValue)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters  */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by order ID, customer name, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex flex-col md:flex-row gap-2">
                  <Select
                    value={dateFilter}
                    onValueChange={(value: any) => setDateFilter(value)}
                  >
                    <SelectTrigger className="w-full md:w-48">
                      <Calendar className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Last 7 Days</SelectItem>
                      <SelectItem value="month">Last 30 Days</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {dateFilter === "custom" && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={customDateRange.start}
                        onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="w-auto h-10"
                      />
                      <span className="text-gray-500">to</span>
                      <Input
                        type="date"
                        value={customDateRange.end}
                        onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="w-auto h-10"
                      />
                    </div>
                  )}
                </div>
                <Select
                  value={sortBy}
                  onValueChange={(value: any) => setSortBy(value)}
                >
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Sort by Date</SelectItem>
                    <SelectItem value="amount">Sort by Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("all")}
                >
                  All Orders
                </Button>
                <Button
                  variant={filter === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("pending")}
                >
                  <Clock className="w-4 h-4 mr-1" />
                  Pending
                </Button>
                <Button
                  variant={filter === "accepted" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("accepted")}
                >
                  <Package className="w-4 h-4 mr-1" />
                  Accepted
                </Button>
                <Button
                  variant={
                    filter === "out_for_delivery" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setFilter("out_for_delivery")}
                >
                  <Truck className="w-4 h-4 mr-1" />
                  Out for Delivery
                </Button>
                <Button
                  variant={filter === "delivered" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("delivered")}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Delivered
                </Button>
                <Button
                  variant={filter === "returned" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("returned")}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Returned
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-600">Loading orders...</p>
            </CardContent>
          </Card>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No orders found</p>
              <p className="text-gray-400 text-sm mt-2">
                Try adjusting your search or filters
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <Card
                  key={order.$id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-7 gap-4 mb-4 items-start">
                      <div className="md:col-span-1">
                        <p className="text-sm text-gray-500 mb-1">Order ID</p>
                        <p className="font-mono text-xs font-medium truncate" title={order.$id}>
                          {order.$id.slice(0, 12)}...
                        </p>
                        <Badge
                          variant={
                            order.status === "pending"
                              ? "warning"
                              : order.status === "accepted"
                                ? "info"
                                : order.status === "out_for_delivery"
                                  ? "purple"
                                  : order.status === "delivered"
                                    ? "success"
                                    : "destructive"
                          }
                          className="mt-2 text-[10px]"
                        >
                          {order.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="md:col-span-1">
                        <p className="text-sm text-gray-500 mb-1">Customer</p>
                        <p className="font-medium text-sm truncate" title={order.customer?.full_name || "Unknown"}>
                          {order.customer?.full_name || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-600">
                          {order.customer?.phone}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Address
                        </p>
                        <p className="text-sm text-gray-700 line-clamp-2" title={order.address ? `${order.address.address_line}${order.address.city ? `, ${order.address.city}` : ""}` : "No address"}>
                          {order.address ? `${order.address.address_line}${order.address.city ? `, ${order.address.city}` : ""}` : "No address"}
                        </p>
                      </div>
                      <div className="md:col-span-1">
                        <p className="text-sm text-gray-500 mb-1 text-center">Weight</p>
                        <div className="flex items-center justify-center gap-1">
                          <Scale className="w-4 h-4 text-gray-400" />
                          <p className="font-medium text-sm">
                            {order.total_weight_kg ? `${order.total_weight_kg} kg` : "-"}
                          </p>
                        </div>
                      </div>
                      <div className="md:col-span-1">
                        <p className="text-sm text-gray-500 mb-1">Date & Total</p>
                        <p className="font-medium text-green-600">
                          {formatCurrency(order.total_price)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.$createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center justify-end gap-2 md:col-span-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyDetails(order)}
                          title="Copy Details"
                        >
                          <Copy className="w-4 h-4 text-gray-500" />
                        </Button>
                        <ReadOnlyGuard>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(order)}
                            title="Edit Order"
                          >
                            <Pencil className="w-4 h-4 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(order)}
                            title="Delete Order"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </ReadOnlyGuard>
                        <Link href={`/orders/${order.$id}?from=admin`}>
                          <Button variant="outline" size="sm" className="h-8">
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(order.status)}
                        <span className="text-sm text-gray-600">
                          Status:{" "}
                          <span className="font-medium capitalize">
                            {order.status.replace("_", " ")}
                          </span>
                        </span>
                      </div>

                      <div className="flex space-x-2">
                        {order.status === "pending" && (
                          <ReadOnlyGuard>
                            <Button
                              size="sm"
                              onClick={() =>
                                updateOrderStatus(order.$id, "accepted")
                              }
                              className="bg-blue-600 hover:bg-blue-700"
                              disabled={updatingOrderIds.has(order.$id)}
                            >
                              {updatingOrderIds.has(order.$id) ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <Package className="w-4 h-4 mr-2" />
                              )}
                              Accept Order
                            </Button>
                          </ReadOnlyGuard>
                        )}

                        {order.status === "accepted" && (
                          <ReadOnlyGuard>
                            <Button
                              size="sm"
                              onClick={() =>
                                updateOrderStatus(order.$id, "out_for_delivery")
                              }
                              className="bg-purple-600 hover:bg-purple-700"
                              disabled={updatingOrderIds.has(order.$id)}
                            >
                              {updatingOrderIds.has(order.$id) ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <Truck className="w-4 h-4 mr-2" />
                              )}
                              Out for Delivery
                            </Button>
                          </ReadOnlyGuard>
                        )}

                        {order.status === "out_for_delivery" && (
                          <ReadOnlyGuard>
                            <Button
                              size="sm"
                              onClick={() =>
                                updateOrderStatus(order.$id, "delivered")
                              }
                              className="bg-green-600 hover:bg-green-700"
                              disabled={updatingOrderIds.has(order.$id)}
                            >
                              {updatingOrderIds.has(order.$id) ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                              )}
                              Mark Delivered
                            </Button>
                          </ReadOnlyGuard>
                        )}

                        {/* Returned button available for Accepted, Out for Delivery, and Delivered */}
                        {["accepted", "out_for_delivery", "delivered"].includes(order.status) && (
                          <ReadOnlyGuard>
                            <Button
                              size="sm"
                              onClick={() =>
                                updateOrderStatus(order.$id, "returned")
                              }
                              className="bg-red-600 hover:bg-red-700"
                              disabled={updatingOrderIds.has(order.$id)}
                            >
                              {updatingOrderIds.has(order.$id) ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <RotateCcw className="w-4 h-4 mr-2" />
                              )}
                              Return
                            </Button>
                          </ReadOnlyGuard>
                        )}

                        {/* Re-open returned order if needed */}
                        {order.status === "returned" && (
                          <ReadOnlyGuard>
                            <Button
                              size="sm"
                              onClick={() =>
                                updateOrderStatus(order.$id, "pending")
                              }
                              variant="outline"
                              disabled={updatingOrderIds.has(order.$id)}
                            >
                              {updatingOrderIds.has(order.$id) ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <RotateCcw className="w-4 h-4 mr-2" />
                              )}
                              Re-open
                            </Button>
                          </ReadOnlyGuard>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && !loading && (
              <div className="flex items-center justify-center space-x-4 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || loadingMore}
                >
                  Previous
                </Button>
                <div className="text-sm font-medium text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || loadingMore}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        <DeleteOrderDialog
          orderId={selectedOrder?.$id || ""}
          customerName={selectedOrder?.customer?.full_name}
          customerPhone={selectedOrder?.customer?.phone}
          address={selectedOrder?.address ? `${selectedOrder.address.address_line}${selectedOrder.address.city ? `, ${selectedOrder.address.city}` : ""}` : undefined}
          totalWeightKg={selectedOrder?.total_weight_kg}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onSuccess={fetchOrders}
        />

        <EditOrderDialog
          order={selectedOrder}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={fetchOrders}
        />
      </div>
    </AdminAuthGuard>
  );
}
