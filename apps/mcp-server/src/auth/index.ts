import { UnauthorizedError } from "@yousuf-rice/domain";

export function validateAuthToken(requestAuthHeader: string | undefined | null): void {
  const expectedToken = process.env.MCP_AUTH_TOKEN;

  if (!expectedToken) {
    return;
  }

  if (!requestAuthHeader) {
    throw new UnauthorizedError("Missing Authorization header");
  }

  const token = requestAuthHeader.replace(/^Bearer\s+/i, "").trim();

  if (!constantTimeCompare(token, expectedToken)) {
    throw new UnauthorizedError("Invalid authorization token");
  }
}

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
