#!/usr/bin/env tsx
/**
 * Push Notification Tables Setup Script (Production)
 * Run with: pnpm dotenv tsx scripts/setup-push-tables.ts
 * 
 * Creates all tables needed for production push notification system:
 * - push_subscriptions: User subscription data
 * - push_notification_log: Notification delivery tracking
 * - push_templates: Reusable notification templates
 * - push_user_preferences: Per-user notification settings
 */

import { Client, Databases, ID, Permission, Role } from 'node-appwrite';

const config = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
};

const tableIds = {
  pushSubscriptions: process.env.NEXT_PUBLIC_APPWRITE_PUSH_SUBSCRIPTIONS_TABLE_ID || 'push_subscriptions',
  pushNotificationLog: process.env.NEXT_PUBLIC_APPWRITE_PUSH_LOG_TABLE_ID || 'push_notification_log',
  pushTemplates: process.env.NEXT_PUBLIC_APPWRITE_PUSH_TEMPLATES_TABLE_ID || 'push_templates',
  pushUserPreferences: process.env.NEXT_PUBLIC_APPWRITE_PUSH_PREFERENCES_TABLE_ID || 'push_user_preferences',
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

async function setupPushTables(): Promise<void> {
  const client = new Client()
    .setEndpoint(config.endpoint!)
    .setProject(config.projectId!)
    .setKey(config.apiKey!);

  const databases = new Databases(client);

  // Validate
  if (!config.endpoint || !config.projectId || !config.apiKey || !config.databaseId) {
    console.error('❌ Missing required environment variables. Check your .env file.');
    process.exit(1);
  }

  console.log('🚀 Push Notification Tables Setup (Production)');
  console.log('=' .repeat(50));
  console.log();

  // ============================================================================
  // Push Subscriptions Table
  // ============================================================================
  console.log('📋 Creating Push Subscriptions table...');

  await deleteCollectionIfExists(databases, tableIds.pushSubscriptions, 'Push Subscriptions');

  await databases.createCollection(
    config.databaseId,
    tableIds.pushSubscriptions,
    'Push Subscriptions',
    [
      Permission.create(Role.any()),
      Permission.read(Role.any()),
      Permission.update(Role.any()),
      Permission.delete(Role.any()),
    ]
  );

  // Required fields
  await databases.createStringAttribute(config.databaseId, tableIds.pushSubscriptions, 'endpoint', 500, true);
  await databases.createStringAttribute(config.databaseId, tableIds.pushSubscriptions, 'p256dh', 255, true);
  await databases.createStringAttribute(config.databaseId, tableIds.pushSubscriptions, 'auth', 255, true);
  
  // Optional fields
  await databases.createStringAttribute(config.databaseId, tableIds.pushSubscriptions, 'user_id', 255, false);
  await databases.createStringAttribute(config.databaseId, tableIds.pushSubscriptions, 'tags', 100, false, undefined, true); // String array (multiple tags)
  await databases.createEnumAttribute(
    config.databaseId,
    tableIds.pushSubscriptions,
    'status',
    ['active', 'inactive', 'pending'],
    false,
    'active'
  );
  await databases.createIntegerAttribute(config.databaseId, tableIds.pushSubscriptions, 'fail_count', false, 0);
  await databases.createStringAttribute(config.databaseId, tableIds.pushSubscriptions, 'user_agent', 500, false);
  await databases.createStringAttribute(config.databaseId, tableIds.pushSubscriptions, 'ip_address', 50, false);
  await databases.createStringAttribute(config.databaseId, tableIds.pushSubscriptions, 'last_used_at', 50, false);
  await databases.createStringAttribute(config.databaseId, tableIds.pushSubscriptions, 'created_at', 50, false);

  console.log('  ✅ Push Subscriptions table created');
  console.log();

  // ============================================================================
  // Push Notification Log Table
  // ============================================================================
  console.log('📋 Creating Push Notification Log table...');

  await deleteCollectionIfExists(databases, tableIds.pushNotificationLog, 'Push Notification Log');

  await databases.createCollection(
    config.databaseId,
    tableIds.pushNotificationLog,
    'Push Notification Log',
    [
      Permission.create(Role.any()),
      Permission.read(Role.any()),
      Permission.update(Role.any()),
      Permission.delete(Role.any()),
    ]
  );

  // Required fields
  await databases.createStringAttribute(config.databaseId, tableIds.pushNotificationLog, 'subscription_id', 255, true);
  await databases.createStringAttribute(config.databaseId, tableIds.pushNotificationLog, 'title', 255, true);
  await databases.createStringAttribute(config.databaseId, tableIds.pushNotificationLog, 'body', 1000, true);
  
  // Optional fields
  await databases.createStringAttribute(config.databaseId, tableIds.pushNotificationLog, 'url', 500, false);
  await databases.createStringAttribute(config.databaseId, tableIds.pushNotificationLog, 'tag', 100, false);
  await databases.createStringAttribute(config.databaseId, tableIds.pushNotificationLog, 'image', 500, false);
  await databases.createEnumAttribute(
    config.databaseId,
    tableIds.pushNotificationLog,
    'status',
    ['sent', 'clicked', 'dismissed', 'failed', 'delivered'],
    false,
    'sent'
  );
  
  // Timestamps
  await databases.createStringAttribute(config.databaseId, tableIds.pushNotificationLog, 'sent_at', 50, false);
  await databases.createStringAttribute(config.databaseId, tableIds.pushNotificationLog, 'clicked_at', 50, false);
  await databases.createStringAttribute(config.databaseId, tableIds.pushNotificationLog, 'dismissed_at', 50, false);
  await databases.createStringAttribute(config.databaseId, tableIds.pushNotificationLog, 'created_at', 50, false);
  
  // Error tracking
  await databases.createStringAttribute(config.databaseId, tableIds.pushNotificationLog, 'error_message', 500, false);
  await databases.createIntegerAttribute(config.databaseId, tableIds.pushNotificationLog, 'error_code', false);

  console.log('  ✅ Push Notification Log table created');
  console.log();

  // ============================================================================
  // Push Templates Table (Optional but recommended)
  // ============================================================================
  console.log('📋 Creating Push Templates table...');

  await deleteCollectionIfExists(databases, tableIds.pushTemplates, 'Push Templates');

  await databases.createCollection(
    config.databaseId,
    tableIds.pushTemplates,
    'Push Templates',
    [
      Permission.create(Role.users()),
      Permission.read(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ]
  );

  await databases.createStringAttribute(config.databaseId, tableIds.pushTemplates, 'name', 100, true);
  await databases.createStringAttribute(config.databaseId, tableIds.pushTemplates, 'title', 100, true);
  await databases.createStringAttribute(config.databaseId, tableIds.pushTemplates, 'body', 300, true);
  await databases.createStringAttribute(config.databaseId, tableIds.pushTemplates, 'icon', 500, false);
  await databases.createStringAttribute(config.databaseId, tableIds.pushTemplates, 'badge', 500, false);
  await databases.createStringAttribute(config.databaseId, tableIds.pushTemplates, 'tag', 100, false);
  await databases.createStringAttribute(config.databaseId, tableIds.pushTemplates, 'url', 500, false);
  await databases.createStringAttribute(config.databaseId, tableIds.pushTemplates, 'actions', 1000, false); // JSON string
  await databases.createBooleanAttribute(config.databaseId, tableIds.pushTemplates, 'require_interaction', false, false);
  await databases.createIntegerAttribute(config.databaseId, tableIds.pushTemplates, 'ttl', false, 86400);
  await databases.createBooleanAttribute(config.databaseId, tableIds.pushTemplates, 'is_active', false, true);
  await databases.createStringAttribute(config.databaseId, tableIds.pushTemplates, 'created_at', 50, false);

  console.log('  ✅ Push Templates table created');
  console.log();

  // ============================================================================
  // Push User Preferences Table (Optional but recommended)
  // ============================================================================
  console.log('📋 Creating Push User Preferences table...');

  await deleteCollectionIfExists(databases, tableIds.pushUserPreferences, 'Push User Preferences');

  await databases.createCollection(
    config.databaseId,
    tableIds.pushUserPreferences,
    'Push User Preferences',
    [
      Permission.create(Role.users()),
      Permission.read(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ]
  );

  await databases.createStringAttribute(config.databaseId, tableIds.pushUserPreferences, 'user_id', 255, true);
  await databases.createBooleanAttribute(config.databaseId, tableIds.pushUserPreferences, 'enabled', false, true);
  await databases.createStringAttribute(config.databaseId, tableIds.pushUserPreferences, 'quiet_hours_start', 10, false); // "22:00"
  await databases.createStringAttribute(config.databaseId, tableIds.pushUserPreferences, 'quiet_hours_end', 10, false);     // "08:00"
  await databases.createStringAttribute(config.databaseId, tableIds.pushUserPreferences, 'timezone', 50, false, 'UTC');
  await databases.createStringAttribute(config.databaseId, tableIds.pushUserPreferences, 'excluded_tags', 500, false);    // JSON array
  await databases.createIntegerAttribute(config.databaseId, tableIds.pushUserPreferences, 'max_per_day', false, 10);
  await databases.createStringAttribute(config.databaseId, tableIds.pushUserPreferences, 'updated_at', 50, false);

  console.log('  ✅ Push User Preferences table created');
  console.log();

  // ============================================================================
  // Create Indexes
  // ============================================================================
  console.log('⏳ Waiting for attributes to be ready before creating indexes...');
  await sleep(5000);

  console.log('📇 Creating indexes on Push Subscriptions...');
  await databases.createIndex(config.databaseId, tableIds.pushSubscriptions, 'idx_user_id', 'key' as any, ['user_id']);
  await databases.createIndex(config.databaseId, tableIds.pushSubscriptions, 'idx_status', 'key' as any, ['status']);
  await databases.createIndex(config.databaseId, tableIds.pushSubscriptions, 'idx_endpoint', 'unique' as any, ['endpoint']);
  await databases.createIndex(config.databaseId, tableIds.pushSubscriptions, 'idx_created_at', 'key' as any, ['created_at']);

  console.log('📇 Creating indexes on Push Notification Log...');
  await databases.createIndex(config.databaseId, tableIds.pushNotificationLog, 'idx_subscription_status', 'key' as any, ['subscription_id', 'status']);
  await databases.createIndex(config.databaseId, tableIds.pushNotificationLog, 'idx_status_sent', 'key' as any, ['status', 'sent_at']);
  await databases.createIndex(config.databaseId, tableIds.pushNotificationLog, 'idx_tag', 'key' as any, ['tag']);
  await databases.createIndex(config.databaseId, tableIds.pushNotificationLog, 'idx_created_at', 'key' as any, ['created_at']);

  console.log('📇 Creating indexes on Push Templates...');
  await databases.createIndex(config.databaseId, tableIds.pushTemplates, 'idx_name', 'unique' as any, ['name']);
  await databases.createIndex(config.databaseId, tableIds.pushTemplates, 'idx_is_active', 'key' as any, ['is_active']);

  console.log('📇 Creating indexes on Push User Preferences...');
  await databases.createIndex(config.databaseId, tableIds.pushUserPreferences, 'idx_user_id', 'unique' as any, ['user_id']);
  await databases.createIndex(config.databaseId, tableIds.pushUserPreferences, 'idx_enabled', 'key' as any, ['enabled']);

  console.log();

  // ============================================================================
  // Done
  // ============================================================================
  console.log('🎉 All push notification tables created successfully!');
  console.log();
  console.log('📝 Add the following to your .env file:');
  console.log(`
NEXT_PUBLIC_APPWRITE_PUSH_SUBSCRIPTIONS_TABLE_ID=${tableIds.pushSubscriptions}
NEXT_PUBLIC_APPWRITE_PUSH_LOG_TABLE_ID=${tableIds.pushNotificationLog}
NEXT_PUBLIC_APPWRITE_PUSH_TEMPLATES_TABLE_ID=${tableIds.pushTemplates}
NEXT_PUBLIC_APPWRITE_PUSH_PREFERENCES_TABLE_ID=${tableIds.pushUserPreferences}

# VAPID Keys (Generate with: npx web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_EMAIL=mailto:your-email@example.com

# Push API Secret (for protecting admin endpoints - generate a random 32+ char string)
PUSH_API_SECRET=your_random_secret_here_at_least_32_chars_long
`);
  console.log();
  console.log('🚀 Next steps:');
  console.log('  1. Generate VAPID keys: npx web-push generate-vapid-keys');
  console.log('  2. Add the keys to your .env file');
  console.log('  3. Generate PUSH_API_SECRET (random 32+ character string)');
  console.log('  4. Test the system: curl -H "x-push-secret: YOUR_SECRET" http://localhost:3000/api/push/health');
  console.log();
}

setupPushTables().catch((error) => {
  console.error('\n❌ Fatal error:', error.message);
  if (error.code) console.error('Error code:', error.code);
  process.exit(1);
});
