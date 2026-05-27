import {
  Client,
  Account,
  TablesDB,
  Storage,
} from "node-appwrite";
// Use a different approach for cookies in Next.js 16

/**
 * Creates server-side Appwrite client
 * For use in server components, API routes, and proxy.ts
 */
export function createClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

  // In Next.js 16, we'll use a different approach for authentication
  // Instead of relying on cookies directly, we'll use JWT or other auth methods
  // For now, we'll just return the client without session

  // Initialize services
  const account = new Account(client);
  const tablesDB = new TablesDB(client);
  const storage = new Storage(client);

  return {
    client,
    account,
    tablesDB,
    storage
  };
}

/**
 * Creates admin-level server client with API key
 * For use in server actions that need full database access
 */
export async function createAppwriteServerClient() {
  const { Client, Databases, Storage } = await import("node-appwrite");
  
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

  return {
    client,
    databases: new Databases(client),
    storage: new Storage(client),
  };
}

// Export database constants
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '';
export const PRODUCTS_TABLE_ID = process.env.NEXT_PUBLIC_APPWRITE_PRODUCTS_COLLECTION_ID || '';
export const PRODUCT_IMAGES_TABLE_ID = process.env.NEXT_PUBLIC_APPWRITE_PRODUCT_IMAGES_COLLECTION_ID || '';
export const ORDERS_TABLE_ID = process.env.NEXT_PUBLIC_APPWRITE_ORDERS_COLLECTION_ID || '';
export const CUSTOMERS_TABLE_ID = process.env.NEXT_PUBLIC_APPWRITE_CUSTOMERS_COLLECTION_ID || '';
export const STORAGE_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID || '';
