import {
  Client,
  ID,
  MessagePriority,
  Messaging,
  Query,
  Users,
  type Models,
} from "node-appwrite";

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || "";

const USER_PAGE_SIZE = 100;
const MESSAGE_RECIPIENT_BATCH_SIZE = 100;

export interface AppwritePushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  image?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export interface AppwritePushTargetSummary {
  userId: string;
  targetId: string;
  providerId?: string;
  providerType: string;
}

function createMessagingClient() {
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
    throw new Error(
      "Missing Appwrite Messaging configuration. Set NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, and APPWRITE_API_KEY.",
    );
  }

  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  return {
    messaging: new Messaging(client),
    users: new Users(client),
  };
}

function getPushTargets(user: Models.User<Models.Preferences>) {
  return user.targets.filter(
    (target) => target.providerType === "push" && !target.expired,
  );
}

export async function listAppwritePushTargets() {
  const { users } = createMessagingClient();
  const pushTargets: AppwritePushTargetSummary[] = [];
  const userIds = new Set<string>();
  let cursor: string | undefined;

  while (true) {
    const queries = [Query.limit(USER_PAGE_SIZE), Query.orderAsc("$id")];
    if (cursor) {
      queries.push(Query.cursorAfter(cursor));
    }

    const page = await users.list({ queries, total: false });
    if (page.users.length === 0) break;

    for (const user of page.users) {
      const targets = getPushTargets(user);
      if (targets.length === 0) continue;

      userIds.add(user.$id);
      for (const target of targets) {
        pushTargets.push({
          userId: user.$id,
          targetId: target.$id,
          providerId: target.providerId,
          providerType: target.providerType,
        });
      }
    }

    if (page.users.length < USER_PAGE_SIZE) break;
    cursor = page.users[page.users.length - 1]?.$id;
    if (!cursor) break;
  }

  return {
    users: [...userIds],
    targets: pushTargets,
  };
}

export async function sendAppwritePushNotifications(payload: AppwritePushPayload) {
  const { messaging } = createMessagingClient();
  const recipients = await listAppwritePushTargets();
  const errors: string[] = [];

  if (recipients.users.length === 0) {
    return {
      sent: 0,
      failed: 0,
      total: 0,
      delivered: 0,
      removed: 0,
      messageIds: [] as string[],
      errors,
    };
  }

  const messageIds: string[] = [];
  let delivered = 0;
  let sent = 0;
  let failed = 0;

  for (
    let index = 0;
    index < recipients.users.length;
    index += MESSAGE_RECIPIENT_BATCH_SIZE
  ) {
    const batch = recipients.users.slice(
      index,
      index + MESSAGE_RECIPIENT_BATCH_SIZE,
    );

    try {
      const message = await messaging.createPush({
        messageId: ID.unique(),
        title: payload.title,
        body: payload.body,
        users: batch,
        data: {
          ...(payload.data || {}),
          url: payload.url || "/",
          tag: payload.tag || "general",
        },
        action: payload.url || "/",
        icon: payload.icon,
        image: payload.image,
        tag: payload.tag || "general",
        priority: MessagePriority.High,
      });

      messageIds.push(message.$id);
      delivered += message.deliveredTotal || 0;
      sent += batch.length;

      if (message.deliveryErrors?.length) {
        errors.push(...message.deliveryErrors);
      }
    } catch (error) {
      failed += batch.length;
      const message =
        error instanceof Error
          ? error.message
          : "Unknown Appwrite Messaging error";
      errors.push(message);
    }
  }

  return {
    sent,
    failed,
    total: recipients.users.length,
    delivered,
    removed: 0,
    messageIds,
    targetCount: recipients.targets.length,
    errors,
  };
}
