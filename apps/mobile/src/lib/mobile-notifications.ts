import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { account } from "@/lib/appwrite";

const APPWRITE_PUSH_PROVIDER_ID =
  Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_APPWRITE_IOS_PUSH_PROVIDER_ID ||
      process.env.EXPO_PUBLIC_APPWRITE_APNS_PROVIDER_ID
    : process.env.EXPO_PUBLIC_APPWRITE_ANDROID_PUSH_PROVIDER_ID ||
      process.env.EXPO_PUBLIC_APPWRITE_FCM_PROVIDER_ID ||
      process.env.EXPO_PUBLIC_APPWRITE_PUSH_PROVIDER_ID;

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

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isNativePushProviderError(message: string) {
  return /firebase|fcm|apns|google|sender|service/i.test(message);
}

export async function registerMobilePushTarget(options: { requestPermission?: boolean } = {}) {
  const requestPermission = options.requestPermission ?? true;

  await account.get().catch(async () => {
    await account.createAnonymousSession();
  });

  if (!Device.isDevice) {
    throw new Error("Push notifications need a physical iOS or Android device.");
  }

  await ensureAndroidChannel();

  const currentPermissions = await Notifications.getPermissionsAsync();
  let finalStatus = currentPermissions.status;

  if (finalStatus !== "granted" && requestPermission) {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermissions.status;
  }

  if (finalStatus !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  let token: Notifications.DevicePushToken;
  try {
    token = await Notifications.getDevicePushTokenAsync();
  } catch (error) {
    const message = toErrorMessage(error);
    if (isNativePushProviderError(message)) {
      throw new Error(
        "Appwrite Messaging push provider is not configured for this app build. Add the iOS APNs and/or Android FCM provider in Appwrite, set EXPO_PUBLIC_APPWRITE_IOS_PUSH_PROVIDER_ID or EXPO_PUBLIC_APPWRITE_ANDROID_PUSH_PROVIDER_ID, rebuild the app, then try again.",
      );
    }

    throw error;
  }
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
  } catch (error) {
    try {
      await account.updatePushTarget({
        targetId,
        identifier,
      });
    } catch {
      const message = toErrorMessage(error);
      throw new Error(
        `Could not register this device with Appwrite Messaging. ${message}`,
      );
    }
  }

  return {
    platform: Platform.OS,
    targetId,
    tokenType: token.type,
  };
}

export async function registerMobilePushTargetIfAllowed() {
  const permissions = await Notifications.getPermissionsAsync();

  if (permissions.status !== "granted") {
    return null;
  }

  return registerMobilePushTarget({ requestPermission: false });
}
