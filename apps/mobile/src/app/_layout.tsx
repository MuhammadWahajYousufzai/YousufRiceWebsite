import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AutoPushRegistration } from '@/components/auto-push-registration';
import { AuthProvider } from '@/lib/auth';
import { CartProvider } from '@/lib/cart';
import { trackMobilePageView } from '@/lib/meta-events';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    void trackMobilePageView();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <CartProvider>
          <AutoPushRegistration />
          <AnimatedSplashOverlay />
          <AppTabs />
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
