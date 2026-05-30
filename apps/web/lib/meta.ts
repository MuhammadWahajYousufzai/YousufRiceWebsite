import crypto from 'crypto';
import type { AgentLabel, OrderChannel } from "@/lib/tracking/order-channel";

export const META_DATASET_ID = process.env.NEXT_PUBLIC_META_DATASET_ID!;
export const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN!;

export const META_API_URL = `https://graph.facebook.com/v20.0/${META_DATASET_ID}/events`;
const META_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

export interface MetaUserData {
  em?: string;
  ph?: string;
  fn?: string;
  ln?: string;
  ct?: string;
  st?: string;
  zp?: string;
  country?: string;
  client_ip_address?: string;
  client_user_agent?: string;
  fbp?: string;
  fbc?: string;
  external_id?: string;
}

export interface MetaCustomData {
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  contents?: Array<{
    id: string;
    quantity: number;
    item_price?: number;
  }>;
  num_items?: number;
  predicted_ltv?: number;
  search_string?: string;
  status?: string;
  order_id?: string;
  order_channel?: OrderChannel;
  agent_label?: AgentLabel;
  placed_by_user_id?: string;
  customer_user_id?: string;
}

export interface MetaEvent {
  event_name: string;
  event_time: number;
  event_id: string;
  event_source_url?: string;
  action_source: 'website';
  user_data: MetaUserData;
  custom_data?: MetaCustomData;
}

export interface MetaEventPayload {
  data: MetaEvent[];
  test_event_code?: string;
}

// Utility: Remove call agent symbols from customer name before sending to Meta
// Removes: -s, -S, -k, -K, (s), (S), (k), (K) which indicate orders taken by call agents
export function sanitizeCustomerNameForMeta(name: string | undefined | null): string | undefined {
  if (!name) return undefined;
  
  // Remove agent symbols: -s, -S, -k, -K, (s), (S), (k), (K)
  // This regex removes the symbols with optional spaces around them
  const sanitized = name
    .replace(/\s*-\s*[sSkK]\s*/g, ' ')  // Remove -s, -S, -k, or -K with surrounding spaces
    .replace(/\s*\(\s*[sSkK]\s*\)\s*/g, ' ')  // Remove (s), (S), (k), or (K) with surrounding spaces
    .replace(/\b[sSkK]\b/g, ' ')  // Remove standalone s, S, k, or K
    .replace(/\s+/g, ' ')  // Normalize multiple spaces to single space
    .trim();  // Remove leading/trailing spaces
  
  return sanitized || undefined;
}

function normalizeTextForMeta(data: string | undefined | null): string | undefined {
  if (!data) return undefined;
  const normalized = data.toLowerCase().trim().replace(/\s+/g, ' ');
  return normalized || undefined;
}

function normalizePhoneForMeta(phone: string | undefined | null): string | undefined {
  if (!phone) return undefined;

  let digits = phone.replace(/\D/g, '');
  if (!digits) return undefined;

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (digits.startsWith('0') && digits.length === 11) {
    digits = `92${digits.slice(1)}`;
  }

  return digits;
}

// Utility: Hash data with SHA256 (required by Meta) - server-only, uses Node.js crypto
export function hashData(data: string | undefined | null): string | undefined {
  const normalized = normalizeTextForMeta(data);
  if (!normalized) return undefined;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function hashPhoneData(phone: string | undefined | null): string | undefined {
  const normalized = normalizePhoneForMeta(phone);
  if (!normalized) return undefined;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

// Cross-platform SHA256: uses Web Crypto API in browser, Node.js crypto on server
async function hashString(str: string): Promise<string> {
  const normalized = str.toLowerCase().trim();
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoder.encode(normalized));
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

// Utility: Generate unique event ID for deduplication — works in browser and server
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

  return `${eventPrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

// Utility: Get current Unix timestamp
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

function readBrowserCookies(): Record<string, string> {
  return document.cookie.split(';').reduce((acc, cookie) => {
    const separatorIndex = cookie.indexOf('=');
    if (separatorIndex === -1) return acc;

    const key = cookie.slice(0, separatorIndex).trim();
    const value = cookie.slice(separatorIndex + 1);
    if (key) acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
}

function getMetaCookieDomainAttribute(): string {
  const hostname = window.location.hostname.toLowerCase();
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return '';
  }

  try {
    const primaryHostname = new URL(
      process.env.NEXT_PUBLIC_PRIMARY_DOMAIN || window.location.origin,
    ).hostname
      .toLowerCase()
      .replace(/^www\./, '');

    if (
      primaryHostname &&
      (hostname === primaryHostname ||
        hostname === `www.${primaryHostname}` ||
        hostname.endsWith(`.${primaryHostname}`))
    ) {
      return `; Domain=.${primaryHostname}`;
    }
  } catch {
    // Ignore invalid environment URLs and fall back to a host-only cookie.
  }

  return '';
}

function writeMetaCookie(name: string, value: string) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = [
    `${name}=${encodeURIComponent(value)}`,
    `Max-Age=${META_COOKIE_MAX_AGE_SECONDS}`,
    'Path=/',
    'SameSite=Lax',
  ].join('; ') + getMetaCookieDomainAttribute() + secure;
}

function createMetaBrowserId(): string {
  const timestamp = Date.now();
  const browserCrypto = window.crypto;
  const randomPart =
    typeof browserCrypto !== 'undefined' && 'randomUUID' in browserCrypto
      ? browserCrypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : Math.random().toString(36).slice(2, 12);

  return `fb.1.${timestamp}.${randomPart}`;
}

function getOrCreateFacebookCookies(): { fbp?: string; fbc?: string } {
  const cookies = readBrowserCookies();
  let fbp: string | undefined = cookies._fbp;
  let fbc: string | undefined = cookies._fbc;

  if (!fbp) {
    fbp = createMetaBrowserId();
    writeMetaCookie('_fbp', fbp);
  }

  const fbclid = new URLSearchParams(window.location.search).get('fbclid');
  if (fbclid) {
    const nextFbc = `fb.1.${Date.now()}.${fbclid}`;
    const currentFbclid = fbc?.split('.').slice(3).join('.');
    if (currentFbclid !== fbclid) {
      fbc = nextFbc;
      writeMetaCookie('_fbc', fbc);
    }
  } else if (!fbc) {
    fbc = undefined;
  }

  if (fbc && !cookies._fbc) {
    writeMetaCookie('_fbc', fbc);
  }

  return {
    fbp: fbp ? decodeURIComponent(fbp) : undefined,
    fbc: fbc ? decodeURIComponent(fbc) : undefined,
  };
}

// Utility: Extract Facebook cookies from browser. If Meta has not created _fbp
// yet, create the same first-party identifier format so guest CAPI events can
// still be matched and deduplicated with browser Pixel events.
export function getFacebookCookies(): { fbp?: string; fbc?: string } {
  if (typeof window === 'undefined') return {};

  return getOrCreateFacebookCookies();
}

// Utility: Get client IP (from headers in API route)
export function getClientIp(request: Request): string | undefined {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const candidates = [
    request.headers.get('cf-connecting-ip'),
    request.headers.get('true-client-ip'),
    request.headers.get('x-real-ip'),
    request.headers.get('x-client-ip'),
    forwardedFor?.split(',')[0],
  ];

  return candidates
    .map((value) => value?.trim())
    .find((value): value is string => Boolean(value && value !== 'unknown'));
}

// Utility: Prepare user data with hashing
export function prepareUserData(rawUserData: {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  clientIp?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
  externalId?: string;
}): MetaUserData {
  return {
    em: hashData(rawUserData.email),
    ph: hashPhoneData(rawUserData.phone),
    fn: hashData(rawUserData.firstName),
    ln: hashData(rawUserData.lastName),
    ct: hashData(rawUserData.city),
    st: hashData(rawUserData.state),
    zp: hashData(rawUserData.zipCode),
    country: hashData(rawUserData.country),
    client_ip_address: rawUserData.clientIp,
    client_user_agent: rawUserData.userAgent,
    fbp: rawUserData.fbp,
    fbc: rawUserData.fbc,
    external_id: rawUserData.externalId,
  };
}

// Utility: Send event to Meta Conversions API
export async function sendMetaEvent(
  event: MetaEvent,
  testEventCode?: string
): Promise<{ success: boolean; error?: string }> {
  const payload: MetaEventPayload = {
    data: [event],
    ...(testEventCode && { test_event_code: testEventCode }),
  };

  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(META_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      timeout = undefined;

      if (response.ok) {
        return { success: true };
      }

      let errorMessage = 'Unknown error';
      try {
        const result = await response.json();
        const error = result?.error;
        errorMessage = [
          error?.message,
          error?.error_user_title,
          error?.error_user_msg,
          error?.error_subcode ? `subcode ${error.error_subcode}` : undefined,
        ]
          .filter(Boolean)
          .join(" - ") || errorMessage;
      } catch {
        errorMessage = `Meta API HTTP ${response.status}`;
      }

      const shouldRetry = response.status >= 500 || response.status === 429;
      if (!shouldRetry || attempt === maxAttempts) {
        console.error('Meta API Error:', {
          eventName: event.event_name,
          eventId: event.event_id,
          attempt,
          status: response.status,
          errorMessage,
        });
        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (error) {
      const isAbort = error instanceof Error && error.name === 'AbortError';
      const isLastAttempt = attempt === maxAttempts;
      if (isLastAttempt) {
        console.error('Meta API Request Failed:', {
          eventName: event.event_name,
          eventId: event.event_id,
          attempt,
          error,
        });
        return {
          success: false,
          error: isAbort
            ? 'Meta request timeout'
            : error instanceof Error
              ? error.message
              : 'Network error',
        };
      }
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  return { success: false, error: 'Meta request failed' };
}
