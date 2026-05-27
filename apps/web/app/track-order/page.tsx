'use client';

/**
 * MANUAL ORDER TRACKING PAGE
 * 
 * This feature is temporarily disabled but fully implemented.
 * To enable:
 * 1. Uncomment the navigation link in components/navbar.tsx (line 32)
 * 2. Uncomment the manual tracking link in app/orders/page.tsx (line 132-148)
 * 
 * This page allows users to track orders by phone number without logging in.
 * Perfect for guest customers or those who changed their phone number.
 */

import { useState } from 'react';
import Link from 'next/link';
import { tablesDB, DATABASE_ID, ORDERS_TABLE_ID, CUSTOMERS_TABLE_ID } from "@/lib/appwrite";
import { Order, Customer } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { Package, Clock, Truck, CheckCircle, Search, Phone } from 'lucide-react';
import { Query } from 'appwrite';
import toast from 'react-hot-toast';

export default function TrackOrderPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearchOrders = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      // Find customer by phone number
      const customerResponse = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: CUSTOMERS_TABLE_ID, queries: [Query.equal('phone', phoneNumber.trim())] });

      if (customerResponse.rows.length === 0) {
        setOrders([]);
        setCustomer(null);
        toast.error('No orders found for this phone number');
        setLoading(false);
        return;
      }

      const foundCustomer = customerResponse.rows[0] as unknown as Customer;
      setCustomer(foundCustomer);

      // Get all orders for this customer
      const ordersResponse = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: ORDERS_TABLE_ID, queries: [Query.equal('customer_id', foundCustomer.$id), Query.orderDesc('$createdAt'), Query.limit(100)] });

      setOrders(ordersResponse.rows as unknown as Order[]);
      
      if (ordersResponse.rows.length > 0) {
        toast.success(`Found ${ordersResponse.rows.length} order(s)`);
      } else {
        toast.error('No orders found for this phone number');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Track Your Order</h1>
        <p className="text-gray-600">Enter your phone number to view your orders</p>
      </div>

      {/* Phone Number Search */}
      <Card className="mb-8 border-2 border-[#27247b]/20">
        <CardHeader className="bg-linear-to-r from-[#27247b]/5 to-[#ffff03]/5">
          <CardTitle className="flex items-center text-[#27247b]">
            <Phone className="w-6 h-6 mr-2" />
            Enter Your Phone Number
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSearchOrders} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-[#27247b] mb-2">
                Phone Number *
              </label>
              <Input
                type="tel"
                placeholder="Enter the phone number used at checkout"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                className="border-2 border-gray-300 focus:border-[#ffff03] focus:ring-2 focus:ring-[#ffff03]/20 rounded-lg p-3 text-base"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the phone number you used when placing your order
              </p>
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full bg-[#27247b] hover:bg-[#27247b]/90 text-white font-bold"
              disabled={loading}
            >
              <Search className="w-5 h-5 mr-2" />
              {loading ? 'Searching...' : 'Track My Orders'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-[#ffff03]/10 border border-[#ffff03] rounded-lg">
            <p className="text-sm text-[#27247b] font-bold mb-2">
              💡 Have an account?
            </p>
            <p className="text-xs text-[#27247b]/80 mb-3">
              Login to automatically view your orders and get a personalized experience.
            </p>
            <Link href="/auth/login?redirect=/orders">
              <Button variant="outline" size="sm" className="w-full border-[#27247b] text-[#27247b] hover:bg-[#27247b] hover:text-white">
                Login to Your Account
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {searched && (
        <>
          {orders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="w-24 h-24 text-gray-300 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">No Orders Found</h2>
                <p className="text-gray-600 mb-6">
                  No orders found for this phone number. Please check the number and try again.
                </p>
                <Link href="/#products">
                  <Button size="lg" className="bg-[#27247b] hover:bg-[#27247b]/90">
                    Start Shopping
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div>
              <div className="mb-4 p-4 bg-[#27247b]/5 border border-[#27247b]/20 rounded-lg">
                <h2 className="text-xl font-bold text-[#27247b] mb-1">
                  Orders for {customer?.full_name}
                </h2>
                <p className="text-sm text-gray-600">
                  Phone: {customer?.phone} {customer?.email && `• Email: ${customer.email}`}
                </p>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {orders.length} {orders.length === 1 ? 'Order' : 'Orders'} Found
              </h3>

              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.$id} className="border-2 border-gray-200 hover:border-[#ffff03] transition-colors">
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
                          <Button variant="outline" className="w-full border-[#27247b] text-[#27247b] hover:bg-[#27247b] hover:text-white">
                            View Order Details
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
