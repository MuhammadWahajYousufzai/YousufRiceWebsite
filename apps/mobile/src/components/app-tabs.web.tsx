import {
  TabList,
  TabListProps,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
  Tabs,
} from "expo-router/ui";
import { SymbolView } from "expo-symbols";
import { Pressable, useColorScheme, View } from "react-native";

import { ExternalLink } from "./external-link";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot className="h-full" />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>Home</TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton>Explore</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  children,
  isFocused,
  ...props
}: TabTriggerSlotProps) {
  return (
    <Pressable {...props} className="active:opacity-70">
      <ThemedView
        type={isFocused ? "backgroundSelected" : "backgroundElement"}
        className="rounded-3xl px-4 py-1"
      >
        <ThemedText
          type="small"
          themeColor={isFocused ? "text" : "textSecondary"}
        >
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const textColor = scheme === "dark" ? "#FFFFFF" : "#27247B";
  return (
    <View
      {...props}
      className="absolute w-full flex-row items-center justify-center p-4"
    >
      <ThemedView
        type="backgroundElement"
        className="w-full max-w-[800px] flex-row items-center gap-2 rounded-[32px] px-8 py-2"
      >
        <ThemedText type="smallBold" className="mr-auto">
          Yousuf Rice
        </ThemedText>
        {props.children}
        <ExternalLink href="https://docs.expo.dev" asChild>
          <Pressable className="ml-4 flex-row items-center justify-center gap-1">
            <ThemedText type="link">Docs</ThemedText>
            <SymbolView
              tintColor={textColor}
              name={{ ios: "arrow.up.right.square", web: "link" }}
              size={12}
            />
          </Pressable>
        </ExternalLink>
      </ThemedView>
    </View>
  );
}
