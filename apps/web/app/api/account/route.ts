import { Account, Client, Query, TablesDB, Users } from "node-appwrite";

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const APPWRITE_PROJECT_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || "";
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
const CUSTOMERS_TABLE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_CUSTOMERS_TABLE_ID || "";
const ORDERS_TABLE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_ORDERS_TABLE_ID || "";

function configurationIsComplete() {
  return Boolean(
    APPWRITE_ENDPOINT &&
      APPWRITE_PROJECT_ID &&
      APPWRITE_API_KEY &&
      DATABASE_ID &&
      CUSTOMERS_TABLE_ID &&
      ORDERS_TABLE_ID,
  );
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

function createUserAccount(jwt: string) {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setJWT(jwt);

  return new Account(client);
}

function createAdminServices() {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  return {
    tablesDB: new TablesDB(client),
    users: new Users(client),
  };
}

async function detachCustomerProfiles(userId: string, tablesDB: TablesDB) {
  const customers = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: CUSTOMERS_TABLE_ID,
    queries: [Query.equal("user_id", userId), Query.limit(100)],
    total: false,
  });

  let deletedProfiles = 0;
  let retainedOrderProfiles = 0;

  for (const customer of customers.rows) {
    const orders = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: ORDERS_TABLE_ID,
      queries: [Query.equal("customer_id", customer.$id), Query.limit(1)],
      total: false,
    });

    if (orders.rows.length === 0) {
      await tablesDB.deleteRow({
        databaseId: DATABASE_ID,
        tableId: CUSTOMERS_TABLE_ID,
        rowId: customer.$id,
      });
      deletedProfiles += 1;
      continue;
    }

    // Keep existing order records operational, but sever their relationship
    // to the deleted Appwrite account and remove the account email.
    await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: CUSTOMERS_TABLE_ID,
      rowId: customer.$id,
      data: {
        email: null,
        user_id: `deleted:${customer.$id}`,
      },
    });
    retainedOrderProfiles += 1;
  }

  return { deletedProfiles, retainedOrderProfiles };
}

export async function DELETE(request: Request) {
  if (!configurationIsComplete()) {
    console.error("[Account deletion] Missing Appwrite server configuration");
    return Response.json(
      { error: "Account deletion is temporarily unavailable." },
      { status: 503 },
    );
  }

  const jwt = bearerToken(request);
  if (!jwt) {
    return Response.json(
      { error: "Authentication is required." },
      { status: 401 },
    );
  }

  try {
    const currentUser = await createUserAccount(jwt).get();
    if (!currentUser.email) {
      return Response.json(
        { error: "Only registered customer accounts can be deleted here." },
        { status: 400 },
      );
    }

    const { tablesDB, users } = createAdminServices();
    const cleanup = await detachCustomerProfiles(currentUser.$id, tablesDB);
    await users.delete({ userId: currentUser.$id });

    return Response.json(
      { deleted: true, ...cleanup },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? Number(error.code)
        : 500;

    if (code === 401) {
      return Response.json(
        { error: "Your session expired. Sign in and try again." },
        { status: 401 },
      );
    }

    console.error("[Account deletion] Request failed", error);
    return Response.json(
      { error: "Your account could not be deleted. Please try again." },
      { status: 500 },
    );
  }
}
