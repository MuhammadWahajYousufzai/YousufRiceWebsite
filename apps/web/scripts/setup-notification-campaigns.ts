#!/usr/bin/env tsx
/**
 * Notification Campaigns Table Setup Script
 * Run with: pnpm dotenv tsx scripts/setup-notification-campaigns.ts
 *
 * Creates tables needed for notification campaigns:
 * - notification_campaigns: Campaign data, images, analytics
 * - notification_campaign_analytics: Per-campaign delivery/click tracking
 */

import { Client, Databases, ID, Permission, Role, Storage } from 'node-appwrite';

const config = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
};

const tableIds = {
  notificationCampaigns: process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATION_CAMPAIGNS_TABLE_ID || 'notification_campaigns',
  notificationAnalytics: process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATION_ANALYTICS_TABLE_ID || 'notification_campaign_analytics',
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function deleteCollectionIfExists(databases: Databases, collectionId: string, name: string): Promise<void> {
  try {
    await databases.deleteCollection(config.databaseId!, collectionId);
    console.log(`  🗑️  Deleted existing "${name}" table`);
    await sleep(1000);
  } catch (error: any) {
    if (error.code === 404) {
      console.log(`  ℹ️  "${name}" doesn't exist yet`);
    } else {
      console.error(`  ❌ Failed to delete "${name}":`, error.message);
    }
  }
}

async function deleteBucketIfExists(storage: Storage, bucketId: string, name: string): Promise<void> {
  try {
    await storage.deleteBucket(bucketId);
    console.log(`  🗑️  Deleted existing "${name}" bucket`);
    await sleep(1000);
  } catch (error: any) {
    if (error.code === 404) {
      console.log(`  ℹ️  "${name}" bucket doesn't exist yet`);
    } else {
      console.error(`  ❌ Failed to delete "${name}" bucket:`, error.message);
    }
  }
}

async function setupNotificationTables(): Promise<void> {
  const client = new Client()
    .setEndpoint(config.endpoint!)
    .setProject(config.projectId!)
    .setKey(config.apiKey!);

  const databases = new Databases(client);
  const storage = new Storage(client);

  if (!config.endpoint || !config.projectId || !config.apiKey || !config.databaseId) {
    console.error('❌ Missing required environment variables. Check your .env file.');
    process.exit(1);
  }

  console.log('🚀 Notification Campaigns Tables Setup');
  console.log('=' .repeat(50));
  console.log();

  // ============================================================================
  // Notification Campaigns Table
  // ============================================================================
  console.log('📋 Creating Notification Campaigns table...');

  await deleteCollectionIfExists(databases, tableIds.notificationCampaigns, 'Notification Campaigns');

  await databases.createCollection(
    config.databaseId,
    tableIds.notificationCampaigns,
    'Notification Campaigns',
    [
      Permission.create(Role.users()),
      Permission.read(Role.any()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ]
  );

  // Required fields
  await databases.createStringAttribute(config.databaseId, tableIds.notificationCampaigns, 'title', 200, true);
  await databases.createStringAttribute(config.databaseId, tableIds.notificationCampaigns, 'body', 1000, true);

  // Optional fields
  await databases.createStringAttribute(config.databaseId, tableIds.notificationCampaigns, 'image_url', 500, false);
  await databases.createStringAttribute(config.databaseId, tableIds.notificationCampaigns, 'target_url', 500, false);
  await databases.createStringAttribute(config.databaseId, tableIds.notificationCampaigns, 'icon_url', 500, false);
  await databases.createStringAttribute(config.databaseId, tableIds.notificationCampaigns, 'badge_url', 500, false);
  await databases.createStringAttribute(config.databaseId, tableIds.notificationCampaigns, 'tag', 100, false);
  await databases.createStringAttribute(config.databaseId, tableIds.notificationCampaigns, 'campaign_type', 50, false, 'push'); // push, in-app, both
  await databases.createEnumAttribute(
    config.databaseId,
    tableIds.notificationCampaigns,
    'status',
    ['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'],
    false,
    'draft'
  );
  await databases.createBooleanAttribute(config.databaseId, tableIds.notificationCampaigns, 'is_active', false, true);
  await databases.createIntegerAttribute(config.databaseId, tableIds.notificationCampaigns, 'sent_count', false, 0);
  await databases.createIntegerAttribute(config.databaseId, tableIds.notificationCampaigns, 'clicked_count', false, 0);
  await databases.createIntegerAttribute(config.databaseId, tableIds.notificationCampaigns, 'failed_count', false, 0);
  await databases.createIntegerAttribute(config.databaseId, tableIds.notificationCampaigns, 'delivered_count', false, 0);
  await databases.createIntegerAttribute(config.databaseId, tableIds.notificationCampaigns, 'dismissed_count', false, 0);
  await databases.createStringAttribute(config.databaseId, tableIds.notificationCampaigns, 'scheduled_at', 50, false);
  await databases.createStringAttribute(config.databaseId, tableIds.notificationCampaigns, 'sent_at', 50, false);
  await databases.createStringAttribute(config.databaseId, tableIds.notificationCampaigns, 'created_by', 255, false);
  await databases.createStringAttribute(config.databaseId, tableIds.notificationCampaigns, 'target_segment', 100, false, 'all'); // all, active_users, inactive_users, custom
  await databases.createStringAttribute(config.databaseId, tableIds.notificationCampaigns, 'target_tags', 100, false, undefined, true); // Array of tags
  await databases.createStringAttribute(config.databaseId, tableIds.notificationCampaigns, 'actions', 1000, false); // JSON action buttons
  await databases.createBooleanAttribute(config.databaseId, tableIds.notificationCampaigns, 'require_interaction', false, false);

  console.log('  ✅ Notification Campaigns table created');
  console.log();

  // ============================================================================
  // Notification Campaign Analytics Table
  // ============================================================================
  console.log('📋 Creating Notification Campaign Analytics table...');

  await deleteCollectionIfExists(databases, tableIds.notificationAnalytics, 'Notification Campaign Analytics');

  await databases.createCollection(
    config.databaseId,
    tableIds.notificationAnalytics,
    'Notification Campaign Analytics',
    [
      Permission.create(Role.any()),
      Permission.read(Role.any()),
      Permission.update(Role.any()),
      Permission.delete(Role.users()),
    ]
  );

  // Required fields
  await databases.createStringAttribute(config.databaseId, tableIds.notificationAnalytics, 'campaign_id', 255, true);
  await databases.createStringAttribute(config.databaseId, tableIds.notificationAnalytics, 'subscription_id', 255, true);

  // Optional fields
  await databases.createEnumAttribute(
    config.databaseId,
    tableIds.notificationAnalytics,
    'event_type',
    ['sent', 'delivered', 'clicked', 'dismissed', 'failed'],
    false,
    'sent'
  );
  await databases.createStringAttribute(config.databaseId, tableIds.notificationAnalytics, 'user_agent', 500, false);
  await databases.createStringAttribute(config.databaseId, tableIds.notificationAnalytics, 'ip_address', 50, false);
  await databases.createStringAttribute(config.databaseId, tableIds.notificationAnalytics, 'clicked_url', 500, false);
  await databases.createIntegerAttribute(config.databaseId, tableIds.notificationAnalytics, 'error_code', false);
  await databases.createStringAttribute(config.databaseId, tableIds.notificationAnalytics, 'error_message', 500, false);
  await databases.createStringAttribute(config.databaseId, tableIds.notificationAnalytics, 'event_at', 50, false);

  console.log('  ✅ Notification Campaign Analytics table created');
  console.log();

  // ============================================================================
  // Notification Images Bucket
  // ============================================================================
  console.log('🪣 Creating Notification Images bucket...');

  const bucketId = 'notification-images';
  await deleteBucketIfExists(storage, bucketId, 'Notification Images');

  await storage.createBucket(
    bucketId,
    'Notification Images',
    [
      Permission.create(Role.users()),
      Permission.read(Role.any()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ],
    false, // fileSecurity
    true,  // enabled
    undefined, // maximumFileSize (use default)
    ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'] // allowedFileExtensions
  );

  console.log('  ✅ Notification Images bucket created');
  console.log();

  // ============================================================================
  // Create Indexes
  // ============================================================================
  console.log('⏳ Waiting for attributes to be ready before creating indexes...');
  await sleep(5000);

  console.log('📇 Creating indexes on Notification Campaigns...');
  await databases.createIndex(config.databaseId, tableIds.notificationCampaigns, 'idx_status', 'key' as any, ['status']);
  await databases.createIndex(config.databaseId, tableIds.notificationCampaigns, 'idx_is_active', 'key' as any, ['is_active']);
  await databases.createIndex(config.databaseId, tableIds.notificationCampaigns, 'idx_campaign_type', 'key' as any, ['campaign_type']);
  await databases.createIndex(config.databaseId, tableIds.notificationCampaigns, 'idx_created_at', 'key' as any, ['$createdAt']);

  console.log('📇 Creating indexes on Notification Campaign Analytics...');
  await databases.createIndex(config.databaseId, tableIds.notificationAnalytics, 'idx_campaign_id', 'key' as any, ['campaign_id']);
  await databases.createIndex(config.databaseId, tableIds.notificationAnalytics, 'idx_event_type', 'key' as any, ['event_type']);
  await databases.createIndex(config.databaseId, tableIds.notificationAnalytics, 'idx_campaign_event', 'key' as any, ['campaign_id', 'event_type']);
  await databases.createIndex(config.databaseId, tableIds.notificationAnalytics, 'idx_event_at', 'key' as any, ['event_at']);

  console.log();

  // ============================================================================
  // Done
  // ============================================================================
  console.log('🎉 All notification campaign tables created successfully!');
  console.log();
  console.log('📝 Add the following to your .env file:');
  console.log(`
NEXT_PUBLIC_APPWRITE_NOTIFICATION_CAMPAIGNS_TABLE_ID=${tableIds.notificationCampaigns}
NEXT_PUBLIC_APPWRITE_NOTIFICATION_ANALYTICS_TABLE_ID=${tableIds.notificationAnalytics}
NEXT_PUBLIC_APPWRITE_NOTIFICATION_IMAGES_BUCKET_ID=notification-images
`);
  console.log();
  console.log('🚀 Next steps:');
  console.log('  1. Add the env variables to your .env file');
  console.log('  2. Visit /admin/notifications to manage campaigns');
  console.log();
}

setupNotificationTables().catch((error) => {
  console.error('\n❌ Fatal error:', error.message);
  if (error.code) console.error('Error code:', error.code);
  process.exit(1);
});
