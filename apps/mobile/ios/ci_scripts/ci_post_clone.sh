#!/bin/sh

set -eu

SCRIPT_DIRECTORY=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
MOBILE_DIRECTORY=$(CDPATH= cd -- "$SCRIPT_DIRECTORY/../.." && pwd)
REPOSITORY_DIRECTORY=$(CDPATH= cd -- "$MOBILE_DIRECTORY/../.." && pwd)

required_public_variables="
EXPO_PUBLIC_APPWRITE_ENDPOINT
EXPO_PUBLIC_APPWRITE_PROJECT_ID
EXPO_PUBLIC_APPWRITE_PLATFORM
EXPO_PUBLIC_APPWRITE_DATABASE_ID
EXPO_PUBLIC_APPWRITE_PRODUCTS_TABLE_ID
EXPO_PUBLIC_APPWRITE_PRODUCT_IMAGES_TABLE_ID
EXPO_PUBLIC_APPWRITE_ORDERS_TABLE_ID
EXPO_PUBLIC_APPWRITE_ORDER_ITEMS_TABLE_ID
EXPO_PUBLIC_APPWRITE_CUSTOMERS_TABLE_ID
EXPO_PUBLIC_APPWRITE_ADDRESSES_TABLE_ID
EXPO_PUBLIC_APPWRITE_STORAGE_BUCKET_ID
EXPO_PUBLIC_BANNER_STORAGE_BUCKET_ID
EXPO_PUBLIC_APPWRITE_IOS_PUSH_PROVIDER_ID
"

missing_public_variables=""
for variable_name in $required_public_variables; do
  if [ -z "$(printenv "$variable_name" 2>/dev/null || true)" ]; then
    missing_public_variables="$missing_public_variables $variable_name"
  fi
done

if [ -n "$missing_public_variables" ]; then
  echo "error: Add these public app variables to the Xcode Cloud workflow:$missing_public_variables"
  exit 1
fi

if ! command -v corepack >/dev/null 2>&1 &&
   ! command -v pnpm >/dev/null 2>&1 &&
   ! command -v npx >/dev/null 2>&1; then
  if ! command -v brew >/dev/null 2>&1; then
    echo "error: Xcode Cloud does not provide Homebrew, which is required to install Node.js."
    exit 1
  fi
  brew install node
fi

if ! command -v pod >/dev/null 2>&1; then
  if ! command -v brew >/dev/null 2>&1; then
    echo "error: Xcode Cloud does not provide Homebrew, which is required to install CocoaPods."
    exit 1
  fi
  brew install cocoapods
fi

cd "$REPOSITORY_DIRECTORY"
PNPM_VERSION="11.6.0"
if command -v corepack >/dev/null 2>&1; then
  corepack pnpm install --frozen-lockfile
elif command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile
elif command -v npx >/dev/null 2>&1; then
  npx --yes "pnpm@$PNPM_VERSION" install --frozen-lockfile
else
  echo "error: Xcode Cloud does not provide corepack, pnpm, or npx on PATH."
  exit 1
fi

cd "$MOBILE_DIRECTORY/ios"
pod install
