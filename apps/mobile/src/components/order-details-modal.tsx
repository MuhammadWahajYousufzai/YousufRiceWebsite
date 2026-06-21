import type { OrderStatus } from "@repo/types";
import { formatCurrency } from "@repo/utils";
import { Button } from "@repo/ui";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getOrderWithDetails, type OrderWithDetails } from "@/lib/orders";

const statusSteps: Array<{ key: OrderStatus; label: string }> = [
  { key: "pending", label: "Order placed" },
  { key: "accepted", label: "Order accepted" },
  { key: "out_for_delivery", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
];

function statusIndex(status: OrderStatus) {
  if (status === "returned") return 0;
  return statusSteps.findIndex((step) => step.key === status);
}

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
        setError(caughtError instanceof Error ? caughtError.message : "Could not load this order.");
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
    if (!data) return;
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
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={Boolean(orderId)}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.eyebrow}>Order details</Text>
            <Text style={styles.headerTitle}>
              {orderId ? `#${orderId.slice(-8).toUpperCase()}` : "Order"}
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#27247B" size="large" />
            <Text style={styles.muted}>Loading your order…</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorTitle}>Order unavailable</Text>
            <Text style={styles.muted}>{error}</Text>
            <Button onPress={() => load()}>Try Again</Button>
          </View>
        ) : data ? (
          <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          >
            <View style={styles.statusCard}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.cardLabel}>Live status</Text>
                  <Text style={styles.statusTitle}>
                    {data.status === "returned"
                      ? "Returned"
                      : statusSteps.find((step) => step.key === data.status)?.label}
                  </Text>
                </View>
                <Text style={styles.orderDate}>
                  {new Date(data.$createdAt).toLocaleDateString([], {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
              {data.status === "returned" ? (
                <View style={styles.returnedBand}>
                  <Text style={styles.returnedText}>This order was marked as returned.</Text>
                </View>
              ) : (
                <View style={styles.timeline}>
                  {statusSteps.map((step, index) => {
                    const complete = index <= currentStep;
                    return (
                      <View key={step.key} style={styles.timelineRow}>
                        <View style={[styles.timelineDot, complete && styles.timelineDotComplete]}>
                          <Text style={[styles.timelineMark, complete && styles.timelineMarkComplete]}>
                            {complete ? "✓" : ""}
                          </Text>
                        </View>
                        <Text style={[styles.timelineText, complete && styles.timelineTextComplete]}>
                          {step.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Order items</Text>
              {data.items.map((item) => (
                <View key={item.$id} style={styles.itemRow}>
                  <View style={styles.itemCopy}>
                    <Text style={styles.itemName}>{item.product_name}</Text>
                    <Text style={styles.itemMeta}>
                      {item.quantity_kg}kg · {formatCurrency(item.price_per_kg_at_order)}/kg
                    </Text>
                    {!!item.notes?.includes("Free Cold Drink") && (
                      <Text style={styles.bundleText}>Includes free cold drink offer</Text>
                    )}
                  </View>
                  <Text style={styles.itemTotal}>{formatCurrency(item.total_after_discount)}</Text>
                </View>
              ))}
              <View style={styles.totalRow}>
                <View>
                  <Text style={styles.totalLabel}>Cash on Delivery</Text>
                  <Text style={styles.totalMeta}>{data.total_weight_kg ?? 0}kg total</Text>
                </View>
                <Text style={styles.totalValue}>{formatCurrency(data.total_price)}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Delivery</Text>
              <Text style={styles.addressText}>
                {data.address
                  ? `${data.address.address_line}${data.address.city ? `, ${data.address.city}` : ""}`
                  : "Address details are not available."}
              </Text>
              {!!data.customer?.phone && <Text style={styles.muted}>{data.customer.phone}</Text>}
              {!!data.address?.maps_url && (
                <Button variant="outline" onPress={openMaps}>Open in Maps</Button>
              )}
            </View>

            <Button size="lg" onPress={shareOrder}>Share Order</Button>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  addressText: { color: "#3C3E4D", fontSize: 15, lineHeight: 22 },
  bundleText: { color: "#735A23", fontSize: 12, fontWeight: "800", marginTop: 4 },
  card: { backgroundColor: "#FFFFFF", borderColor: "#E6E6ED", borderRadius: 16, borderWidth: 1, gap: 14, padding: 16 },
  cardLabel: { color: "#7B7D8F", fontSize: 11, fontWeight: "900", letterSpacing: 0.8, textTransform: "uppercase" },
  centered: { alignItems: "center", flex: 1, gap: 14, justifyContent: "center", padding: 32 },
  closeButton: { backgroundColor: "#EFEFF9", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  closeText: { color: "#27247B", fontSize: 14, fontWeight: "900" },
  content: { gap: 16, padding: 16, paddingBottom: 44 },
  errorTitle: { color: "#74171F", fontSize: 21, fontWeight: "900" },
  eyebrow: { color: "#7B7D8F", fontSize: 11, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  headerTitle: { color: "#27247B", fontSize: 22, fontWeight: "900", marginTop: 2 },
  itemCopy: { flex: 1 },
  itemMeta: { color: "#7B7D8F", fontSize: 13, marginTop: 3 },
  itemName: { color: "#1D1E28", fontSize: 15, fontWeight: "800" },
  itemRow: { alignItems: "center", borderBottomColor: "#E6E6ED", borderBottomWidth: 1, flexDirection: "row", gap: 12, paddingBottom: 12 },
  itemTotal: { color: "#27247B", fontSize: 15, fontWeight: "900" },
  modalHeader: { alignItems: "center", backgroundColor: "#FFFFFF", borderBottomColor: "#E6E6ED", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  muted: { color: "#7B7D8F", fontSize: 13, lineHeight: 19, textAlign: "center" },
  orderDate: { color: "#7B7D8F", fontSize: 13, fontWeight: "700" },
  returnedBand: { backgroundColor: "#FEEEEF", borderRadius: 10, padding: 12 },
  returnedText: { color: "#9C1F29", fontSize: 13, fontWeight: "800" },
  rowBetween: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  safeArea: { backgroundColor: "#FAFAFC", flex: 1 },
  sectionTitle: { color: "#27247B", fontSize: 18, fontWeight: "900" },
  statusCard: { backgroundColor: "#F7F7FC", borderColor: "#DCDDF2", borderRadius: 16, borderWidth: 1, gap: 16, padding: 16 },
  statusTitle: { color: "#27247B", fontSize: 21, fontWeight: "900", marginTop: 4 },
  timeline: { gap: 12 },
  timelineDot: { alignItems: "center", backgroundColor: "#E6E6ED", borderRadius: 99, height: 24, justifyContent: "center", width: 24 },
  timelineDotComplete: { backgroundColor: "#27247B" },
  timelineMark: { color: "transparent", fontSize: 13, fontWeight: "900" },
  timelineMarkComplete: { color: "#FFFFFF" },
  timelineRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  timelineText: { color: "#A3A5B5", fontSize: 14, fontWeight: "700" },
  timelineTextComplete: { color: "#3C3E4D" },
  totalLabel: { color: "#3C3E4D", fontSize: 13, fontWeight: "800" },
  totalMeta: { color: "#7B7D8F", fontSize: 12, marginTop: 2 },
  totalRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingTop: 2 },
  totalValue: { color: "#27247B", fontSize: 22, fontWeight: "900" },
});
