import { Client, Account, Databases, Storage } from 'appwrite';

/**
 * Creates server-side Appwrite client without cookie handling
 * For use in proxy.ts where we don't need to maintain session
 */
export function createServerClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

  // Initialize services
  const account = new Account(client);
  const tablesDB = new Databases(client);
  const storage = new Storage(client);

  return {
    client,
    account,
    tablesDB,
    storage
  };
}

// Export database constants
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '';
export const PRODUCTS_TABLE_ID = process.env.NEXT_PUBLIC_APPWRITE_PRODUCTS_COLLECTION_ID || '';
export const PRODUCT_IMAGES_TABLE_ID = process.env.NEXT_PUBLIC_APPWRITE_PRODUCT_IMAGES_COLLECTION_ID || '';
export const ORDERS_TABLE_ID = process.env.NEXT_PUBLIC_APPWRITE_ORDERS_COLLECTION_ID || '';
export const CUSTOMERS_TABLE_ID = process.env.NEXT_PUBLIC_APPWRITE_CUSTOMERS_COLLECTION_ID || '';
export const STORAGE_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID || '';
