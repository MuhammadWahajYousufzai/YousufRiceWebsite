import { forwardRef } from "react";
import { ScrollView, type ScrollViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const AppScrollView = forwardRef<ScrollView, ScrollViewProps>(
  function AppScrollView(
    { children, contentContainerClassName, ...props },
    ref,
  ) {
    return (
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
        <ScrollView
          ref={ref}
          {...props}
          className="flex-1"
          contentContainerClassName={contentContainerClassName}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  },
);
