import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

async function safely(run: () => Promise<void>) {
  if (Platform.OS === "web") return;
  await run().catch(() => undefined);
}

export function selectionFeedback() {
  return safely(() => Haptics.selectionAsync());
}

export function successFeedback() {
  return safely(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  );
}

export function warningFeedback() {
  return safely(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  );
}
