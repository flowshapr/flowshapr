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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const sessionData = await authClient.getSession();
        setSession(sessionData);
      } catch (error) {
        console.error("Failed to get session:", error);
        setSession(null);
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
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ session, loading, signOut }}>
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
  
  useEffect(() => {
    if (!loading && !session) {
      // Redirect to login page
      window.location.href = "/login";
    }
  }, [session, loading]);

  return { session, loading };
}