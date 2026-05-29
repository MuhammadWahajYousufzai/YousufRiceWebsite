import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { account } from "@/lib/appwrite";

const APPWRITE_PUSH_PROVIDER_ID = process.env.EXPO_PUBLIC_APPWRITE_PUSH_PROVIDER_ID;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("orders", {
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: "#27247b",
    name: "Orders and offers",
    vibrationPattern: [0, 250, 250, 250],
  });
}

function getTargetId() {
  const runtime = Constants.executionEnvironment || "native";
  return `mobile-${Platform.OS}-${runtime}`.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 36);
}

export async function registerMobilePushTarget() {
  await account.get().catch(async () => {
    await account.createAnonymousSession();
  });

  if (!Device.isDevice) {
    throw new Error("Push notifications need a physical iOS or Android device.");
  }

  await ensureAndroidChannel();

  const currentPermissions = await Notifications.getPermissionsAsync();
  let finalStatus = currentPermissions.status;

  if (finalStatus !== "granted") {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermissions.status;
  }

  if (finalStatus !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const token = await Notifications.getDevicePushTokenAsync();
  const identifier = String(token.data || "");

  if (!identifier) {
    throw new Error("Could not read this device push token.");
  }

  const targetId = getTargetId();

  try {
    await account.createPushTarget({
      targetId,
      identifier,
      providerId: APPWRITE_PUSH_PROVIDER_ID || undefined,
    });
  } catch {
    await account.updatePushTarget({
      targetId,
      identifier,
    });
  }

  return {
    platform: Platform.OS,
    targetId,
    tokenType: token.type,
  };
}
