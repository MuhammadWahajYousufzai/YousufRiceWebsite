import type { OrderStatus } from "@repo/types";
import { formatCurrency } from "@repo/utils";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "@/components/app-button";
import { getOrderWithDetails, type OrderWithDetails } from "@/lib/orders";

const statusSteps: Array<{ key: OrderStatus; label: string }> = [
  { key: "pending", label: "Order placed" },
  { key: "accepted", label: "Order accepted" },
  { key: "out_for_delivery", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
];
const statusIndex = (status: OrderStatus) =>
  status === "returned"
    ? 0
    : statusSteps.findIndex((step) => step.key === status);

export function OrderDetailsModal({
  onClose,
  orderId,
}: {
  onClose: () => void;
  orderId: string | null;
}) {
  const [data, setData] = useState<OrderWithDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(
    async (refresh = false) => {
      if (!orderId) return;
      refresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        setData(await getOrderWithDetails(orderId));
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load this order.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderId],
  );
  useEffect(() => {
    setData(null);
    if (orderId) void load();
  }, [load, orderId]);
  const shareOrder = async () => {
    if (data)
      await Share.share({
        message: `Yousuf Rice order ${data.$id}\nStatus: ${statusSteps.find((step) => step.key === data.status)?.label ?? data.status}\nTotal: ${formatCurrency(data.total_price)}`,
        title: "Yousuf Rice order",
      });
  };
  const openMaps = async () => {
    const url = data?.address?.maps_url;
    if (url && (await Linking.canOpenURL(url))) await Linking.openURL(url);
  };
  const currentStep = data ? statusIndex(data.status) : 0;
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={Boolean(orderId)}
    >
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
        <View className="flex-row items-center justify-between border-b border-line bg-white px-4 py-3">
          <View>
            <Text className="text-[11px] font-extrabold uppercase tracking-[1px] text-muted">
              Order details
            </Text>
            <Text className="mt-1 text-[22px] font-extrabold text-brand-800">
              {orderId ? `#${orderId.slice(-8).toUpperCase()}` : "Order"}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            className="rounded-full bg-brand-100 px-4 py-2.5"
          >
            <Text className="text-[14px] font-bold text-brand-800">Close</Text>
          </Pressable>
        </View>
        {loading ? (
          <View className="flex-1 items-center justify-center gap-3 p-8">
            <ActivityIndicator color="#27247B" size="large" />
            <Text className="text-[13px] text-muted">Loading your order…</Text>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center gap-3 p-8">
            <Text className="text-[21px] font-extrabold text-coral-700">
              Order unavailable
            </Text>
            <Text className="text-center text-[13px] leading-5 text-muted">
              {error}
            </Text>
            <AppButton onPress={() => load()}>Try again</AppButton>
          </View>
        ) : data ? (
          <ScrollView
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => load(true)}
              />
            }
            contentContainerClassName="gap-4 p-4 pb-6"
            className="flex-1"
          >
            <View className="gap-4 rounded-card border border-brand-200 bg-brand-50 p-4">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-[11px] font-extrabold uppercase tracking-[1px] text-brand-700">
                    Live status
                  </Text>
                  <Text className="mt-1 text-[21px] font-extrabold text-brand-800">
                    {data.status === "returned"
                      ? "Returned"
                      : statusSteps.find((step) => step.key === data.status)
                          ?.label}
                  </Text>
                </View>
                <Text className="text-[13px] font-bold text-muted">
                  {new Date(data.$createdAt).toLocaleDateString([], {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
              {data.status === "returned" ? (
                <View className="rounded-xl bg-coral-50 p-3">
                  <Text className="text-[13px] font-bold text-coral-700">
                    This order was marked as returned.
                  </Text>
                </View>
              ) : (
                <View className="gap-3">
                  {statusSteps.map((step, index) => {
                    const complete = index <= currentStep;
                    return (
                      <View
                        key={step.key}
                        className="flex-row items-center gap-3"
                      >
                        <View
                          className={`h-6 w-6 items-center justify-center rounded-full ${complete ? "bg-brand-800" : "bg-line"}`}
                        >
                          <Text
                            className={`text-[13px] font-extrabold ${complete ? "text-white" : "text-transparent"}`}
                          >
                            ✓
                          </Text>
                        </View>
                        <Text
                          className={`text-[14px] font-bold ${complete ? "text-body" : "text-muted"}`}
                        >
                          {step.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
            <View className="gap-4 rounded-card border border-line bg-white p-4">
              <Text className="text-[18px] font-extrabold text-brand-800">
                Order items
              </Text>
              {data.items.map((item) => (
                <View
                  key={item.$id}
                  className="flex-row items-center gap-3 border-b border-line pb-3"
                >
                  <View className="flex-1">
                    <Text className="text-[15px] font-extrabold text-ink">
                      {item.product_name}
                    </Text>
                    <Text className="mt-1 text-[13px] text-muted">
                      {item.quantity_kg}kg ·{" "}
                      {formatCurrency(item.price_per_kg_at_order)}/kg
                    </Text>
                    {item.notes?.includes("Free Cold Drink") && (
                      <Text className="mt-1 text-[12px] font-bold text-gold-700">
                        Includes free cold drink offer
                      </Text>
                    )}
                  </View>
                  <Text className="text-[15px] font-extrabold text-brand-800">
                    {formatCurrency(item.total_after_discount)}
                  </Text>
                </View>
              ))}
              <View className="flex-row items-center justify-between pt-1">
                <View>
                  <Text className="text-[13px] font-bold text-body">
                    Cash on Delivery
                  </Text>
                  <Text className="mt-1 text-[12px] text-muted">
                    {data.total_weight_kg ?? 0}kg total
                  </Text>
                </View>
                <Text className="text-[22px] font-extrabold text-brand-800">
                  {formatCurrency(data.total_price)}
                </Text>
              </View>
            </View>
            <View className="gap-3 rounded-card border border-line bg-white p-4">
              <Text className="text-[18px] font-extrabold text-brand-800">
                Delivery
              </Text>
              <Text className="text-[15px] leading-[22px] text-body">
                {data.address
                  ? `${data.address.address_line}${data.address.city ? `, ${data.address.city}` : ""}`
                  : "Address details are not available."}
              </Text>
              {data.customer?.phone && (
                <Text className="text-[13px] text-muted">
                  {data.customer.phone}
                </Text>
              )}
              {data.address?.maps_url && (
                <AppButton variant="outline" onPress={openMaps}>
                  Open in maps
                </AppButton>
              )}
            </View>
            <AppButton size="lg" onPress={shareOrder}>
              Share order
            </AppButton>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}
