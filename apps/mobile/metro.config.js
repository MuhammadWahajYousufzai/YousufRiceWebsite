const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Store release credentials are shell input for upload/build scripts, not
// application source. Metro otherwise treats the custom `.local` suffix as a
// platform variant and attempts to parse the private env files as JavaScript.
const existingBlockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existingBlockList)
    ? existingBlockList
    : existingBlockList
      ? [existingBlockList]
      : []),
  /[/\\]\.env\.appstoreconnect\.local$/,
  /[/\\]\.env\.googleplay\.local$/,
];

module.exports = withNativeWind(config, { input: "./src/global.css" });
