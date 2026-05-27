/**
 * Agent Helper Utilities
 * Useful functions for working with OpenAI Agents SDK
 */

import { getOrCreateSession, createNewSession, getUserSessions } from '@/lib/appwriteSession';

/**
 * Get or create a session ID for a user
 * The OpenAI SDK handles all memory/context internally
 */
export async function initializeUserSession(userId: string): Promise<string> {
  return await getOrCreateSession(userId);
}

/**
 * Force create a new session for a user (start fresh conversation)
 */
export async function startNewConversation(userId: string): Promise<string> {
  return await createNewSession(userId);
}

/**
 * Get all session IDs for a user
 */
export async function getUserSessionList(userId: string) {
  return await getUserSessions(userId);
}

/**
 * Format agent response for display
 */
export function formatAgentResponse(response: any): string {
  if (typeof response === 'string') {
    return response;
  }
  
  if (response.finalOutput) {
    return typeof response.finalOutput === 'string' 
      ? response.finalOutput 
      : JSON.stringify(response.finalOutput, null, 2);
  }
  
  return JSON.stringify(response, null, 2);
}

/**
 * Validate user input before sending to agent
 */
export function validateUserInput(input: string): {
  valid: boolean;
  error?: string;
} {
  if (!input || input.trim().length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  
  if (input.length > 2000) {
    return { valid: false, error: 'Message is too long (max 2000 characters)' };
  }
  
  // Check for potential injection attempts
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onclick=/i,
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(input)) {
      return { valid: false, error: 'Invalid characters detected' };
    }
  }
  
  return { valid: true };
}

/**
 * Extract keywords from user input for analytics
 */
export function extractKeywords(input: string): string[] {
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'my', 'your', 'i', 'you', 'me',
  ]);
  
  const words = input
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !commonWords.has(word));
  
  return [...new Set(words)];
}

/**
 * Determine agent type from routing decision
 */
export function getAgentType(route: string): 'product' | 'order' | 'support' | 'general' {
  const routeMap: Record<string, 'product' | 'order' | 'support' | 'general'> = {
    product: 'product',
    order: 'order',
    customer_service: 'support',
    general: 'general',
  };
  
  return routeMap[route] || 'general';
}

/**
 * Create a context object for agent execution
 */
export function createAgentContext(userId: string, additionalData?: Record<string, any>) {
  return {
    userId,
    timestamp: new Date().toISOString(),
    ...additionalData,
  };
}

/**
 * Log agent interaction for analytics
 */
export async function logAgentInteraction(data: {
  userId: string;
  agentType: string;
  userMessage: string;
  agentResponse: string;
  duration: number;
  success: boolean;
}) {
  // In production, send to analytics service
  console.log('[Agent Interaction]', {
    ...data,
    timestamp: new Date().toISOString(),
  });
  
  // Could also store in Appwrite for analytics
  // await tablesDB.createRow('analytics', 'interactions', ID.unique(), data);
}
