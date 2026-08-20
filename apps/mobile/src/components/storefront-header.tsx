import { Pressable, Text, View } from "react-native";

import { Image } from "@/components/app-image";

export function StorefrontAnnouncement({
  offerEnabled,
  onOrderNow,
}: {
  offerEnabled: boolean;
  onOrderNow: () => void;
}) {
  return (
    <View className="relative flex-row items-center gap-3 overflow-hidden bg-gray-50 px-4 py-2.5">
      <View className="absolute -left-10 -top-8 h-20 w-36 rotate-12 rounded-full bg-brand-200/70" />
      <View className="absolute -right-8 -top-8 h-20 w-36 -rotate-12 rounded-full bg-gold-400/40" />
      <Text className="flex-1 text-[11px] font-extrabold leading-4 text-gray-900">
        {offerEnabled
          ? "⏳ HURRY! Get 1kg FREE rice for every 15kg."
          : "Yousuf Rice 2026 — premium rice with Free Delivery across Karachi!"}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onOrderNow}
        className="rounded-full bg-gray-900 px-3 py-2 active:opacity-80"
      >
        <Text className="text-[11px] font-extrabold text-white">
          Order now →
        </Text>
      </Pressable>
    </View>
  );
}

export function StorefrontHeader({
  actionLabel = "Bag",
  cartCount = 0,
  onActionPress,
}: {
  actionLabel?: string;
  cartCount?: number;
  onActionPress: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between border-b border-gray-100 bg-white px-4 py-2">
      <Image
        accessibilityLabel="Yousuf Rice"
        source={require("@/assets/images/splash-icon.png")}
        contentFit="contain"
        className="h-12 w-[90px]"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          actionLabel === "Bag"
            ? `${cartCount} bags in cart`
            : actionLabel
        }
        onPress={onActionPress}
        className="relative min-h-10 min-w-10 items-center justify-center rounded-full border border-gray-200 bg-white px-3 active:bg-gray-50"
      >
        <Text className="text-[12px] font-extrabold text-brand-800">
          {actionLabel}
        </Text>
        {actionLabel === "Bag" && cartCount > 0 && (
          <View className="absolute -right-1.5 -top-2 min-w-5 items-center rounded-full border-2 border-white bg-gold-400 px-1.5 py-0.5">
            <Text className="text-[10px] font-black text-brand-800">
              {cartCount}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
