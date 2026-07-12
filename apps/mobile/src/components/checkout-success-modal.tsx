import { formatCurrency } from "@repo/utils";
import { Modal, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "@/components/app-button";
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
    if (result)
      await Share.share({
        message: `My Yousuf Rice COD order is confirmed.\nOrder: ${result.orderId}\nTotal: ${formatCurrency(result.totalPrice)}`,
        title: "Yousuf Rice order confirmed",
      });
  };
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      visible={Boolean(result)}
    >
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center gap-4 p-6">
          <View className="h-[76px] w-[76px] items-center justify-center rounded-full bg-brand-800">
            <Text className="text-[38px] font-extrabold text-white">✓</Text>
          </View>
          <Text className="text-[12px] font-extrabold uppercase tracking-[1px] text-gold-600">
            Cash on Delivery confirmed
          </Text>
          <Text className="text-center text-[30px] font-extrabold leading-[35px] text-brand-800">
            Your order is placed
          </Text>
          <Text className="max-w-[360px] text-center text-[15px] leading-[22px] text-body">
            We have received your order. You can follow every delivery update
            from the app.
          </Text>
          {result && (
            <View className="my-3 w-full gap-2 rounded-card border border-line bg-canvas p-5">
              <Text className="text-center text-[11px] font-extrabold uppercase tracking-[1px] text-muted">
                Order reference
              </Text>
              <Text
                selectable
                className="mt-1 text-center font-mono text-[14px] font-extrabold text-brand-800"
              >
                {result.orderId}
              </Text>
              <Text className="mt-2 text-center text-[24px] font-extrabold text-ink">
                {formatCurrency(result.totalPrice)}
              </Text>
            </View>
          )}
          <View className="w-full gap-2">
            {result && (
              <AppButton size="lg" onPress={() => onViewOrder(result.orderId)}>
                Track this order
              </AppButton>
            )}
            <AppButton size="lg" variant="outline" onPress={share}>
              Share receipt
            </AppButton>
            <AppButton size="lg" variant="ghost" onPress={onClose}>
              Continue shopping
            </AppButton>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
