import { Client, TablesDB } from "node-appwrite";

export interface AppwriteConfig {
  endpoint: string;
  projectId: string;
  apiKey: string;
  databaseId: string;
  productsTableId: string;
  ordersTableId: string;
  orderItemsTableId: string;
  customersTableId: string;
  addressesTableId: string;
}

let tablesDBInstance: TablesDB | null = null;
let configInstance: AppwriteConfig | null = null;

export function initAppwrite(config: AppwriteConfig): TablesDB {
  if (tablesDBInstance && configInstance?.endpoint === config.endpoint) {
    return tablesDBInstance;
  }

  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);

  configInstance = config;
  tablesDBInstance = new TablesDB(client);
  return tablesDBInstance;
}

export function getTablesDB(): TablesDB {
  if (!tablesDBInstance) {
    throw new Error("Appwrite not initialized. Call initAppwrite() first.");
  }
  return tablesDBInstance;
}

export function getConfig(): AppwriteConfig {
  if (!configInstance) {
    throw new Error("Appwrite not initialized. Call initAppwrite() first.");
  }
  return configInstance;
}

export function loadConfigFromEnv(): AppwriteConfig {
  const endpoint = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
  const productsTableId = process.env.APPWRITE_PRODUCTS_TABLE_ID || process.env.NEXT_PUBLIC_APPWRITE_PRODUCTS_TABLE_ID;
  const ordersTableId = process.env.APPWRITE_ORDERS_TABLE_ID || process.env.NEXT_PUBLIC_APPWRITE_ORDERS_TABLE_ID;
  const orderItemsTableId = process.env.APPWRITE_ORDER_ITEMS_TABLE_ID || process.env.NEXT_PUBLIC_APPWRITE_ORDER_ITEMS_TABLE_ID;
  const customersTableId = process.env.APPWRITE_CUSTOMERS_TABLE_ID || process.env.NEXT_PUBLIC_APPWRITE_CUSTOMERS_TABLE_ID;
  const addressesTableId = process.env.APPWRITE_ADDRESSES_TABLE_ID || process.env.NEXT_PUBLIC_APPWRITE_ADDRESSES_TABLE_ID;

  if (!endpoint || !projectId || !apiKey || !databaseId) {
    throw new Error(
      "Missing required Appwrite environment variables: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DATABASE_ID"
    );
  }

  if (!productsTableId || !ordersTableId || !orderItemsTableId || !customersTableId || !addressesTableId) {
    throw new Error("Missing required Appwrite table ID environment variables");
  }

  return {
    endpoint,
    projectId,
    apiKey,
    databaseId,
    productsTableId,
    ordersTableId,
    orderItemsTableId,
    customersTableId,
    addressesTableId,
  };
}
