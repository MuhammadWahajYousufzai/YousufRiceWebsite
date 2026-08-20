#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOCAL_ENV="$MOBILE_DIR/.env.googleplay.local"
EXPECTED_UPLOAD_SHA1_DEFAULT="E6:21:48:F5:4D:15:C8:1D:0B:3B:B3:34:14:A3:6F:71:29:33:F9:95"
KEYCHAIN_SERVICE_DEFAULT="Yousuf Rice Google Play Upload Key"
KEYCHAIN_ACCOUNT_DEFAULT="com.yousufrice.mobile"

if [[ -f "$LOCAL_ENV" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$LOCAL_ENV"
  set +a
fi

: "${YOUSUF_RICE_UPLOAD_STORE_FILE:?Set YOUSUF_RICE_UPLOAD_STORE_FILE in $LOCAL_ENV}"
: "${YOUSUF_RICE_UPLOAD_KEY_ALIAS:?Set YOUSUF_RICE_UPLOAD_KEY_ALIAS in $LOCAL_ENV}"
: "${YOUSUF_RICE_EXPECTED_UPLOAD_SHA1:=$EXPECTED_UPLOAD_SHA1_DEFAULT}"
: "${YOUSUF_RICE_KEYCHAIN_SERVICE:=$KEYCHAIN_SERVICE_DEFAULT}"
: "${YOUSUF_RICE_KEYCHAIN_ACCOUNT:=$KEYCHAIN_ACCOUNT_DEFAULT}"

if [[ -z "${YOUSUF_RICE_UPLOAD_STORE_PASSWORD:-}" ]]; then
  YOUSUF_RICE_UPLOAD_STORE_PASSWORD="$(
    security find-generic-password \
      -a "$YOUSUF_RICE_KEYCHAIN_ACCOUNT" \
      -s "$YOUSUF_RICE_KEYCHAIN_SERVICE" \
      -w
  )"
fi

if [[ -z "${YOUSUF_RICE_UPLOAD_KEY_PASSWORD:-}" ]]; then
  YOUSUF_RICE_UPLOAD_KEY_PASSWORD="$YOUSUF_RICE_UPLOAD_STORE_PASSWORD"
fi

export YOUSUF_RICE_UPLOAD_STORE_PASSWORD YOUSUF_RICE_UPLOAD_KEY_PASSWORD

if [[ ! -f "$YOUSUF_RICE_UPLOAD_STORE_FILE" ]]; then
  echo "Missing Play upload keystore: $YOUSUF_RICE_UPLOAD_STORE_FILE" >&2
  exit 1
fi

AVAILABLE_KB="$(df -Pk "$MOBILE_DIR" | awk 'NR == 2 { print $4 }')"
MINIMUM_KB=$((6 * 1024 * 1024))
if (( AVAILABLE_KB < MINIMUM_KB )); then
  echo "Android Release build needs at least 6 GiB free; only $((AVAILABLE_KB / 1024)) MiB is available." >&2
  exit 1
fi

ACTUAL_UPLOAD_SHA1="$(
  keytool -list -v \
    -keystore "$YOUSUF_RICE_UPLOAD_STORE_FILE" \
    -alias "$YOUSUF_RICE_UPLOAD_KEY_ALIAS" \
    -storepass:env YOUSUF_RICE_UPLOAD_STORE_PASSWORD \
    -keypass:env YOUSUF_RICE_UPLOAD_KEY_PASSWORD |
    awk -F': ' '/SHA1:/{ print $2; exit }'
)"

if [[ "$ACTUAL_UPLOAD_SHA1" != "$YOUSUF_RICE_EXPECTED_UPLOAD_SHA1" ]]; then
  echo "Keystore SHA-1 does not match the Google Play upload certificate." >&2
  echo "Expected: $YOUSUF_RICE_EXPECTED_UPLOAD_SHA1" >&2
  echo "Actual:   $ACTUAL_UPLOAD_SHA1" >&2
  exit 1
fi

cd "$MOBILE_DIR"
CI=1 ./node_modules/.bin/expo prebuild --platform android --no-install
NODE_ENV=production ./android/gradlew \
  -p ./android \
  bundleRelease \
  -PreactNativeArchitectures=armeabi-v7a,arm64-v8a \
  --no-daemon

AAB_PATH="$MOBILE_DIR/android/app/build/outputs/bundle/release/app-release.aab"
if [[ ! -f "$AAB_PATH" ]]; then
  echo "Gradle completed but no AAB was found at $AAB_PATH" >&2
  exit 1
fi

echo "Signed Google Play bundle: $AAB_PATH"
