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

cd "$REPOSITORY_DIRECTORY"
corepack pnpm install --frozen-lockfile

cd "$MOBILE_DIRECTORY/ios"
pod install
