import { formatCurrency } from "@repo/utils";
import { Button } from "@repo/ui";
import { Modal, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { PlaceOrderResult } from "@/lib/orders";

export function CheckoutSuccessModal({
  onClose,
  onViewOrder,
  result,
}: {
  onClose: () => void;
  onViewOrder: (orderId: string) => void;
  result: PlaceOrderResult | null;
}) {
  const share = async () => {
    if (!result) return;
    await Share.share({
      message: `My Yousuf Rice COD order is confirmed.\nOrder: ${result.orderId}\nTotal: ${formatCurrency(result.totalPrice)}`,
      title: "Yousuf Rice order confirmed",
    });
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} visible={Boolean(result)}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.checkCircle}>
            <Text style={styles.check}>✓</Text>
          </View>
          <Text style={styles.eyebrow}>Cash on Delivery confirmed</Text>
          <Text style={styles.title}>Your order is placed</Text>
          <Text style={styles.subtitle}>
            We have received your order. You can follow every delivery update from the app.
          </Text>

          {result && (
            <View style={styles.referenceCard}>
              <Text style={styles.referenceLabel}>Order reference</Text>
              <Text selectable style={styles.reference}>{result.orderId}</Text>
              <Text style={styles.total}>{formatCurrency(result.totalPrice)}</Text>
            </View>
          )}

          <View style={styles.actions}>
            {result && <Button size="lg" onPress={() => onViewOrder(result.orderId)}>Track This Order</Button>}
            <Button size="lg" variant="outline" onPress={share}>Share Receipt</Button>
            <Button size="lg" variant="ghost" onPress={onClose}>Continue Shopping</Button>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 10, width: "100%" },
  check: { color: "#FFFFFF", fontSize: 38, fontWeight: "900" },
  checkCircle: { alignItems: "center", backgroundColor: "#27247B", borderRadius: 999, height: 76, justifyContent: "center", width: 76 },
  content: { alignItems: "center", flex: 1, gap: 14, justifyContent: "center", padding: 24 },
  eyebrow: { color: "#96762E", fontSize: 12, fontWeight: "900", letterSpacing: 0.9, textTransform: "uppercase" },
  reference: { color: "#27247B", fontFamily: "monospace", fontSize: 14, fontWeight: "800", marginTop: 6, textAlign: "center" },
  referenceCard: { backgroundColor: "#F7F7FC", borderColor: "#DCDDF2", borderRadius: 16, borderWidth: 1, marginVertical: 12, padding: 18, width: "100%" },
  referenceLabel: { color: "#7B7D8F", fontSize: 11, fontWeight: "900", letterSpacing: 0.8, textAlign: "center", textTransform: "uppercase" },
  safeArea: { backgroundColor: "#FFFFFF", flex: 1 },
  subtitle: { color: "#565869", fontSize: 15, lineHeight: 22, maxWidth: 360, textAlign: "center" },
  title: { color: "#27247B", fontSize: 30, fontWeight: "900", textAlign: "center" },
  total: { color: "#1D1E28", fontSize: 24, fontWeight: "900", marginTop: 12, textAlign: "center" },
});
