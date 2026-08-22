# Yousuf Rice Mobile

Expo/React Native app for the Yousuf Rice customer storefront.

## iOS App Store Launch Without EAS

Current iOS identifiers:

- App name: `Yousuf Rice`
- Bundle ID: `com.yousufrice.mobile`
- Apple Team ID in Xcode project: `V4AYP7YKGS`
- Xcode workspace: `ios/YousufRice.xcworkspace`
- Xcode scheme: `YousufRice`
- App version: `1.0.0`
- Build number: `6`

## Local Checks

Run from the repository root:

```bash
pnpm --filter @yousuf-rice/mobile typecheck
```

Then run the app locally:

```bash
pnpm --filter @yousuf-rice/mobile ios
```

## Live Storefront Promotions (iOS and Android)

Promotions and the announcement bar are managed from **Web Admin →
Promotions**. The iOS, Android, and web storefronts read the same
`storefront_content` Appwrite table and subscribe to Realtime changes. A
15-second polling fallback and refresh-on-app-focus keep content current if a
Realtime connection is temporarily unavailable.

The mobile build only needs the table identifier once:

```bash
EXPO_PUBLIC_APPWRITE_STOREFRONT_CONTENT_TABLE_ID=storefront_content
```

Offer copy, selected products, reward rules, designs, scheduling, ordering,
and on/off switches are no longer compiled into the app bundle.

## Prepare App Store Connect

In App Store Connect, create the app before uploading the first archive:

1. Select the same Apple Developer team as `V4AYP7YKGS`.
2. Create a new iOS app named `Yousuf Rice`.
3. Use bundle ID `com.yousufrice.mobile`.
4. Use SKU `com.yousufrice.mobile` unless you already have a store SKU.
5. Complete pricing and availability, age rating, app privacy, support URL, review contact, and demo/review notes.
6. Add screenshots. Because the current native project supports iPad, include iPad screenshots too or disable iPad support before release.

## Archive With Xcode

From a Mac with Xcode signed into the Apple Developer account:

1. Open `apps/mobile/ios/YousufRice.xcworkspace`.
2. Select scheme `YousufRice`.
3. Select destination `Any iOS Device (arm64)`.
4. In `Signing & Capabilities`, confirm team `V4AYP7YKGS` and bundle ID `com.yousufrice.mobile`.
5. Choose `Product > Archive`.
6. When Organizer opens, choose `Distribute App`.
7. Select `App Store Connect`.
8. Upload the archive.

## Command Line Archive

You can also create an archive from the repository root:

```bash
xcodebuild archive \
  -workspace apps/mobile/ios/YousufRice.xcworkspace \
  -scheme YousufRice \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath "$PWD/apps/mobile/build/YousufRice.xcarchive"
```

Then open Xcode Organizer and upload the archive, or export an `.ipa` with an `ExportOptions.plist` configured for App Store distribution.

## App Store Connect API Upload

For Codex-driven/TestFlight uploads, use an App Store Connect API key instead of a browser session:

1. In App Store Connect, create or download an API key. Team keys live under `Users and Access > Integrations > Team Keys`; individual keys live under your profile.
2. Copy `apps/mobile/app-store-connect.env.example` to `apps/mobile/.env.appstoreconnect.local`.
3. Put the downloaded key at `apps/mobile/AuthKey_<KEY_ID>.p8`, or set `ASC_KEY_PATH` to its absolute path.
4. Fill `ASC_KEY_ID`, `ASC_ISSUER_ID`, and `APPLE_TEAM_ID` in `.env.appstoreconnect.local`.
5. Upload with:

```bash
pnpm --filter @yousuf-rice/mobile ios:asc:upload
```

To create a local App Store `.ipa` without uploading:

```bash
pnpm --filter @yousuf-rice/mobile ios:asc:export
```

The real `.p8` and `.env.appstoreconnect.local` files are ignored by git. Apple only lets you download a private API key once, so keep a backup in a secure password manager or vault.

## Versioning

Before each upload, increment the iOS build number so Apple accepts the new binary:

- App Store version: `expo.version` in `app.json`
- iOS build number: `expo.ios.buildNumber` in `app.json`
- Native build number: `CURRENT_PROJECT_VERSION` in `ios/YousufRice.xcodeproj/project.pbxproj`

If you change `app.json`, run prebuild or update the native Xcode project so the committed iOS project matches the release version.

## Privacy Notes

The iOS project already declares location usage copy and `ITSAppUsesNonExemptEncryption=false`. Review App Store Connect privacy answers against the actual production backend behavior before submitting for review.
