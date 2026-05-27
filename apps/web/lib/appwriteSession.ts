/**
 * Browser-based session management for agent chat
 * Stores session IDs in localStorage with 24-hour expiration
 */

/**
 * Session data structure
 */
interface SessionData {
  userId: string;
  sessionId: string;
  createdAt: string;
  lastAccessedAt: string;
  expiresAt: string;
}

// Storage key prefix for sessions
const SESSION_STORAGE_KEY_PREFIX = 'agent_session_';

/**
 * Get the storage key for a user
 */
function getStorageKey(userId: string): string {
  return `${SESSION_STORAGE_KEY_PREFIX}${userId}`;
}

/**
 * Update last accessed time for a session
 */
function updateSessionAccess(userId: string, sessionData: SessionData): void {
  try {
    // Update timestamps
    sessionData.lastAccessedAt = new Date().toISOString();
    
    // Set expiration to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    sessionData.expiresAt = expiresAt.toISOString();
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(getStorageKey(userId), JSON.stringify(sessionData));
    }
  } catch (error) {
    console.error('Error updating session access:', error);
  }
}

/**
 * Get or create a session ID for a user
 * Returns the OpenAI session ID that the SDK will use for memory management
 * Uses browser localStorage with 24-hour expiration
 */
export async function getOrCreateSession(userId: string): Promise<string> {
  try {
    // Only works in browser
    if (typeof window === 'undefined') {
      // For server-side, generate a temporary session ID
      return `session_${Math.random().toString(36).substring(2, 15)}`;
    }
    
    // Check if a valid session exists in localStorage
    const storageKey = getStorageKey(userId);
    const storedSession = localStorage.getItem(storageKey);
    
    if (storedSession) {
      try {
        const sessionData = JSON.parse(storedSession) as SessionData;
        
        // Check if session is still valid (not expired)
        if (new Date(sessionData.expiresAt) > new Date()) {
          // Update last accessed time and extend expiration
          updateSessionAccess(userId, sessionData);
          return sessionData.sessionId;
        }
      } catch (e) {
        // Invalid JSON, will create new session
        console.warn('Invalid session data in localStorage');
      }
    }

    // Create a new session
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiration
    
    // Generate a unique session ID
    const newSessionId = `session_${Math.random().toString(36).substring(2, 15)}`;
    
    // Create session data
    const sessionData: SessionData = {
      userId,
      sessionId: newSessionId,
      createdAt: now.toISOString(),
      lastAccessedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };
    
    // Save to localStorage
    localStorage.setItem(storageKey, JSON.stringify(sessionData));
    
    return newSessionId;
  } catch (error) {
    console.error('Error getting or creating session:', error);
    // Return a fallback session ID if there's an error
    return `session_${Math.random().toString(36).substring(2, 15)}`;
  }
}

/**
 * Get all session mappings for a user
 * In browser implementation, there's only one active session per user
 */
export async function getUserSessions(userId: string): Promise<SessionData[]> {
  try {
    // Only works in browser
    if (typeof window === 'undefined') {
      return [];
    }
    
    const storageKey = getStorageKey(userId);
    const storedSession = localStorage.getItem(storageKey);
    
    if (storedSession) {
      try {
        const sessionData = JSON.parse(storedSession) as SessionData;
        
        // Check if session is still valid (not expired)
        if (new Date(sessionData.expiresAt) > new Date()) {
          return [sessionData];
        }
      } catch (e) {
        // Invalid JSON
        console.warn('Invalid session data in localStorage');
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return [];
  }
}

/**
 * Create a new session for a user (force new conversation)
 */
export async function createNewSession(userId: string): Promise<string> {
  try {
    // Only works in browser
    if (typeof window === 'undefined') {
      return `session_${Math.random().toString(36).substring(2, 15)}`;
    }
    
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiration
    
    // Generate a unique session ID
    const newSessionId = `session_${Math.random().toString(36).substring(2, 15)}`;
    
    // Create session data
    const sessionData: SessionData = {
      userId,
      sessionId: newSessionId,
      createdAt: now.toISOString(),
      lastAccessedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };
    
    // Save to localStorage
    localStorage.setItem(getStorageKey(userId), JSON.stringify(sessionData));
    
    return newSessionId;
  } catch (error) {
    console.error('Error creating new session:', error);
    return `session_${Math.random().toString(36).substring(2, 15)}`;
  }
}

/**
 * Delete old sessions (cleanup utility)
 * In browser implementation, expired sessions are automatically handled
 * This is kept for API compatibility
 */
export async function deleteOldSessions(daysOld: number = 30): Promise<number> {
  // Browser localStorage automatically handles session expiration
  // through the expiresAt check in getOrCreateSession
  return 0;
}

/**
 * Clear all sessions for testing purposes
 */
export function clearAllSessions(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  // Find all keys that start with our prefix
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(SESSION_STORAGE_KEY_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  
  // Remove all session keys
  keysToRemove.forEach(key => localStorage.removeItem(key));
}
