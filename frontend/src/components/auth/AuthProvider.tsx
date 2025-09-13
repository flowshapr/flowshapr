"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

type AuthSession = {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
    emailVerified: boolean;
  };
  session: {
    id: string;
    expiresAt: Date;
  };
} | null;

type AuthContextType = {
  session: AuthSession;
  loading: boolean;
  signOut: () => Promise<void>;
  handleAuthError: () => void;
  refreshSession: () => Promise<AuthSession>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const sessionData = await authClient.getSession();
      setSession(sessionData);
      return sessionData;
    } catch (error) {
      console.error("Failed to get session data:", error);
      setSession(null);
      return null;
    }
  };

  useEffect(() => {
    // Try to get session data for UI purposes only
    // Authentication validation is handled entirely by middleware
    const getSession = async () => {
      try {
        await refreshSession();
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth state changes
    const unsubscribe = authClient.onSessionChange((session) => {
      setSession(session);
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    try {
      await authClient.signOut();
      setSession(null);
      // Immediate redirect after successful logout to prevent redirect loops
      window.location.href = "/login";
    } catch (error) {
      console.error("Sign out failed:", error);
      // Even if logout fails, clear local state and redirect
      setSession(null);
      window.location.href = "/login";
    }
  };

  const handleAuthError = () => {
    // Clear session state only - let middleware handle redirect
    // This can be called when API calls return 401/403
    setSession(null);
    // Note: Redirect removed to prevent conflicts with middleware
    // Middleware will detect cleared session and handle redirect appropriately
  };

  return (
    <AuthContext.Provider value={{ session, loading, signOut, handleAuthError, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useRequireAuth() {
  const { session, loading } = useAuth();

  // Note: Redirect logic removed to prevent conflicts with middleware
  // Middleware handles all authentication redirects consistently
  // This hook now only provides auth state for UI rendering

  return { session, loading };
}