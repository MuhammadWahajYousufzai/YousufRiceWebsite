"use client";

import { account } from "@/lib/appwrite";

type GraphQLResponse<TData> = {
  data?: TData;
  errors?: Array<{ message?: string }>;
  error?: string;
  message?: string;
};

export async function requestAdminGraphQL<TData>(
  query: string,
  variables?: Record<string, unknown>
) {
  const authHeaders = await createAuthHeaders();
  const response = await fetch("/api/admin/graphql", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = (await response.json().catch(() => ({}))) as GraphQLResponse<TData>;

  if (!response.ok || payload.errors?.length || !payload.data) {
    const graphQLError = payload.errors
      ?.map((error) => error.message)
      .filter(Boolean)
      .join("; ");
    const message =
      graphQLError ||
      payload.message ||
      payload.error ||
      `Admin GraphQL request failed with status ${response.status}`;

    throw new Error(message);
  }

  return payload.data;
}

async function createAuthHeaders(): Promise<Record<string, string>> {
  try {
    const token = await account.createJWT();
    if (token.jwt) {
      return {
        Authorization: `Bearer ${token.jwt}`,
      };
    }
  } catch {
    // Fall back to the synced httpOnly session cookie when JWT creation is unavailable.
  }

  return {};
}
