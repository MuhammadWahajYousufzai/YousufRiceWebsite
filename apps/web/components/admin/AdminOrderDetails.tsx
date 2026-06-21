"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  MapPin,
  Package,
  Phone,
  Scale,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import { OrderService } from "@/lib/services/order-service";
import type { Order, OrderWithDetails } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminOrderDetailsProps {
  orderId: string;
}

const statusMeta: Record<
  Order["status"],
  {
    label: string;
    variant: "warning" | "info" | "purple" | "success" | "destructive";
  }
> = {
  pending: { label: "Pending", variant: "warning" },
  accepted: { label: "Accepted", variant: "info" },
  out_for_delivery: { label: "Out for delivery", variant: "purple" },
  delivered: { label: "Delivered", variant: "success" },
  returned: { label: "Returned", variant: "destructive" },
};

function DetailSkeleton() {
  return (
    <div className="flex min-h-72 items-center justify-center text-gray-600">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      Loading order details…
    </div>
  );
}

export default function AdminOrderDetails({ orderId }: AdminOrderDetailsProps) {
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      setLoading(true);

      try {
        const nextOrder = await OrderService.getOrderWithDetails(orderId);
        if (!cancelled) setOrder(nextOrder);
      } catch (error) {
        console.error("Failed to load admin order details:", error);
        if (!cancelled) setOrder(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loading) return <DetailSkeleton />;

  if (!order) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Package className="mx-auto mb-4 h-10 w-10 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900">Order not found</h2>
          <p className="mt-2 text-sm text-gray-500">
            This order may have been removed or is no longer available.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentOrder = order;
  const status = statusMeta[currentOrder.status];
  const itemsSubtotal = currentOrder.items.reduce(
    (sum, item) => sum + item.total_after_discount,
    0,
  );
  const discount = Math.max(0, itemsSubtotal - currentOrder.total_price);
  const totalWeight =
    currentOrder.total_weight_kg ??
    currentOrder.items.reduce((sum, item) => sum + Number(item.quantity_kg || 0), 0);
  const addressText = currentOrder.address
    ? `${currentOrder.address.address_line}${currentOrder.address.city ? `, ${currentOrder.address.city}` : ""}`
    : "Address not available";
  const mapsUrl =
    currentOrder.address?.maps_url ??
    (currentOrder.address?.latitude != null && currentOrder.address?.longitude != null
      ? `https://www.google.com/maps?q=${currentOrder.address.latitude},${currentOrder.address.longitude}`
      : null);
  const notes = currentOrder.items.map((item) => item.notes?.trim()).find(Boolean);

  async function copyOrderSummary() {
    try {
      await navigator.clipboard.writeText(
        [
          `Order ${currentOrder.$id}`,
          currentOrder.customer.full_name,
          currentOrder.customer.phone,
          addressText,
          `${totalWeight} kg`,
          formatCurrency(currentOrder.total_price),
          notes,
        ]
          .filter(Boolean)
          .join("\n"),
      );
      toast.success("Order details copied");
    } catch (error) {
      console.error("Failed to copy order details:", error);
      toast.error("Could not copy order details");
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant={status.variant}>{status.label}</Badge>
              <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                <CalendarDays className="h-4 w-4" />
                {new Date(currentOrder.$createdAt).toLocaleString("en-PK", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-950 sm:text-3xl">
              Order details
            </h1>
            <p className="mt-2 break-all font-mono text-xs text-gray-500">
              {currentOrder.$id}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={copyOrderSummary}>
            <Copy className="h-4 w-4" />
            Copy details
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Total
            </p>
            <p className="mt-1 text-lg font-bold text-green-700">
              {formatCurrency(currentOrder.total_price)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Weight
            </p>
            <p className="mt-1 flex items-center gap-1 text-lg font-bold text-gray-900">
              <Scale className="h-4 w-4 text-gray-400" />
              {totalWeight} kg
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Items
            </p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {currentOrder.items.length}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Payment
            </p>
            <p className="mt-1 text-sm font-bold text-gray-900">Cash on delivery</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-gray-500" />
              Order items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {currentOrder.items.map((item) => (
                <div
                  key={item.$id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{item.product_name}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {item.quantity_kg} kg × {formatCurrency(item.price_per_kg_at_order)}/kg
                    </p>
                    {item.discount_amount > 0 && (
                      <p className="mt-1 text-xs font-medium text-green-700">
                        {formatCurrency(item.discount_amount)} discount
                      </p>
                    )}
                  </div>
                  <p className="font-bold text-gray-900">
                    {formatCurrency(item.total_after_discount)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(itemsSubtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Discount</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 text-base font-bold text-gray-950">
                <span>Total</span>
                <span>{formatCurrency(currentOrder.total_price)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-gray-500" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold text-gray-900">{currentOrder.customer.full_name}</p>
                {currentOrder.customer.email && (
                  <p className="mt-1 break-all text-sm text-gray-500">
                    {currentOrder.customer.email}
                  </p>
                )}
              </div>
              <Button asChild variant="outline" size="sm" className="w-full">
                <a href={`tel:${currentOrder.customer.phone}`}>
                  <Phone className="h-4 w-4" />
                  {currentOrder.customer.phone}
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-500" />
                Delivery address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-gray-700">{addressText}</p>
              {currentOrder.address?.latitude != null && currentOrder.address?.longitude != null && (
                <p className="mt-2 break-all font-mono text-xs text-gray-400">
                  {currentOrder.address.latitude}, {currentOrder.address.longitude}
                </p>
              )}
              {mapsUrl && (
                <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                  <a href={mapsUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Open in Maps
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-gray-500" />
              Order notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">{notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
