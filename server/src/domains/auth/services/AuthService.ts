import { db } from "../../../infrastructure/database/connection";
import * as schema from "../../../infrastructure/database/schema/index";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { ConflictError, UnauthorizedError } from "../../../shared/utils/errors";
import { logError } from "../../../shared/utils/logger";
import { 
  SignUpData, 
  SignInData, 
  AuthUser, 
  AuthSession, 
  AuthResponse, 
  SessionData
} from "../types";

// Simple in-memory session store (for development)
const sessions = new Map<string, SessionData>();

export class AuthService {

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private createAuthUser(user: any): AuthUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      emailVerified: !!user.emailVerified
    };
  }

  async signUp(data: SignUpData): Promise<AuthResponse> {
    if (!db) {
      throw new Error("Database not available");
    }

    try {
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(schema.user)
        .where(eq(schema.user.email, data.email))
        .limit(1);

      if (existingUser.length > 0) {
        throw new ConflictError("User already exists with this email address");
      }

      // Hash password (for future implementation)
      const hashedPassword = await bcrypt.hash(data.password, 12);

      // Create user
      const userId = this.generateUserId();
      const newUser = await db
        .insert(schema.user)
        .values({
          id: userId,
          name: data.name,
          email: data.email,
          emailVerified: true, // For testing, mark as verified
          image: null,
        })
        .returning();

      return {
        user: this.createAuthUser(newUser[0])
      };
    } catch (error: any) {
      if (error instanceof ConflictError) {
        throw error;
      }
      logError("Registration error:", error);
      throw new Error("Registration failed. Please try again.");
    }
  }

  async signIn(data: SignInData): Promise<AuthResponse> {
    if (!db) {
      throw new Error("Database not available");
    }

    try {
      // Find user by email
      const users = await db
        .select()
        .from(schema.user)
        .where(eq(schema.user.email, data.email))
        .limit(1);

      if (users.length === 0) {
        throw new UnauthorizedError("Invalid email or password");
      }

      const user = users[0];

      // For now, we'll skip password verification since we don't have a password field
      // This is temporary until we implement proper Better Auth

      // Create session with proper token generation
      const sessionId = this.generateSessionId();
      const sessionToken = `token_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const authUser = this.createAuthUser(user);

      // Store session in memory with proper token
      sessions.set(sessionId, {
        userId: user.id,
        user: authUser,
        token: sessionToken,
        expiresAt
      });

      const session: AuthSession = {
        id: sessionId,
        userId: user.id,
        token: sessionToken,
        expiresAt
      };

      return {
        user: authUser,
        session
      };
    } catch (error: any) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      logError("Login error:", error);
      throw new UnauthorizedError("Invalid email or password");
    }
  }

  async signOut(sessionId: string): Promise<{ success: boolean }> {
    if (sessionId && sessions.has(sessionId)) {
      sessions.delete(sessionId);
    }
    return { success: true };
  }

  async getSession(sessionId: string): Promise<{ user: AuthUser; session: { id: string; expiresAt: Date } } | null> {
    if (!sessionId) {
      return null;
    }

    const session = sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      sessions.delete(sessionId);
      return null;
    }

    return {
      user: session.user,
      session: {
        id: sessionId,
        expiresAt: session.expiresAt
      }
    };
  }

  // Static method to access sessions (for cleanup, admin purposes, etc.)
  static getAllSessions(): Map<string, SessionData> {
    return sessions;
  }

  static clearExpiredSessions(): number {
    const now = new Date();
    let cleared = 0;
    
    for (const [sessionId, sessionData] of sessions.entries()) {
      if (sessionData.expiresAt < now) {
        sessions.delete(sessionId);
        cleared++;
      }
    }
    
    return cleared;
  }
}

export const authService = new AuthService();