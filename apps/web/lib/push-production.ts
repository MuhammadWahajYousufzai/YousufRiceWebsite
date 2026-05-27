/**
 * Production-Grade Push Notification System
 * 
 * Features:
 * - Rate limiting with Redis/memory store
 * - Input validation and sanitization
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern
 * - Comprehensive logging
 * - Health checks
 * - Metrics collection
 * - Data retention policies
 * - Graceful degradation
 */

import { Client, TablesDB, Query, ID } from "node-appwrite";
import webpush from "web-push";

// ============================================================================
// Configuration & Types
// ============================================================================

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
const PUSH_SUBSCRIPTIONS_TABLE_ID = process.env.NEXT_PUBLIC_APPWRITE_PUSH_SUBSCRIPTIONS_TABLE_ID || "push_subscriptions";
const PUSH_LOG_TABLE_ID = process.env.NEXT_PUBLIC_APPWRITE_PUSH_LOG_TABLE_ID || "push_notification_log";
const PUSH_TEMPLATES_TABLE_ID = process.env.NEXT_PUBLIC_APPWRITE_PUSH_TEMPLATES_TABLE_ID || "push_templates";
const PUSH_USER_PREFERENCES_TABLE_ID = process.env.NEXT_PUBLIC_APPWRITE_PUSH_PREFERENCES_TABLE_ID || "push_user_preferences";

const PUSH_API_SECRET = process.env.PUSH_API_SECRET || "";

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE_MS = 1000;
const CIRCUIT_BREAKER_THRESHOLD = 10;
const CIRCUIT_BREAKER_TIMEOUT_MS = 60000;

// Batch configuration - OPTIMIZED FOR SALES (max throughput)
const DEFAULT_BATCH_SIZE = 500;        // Max 500 per batch
const DEFAULT_BATCH_DELAY_MS = 0;       // No delay between batches (fastest)
const MAX_BATCH_SIZE = 500;             // Maximum allowed
const MAX_CONCURRENT_BATCHES = 5;        // Parallel batch processing

// Rate limiting - CONFIGURABLE PER OPERATION TYPE
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_DEFAULT = 100;
const RATE_LIMIT_SALES_BLAST = 1000; // Very high for sales operations (1000 blasts/min)

// Data retention (days)
const LOG_RETENTION_DAYS = 30;
const INACTIVE_SUBSCRIPTION_DAYS = 30;

// Circuit breaker state
interface CircuitState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

const circuitStates = new Map<string, CircuitState>();

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Metrics
interface PushMetrics {
  totalSent: number;
  totalFailed: number;
  totalClicked: number;
  totalDismissed: number;
  averageLatencyMs: number;
  errorsByType: Map<string, number>;
}

const metrics: PushMetrics = {
  totalSent: 0,
  totalFailed: 0,
  totalClicked: 0,
  totalDismissed: 0,
  averageLatencyMs: 0,
  errorsByType: new Map(),
};

// ============================================================================
// Types
// ============================================================================

export interface PushSubscription {
  $id?: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id?: string | null;
  tags?: string[];
  status: "active" | "inactive" | "pending";
  fail_count: number;
  user_agent?: string | null;
  ip_address?: string | null;
  last_used_at?: string | null;
  created_at?: string;
  $createdAt?: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  image?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  data?: Record<string, unknown>;
  ttl?: number;
  urgency?: "normal" | "high";
  timestamp?: number;
}

export interface SendOptions {
  tags?: string[];
  userIds?: string[];
  batchSize?: number;
  batchDelayMs?: number;
  ttl?: number;
  priority?: "normal" | "high";
  templateId?: string;
  variables?: Record<string, string>;
  skipInactive?: boolean;
  /** @deprecated User preferences are ignored for sales messages to maximize reach */
  ignorePreferences?: boolean; // Always true for sales
  urgent?: boolean; // High priority + longer TTL
}

export interface SendResult {
  total: number;
  sent: number;
  failed: number;
  removed: number;
  retried: number;
  errors: Array<{ endpoint: string; error: string; code?: number }>;
  durationMs: number;
}

export interface UserPreferences {
  userId: string;
  enabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
  excludedTags?: string[];
  maxPerDay?: number;
}

export interface NotificationTemplate {
  $id?: string;
  name: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  actions?: string; // JSON string
  requireInteraction?: boolean;
  ttl?: number;
}

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  vapidConfigured: boolean;
  databaseConnected: boolean;
  circuitBreakerStatus: Record<string, string>;
  metrics: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    notificationsLast24h: number;
    errorRate: number;
  };
  checks: Record<string, { status: "pass" | "fail"; message?: string }>;
}

// ============================================================================
// VAPID Configuration
// ============================================================================

let vapidInitialized = false;

export function initializeVapid(): boolean {
  if (vapidInitialized) return true;
  
  const vapidEmail = process.env.VAPID_EMAIL;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (!vapidEmail || !vapidPublicKey || !vapidPrivateKey) {
    console.warn("[Push] VAPID keys not configured. Push notifications will be disabled.");
    return false;
  }

  try {
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
    vapidInitialized = true;
    return true;
  } catch (error) {
    console.error("[Push] Failed to initialize VAPID:", error);
    return false;
  }
}

export function isPushEnabled(): boolean {
  return vapidInitialized || initializeVapid();
}

// ============================================================================
// Database Client
// ============================================================================

function createAdminClient(): TablesDB {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "")
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "")
    .setKey(process.env.APPWRITE_API_KEY || "");

  return new TablesDB(client);
}

// ============================================================================
// Validation & Sanitization
// ============================================================================

export function validateSubscription(sub: unknown): { valid: boolean; error?: string; data?: Partial<PushSubscription> } {
  if (!sub || typeof sub !== "object") {
    return { valid: false, error: "Invalid subscription object" };
  }

  const s = sub as Record<string, unknown>;

  // Required fields
  if (!s.endpoint || typeof s.endpoint !== "string") {
    return { valid: false, error: "Endpoint is required and must be a string" };
  }

  if (!s.p256dh || typeof s.p256dh !== "string") {
    return { valid: false, error: "p256dh is required and must be a string" };
  }

  if (!s.auth || typeof s.auth !== "string") {
    return { valid: false, error: "auth is required and must be a string" };
  }

  // Validate endpoint format
  try {
    const url = new URL(s.endpoint);
    if (!url.protocol.startsWith("https") && !url.hostname.includes("localhost")) {
      return { valid: false, error: "Endpoint must use HTTPS" };
    }
  } catch {
    return { valid: false, error: "Invalid endpoint URL format" };
  }

  // Sanitize
  const sanitized: Partial<PushSubscription> = {
    endpoint: s.endpoint.trim().slice(0, 500),
    p256dh: s.p256dh.trim().slice(0, 255),
    auth: s.auth.trim().slice(0, 255),
    user_agent: typeof s.user_agent === "string" ? s.user_agent.slice(0, 500) : null,
    ip_address: typeof s.ip_address === "string" ? s.ip_address.slice(0, 50) : null,
  };

  if (s.user_id && typeof s.user_id === "string") {
    sanitized.user_id = s.user_id.trim().slice(0, 255);
  }

  // Handle tags (array or string)
  if (s.tags) {
    if (Array.isArray(s.tags)) {
      sanitized.tags = s.tags.map(t => String(t).trim()).filter(Boolean);
    } else if (typeof s.tags === "string") {
      sanitized.tags = s.tags.split(",").map(t => t.trim()).filter(Boolean);
    }
  }

  return { valid: true, data: sanitized };
}

export function validateNotificationPayload(payload: unknown): { valid: boolean; error?: string; data?: NotificationPayload } {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Invalid payload object" };
  }

  const p = payload as Record<string, unknown>;

  if (!p.title || typeof p.title !== "string" || p.title.trim().length === 0) {
    return { valid: false, error: "Title is required" };
  }

  if (p.title.length > 100) {
    return { valid: false, error: "Title must be 100 characters or less" };
  }

  if (!p.body || typeof p.body !== "string" || p.body.trim().length === 0) {
    return { valid: false, error: "Body is required" };
  }

  if (p.body.length > 300) {
    return { valid: false, error: "Body must be 300 characters or less" };
  }

  const sanitized: NotificationPayload = {
    title: p.title.trim(),
    body: p.body.trim(),
    url: typeof p.url === "string" ? p.url.trim().slice(0, 500) : "/",
    icon: typeof p.icon === "string" ? p.icon.trim().slice(0, 500) : "/logo.png",
    badge: typeof p.badge === "string" ? p.badge.trim().slice(0, 500) : "/badge.png",
    image: typeof p.image === "string" ? p.image.trim().slice(0, 500) : undefined,
    tag: typeof p.tag === "string" ? p.tag.trim().slice(0, 100) : "general",
    requireInteraction: p.requireInteraction === true,
    ttl: typeof p.ttl === "number" && p.ttl > 0 && p.ttl <= 2419200 ? p.ttl : 86400,
    urgency: p.urgency === "high" ? "high" : "normal",
    timestamp: Date.now(),
  };

  // Validate actions
  if (p.actions && Array.isArray(p.actions)) {
    sanitized.actions = p.actions
      .filter((a: unknown) => a && typeof a === "object")
      .map((a: any) => ({
        action: String(a.action || "view").slice(0, 50),
        title: String(a.title || "View").slice(0, 50),
        icon: a.icon ? String(a.icon).slice(0, 500) : undefined,
      }))
      .slice(0, 2); // Max 2 actions
  }

  // Validate data
  if (p.data && typeof p.data === "object") {
    sanitized.data = sanitizeData(p.data as Record<string, unknown>);
  }

  return { valid: true, data: sanitized };
}

function sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const safeKey = String(key).replace(/[^a-zA-Z0-9_]/g, "").slice(0, 50);
    if (typeof value === "string") {
      sanitized[safeKey] = value.slice(0, 1000);
    } else if (typeof value === "number" || typeof value === "boolean") {
      sanitized[safeKey] = value;
    } else if (value === null) {
      sanitized[safeKey] = null;
    }
    // Skip objects, arrays, functions for security
  }
  return sanitized;
}

// ============================================================================
// Rate Limiting
// ============================================================================

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = RATE_LIMIT_DEFAULT
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `${identifier}:${Math.floor(now / RATE_LIMIT_WINDOW_MS)}`;
  
  const record = rateLimitStore.get(key);
  
  if (!record) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
  }
  
  if (now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }
  
  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetTime: record.resetTime };
}

// ============================================================================
// Circuit Breaker
// ============================================================================

function getCircuitState(key: string): CircuitState {
  if (!circuitStates.has(key)) {
    circuitStates.set(key, { failures: 0, lastFailureTime: 0, isOpen: false });
  }
  return circuitStates.get(key)!;
}

function recordSuccess(key: string): void {
  const state = getCircuitState(key);
  state.failures = 0;
  state.isOpen = false;
}

function recordFailure(key: string): boolean {
  const state = getCircuitState(key);
  state.failures++;
  state.lastFailureTime = Date.now();
  
  if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    state.isOpen = true;
    console.warn(`[Push] Circuit breaker opened for ${key}`);
    return true;
  }
  return false;
}

function isCircuitOpen(key: string): boolean {
  const state = getCircuitState(key);
  
  if (!state.isOpen) return false;
  
  // Check if we should try again
  if (Date.now() - state.lastFailureTime > CIRCUIT_BREAKER_TIMEOUT_MS) {
    state.isOpen = false;
    state.failures = 0;
    console.info(`[Push] Circuit breaker half-open for ${key}`);
    return false;
  }
  
  return true;
}

// ============================================================================
// Retry Logic
// ============================================================================

async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = MAX_RETRIES
): Promise<{ success: boolean; result?: T; error?: string; attempts: number }> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      recordSuccess(operationName);
      return { success: true, result, attempts: attempt };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on certain errors
      if (error && typeof error === "object" && "statusCode" in error) {
        const statusCode = (error as any).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          return { success: false, error: lastError.message, attempts: attempt };
        }
      }
      
      if (attempt < maxRetries) {
        const delay = RETRY_DELAY_BASE_MS * Math.pow(2, attempt - 1);
        console.warn(`[Push] Retry ${attempt}/${maxRetries} for ${operationName} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  recordFailure(operationName);
  return { success: false, error: lastError?.message || "Unknown error", attempts: maxRetries };
}

// ============================================================================
// Subscription Management
// ============================================================================

export async function saveSubscription(
  subscription: Omit<PushSubscription, "status" | "fail_count" | "created_at">
): Promise<{ success: boolean; error?: string; id?: string; isNew?: boolean }> {
  if (isCircuitOpen("database")) {
    return { success: false, error: "Service temporarily unavailable" };
  }

  // Validate input
  const validation = validateSubscription(subscription);
  if (!validation.valid || !validation.data) {
    return { success: false, error: validation.error };
  }

  const sub = validation.data;

  try {
    const tablesDB = createAdminClient();

    const result = await withRetry(async () => {
      // Check for existing subscription by endpoint
      const existing = await tablesDB.listRows(
        DATABASE_ID,
        PUSH_SUBSCRIPTIONS_TABLE_ID,
        [Query.equal("endpoint", sub.endpoint!), Query.limit(1)]
      );

      const now = new Date().toISOString();

      if (existing.total > 0) {
        // Update existing
        const existingSub = existing.rows[0] as unknown as PushSubscription;
        await tablesDB.updateRow(
          DATABASE_ID,
          PUSH_SUBSCRIPTIONS_TABLE_ID,
          existingSub.$id!,
          {
            p256dh: sub.p256dh,
            auth: sub.auth,
            user_id: sub.user_id || existingSub.user_id,
            tags: sub.tags || existingSub.tags,
            status: "active",
            fail_count: 0,
            user_agent: sub.user_agent,
            ip_address: sub.ip_address,
            last_used_at: now,
          }
        );
        return { id: existingSub.$id, isNew: false };
      }

      // Create new
      const newId = ID.unique();
      await tablesDB.createRow(
        DATABASE_ID,
        PUSH_SUBSCRIPTIONS_TABLE_ID,
        newId,
        {
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
          user_id: sub.user_id || null,
          tags: sub.tags || [],
          status: "active",
          fail_count: 0,
          user_agent: sub.user_agent,
          ip_address: sub.ip_address,
          last_used_at: now,
        }
      );
      return { id: newId, isNew: true };
    }, "saveSubscription");

    if (result.success && result.result) {
      return { success: true, id: result.result.id, isNew: result.result.isNew };
    }

    return { success: false, error: result.error };
  } catch (error: any) {
    console.error("[Push] Failed to save subscription:", error);
    recordFailure("database");
    return { success: false, error: error.message };
  }
}

export async function removeSubscription(endpoint: string): Promise<{ success: boolean; error?: string }> {
  if (!endpoint || typeof endpoint !== "string") {
    return { success: false, error: "Invalid endpoint" };
  }

  if (isCircuitOpen("database")) {
    return { success: false, error: "Service temporarily unavailable" };
  }

  try {
    const tablesDB = createAdminClient();

    const result = await withRetry(async () => {
      const existing = await tablesDB.listRows(
        DATABASE_ID,
        PUSH_SUBSCRIPTIONS_TABLE_ID,
        [Query.equal("endpoint", endpoint.trim()), Query.limit(1)]
      );

      if (existing.total > 0) {
        const sub = existing.rows[0] as unknown as PushSubscription;
        await tablesDB.deleteRow(DATABASE_ID, PUSH_SUBSCRIPTIONS_TABLE_ID, sub.$id!);
      }
      return { deleted: existing.total > 0 };
    }, "removeSubscription");

    if (result.success) {
      return { success: true };
    }

    return { success: false, error: result.error };
  } catch (error: any) {
    console.error("[Push] Failed to remove subscription:", error);
    recordFailure("database");
    return { success: false, error: error.message };
  }
}

export async function getSubscriptionByEndpoint(endpoint: string): Promise<{ exists: boolean; active: boolean; subscription?: PushSubscription }> {
  if (!endpoint || typeof endpoint !== "string") {
    return { exists: false, active: false };
  }

  if (isCircuitOpen("database")) {
    return { exists: false, active: false };
  }

  try {
    const tablesDB = createAdminClient();

    const result = await withRetry(async () => {
      const existing = await tablesDB.listRows(
        DATABASE_ID,
        PUSH_SUBSCRIPTIONS_TABLE_ID,
        [Query.equal("endpoint", endpoint.trim()), Query.limit(1)]
      );

      if (existing.total === 0) {
        return null;
      }

      return existing.rows[0] as unknown as PushSubscription;
    }, "getSubscription");

    if (result.success && result.result) {
      return {
        exists: true,
        active: result.result.status === "active",
        subscription: result.result,
      };
    }

    return { exists: false, active: false };
  } catch (error) {
    console.error("[Push] Failed to get subscription:", error);
    return { exists: false, active: false };
  }
}

// ============================================================================
// User Preferences
// ============================================================================

export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  if (!userId || isCircuitOpen("database")) return null;

  try {
    const tablesDB = createAdminClient();

    const result = await withRetry(async () => {
      const prefs = await tablesDB.listRows(
        DATABASE_ID,
        PUSH_USER_PREFERENCES_TABLE_ID,
        [Query.equal("user_id", userId), Query.limit(1)]
      );

      if (prefs.total === 0) return null;

      const p = prefs.rows[0] as any;
      return {
        userId: p.user_id,
        enabled: p.enabled ?? true,
        quietHoursStart: p.quiet_hours_start,
        quietHoursEnd: p.quiet_hours_end,
        timezone: p.timezone || "UTC",
        excludedTags: p.excluded_tags || [],
        maxPerDay: p.max_per_day || 10,
      };
    }, "getUserPreferences");

    return result.success && result.result ? result.result : null;
  } catch (error) {
    console.error("[Push] Failed to get user preferences:", error);
    return null;
  }
}

/**
 * @deprecated User preferences are DISABLED for sales mode.
 * All sales messages reach ALL subscribers for maximum conversion.
 */
export async function shouldSendToUser(userId: string, tag?: string): Promise<boolean> {
  // SALES MODE: Always return true to maximize reach
  // User preferences are ignored - all deals/offers go to everyone
  return true;
}

// ============================================================================
// Templates
// ============================================================================

export async function getTemplate(templateId: string): Promise<NotificationTemplate | null> {
  if (!templateId || isCircuitOpen("database")) return null;

  try {
    const tablesDB = createAdminClient();

    const result = await withRetry(async () => {
      const template = await tablesDB.getRow(
        DATABASE_ID,
        PUSH_TEMPLATES_TABLE_ID,
        templateId
      );
      return template as unknown as NotificationTemplate;
    }, "getTemplate");

    return result.success && result.result ? result.result : null;
  } catch (error) {
    console.error("[Push] Failed to get template:", error);
    return null;
  }
}

export function applyTemplate(template: NotificationTemplate, variables: Record<string, string>): NotificationPayload {
  let title = template.title;
  let body = template.body;
  
  // Replace variables
  for (const [key, value] of Object.entries(variables)) {
    const safeValue = value.slice(0, 100);
    title = title.replace(new RegExp(`{{${key}}}`, "g"), safeValue);
    body = body.replace(new RegExp(`{{${key}}}`, "g"), safeValue);
  }
  
  return {
    title,
    body,
    url: template.url,
    icon: template.icon,
    badge: template.badge,
    tag: template.tag,
    actions: template.actions ? JSON.parse(template.actions) : undefined,
    requireInteraction: template.requireInteraction,
    ttl: template.ttl,
  };
}

// ============================================================================
// Logging & Analytics
// ============================================================================

async function logNotification(
  subscriptionId: string,
  payload: NotificationPayload,
  status: "sent" | "clicked" | "dismissed" | "failed" | "delivered",
  errorCode?: number,
  errorMessage?: string
): Promise<void> {
  if (isCircuitOpen("database")) return;

  try {
    const tablesDB = createAdminClient();

    const logData: Record<string, unknown> = {
      subscription_id: subscriptionId,
      title: payload.title.slice(0, 255),
      body: payload.body.slice(0, 1000),
      url: payload.url || "/",
      tag: payload.tag || "general",
      image: payload.image || null,
      status,
      created_at: new Date().toISOString(),
    };

    if (status === "sent" || status === "delivered") {
      logData.sent_at = new Date().toISOString();
    }
    if (status === "clicked") {
      logData.clicked_at = new Date().toISOString();
    }
    if (status === "dismissed") {
      logData.dismissed_at = new Date().toISOString();
    }
    if (status === "failed") {
      logData.error_code = errorCode;
      logData.error_message = (errorMessage || "").slice(0, 500);
    }

    // Fire and forget - don't await
    tablesDB.createRow(DATABASE_ID, PUSH_LOG_TABLE_ID, ID.unique(), logData).catch(err => {
      console.error("[Push] Failed to log notification (non-blocking):", err);
    });
  } catch (error) {
    console.error("[Push] Failed to log notification:", error);
  }
}

export function updateMetrics(result: SendResult): void {
  metrics.totalSent += result.sent;
  metrics.totalFailed += result.failed;
  
  // Update average latency
  const totalOps = metrics.totalSent + metrics.totalFailed;
  if (totalOps > 0) {
    metrics.averageLatencyMs = (metrics.averageLatencyMs * (totalOps - 1) + result.durationMs) / totalOps;
  }
}

export function recordError(type: string): void {
  const current = metrics.errorsByType.get(type) || 0;
  metrics.errorsByType.set(type, current + 1);
}

export function getMetrics(): PushMetrics {
  return { ...metrics, errorsByType: new Map(metrics.errorsByType) };
}

// ============================================================================
// Send Logic
// ============================================================================

async function sendToSubscription(
  subscription: PushSubscription,
  payload: NotificationPayload,
  attempt: number = 1
): Promise<{ success: boolean; shouldRemove?: boolean; shouldRetry?: boolean; error?: string; statusCode?: number }> {
  if (!isPushEnabled()) {
    return { success: false, error: "Push notifications not enabled" };
  }

  // User preferences check DISABLED for sales - all messages go through
  // This ensures maximum reach for deals/offers/discounts

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/",
    icon: payload.icon || "/logo.png",
    badge: payload.badge || "/badge.png",
    image: payload.image,
    tag: payload.tag || "general",
    requireInteraction: payload.requireInteraction ?? false,
    actions: payload.actions || [{ action: "view", title: "View" }],
    data: {
      ...payload.data,
      url: payload.url || "/",
      subscriptionId: subscription.$id,
      timestamp: payload.timestamp,
    },
    timestamp: payload.timestamp,
  });

  const options: webpush.RequestOptions = {
    TTL: payload.ttl || 86400 * 2, // 48 hours default for sales (longer TTL = more delivery)
    urgency: payload.urgency === "high" ? "high" : "normal",
  };

  try {
    const startTime = Date.now();
    await webpush.sendNotification(pushSubscription, notificationPayload, options);
    const latency = Date.now() - startTime;
    
    await logNotification(subscription.$id!, payload, "sent");
    
    // Update subscription last_used_at
    if (subscription.$id) {
      const tablesDB = createAdminClient();
      tablesDB.updateRow(
        DATABASE_ID,
        PUSH_SUBSCRIPTIONS_TABLE_ID,
        subscription.$id,
        { last_used_at: new Date().toISOString(), fail_count: 0 }
      ).catch(() => {}); // Non-blocking
    }
    
    return { success: true };
  } catch (error: any) {
    const statusCode = error.statusCode;
    
    // Handle specific error codes
    if (statusCode === 410 || statusCode === 404) {
      await deleteSubscription(subscription.$id!);
      recordError("expired_subscription");
      return { success: false, shouldRemove: true, error: "Subscription expired", statusCode };
    }

    // Retryable errors
    if (statusCode === 429 || statusCode === 502 || statusCode === 503 || statusCode === 504) {
      if (attempt < MAX_RETRIES) {
        return { success: false, shouldRetry: true, error: error.message, statusCode };
      }
    }

    // Mark as failed
    await markSubscriptionFailed(subscription.$id!);
    await logNotification(subscription.$id!, payload, "failed", statusCode, error.message);
    recordError(`push_error_${statusCode || "unknown"}`);
    
    return { success: false, error: error.message, statusCode };
  }
}

async function markSubscriptionFailed(subscriptionId: string): Promise<void> {
  if (!subscriptionId || isCircuitOpen("database")) return;

  try {
    const tablesDB = createAdminClient();

    const result = await withRetry(async () => {
      const row = await tablesDB.getRow(
        DATABASE_ID,
        PUSH_SUBSCRIPTIONS_TABLE_ID,
        subscriptionId
      ) as unknown as PushSubscription;

      const newFailCount = (row.fail_count || 0) + 1;
      
      if (newFailCount >= 5) {
        await tablesDB.updateRow(
          DATABASE_ID,
          PUSH_SUBSCRIPTIONS_TABLE_ID,
          subscriptionId,
          { status: "inactive", fail_count: newFailCount }
        );
      } else {
        await tablesDB.updateRow(
          DATABASE_ID,
          PUSH_SUBSCRIPTIONS_TABLE_ID,
          subscriptionId,
          { fail_count: newFailCount }
        );
      }
      return { deactivated: newFailCount >= 5 };
    }, "markSubscriptionFailed");
  } catch (error) {
    console.error("[Push] Failed to mark subscription as failed:", error);
  }
}

async function deleteSubscription(subscriptionId: string): Promise<void> {
  if (!subscriptionId || isCircuitOpen("database")) return;

  try {
    const tablesDB = createAdminClient();
    await tablesDB.deleteRow(DATABASE_ID, PUSH_SUBSCRIPTIONS_TABLE_ID, subscriptionId);
  } catch (error) {
    console.error("[Push] Failed to delete subscription:", error);
  }
}

// ============================================================================
// Batch Sending with Cursor Pagination
// ============================================================================

async function getSubscriptionsBatch(
  options: SendOptions,
  cursor?: string
): Promise<{ subscriptions: PushSubscription[]; nextCursor?: string; hasMore: boolean }> {
  const tablesDB = createAdminClient();
  
  const queries: string[] = [Query.equal("status", "active")];
  
  if (options.userIds && options.userIds.length > 0) {
    // Note: Appwrite Query.equal with array does OR logic
    queries.push(Query.equal("user_id", options.userIds));
  }
  
  queries.push(Query.limit(MAX_BATCH_SIZE));
  
  if (cursor) {
    queries.push(Query.cursorAfter(cursor));
  }
  
  const response = await tablesDB.listRows(
    DATABASE_ID,
    PUSH_SUBSCRIPTIONS_TABLE_ID,
    queries
  );

  let subscriptions = response.rows as unknown as PushSubscription[];
  
  // Filter by tags if specified (client-side since tags is array)
  if (options.tags && options.tags.length > 0) {
    subscriptions = subscriptions.filter((sub) => {
      if (!sub.tags || sub.tags.length === 0) return false;
      return options.tags!.some(tag => sub.tags!.includes(tag));
    });
  }
  
  const lastRow = subscriptions[subscriptions.length - 1];
  const nextCursor = lastRow?.$id;
  
  return {
    subscriptions,
    nextCursor,
    hasMore: subscriptions.length === MAX_BATCH_SIZE,
  };
}

export async function sendPushNotifications(
  payload: NotificationPayload,
  options: SendOptions = {}
): Promise<SendResult> {
  const startTime = Date.now();
  
  if (!isPushEnabled()) {
    return {
      total: 0,
      sent: 0,
      failed: 0,
      removed: 0,
      retried: 0,
      errors: [{ endpoint: "system", error: "Push notifications not enabled" }],
      durationMs: 0,
    };
  }

  // Use template if specified
  let finalPayload = payload;
  if (options.templateId) {
    const template = await getTemplate(options.templateId);
    if (template) {
      finalPayload = { ...applyTemplate(template, options.variables || {}), ...payload };
    }
  }

  // Apply urgent settings for sales messages
  if (options.urgent || options.priority === "high") {
    finalPayload = {
      ...finalPayload,
      urgency: "high",
      ttl: Math.max(finalPayload.ttl || 0, 86400 * 3), // 3 days for urgent
      requireInteraction: finalPayload.requireInteraction ?? true,
    };
  }

  const batchSize = Math.min(options.batchSize || DEFAULT_BATCH_SIZE, MAX_BATCH_SIZE);
  const batchDelayMs = options.batchDelayMs ?? DEFAULT_BATCH_DELAY_MS;

  const result: SendResult = {
    total: 0,
    sent: 0,
    failed: 0,
    removed: 0,
    retried: 0,
    errors: [],
    durationMs: 0,
  };

  // Collect all subscriptions first (for parallel processing)
  const allSubscriptions: PushSubscription[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  console.log(`[Push] Fetching all subscriptions for sales blast...`);
  
  while (hasMore) {
    const batch = await getSubscriptionsBatch(options, cursor);
    
    if (batch.subscriptions.length === 0) {
      break;
    }

    allSubscriptions.push(...batch.subscriptions);
    cursor = batch.nextCursor;
    hasMore = batch.hasMore;
  }

  result.total = allSubscriptions.length;
  
  if (allSubscriptions.length === 0) {
    result.durationMs = Date.now() - startTime;
    return result;
  }

  console.log(`[Push] Sending to ${allSubscriptions.length} subscribers with batch size ${batchSize}...`);

  // Process in parallel chunks for maximum speed
  const chunks: PushSubscription[][] = [];
  for (let i = 0; i < allSubscriptions.length; i += batchSize) {
    chunks.push(allSubscriptions.slice(i, i + batchSize));
  }

  // Process chunks with controlled parallelism (up to 5 concurrent batches)
  const CONCURRENCY = MAX_CONCURRENT_BATCHES;
  
  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const concurrentChunks = chunks.slice(i, i + CONCURRENCY);
    
    const batchResults = await Promise.all(
      concurrentChunks.map(chunk => 
        Promise.allSettled(chunk.map(sub => sendToSubscription(sub, finalPayload)))
      )
    );

    // Aggregate results
    for (let chunkIdx = 0; chunkIdx < batchResults.length; chunkIdx++) {
      const chunkResult = batchResults[chunkIdx];
      const chunk = concurrentChunks[chunkIdx];

      for (let j = 0; j < chunkResult.length; j++) {
        const subResult = chunkResult[j];
        const subscription = chunk[j];

        if (subResult.status === "fulfilled") {
          const value = subResult.value;
          
          if (value.success) {
            result.sent++;
          } else {
            result.failed++;
            if (value.shouldRemove) {
              result.removed++;
            }
            if (value.shouldRetry) {
              result.retried++;
            }
            // Limit errors logged to avoid memory bloat on large blasts
            if (result.errors.length < 100) {
              result.errors.push({
                endpoint: subscription.endpoint.slice(0, 50) + "...",
                error: value.error || "Unknown error",
                code: value.statusCode,
              });
            }
          }
        } else {
          result.failed++;
          if (result.errors.length < 100) {
            result.errors.push({
              endpoint: subscription.endpoint.slice(0, 50) + "...",
              error: subResult.reason?.message || "Unknown error",
            });
          }
        }
      }
    }

    // Minimal delay between parallel batches (only if specified)
    if (batchDelayMs > 0 && i + CONCURRENCY < chunks.length) {
      await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
    }

    // Log progress for large blasts
    if (allSubscriptions.length > 1000 && (result.sent + result.failed) % 1000 === 0) {
      console.log(`[Push] Progress: ${result.sent + result.failed}/${result.total} (${Math.round((result.sent + result.failed) / result.total * 100)}%)`);
    }
  }

  result.durationMs = Date.now() - startTime;
  updateMetrics(result);
  
  const rate = result.total > 0 ? Math.round((result.sent / result.total) * 100) : 0;
  const throughput = result.durationMs > 0 ? Math.round(result.total / (result.durationMs / 1000)) : 0;
  
  console.info(`[Push] SALES BLAST COMPLETE: ${result.sent}/${result.total} (${rate}%) in ${result.durationMs}ms (${throughput} msgs/sec)`);
  
  return result;
}

// ============================================================================
// Health Check
// ============================================================================

export async function getHealthStatus(): Promise<HealthStatus> {
  const checks: Record<string, { status: "pass" | "fail"; message?: string }> = {};
  let databaseConnected = false;
  let totalSubscriptions = 0;
  let activeSubscriptions = 0;
  let notificationsLast24h = 0;

  // Check VAPID
  const vapidConfigured = isPushEnabled();
  checks.vapid = { status: vapidConfigured ? "pass" : "fail", message: vapidConfigured ? undefined : "VAPID not configured" };

  // Check database
  if (!isCircuitOpen("database")) {
    try {
      const tablesDB = createAdminClient();
      const subs = await tablesDB.listRows(
        DATABASE_ID,
        PUSH_SUBSCRIPTIONS_TABLE_ID,
        [Query.limit(1)]
      );
      databaseConnected = true;
      totalSubscriptions = subs.total;

      const active = await tablesDB.listRows(
        DATABASE_ID,
        PUSH_SUBSCRIPTIONS_TABLE_ID,
        [Query.equal("status", "active"), Query.limit(1)]
      );
      activeSubscriptions = active.total;

      // Notifications in last 24h
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const recent = await tablesDB.listRows(
        DATABASE_ID,
        PUSH_LOG_TABLE_ID,
        [Query.greaterThan("created_at", yesterday.toISOString()), Query.limit(1)]
      );
      notificationsLast24h = recent.total;

      checks.database = { status: "pass" };
    } catch (error: any) {
      checks.database = { status: "fail", message: error.message };
    }
  } else {
    checks.database = { status: "fail", message: "Circuit breaker open" };
  }

  // Circuit breaker status
  const circuitBreakerStatus: Record<string, string> = {};
  for (const [key, state] of circuitStates) {
    circuitBreakerStatus[key] = state.isOpen ? "open" : "closed";
  }

  // Calculate error rate
  const totalOps = metrics.totalSent + metrics.totalFailed;
  const errorRate = totalOps > 0 ? (metrics.totalFailed / totalOps) * 100 : 0;

  // Determine overall status
  let status: "healthy" | "degraded" | "unhealthy" = "healthy";
  if (!vapidConfigured || !databaseConnected) {
    status = "unhealthy";
  } else if (errorRate > 10 || Object.values(circuitBreakerStatus).some(s => s === "open")) {
    status = "degraded";
  }

  return {
    status,
    vapidConfigured,
    databaseConnected,
    circuitBreakerStatus,
    metrics: {
      totalSubscriptions,
      activeSubscriptions,
      notificationsLast24h,
      errorRate: Math.round(errorRate * 100) / 100,
    },
    checks,
  };
}

// ============================================================================
// Data Retention & Cleanup
// ============================================================================

export async function cleanupOldLogs(days: number = LOG_RETENTION_DAYS): Promise<{ deleted: number; error?: string }> {
  if (isCircuitOpen("database")) {
    return { deleted: 0, error: "Circuit breaker open" };
  }

  try {
    const tablesDB = createAdminClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let deleted = 0;
    let hasMore = true;
    let cursor: string | undefined;

    while (hasMore && deleted < 10000) {
      const queries = [
        Query.lessThan("created_at", cutoffDate.toISOString()),
        Query.limit(100),
      ];
      
      if (cursor) {
        queries.push(Query.cursorAfter(cursor));
      }

      const oldLogs = await tablesDB.listRows(
        DATABASE_ID,
        PUSH_LOG_TABLE_ID,
        queries
      );

      if (oldLogs.rows.length === 0) {
        break;
      }

      for (const log of oldLogs.rows) {
        try {
          await tablesDB.deleteRow(DATABASE_ID, PUSH_LOG_TABLE_ID, (log as any).$id);
          deleted++;
        } catch (error) {
          console.error("[Push] Failed to delete old log:", error);
        }
      }

      cursor = (oldLogs.rows[oldLogs.rows.length - 1] as any).$id;
      hasMore = oldLogs.rows.length === 100;
    }

    console.info(`[Push] Cleaned up ${deleted} old log entries`);
    return { deleted };
  } catch (error: any) {
    console.error("[Push] Failed to cleanup logs:", error);
    return { deleted: 0, error: error.message };
  }
}

export async function cleanupInactiveSubscriptions(days: number = INACTIVE_SUBSCRIPTION_DAYS): Promise<{ deleted: number; error?: string }> {
  if (isCircuitOpen("database")) {
    return { deleted: 0, error: "Circuit breaker open" };
  }

  try {
    const tablesDB = createAdminClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let deleted = 0;
    let hasMore = true;
    let cursor: string | undefined;

    while (hasMore && deleted < 5000) {
      const queries = [
        Query.equal("status", "inactive"),
        Query.lessThan("last_used_at", cutoffDate.toISOString()),
        Query.limit(100),
      ];
      
      if (cursor) {
        queries.push(Query.cursorAfter(cursor));
      }

      const inactiveSubs = await tablesDB.listRows(
        DATABASE_ID,
        PUSH_SUBSCRIPTIONS_TABLE_ID,
        queries
      );

      if (inactiveSubs.rows.length === 0) {
        break;
      }

      for (const sub of inactiveSubs.rows) {
        try {
          await tablesDB.deleteRow(DATABASE_ID, PUSH_SUBSCRIPTIONS_TABLE_ID, (sub as any).$id);
          deleted++;
        } catch (error) {
          console.error("[Push] Failed to delete inactive subscription:", error);
        }
      }

      cursor = (inactiveSubs.rows[inactiveSubs.rows.length - 1] as any).$id;
      hasMore = inactiveSubs.rows.length === 100;
    }

    console.info(`[Push] Cleaned up ${deleted} inactive subscriptions`);
    return { deleted };
  } catch (error: any) {
    console.error("[Push] Failed to cleanup subscriptions:", error);
    return { deleted: 0, error: error.message };
  }
}

// ============================================================================
// Statistics
// ============================================================================

export async function getPushStats(): Promise<{
  totalSubscriptions: number;
  activeSubscriptions: number;
  inactiveSubscriptions: number;
  totalNotifications: number;
  clickedNotifications: number;
  dismissedNotifications: number;
  clickRate: number;
  recentErrors: Array<{ type: string; count: number }>;
}> {
  if (isCircuitOpen("database")) {
    return {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      inactiveSubscriptions: 0,
      totalNotifications: metrics.totalSent + metrics.totalFailed,
      clickedNotifications: metrics.totalClicked,
      dismissedNotifications: metrics.totalDismissed,
      clickRate: 0,
      recentErrors: Array.from(metrics.errorsByType.entries()).map(([type, count]) => ({ type, count })),
    };
  }

  try {
    const tablesDB = createAdminClient();

    const [allSubs, activeSubs, inactiveSubs, allNotifications, clickedNotifications, dismissedNotifications] = await Promise.all([
      tablesDB.listRows(DATABASE_ID, PUSH_SUBSCRIPTIONS_TABLE_ID, [Query.limit(1)]),
      tablesDB.listRows(DATABASE_ID, PUSH_SUBSCRIPTIONS_TABLE_ID, [Query.equal("status", "active"), Query.limit(1)]),
      tablesDB.listRows(DATABASE_ID, PUSH_SUBSCRIPTIONS_TABLE_ID, [Query.equal("status", "inactive"), Query.limit(1)]),
      tablesDB.listRows(DATABASE_ID, PUSH_LOG_TABLE_ID, [Query.limit(1)]),
      tablesDB.listRows(DATABASE_ID, PUSH_LOG_TABLE_ID, [Query.equal("status", "clicked"), Query.limit(1)]),
      tablesDB.listRows(DATABASE_ID, PUSH_LOG_TABLE_ID, [Query.equal("status", "dismissed"), Query.limit(1)]),
    ]);

    const totalSent = allNotifications.total;
    const totalClicked = clickedNotifications.total;
    const clickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;

    return {
      totalSubscriptions: allSubs.total,
      activeSubscriptions: activeSubs.total,
      inactiveSubscriptions: inactiveSubs.total,
      totalNotifications: totalSent,
      clickedNotifications: totalClicked,
      dismissedNotifications: dismissedNotifications.total,
      clickRate: Math.round(clickRate * 100) / 100,
      recentErrors: Array.from(metrics.errorsByType.entries()).map(([type, count]) => ({ type, count })),
    };
  } catch (error) {
    console.error("[Push] Failed to get stats:", error);
    return {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      inactiveSubscriptions: 0,
      totalNotifications: 0,
      clickedNotifications: 0,
      dismissedNotifications: 0,
      clickRate: 0,
      recentErrors: [],
    };
  }
}

// ============================================================================
// Secret Verification
// ============================================================================

export function verifyPushSecret(secret: string): boolean {
  if (!PUSH_API_SECRET || PUSH_API_SECRET.length < 32) {
    console.warn("[Push] PUSH_API_SECRET not properly configured");
    return false;
  }
  
  // Use timing-safe comparison
  if (secret.length !== PUSH_API_SECRET.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < secret.length; i++) {
    result |= secret.charCodeAt(i) ^ PUSH_API_SECRET.charCodeAt(i);
  }
  
  return result === 0;
}

// Initialize on module load
initializeVapid();

// Re-export webpush for direct access if needed
export { webpush };
