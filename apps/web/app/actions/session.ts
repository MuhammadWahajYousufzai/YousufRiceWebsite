"use server";

import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "yousuf_session";

export async function setSessionCookie(secret: string) {
  console.log('[SessionAction] Setting session cookie, secret length:', secret?.length);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
  console.log('[SessionAction] Cookie set successfully');
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}
