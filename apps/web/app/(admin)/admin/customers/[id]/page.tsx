'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, AdminPermission } from '@/lib/store/auth-store';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';
import ReadOnlyGuard from '@/components/admin/ReadOnlyGuard';
import { tablesDB, DATABASE_ID, CUSTOMERS_TABLE_ID, ORDERS_TABLE_ID, ADDRESSES_TABLE_ID } from "@/lib/appwrite";
import { Customer, Order, Address } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import {
  User, Mail, Phone, MapPin, Calendar, ShoppingBag,
  DollarSign, TrendingUp, ArrowLeft, Package, Truck,
  CheckCircle, Clock, Home, Building, ExternalLink
} from 'lucide-react';
import { Query } from 'appwrite';
import toast from 'react-hot-toast';

interface OrderWithDetails extends Order {
  statusColor: string;
  statusIcon: React.ReactNode;
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  const { hasReadPermission, loading: authLoading, checkAuth } = useAuthStore();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (customerId) {
      fetchCustomerData();
    }
  }, [customerId]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);

      // Fetch customer details
      const customerDoc = await tablesDB.getRow({ databaseId: DATABASE_ID, tableId: CUSTOMERS_TABLE_ID, rowId: customerId }) as unknown as Customer;
      setCustomer(customerDoc);

      // Fetch customer orders
      const ordersResponse = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: ORDERS_TABLE_ID, queries: [Query.equal('customer_id', customerId), Query.orderDesc('$createdAt')] });

      const ordersWithDetails = ordersResponse.rows.map((order: any) => {
        let statusColor = '';
        let statusIcon = <Clock className="w-4 h-4" />;

        switch (order.status) {
          case 'pending':
            statusColor = 'warning';
            statusIcon = <Clock className="w-4 h-4" />;
            break;
          case 'accepted':
            statusColor = 'info';
            statusIcon = <Package className="w-4 h-4" />;
            break;
          case 'out_for_delivery':
            statusColor = 'purple';
            statusIcon = <Truck className="w-4 h-4" />;
            break;
          case 'delivered':
            statusColor = 'success';
            statusIcon = <CheckCircle className="w-4 h-4" />;
            break;
        }

        return {
          ...order,
          statusColor,
          statusIcon
        } as OrderWithDetails;
      });

      setOrders(ordersWithDetails);

      // Fetch customer addresses
      const addressesResponse = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: ADDRESSES_TABLE_ID, queries: [Query.equal('customer_id', customerId)] });
      setAddresses(addressesResponse.rows as unknown as Address[]);

    } catch (error) {
      console.error('Error fetching customer data:', error);
      toast.error('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-600">Loading customer details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card>
          <CardContent className="p-12 text-center">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Customer not found</p>
            <Link href="/admin/customers">
              <Button className="mt-4">Back to Customers</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = {
    totalOrders: orders.length,
    totalSpent: orders.reduce((sum, order) => sum + order.total_price, 0),
    avgOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + order.total_price, 0) / orders.length : 0,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    deliveredOrders: orders.filter(o => o.status === 'delivered').length
  };

  return (
    <AdminAuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin/customers">
            <Button variant="outline" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Customers
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">{customer.full_name}</h1>
                <p className="text-lg text-gray-600 flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4" />
                  Customer since {new Date(customer.$createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
                </div>
                <ShoppingBag className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Spent</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalSpent)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg Order Value</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.avgOrderValue)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Delivered</p>
                  <p className="text-2xl font-bold text-green-600">{stats.deliveredOrders}</p>
                  <p className="text-xs text-gray-500">{stats.pendingOrders} pending</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="orders">Order History ({orders.length})</TabsTrigger>
            <TabsTrigger value="addresses">Addresses ({addresses.length})</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Phone Number</p>
                      <p className="font-medium">{customer.phone}</p>
                    </div>
                  </div>
                  {customer.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Email Address</p>
                        <p className="font-medium">{customer.email}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Joined Date</p>
                      <p className="font-medium">{new Date(customer.$createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5" />
                    Order Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Orders</span>
                    <Badge variant="info">{stats.totalOrders}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Pending Orders</span>
                    <Badge variant="warning">{stats.pendingOrders}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Delivered Orders</span>
                    <Badge variant="success">{stats.deliveredOrders}</Badge>
                  </div>
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Lifetime Value</span>
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(stats.totalSpent)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Recent Orders
                  </span>
                  <Link href={`#orders`}>
                    <Button variant="outline" size="sm">View All</Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No orders yet</p>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.$id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          {order.statusIcon}
                          <div>
                            <p className="font-medium text-sm">Order #{order.$id.slice(0, 8)}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(order.$createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={order.statusColor as any}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                          <span className="font-bold text-green-600">
                            {formatCurrency(order.total_price)}
                          </span>
                          <Link href={`/orders/${order.$id}?from=customer&customerId=${customer.$id}`}>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            {orders.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No orders found</p>
                  <p className="text-gray-400 text-sm mt-2">This customer hasn't placed any orders yet</p>
                </CardContent>
              </Card>
            ) : (
              orders.map((order) => (
                <Card key={order.$id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">Order #{order.$id.slice(0, 12)}</h3>
                          <Badge variant={order.statusColor as any}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          Placed on {new Date(order.$createdAt).toLocaleDateString()} at {new Date(order.$createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(order.total_price)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-2">
                        {order.statusIcon}
                        <span className="text-sm text-gray-600">
                          Status: <span className="font-medium capitalize">{order.status.replace('_', ' ')}</span>
                        </span>
                      </div>
                      <Link href={`/orders/${order.$id}?from=customer&customerId=${customer.$id}`}>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-4">
            {addresses.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No addresses found</p>
                  <p className="text-gray-400 text-sm mt-2">This customer hasn't added any delivery addresses yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {addresses.map((address) => (
                  <Card key={address.$id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                          <MapPin className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <h3 className="font-semibold">Delivery Address</h3>
                            <Badge variant="info">Location</Badge>
                          </div>
                          <div className="space-y-2 text-sm text-gray-600">
                            <p className="font-medium text-gray-900">{address.address_line}</p>
                            {address.latitude != null && address.longitude != null && (
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>Lat: {address.latitude.toFixed(15)}</span>
                                <span>•</span>
                                <span>Long: {address.longitude.toFixed(15)}</span>
                              </div>
                            )}
                            {address.maps_url && (
                              <div className="mt-3 pt-3 border-t">
                                <a
                                  href={address.maps_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                                >
                                  <MapPin className="w-4 h-4" />
                                  View on Google Maps
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminAuthGuard>
  );
}
