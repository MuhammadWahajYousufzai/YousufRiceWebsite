/**
 * Migration Script: Convert tags from string to array
 * Run: pnpm dotenv tsx scripts/migrate-tags-to-array.ts
 */

import { Client, Databases, Query } from "node-appwrite";

const config = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
  apiKey: process.env.APPWRITE_API_KEY!,
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  pushSubscriptionsTableId: process.env.NEXT_PUBLIC_APPWRITE_PUSH_SUBSCRIPTIONS_TABLE_ID!,
};

async function migrateTagsToArray() {
  console.log("🔄 Starting tags migration...\n");

  // Validate config
  if (!config.apiKey || !config.databaseId) {
    console.error("❌ Missing required environment variables");
    console.log("Required: APPWRITE_API_KEY, NEXT_PUBLIC_APPWRITE_DATABASE_ID");
    process.exit(1);
  }

  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);

  const databases = new Databases(client);

  try {
    // Step 1: Delete the old string 'tags' attribute
    console.log("1️⃣  Deleting old string 'tags' attribute...");
    try {
      await databases.deleteAttribute(
        config.databaseId,
        config.pushSubscriptionsTableId,
        "tags"
      );
      console.log("   ✅ Old tags attribute deleted");
    } catch (error: any) {
      if (error?.message?.includes("not found")) {
        console.log("   ⚠️  Old tags attribute not found (may already be deleted)");
      } else {
        throw error;
      }
    }

    // Step 2: Create new string array 'tags' attribute
    console.log("\n2️⃣  Creating new array 'tags' attribute...");
    await databases.createStringAttribute(
      config.databaseId,
      config.pushSubscriptionsTableId,
      "tags",
      100, // each tag max 100 chars
      false, // not required
      undefined, // no default
      true // IS ARRAY = true
    );
    console.log("   ✅ New tags array attribute created");

    // Step 3: Wait for attribute to be ready
    console.log("\n3️⃣  Waiting for attribute to be ready (5 seconds)...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Step 4: Migrate existing data
    console.log("\n4️⃣  Migrating existing subscriptions...");
    let migrated = 0;
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const queries = [Query.limit(100)];
      if (cursor) {
        queries.push(Query.cursorAfter(cursor));
      }

      const result = await databases.listDocuments(
        config.databaseId,
        config.pushSubscriptionsTableId,
        queries
      );

      for (const doc of result.documents) {
        // Check if tags field exists and is a string (needs migration)
        const tagsValue = (doc as any).tags;
        if (tagsValue && typeof tagsValue === "string" && tagsValue.length > 0) {
          // Convert comma-separated string to array
          const tagsArray = tagsValue
            .split(",")
            .map((t: string) => t.trim())
            .filter((t: string) => t.length > 0);

          // Update document with array
          await databases.updateDocument(
            config.databaseId,
            config.pushSubscriptionsTableId,
            doc.$id,
            { tags: tagsArray }
          );
          migrated++;
        } else if (!tagsValue || tagsValue === "") {
          // Set empty array for null/empty tags
          await databases.updateDocument(
            config.databaseId,
            config.pushSubscriptionsTableId,
            doc.$id,
            { tags: [] }
          );
          migrated++;
        }
      }

      hasMore = result.documents.length === 100;
      if (hasMore && result.documents.length > 0) {
        cursor = result.documents[result.documents.length - 1].$id;
      }

      process.stdout.write(`   Processed: ${migrated} documents\r`);
    }

    console.log(`\n   ✅ Migrated ${migrated} subscriptions`);

    console.log("\n🎉 Migration complete!");
    console.log("\nYour database now accepts tags as an ARRAY instead of comma-separated string.");
    console.log("The subscription button should work now.");

  } catch (error: any) {
    console.error("\n❌ Migration failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

migrateTagsToArray();
