// Expo inlines EXPO_PUBLIC_* values into the iOS and Android JavaScript bundles.
// The current Shan offer defaults on so a missing build variable cannot hide it.
export const everyGrainShanOfferEnabled =
  process.env.EXPO_PUBLIC_ENABLE_EVERY_GRAIN_SHAN_OFFER !== "false";
