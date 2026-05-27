import { Account, Client, Storage, TablesDB } from "appwrite";

export const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? "")
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "");

export const account = new Account(client);
export const tablesDB = new TablesDB(client);
export const storage = new Storage(client);
