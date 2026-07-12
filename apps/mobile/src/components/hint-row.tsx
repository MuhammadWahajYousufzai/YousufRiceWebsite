import type { ReactNode } from "react";
import { View } from "react-native";

import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

export function HintRow({
  title = "Try editing",
  hint = "app/index.tsx",
}: {
  title?: string;
  hint?: ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <ThemedText type="small">{title}</ThemedText>
      <ThemedView type="backgroundSelected" className="rounded-lg px-2 py-0.5">
        <ThemedText themeColor="textSecondary">{hint}</ThemedText>
      </ThemedView>
    </View>
  );
}
