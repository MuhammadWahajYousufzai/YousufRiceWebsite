import "react-native-url-polyfill/auto";

import {
  Account,
  Channel,
  Client,
  ID,
  Query,
  Realtime,
  Storage,
  TablesDB,
} from "react-native-appwrite";

export const APPWRITE_ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ?? "";
export const APPWRITE_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? "";
export const APPWRITE_PLATFORM = process.env.EXPO_PUBLIC_APPWRITE_PLATFORM ?? "";

export const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID ?? "";
export const PRODUCTS_TABLE_ID = process.env.EXPO_PUBLIC_APPWRITE_PRODUCTS_TABLE_ID ?? "";
export const PRODUCT_IMAGES_TABLE_ID =
  process.env.EXPO_PUBLIC_APPWRITE_PRODUCT_IMAGES_TABLE_ID ?? "";
export const ORDERS_TABLE_ID = process.env.EXPO_PUBLIC_APPWRITE_ORDERS_TABLE_ID ?? "";
export const ORDER_ITEMS_TABLE_ID =
  process.env.EXPO_PUBLIC_APPWRITE_ORDER_ITEMS_TABLE_ID ?? "";
export const CUSTOMERS_TABLE_ID = process.env.EXPO_PUBLIC_APPWRITE_CUSTOMERS_TABLE_ID ?? "";
export const ADDRESSES_TABLE_ID = process.env.EXPO_PUBLIC_APPWRITE_ADDRESSES_TABLE_ID ?? "";
export const STORAGE_BUCKET_ID = process.env.EXPO_PUBLIC_APPWRITE_STORAGE_BUCKET_ID ?? "";
export const BANNER_STORAGE_BUCKET_ID =
  process.env.EXPO_PUBLIC_BANNER_STORAGE_BUCKET_ID ?? "";

export const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

if (APPWRITE_PLATFORM) {
  client.setPlatform(APPWRITE_PLATFORM);
}

export const account = new Account(client);
export const realtime = new Realtime(client);
export const tablesDB = new TablesDB(client);
export const storage = new Storage(client);

export { Channel, ID, Query };
