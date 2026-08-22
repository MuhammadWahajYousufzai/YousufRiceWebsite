#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOCAL_ENV="$MOBILE_DIR/.env.appstoreconnect.local"

usage() {
  cat <<'EOF'
Usage:
  pnpm --filter @yousuf-rice/mobile ios:asc:upload
  pnpm --filter @yousuf-rice/mobile ios:asc:export

Setup:
  1. Copy apps/mobile/app-store-connect.env.example to apps/mobile/.env.appstoreconnect.local.
  2. Put Apple's AuthKey_<KEY_ID>.p8 in apps/mobile/ or set ASC_KEY_PATH.
  3. Fill ASC_KEY_ID, ASC_ISSUER_ID, and APPLE_TEAM_ID.

Modes:
  upload  Archive and upload to App Store Connect/TestFlight.
  export  Archive and export a local .ipa without upload.
EOF
}

MODE="${1:-upload}"
if [[ "$MODE" == "-h" || "$MODE" == "--help" ]]; then
  usage
  exit 0
fi

if [[ "$MODE" != "upload" && "$MODE" != "export" ]]; then
  echo "Unknown mode: $MODE" >&2
  usage >&2
  exit 2
fi

if [[ -f "$LOCAL_ENV" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$LOCAL_ENV"
  set +a
fi

: "${ASC_KEY_ID:?Set ASC_KEY_ID in $LOCAL_ENV}"
: "${ASC_ISSUER_ID:?Set ASC_ISSUER_ID in $LOCAL_ENV}"
: "${APPLE_TEAM_ID:=V4AYP7YKGS}"
: "${EXPO_PUBLIC_APPWRITE_IOS_PUSH_PROVIDER_ID:=ios_apns}"
export EXPO_PUBLIC_APPWRITE_IOS_PUSH_PROVIDER_ID

ASC_KEY_PATH="${ASC_KEY_PATH:-$MOBILE_DIR/AuthKey_${ASC_KEY_ID}.p8}"
if [[ ! -f "$ASC_KEY_PATH" ]]; then
  echo "Missing App Store Connect key at $ASC_KEY_PATH" >&2
  echo "Download AuthKey_${ASC_KEY_ID}.p8 from App Store Connect or set ASC_KEY_PATH." >&2
  exit 1
fi

WORKSPACE="$MOBILE_DIR/ios/YousufRice.xcworkspace"
SCHEME="YousufRice"
ARCHIVE_PATH="${ARCHIVE_PATH:-$MOBILE_DIR/build/YousufRice.xcarchive}"
EXPORT_PATH="${EXPORT_PATH:-$MOBILE_DIR/build/app-store-connect-$MODE}"
EXPORT_OPTIONS_PLIST="$MOBILE_DIR/build/ExportOptions-$MODE.plist"
DESTINATION="$MODE"

mkdir -p "$MOBILE_DIR/build"

cat > "$EXPORT_OPTIONS_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>destination</key>
  <string>$DESTINATION</string>
  <key>manageAppVersionAndBuildNumber</key>
  <false/>
  <key>method</key>
  <string>app-store-connect</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>stripSwiftSymbols</key>
  <true/>
  <key>teamID</key>
  <string>$APPLE_TEAM_ID</string>
  <key>uploadSymbols</key>
  <true/>
</dict>
</plist>
PLIST

cd "$MOBILE_DIR"

echo "Synchronizing the native iOS project with Expo configuration..."
"$MOBILE_DIR/node_modules/.bin/expo" prebuild --platform ios

echo "Archiving $SCHEME for App Store Connect..."
xcodebuild archive \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath "$ARCHIVE_PATH" \
  -quiet \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$ASC_KEY_PATH" \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID" \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
  CODE_SIGN_STYLE=Automatic

echo "Exporting archive with destination=$DESTINATION..."
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist "$EXPORT_OPTIONS_PLIST" \
  -quiet \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$ASC_KEY_PATH" \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID"

echo "Done: $EXPORT_PATH"
