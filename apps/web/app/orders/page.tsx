'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { tablesDB, DATABASE_ID, ORDERS_TABLE_ID } from "@/lib/appwrite";
import { Order } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Package, Clock, Truck, CheckCircle, LogIn, Filter, X } from 'lucide-react';
import { Query } from 'appwrite';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/store/auth-store';
import { Input } from '@/components/ui/input';

export default function OrdersPage() {
  const router = useRouter();
  const { user, customer, loading: authLoading, checkAuth } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtering and Pagination State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 50;

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    // If auth check is complete and user is not logged in, redirect to login
    if (!authLoading && !user) {
      router.push('/auth/login?redirect=/orders');
      return;
    }

    // If user is logged in and has customer record, fetch orders
    if (user && customer) {
      // Only fetch if we haven't fetched yet (to avoid double fetch on mount)
      // But we need to handle the initial load.
      // Let's rely on the dependency array.
      fetchOrders(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, customer, authLoading, router]);

  // Handle page changes
  useEffect(() => {
    if (user && customer && (currentPage > 1 || orders.length > 0)) {
      fetchOrders(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const fetchOrders = async (reset: boolean = false) => {
    if (!customer) return;

    setLoading(true);
    try {
      const isInitialLoad = reset || currentPage === 1;

      const queries = [
        Query.equal('customer_id', customer.$id),
        Query.orderDesc('$createdAt'),
        Query.limit(PAGE_SIZE),
        Query.offset((reset ? 0 : currentPage - 1) * PAGE_SIZE)
      ];

      // Apply Date Filters
      if (startDate) {
        // Start of the selected day
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        queries.push(Query.greaterThanEqual('$createdAt', start.toISOString()));
      }

      if (endDate) {
        // End of the selected day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        queries.push(Query.lessThanEqual('$createdAt', end.toISOString()));
      }

      const ordersResponse = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: ORDERS_TABLE_ID, queries: queries });

      const newOrders = ordersResponse.rows as unknown as Order[];

      if (isInitialLoad) {
        setOrders(newOrders);
        if (newOrders.length > 0) {
          toast.success(`Found ${ordersResponse.total} order(s)`, {
            id: 'orders-found',
          });
        } else if (!isInitialLoad) {
          // Only show "No orders found" if it's a fresh search/filter, not just loading more
          // But we handle empty state in UI, so maybe just a toast if filtering?
          if (startDate || endDate) {
            toast('No orders found for the selected dates', { icon: '🔍' });
          }
        }
      } else {
        setOrders(newOrders);
      }

      // Update pagination state
      setTotalPages(Math.max(1, Math.ceil(ordersResponse.total / PAGE_SIZE)));

    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    setCurrentPage(1);
    fetchOrders(true);
  };



  // Better Clear Handler
  const clearAndRefetch = () => {
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);

    // Manually fetch with cleared values
    // We can't easily reuse fetchOrders as is if it reads state.
    // So let's refactor fetchOrders to read from params OR state.
    // Actually, let's just do this:

    setLoading(true);
    tablesDB.listRows({ databaseId: DATABASE_ID, tableId: ORDERS_TABLE_ID, queries: [
                  Query.equal('customer_id', customer!.$id),
                  Query.orderDesc('$createdAt'),
                  Query.limit(PAGE_SIZE),
                  Query.offset(0)
                ] }).then((response) => {
      const newOrders = response.rows as unknown as Order[];
      setOrders(newOrders);
      setTotalPages(Math.max(1, Math.ceil(response.total / PAGE_SIZE)));
      toast.success('Filters cleared');
    }).catch(err => {
      console.error(err);
      toast.error('Failed to reset');
    }).finally(() => setLoading(false));
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'accepted':
        return <Package className="w-5 h-5 text-blue-500" />;
      case 'out_for_delivery':
        return <Truck className="w-5 h-5 text-purple-500" />;
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };

  const getStatusText = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'accepted':
        return 'Accepted';
      case 'out_for_delivery':
        return 'Out for Delivery';
      case 'delivered':
        return 'Delivered';
    }
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show login prompt (this will redirect automatically)
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card>
          <CardContent className="p-12 text-center">
            <LogIn className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Required</h2>
            <p className="text-gray-600 mb-6">Please login to view your orders.</p>
            <Link href="/auth/login?redirect=/orders">
              <Button size="lg">Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Track Your Orders</h1>
        {customer && (
          <p className="text-gray-600">
            Welcome back, {customer.full_name}! ({customer.phone})
          </p>
        )}
      </div>

      {/* Filters Section */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button onClick={handleFilter} className="flex-1 md:flex-none">
                <Filter className="w-4 h-4 mr-2" />
                Apply
              </Button>
              {(startDate || endDate) && (
                <Button variant="outline" onClick={clearAndRefetch} className="flex-1 md:flex-none">
                  <X className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State - Initial Load Only */}
      {loading && orders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg text-gray-600">Loading your orders...</p>
        </div>
      )}

      {/* Orders List */}
      {(!loading || orders.length > 0) && (
        <>
          {orders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="w-24 h-24 text-gray-300 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">No Orders Found</h2>
                <p className="text-gray-600 mb-6">
                  {startDate || endDate
                    ? "Try adjusting your date filters."
                    : "You haven't placed any orders yet."}
                </p>
                {!(startDate || endDate) && (
                  <Link href="/#products">
                    <Button size="lg">Start Shopping</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Your Orders (Page {currentPage} of {totalPages})
              </h2>

              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.$id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Order ID</p>
                          <p className="font-mono text-sm font-medium">{order.$id}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(order.status)}
                          <span className="font-medium">{getStatusText(order.status)}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-500">Order Date</p>
                          <p className="font-medium">
                            {new Date(order.$createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Total</p>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(order.total_price)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t">
                        <Link href={`/orders/${order.$id}`}>
                          <Button variant="outline" className="w-full">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-4 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || loading}
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
                    disabled={currentPage === totalPages || loading}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
