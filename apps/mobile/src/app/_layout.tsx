import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import "@/global.css";
import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { AutoPushRegistration } from "@/components/auto-push-registration";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import {
  requestMobileAdTrackingPermission,
  trackMobilePageView,
} from "@/lib/meta-events";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Ask with Apple's native ATT dialog on the first eligible launch. There
    // is intentionally no custom pre-prompt or button before this request.
    void requestMobileAdTrackingPermission().then((permission) => {
      if (permission.granted) void trackMobilePageView();
    });
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <CartProvider>
            <StatusBar style="dark" />
            <AutoPushRegistration />
            <AnimatedSplashOverlay />
            <AppTabs />
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
