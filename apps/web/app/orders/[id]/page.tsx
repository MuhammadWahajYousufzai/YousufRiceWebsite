"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { OrderWithDetails, OrderItem } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { OrderService } from "@/lib/services/order-service";
import { LoyaltyService, LoyaltyDiscount } from "@/lib/services/loyalty-service";
import {
  MapPin,
  Package,
  Clock,
  Truck,
  CheckCircle,
  ExternalLink,
  ArrowLeft,
  Gift,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth-store";

// Remove old interfaces since we're using the new OrderWithDetails type

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params.id as string;
  const { isAdmin } = useAuthStore();

  const [data, setData] = useState<OrderWithDetails | null>(null);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState<LoyaltyDiscount | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if coming from customer detail page or admin
  const fromCustomer = searchParams.get("from") === "customer";
  const fromAdmin = searchParams.get("from") === "admin";
  const customerId = searchParams.get("customerId");

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        console.log("Fetching order details for ID:", orderId);
        const orderWithDetails = await OrderService.getOrderWithDetails(
          orderId
        );
        console.log("Order details fetched:", orderWithDetails);
        setData(orderWithDetails);

        // Fetch loyalty info if we have a customer ID
        if (orderWithDetails?.customer_id) {
          try {
            const discount = await LoyaltyService.getCustomerLoyaltyInfo(
              orderWithDetails.customer_id
            );
            setLoyaltyDiscount(discount);
          } catch (err) {
            console.error("Error fetching loyalty info:", err);
          }
        }
      } catch (error) {
        console.error("Error fetching order details:", error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrderDetails();
    } else {
      console.error("No orderId provided");
      setLoading(false);
    }
  }, [orderId]);

  // Determine back URL and text based on context
  let backUrl = "/orders";
  let backText = "Back to My Orders";

  if (fromCustomer && customerId) {
    backUrl = `/admin/customers/${customerId}`;
    backText = "Back to Customer Details";
  } else if (fromAdmin || isAdmin) {
    backUrl = "/admin/orders";
    backText = "Back to Order Management";
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Order Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The order you're looking for doesn't exist
          </p>
          <Link href={backUrl}>
            <Button>Back to Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: OrderWithDetails["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="w-6 h-6 text-yellow-500" />;
      case "accepted":
        return <Package className="w-6 h-6 text-blue-500" />;
      case "out_for_delivery":
        return <Truck className="w-6 h-6 text-purple-500" />;
      case "delivered":
        return <CheckCircle className="w-6 h-6 text-green-500" />;
    }
  };

  const getStatusText = (status: OrderWithDetails["status"]) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "accepted":
        return "Accepted";
      case "out_for_delivery":
        return "Out for Delivery";
      case "delivered":
        return "Delivered";
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-6">
        <Link href={backUrl}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backText}
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Order Details</h1>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Order ID:</span>
          <code className="px-3 py-1 bg-gray-100 rounded-md font-mono text-sm font-medium text-gray-900">
            {data.$id}
          </code>
        </div>
      </div>

      <div className="space-y-6">
        {/* Order Status */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              {getStatusIcon(data.status)}
              <div>
                <p className="text-xl font-bold">
                  {getStatusText(data.status)}
                </p>
                <p className="text-sm text-gray-500">
                  Ordered on{" "}
                  {new Date(data.$createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="mt-6 space-y-3">
              <div
                className={`flex items-center space-x-3 ${data.status === "pending" ||
                  data.status === "accepted" ||
                  data.status === "out_for_delivery" ||
                  data.status === "delivered"
                  ? "text-green-600"
                  : "text-gray-400"
                  }`}
              >
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Order Placed</span>
              </div>
              <div
                className={`flex items-center space-x-3 ${data.status === "accepted" ||
                  data.status === "out_for_delivery" ||
                  data.status === "delivered"
                  ? "text-green-600"
                  : "text-gray-400"
                  }`}
              >
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Order Accepted</span>
              </div>
              <div
                className={`flex items-center space-x-3 ${data.status === "out_for_delivery" ||
                  data.status === "delivered"
                  ? "text-green-600"
                  : "text-gray-400"
                  }`}
              >
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Out for Delivery</span>
              </div>
              <div
                className={`flex items-center space-x-3 ${data.status === "delivered"
                  ? "text-green-600"
                  : "text-gray-400"
                  }`}
              >
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Delivered</span>
              </div>
            </div>
          </CardContent>
        </Card>



        {/* Loyalty Reward Section */}
        {loyaltyDiscount &&
          loyaltyDiscount.code_status === "active" &&
          loyaltyDiscount.discount_code && (
            <Card className="border-2 border-[#ffff03] bg-linear-to-r from-[#27247b] to-[#27247b]/90 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Gift className="w-32 h-32" />
              </div>
              <CardHeader>
                <CardTitle className="flex items-center text-[#ffff03]">
                  <Gift className="w-6 h-6 mr-2" />
                  Loyalty Reward Unlocked!
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="space-y-4">
                  <p className="text-white/90">
                    Congratulations! You've earned a special discount for your
                    next purchase.
                  </p>
                  <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20">
                    <p className="text-sm text-[#ffff03] font-bold mb-1">
                      YOUR DISCOUNT CODE
                    </p>
                    <div className="flex items-center justify-between gap-4">
                      <code className="text-2xl font-mono font-bold tracking-wider">
                        {loyaltyDiscount.discount_code}
                      </code>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-[#ffff03] text-[#27247b] hover:bg-[#ffff03]/90 font-bold"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            loyaltyDiscount.discount_code
                          );
                          alert("Code copied to clipboard!");
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Code
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-white/60">
                    * Use this code on your next order to get{" "}
                    {loyaltyDiscount.extra_discount_percentage}% off. Valid for
                    one-time use only.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.items.map((item: OrderItem, index: number) => (
                <div
                  key={index}
                  className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
                      {item.product_name}
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">{item.quantity_kg} kg</span>
                    </p>
                    <p className="text-xs text-gray-500 mb-1">
                      {formatCurrency(item.price_per_kg_at_order)}/kg
                    </p>
                    
                    {/* Bundle Deal Styling */}
                    {(item.notes?.includes("Next Cola Deal") || item.notes?.includes("Cold Drink Bundle") || item.notes?.includes("colddrink") || item.notes?.includes("Free Cold Drink Deal Qualified")) && (
                      <div className="mt-2 inline-flex items-center gap-2 bg-linear-to-r from-teal-50 to-cyan-50 border border-teal-200 px-3 py-1.5 rounded-lg shadow-sm">
                        <span className="text-lg">🥤</span>
                        <div>
                          <p className="text-[10px] font-bold text-teal-700 uppercase tracking-widest leading-none mb-0.5">Bundle Offer</p>
                          <p className="text-xs text-teal-900 font-bold leading-none">
                            Includes {item.quantity_kg >= 10 ? Math.floor(item.quantity_kg / 10) : 0}x Free 1L Cold Drink
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                      <p className="text-base font-bold text-gray-900">{formatCurrency(item.total_after_discount)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t">
              {(() => {
                // Calculate total from items to see if there's a discrepancy (discount)
                const itemsTotal = data.items.reduce(
                  (sum, item) => sum + item.total_after_discount,
                  0
                );
                const discountAmount = itemsTotal - data.total_price;

                return (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-gray-600">
                      <span>Subtotal</span>
                      <span>{formatCurrency(itemsTotal)}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center text-green-600">
                        <span>Discount</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t mt-2">
                      <span className="text-xl font-bold">Total</span>
                      <span className="text-2xl font-bold text-green-600">
                        {formatCurrency(data.total_price)}
                      </span>
                    </div>
                  </div>
                );
              })()}
              <p className="text-sm text-gray-500 mt-2">
                Payment: Cash on Delivery
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Customer Details */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="bg-gray-100 p-2 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-600"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {data.customer.full_name}
                  </p>
                  <p className="text-sm text-gray-500">Customer Name</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-gray-100 p-2 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-600"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.05 12.05 0 0 0 .57 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.05 12.05 0 0 0 2.81.57A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {data.customer.phone}
                  </p>
                  <p className="text-sm text-gray-500">Phone Number</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Notes */}
        {data.items.length > 0 && data.items[0].notes && (
          <Card>
            <CardHeader>
              <CardTitle>Order Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">
                {data.items[0].notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Ramadan Offer Note */}
        {(() => {
          // Calculate weight directly from items to ensure accuracy (like checkout page)
          const calculatedWeight = data.items.reduce((acc, item) => acc + (Number(item.quantity_kg) || 0), 0);
          const freeKg = Math.floor(calculatedWeight / 15);

          if (
            process.env.NEXT_PUBLIC_ENABLE_RAMADAN_OFFER === 'true' &&
            freeKg > 0
          ) {
            return (
              <Card className="border-2 border-[#ffff03] bg-linear-to-r from-[#27247b] to-[#27247b]/90 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center text-[#ffff03]">
                    <span className="mr-2">🎉</span> Post-Eid Gift Qualified
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/90">
                    This order qualifies for the Post-Eid Special Offer (ends soon)! <strong className="text-[#ffff03]">{freeKg}kg Free Rice</strong> will be included in your delivery.
                  </p>
                </CardContent>
              </Card>
            );
          }
          return null;
        })()}


        {/* Delivery Address */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.address ? (
                <>
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="font-medium">
                        {data.address.address_line}
                        {data.address.city ? `, ${data.address.city}` : ""}
                      </p>
                      {data.address.latitude != null &&
                        data.address.longitude != null && (
                          <p className="text-sm text-gray-500 mt-1">
                            Coordinates: {data.address.latitude.toFixed(15)},{" "}
                            {data.address.longitude.toFixed(15)}
                          </p>
                        )}
                    </div>
                  </div>

                  <a
                    href={data.address.maps_url || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <Button variant="outline" className="mt-2">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open in Maps
                    </Button>
                  </a>
                </>
              ) : (
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <p className="text-gray-500 italic">
                    Address details not available
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
