import { Pressable, Text, View } from "react-native";
import type { StorefrontContent } from "@repo/types";

import { Image } from "@/components/app-image";

export function StorefrontAnnouncement({
  announcement,
  onOrderNow,
}: {
  announcement?: StorefrontContent;
  onOrderNow: () => void;
}) {
  if (!announcement) return null;
  const themeColors = {
    harvest: { backgroundColor: "#6e4d22", color: "#ffffff" },
    midnight: { backgroundColor: "#27247b", color: "#ffffff" },
    saffron: { backgroundColor: "#ffff03", color: "#27247b" },
    emerald: { backgroundColor: "#176345", color: "#ffffff" },
    rose: { backgroundColor: "#8e3f3a", color: "#ffffff" },
  }[announcement.theme];

  return (
    <View
      className="relative flex-row items-center gap-3 overflow-hidden px-4 py-2.5"
      style={{ backgroundColor: themeColors.backgroundColor }}
    >
      <View className="absolute -left-10 -top-8 h-20 w-36 rotate-12 rounded-full border border-white/15" />
      <View className="absolute -right-8 -top-8 h-20 w-36 -rotate-12 rounded-full border border-white/15" />
      <Text
        className="flex-1 text-[11px] font-extrabold leading-4"
        style={{ color: themeColors.color }}
      >
        {announcement.title}
      </Text>
      {announcement.cta_text && (
        <Pressable
          accessibilityRole="button"
          onPress={onOrderNow}
          className="rounded-full bg-black/25 px-3 py-2 active:opacity-80"
        >
          <Text className="text-[11px] font-extrabold text-white">
            {announcement.cta_text} →
          </Text>
        </Pressable>
      )}
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
