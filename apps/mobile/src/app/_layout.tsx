import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState, useColorScheme } from "react-native";
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
    let cancelled = false;
    let startupPageViewSent = false;

    const requestAtStartup = async () => {
      const permission = await requestMobileAdTrackingPermission();
      if (cancelled || !permission.granted || startupPageViewSent) return;
      startupPageViewSent = true;
      void trackMobilePageView();
    };

    void requestAtStartup();
    const subscription = AppState.addEventListener("change", (state) => {
      // If iOS could not present ATT during the initial transition, try again
      // when the app next becomes active. Denied/restricted statuses return
      // immediately and are never prompted again.
      if (state === "active") void requestAtStartup();
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
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
