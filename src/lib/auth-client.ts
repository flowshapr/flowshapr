// Temporary simple auth client for build compatibility
const authUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://127.0.0.1:3001";

export type AuthSession = {
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

// Placeholder auth client - will be replaced with proper Better Auth integration
export const authClient = {
  signIn: {
    email: async (credentials: { email: string; password: string }) => {
      console.log("Auth client making request to:", `${authUrl}/api/auth/sign-in/email`);
      console.log("With credentials:", credentials);
      const response = await fetch(`${authUrl}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
        credentials: 'include', // Include cookies in cross-origin requests
      });
      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);
      const jsonResult = await response.json();
      console.log("Parsed JSON result:", jsonResult);
      return jsonResult;
    },
    social: async ({ provider, callbackURL }: { provider: string; callbackURL: string }) => {
      window.location.href = `${authUrl}/api/auth/sign-in/${provider}?callbackURL=${encodeURIComponent(callbackURL)}`;
    },
  },
  signUp: {
    email: async (data: { name: string; email: string; password: string }) => {
      const response = await fetch(`${authUrl}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      return response.json();
    },
  },
  signOut: async () => {
    const response = await fetch(`${authUrl}/api/auth/sign-out`, {
      method: 'POST',
      credentials: 'include',
    });
    return response.json();
  },
  getSession: async (): Promise<AuthSession> => {
    try {
      const response = await fetch(`${authUrl}/api/auth/session`, {
        credentials: 'include', // Include cookies to get session
      });
      const data = await response.json();
      console.log("getSession response:", data);
      return data.data ? data.data : null;
    } catch (error) {
      console.error("getSession error:", error);
      return null;
    }
  },
  onSessionChange: (callback: (session: AuthSession) => void) => {
    // Placeholder - return unsubscribe function
    return () => {};
  },
};

// Helper functions for common auth operations
export const auth = {
  signIn: {
    email: async (email: string, password: string) => {
      return authClient.signIn.email({ email, password });
    },
    social: async (provider: "google" | "github" | "microsoft" | "apple") => {
      return authClient.signIn.social({ provider, callbackURL: "/dashboard" });
    },
  },
  signUp: {
    email: async (name: string, email: string, password: string) => {
      return authClient.signUp.email({ name, email, password });
    },
  },
  signOut: async () => {
    return authClient.signOut();
  },
  getSession: async (): Promise<AuthSession> => {
    return authClient.getSession();
  },
};