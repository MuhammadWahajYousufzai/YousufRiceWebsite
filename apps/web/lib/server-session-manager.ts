/**
 * Server-side session management for AI agent conversations
 * Sessions are stored in memory and cleared when server restarts or user leaves
 */

import { OpenAIConversationsSession } from '@openai/agents';

interface ServerSession {
  sessionId: string;
  userId: string;
  openaiSession: OpenAIConversationsSession;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
}

class ServerSessionManager {
  private sessions = new Map<string, ServerSession>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly SESSION_TIMEOUT_HOURS = 2; // Sessions expire after 2 hours of inactivity
  private readonly CLEANUP_INTERVAL_MINUTES = 15; // Clean up expired sessions every 15 minutes

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Create or get existing session for a user
   */
  async getOrCreateSession(userId: string): Promise<{ sessionId: string; openaiSession: OpenAIConversationsSession }> {
    // Check if user has an active session
    const existingSession = this.findActiveSessionByUserId(userId);

    if (existingSession) {
      // Update last accessed time and extend expiration
      this.updateSessionAccess(existingSession.sessionId);
      return {
        sessionId: existingSession.sessionId,
        openaiSession: existingSession.openaiSession
      };
    }

    // Create new session
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (this.SESSION_TIMEOUT_HOURS * 60 * 60 * 1000));

    // Create OpenAI session - let OpenAI generate its own conversation ID
    // We'll track our server session ID separately
    const openaiSession = new OpenAIConversationsSession();

    const serverSession: ServerSession = {
      sessionId,
      userId,
      openaiSession,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt
    };

    this.sessions.set(sessionId, serverSession);

    console.log(`Created new session ${sessionId} for user ${userId}`);

    return {
      sessionId,
      openaiSession
    };
  }

  /**
   * Get session by session ID
   */
  getSession(sessionId: string): { sessionId: string; openaiSession: OpenAIConversationsSession } | null {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      this.deleteSession(sessionId);
      return null;
    }

    // Update last accessed time
    this.updateSessionAccess(sessionId);

    return {
      sessionId: session.sessionId,
      openaiSession: session.openaiSession
    };
  }

  /**
   * Find active session by user ID
   */
  private findActiveSessionByUserId(userId: string): ServerSession | null {
    const now = new Date();

    for (const session of this.sessions.values()) {
      if (session.userId === userId && now <= session.expiresAt) {
        return session;
      }
    }

    return null;
  }

  /**
   * Update session access time and extend expiration
   */
  private updateSessionAccess(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      const now = new Date();
      session.lastAccessedAt = now;
      session.expiresAt = new Date(now.getTime() + (this.SESSION_TIMEOUT_HOURS * 60 * 60 * 1000));
    }
  }

  /**
   * Delete a specific session
   */
  deleteSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      console.log(`Deleted session ${sessionId}`);
    }
    return deleted;
  }

  /**
   * Delete all sessions for a user
   */
  deleteUserSessions(userId: string): number {
    let deletedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`Deleted ${deletedCount} sessions for user ${userId}`);
    }

    return deletedCount;
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired sessions`);
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.CLEANUP_INTERVAL_MINUTES * 60 * 1000);

    console.log(`Session cleanup timer started (every ${this.CLEANUP_INTERVAL_MINUTES} minutes)`);
  }

  /**
   * Stop cleanup timer (for graceful shutdown)
   */
  stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('Session cleanup timer stopped');
    }
  }

  /**
   * Get session statistics
   */
  getStats(): {
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
    sessionsByUser: Record<string, number>;
  } {
    const now = new Date();
    let activeSessions = 0;
    let expiredSessions = 0;
    const sessionsByUser: Record<string, number> = {};

    for (const session of this.sessions.values()) {
      if (now <= session.expiresAt) {
        activeSessions++;
      } else {
        expiredSessions++;
      }

      sessionsByUser[session.userId] = (sessionsByUser[session.userId] || 0) + 1;
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      expiredSessions,
      sessionsByUser
    };
  }

  /**
   * Force create a new session for a user (clear existing)
   */
  async createNewSession(userId: string): Promise<{ sessionId: string; openaiSession: OpenAIConversationsSession }> {
    // Delete existing sessions for this user
    this.deleteUserSessions(userId);

    // Create new session
    return this.getOrCreateSession(userId);
  }
}

// Export singleton instance
export const serverSessionManager = new ServerSessionManager();

// Graceful shutdown handler
process.on('SIGTERM', () => {
  serverSessionManager.stopCleanupTimer();
});

process.on('SIGINT', () => {
  serverSessionManager.stopCleanupTimer();
});
