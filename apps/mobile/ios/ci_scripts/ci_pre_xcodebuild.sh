#!/bin/sh

set -eu

SCRIPT_DIRECTORY=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIRECTORY=$(CDPATH= cd -- "$SCRIPT_DIRECTORY/.." && pwd)
INFO_PLIST="$SCRIPT_DIRECTORY/../YousufRice/Info.plist"

# Version 1.0.0 build 5 was uploaded before the ATT startup fix. Offset Xcode
# Cloud's sequential build number so the first corrected archive is build 6
# and later runs stay unique for TestFlight.
cloud_build_number=${CI_BUILD_NUMBER:-1}
case "$cloud_build_number" in
  *[!0-9]*|'') app_build_number=6 ;;
  *) app_build_number=$((cloud_build_number + 5)) ;;
esac

cd "$PROJECT_DIRECTORY"
/usr/bin/xcrun agvtool new-version -all "$app_build_number"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $app_build_number" "$INFO_PLIST"
echo "Using TestFlight build number $app_build_number"
