// Public flags are evaluated when the web application is built.
// The current Shan offer defaults on so a missing deployment variable cannot hide it.
export const everyGrainShanOfferEnabled =
  process.env.NEXT_PUBLIC_ENABLE_EVERY_GRAIN_SHAN_OFFER !== "false";
