#!/usr/bin/env tsx
/**
 * Notification Permissions Setup Script
 * Run with: pnpm dotenv tsx scripts/setup-notification-permissions.ts
 */

import { Client, Databases, Storage, Permission, Role } from 'node-appwrite';

const config = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
};

const tableIds = {
  notificationCampaigns: process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATION_CAMPAIGNS_TABLE_ID || 'notification_campaigns',
  notificationAnalytics: process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATION_ANALYTICS_TABLE_ID || 'notification_campaign_analytics',
  pushSubscriptions: process.env.NEXT_PUBLIC_APPWRITE_PUSH_SUBSCRIPTIONS_TABLE_ID || 'push_subscriptions',
  pushLog: process.env.NEXT_PUBLIC_APPWRITE_PUSH_LOG_TABLE_ID || 'push_notification_log',
  pushTemplates: process.env.NEXT_PUBLIC_APPWRITE_PUSH_TEMPLATES_TABLE_ID || 'push_templates',
  pushPreferences: process.env.NEXT_PUBLIC_APPWRITE_PUSH_PREFERENCES_TABLE_ID || 'push_user_preferences',
};

const bucketIds = {
  notificationImages: process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATION_IMAGES_BUCKET_ID || 'notification-images',
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Your Appwrite Cloud instance does not support Role.label() via the SDK.
// Instead we pass permissions as plain strings using the format Appwrite expects.
// Format: "create(\"label:admin\")" etc.
// We build these manually since the SDK Role.label() is being rejected.
function adminPermissions(): string[] {
  return [
    `create("label:admin")`,
    `read("label:admin")`,
    `update("label:admin")`,
    `delete("label:admin")`,
  ];
}

function publicCreateAdminManagePermissions(): string[] {
  return [
    `create("any")`,
    `read("any")`,
    `update("any")`,
    `delete("any")`,
    `create("label:admin")`,
    `read("label:admin")`,
    `update("label:admin")`,
    `delete("label:admin")`,
  ];
}

function publicReadAdminManagePermissions(): string[] {
  return [
    `create("label:admin")`,
    `read("any")`,
    `update("label:admin")`,
    `delete("label:admin")`,
  ];
}

async function updateCollectionPermissions(
  databases: Databases,
  collectionId: string,
  name: string,
  permissions: string[]
): Promise<void> {
  try {
    console.log(`  🔐 Updating permissions for "${name}"...`);
    await databases.updateCollection(
      config.databaseId!,
      collectionId,
      name,
      permissions as any
    );
    console.log(`  ✅ Done: "${name}"`);
  } catch (error: any) {
    console.error(`  ❌ Failed "${name}": ${error.message}`);
    if (error.code === 404) {
      console.error(`     Table does not exist. Run setup scripts first.`);
    }
  }
}

async function updateBucketPermissions(
  storage: Storage,
  bucketId: string,
  name: string,
  permissions: string[]
): Promise<void> {
  try {
    console.log(`  🔐 Updating permissions for bucket "${name}"...`);
    await storage.updateBucket(bucketId, name, permissions as any);
    console.log(`  ✅ Done: "${name}"`);
  } catch (error: any) {
    console.error(`  ❌ Failed "${name}": ${error.message}`);
    if (error.code === 404) {
      console.error(`     Bucket does not exist. Run setup scripts first.`);
    }
  }
}

async function setupNotificationPermissions(): Promise<void> {
  if (!config.endpoint || !config.projectId || !config.apiKey || !config.databaseId) {
    console.error('❌ Missing required environment variables.');
    process.exit(1);
  }

  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);

  const databases = new Databases(client);
  const storage = new Storage(client);

  console.log('🚀 Notification Permissions Setup');
  console.log('='.repeat(60));
  console.log();

  // ── Admin-only tables ─────────────────────────────────────────────────────
  console.log('🔴 Setting ADMIN-ONLY permissions...\n');

  for (const [id, name] of [
    [tableIds.notificationCampaigns,  'Notification Campaigns'],
    [tableIds.notificationAnalytics,  'Notification Campaign Analytics'],
    [tableIds.pushTemplates,           'Push Templates'],
    [tableIds.pushPreferences,         'Push User Preferences'],
  ] as [string, string][]) {
    await updateCollectionPermissions(databases, id, name, adminPermissions());
    await sleep(500);
  }

  // ── Public create / admin manage ──────────────────────────────────────────
  console.log('\n🟡 Setting PUBLIC CREATE / ADMIN MANAGE permissions...\n');

  // Push Subscriptions — anyone can subscribe, admin can manage
  await updateCollectionPermissions(
    databases,
    tableIds.pushSubscriptions,
    'Push Subscriptions',
    publicCreateAdminManagePermissions()
  );
  await sleep(500);

  // Push Log — admin creates logs, anyone can read (for click tracking)
  await updateCollectionPermissions(
    databases,
    tableIds.pushLog,
    'Push Notification Log',
    adminPermissions()
  );
  await sleep(500);

  // ── Buckets ───────────────────────────────────────────────────────────────
  console.log('\n🔴 Setting ADMIN-ONLY bucket permissions...\n');

  // Notification images — admin uploads, public can view
  await updateBucketPermissions(
    storage,
    bucketIds.notificationImages,
    'Notification Images',
    publicReadAdminManagePermissions()
  );
  await sleep(500);

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('\n🎉 Notification Permissions Setup Complete!');
  console.log();
  console.log('⚠️  Important:');
  console.log('   - Add the "admin" label to authorized users in Appwrite Console');
  console.log('   - Appwrite Console > Auth > Users > [User] > Labels');
}

setupNotificationPermissions().catch((error) => {
  console.error('\n❌ Fatal error:', error.message);
  if (error.code) console.error('Error code:', error.code);
  process.exit(1);
});