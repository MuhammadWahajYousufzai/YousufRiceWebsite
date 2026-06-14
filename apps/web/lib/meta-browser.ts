"use client";

import type { MetaCustomData } from "@/lib/meta";

export type { MetaCustomData };

export const META_DATASET_ID = process.env.NEXT_PUBLIC_META_DATASET_ID;

const META_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

export function sanitizeCustomerNameForMeta(
  name: string | undefined | null,
): string | undefined {
  if (!name) return undefined;

  const sanitized = name
    .replace(/\s*-\s*[sSkK]\s*/g, " ")
    .replace(/\s*\(\s*[sSkK]\s*\)\s*/g, " ")
    .replace(/\b[sSkK]\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return sanitized || undefined;
}

function fallbackHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

async function hashString(str: string): Promise<string> {
  const normalized = str.toLowerCase().trim();
  if (window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const hashBuffer = await window.crypto.subtle.digest(
      "SHA-256",
      encoder.encode(normalized),
    );
    return Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  return fallbackHash(normalized);
}

export async function generateEventId(options?: {
  eventName?: string;
  stableKey?: string;
}): Promise<string> {
  const eventPrefix = options?.eventName
    ? options.eventName.toLowerCase().replace(/[^a-z0-9]+/g, "_")
    : "event";

  if (options?.stableKey) {
    const stableHash = await hashString(options.stableKey);
    return `${eventPrefix}_${stableHash.slice(0, 16)}`;
  }

  return `${eventPrefix}_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 10)}`;
}

function readBrowserCookies(): Record<string, string> {
  return document.cookie.split(";").reduce((acc, cookie) => {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex === -1) return acc;

    const key = cookie.slice(0, separatorIndex).trim();
    const value = cookie.slice(separatorIndex + 1);
    if (key) acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
}

function getMetaCookieDomainAttribute(): string {
  const hostname = window.location.hostname.toLowerCase();
  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return "";
  }

  try {
    const primaryHostname = new URL(
      process.env.NEXT_PUBLIC_PRIMARY_DOMAIN || window.location.origin,
    ).hostname
      .toLowerCase()
      .replace(/^www\./, "");

    if (
      primaryHostname &&
      (hostname === primaryHostname ||
        hostname === `www.${primaryHostname}` ||
        hostname.endsWith(`.${primaryHostname}`))
    ) {
      return `; Domain=.${primaryHostname}`;
    }
  } catch {
    // Fall back to a host-only cookie when the configured domain is invalid.
  }

  return "";
}

function writeMetaCookie(name: string, value: string) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    [
      `${name}=${encodeURIComponent(value)}`,
      `Max-Age=${META_COOKIE_MAX_AGE_SECONDS}`,
      "Path=/",
      "SameSite=Lax",
    ].join("; ") +
    getMetaCookieDomainAttribute() +
    secure;
}

function createMetaBrowserId(): string {
  const timestamp = Date.now();
  const browserCrypto = window.crypto;
  const randomPart =
    browserCrypto && "randomUUID" in browserCrypto
      ? browserCrypto.randomUUID().replace(/-/g, "").slice(0, 16)
      : Math.random().toString(36).slice(2, 12);

  return `fb.1.${timestamp}.${randomPart}`;
}

function getOrCreateFacebookCookies(): { fbp?: string; fbc?: string } {
  const cookies = readBrowserCookies();
  let fbp: string | undefined = cookies._fbp;
  let fbc: string | undefined = cookies._fbc;

  if (!fbp) {
    fbp = createMetaBrowserId();
    writeMetaCookie("_fbp", fbp);
  }

  const fbclid = new URLSearchParams(window.location.search).get("fbclid");
  if (fbclid) {
    const nextFbc = `fb.1.${Date.now()}.${fbclid}`;
    const currentFbclid = fbc?.split(".").slice(3).join(".");
    if (currentFbclid !== fbclid) {
      fbc = nextFbc;
      writeMetaCookie("_fbc", fbc);
    }
  } else if (!fbc) {
    fbc = undefined;
  }

  if (fbc && !cookies._fbc) {
    writeMetaCookie("_fbc", fbc);
  }

  return {
    fbp: fbp ? decodeURIComponent(fbp) : undefined,
    fbc: fbc ? decodeURIComponent(fbc) : undefined,
  };
}

export function getFacebookCookies(): { fbp?: string; fbc?: string } {
  if (typeof window === "undefined") return {};
  return getOrCreateFacebookCookies();
}
