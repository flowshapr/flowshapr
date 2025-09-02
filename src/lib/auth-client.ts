// Resolve the backend auth base URL with sensible fallbacks
function resolveAuthUrl(): string {
  const envUrl =
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL;

  if (envUrl) return envUrl.replace(/\/$/, "");

  // Browser fallback: prefer localhost for cookie domain alignment
  if (typeof window !== "undefined") {
    const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    const host = isLocal ? "localhost" : window.location.hostname;
    const protocol = window.location.protocol === "https:" ? "https" : "http";
    const port = isLocal ? 3001 : (window.location.port || 3000); // default dev to 3001
    return `${protocol}://${host}:${port}`;
  }

  // Server-side fallback for dev
  return "http://localhost:3001";
}

const authUrl = resolveAuthUrl();

// Small helper to avoid hung requests
async function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  let timeoutId: any;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Request timed out")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

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
      try {
        const url = `${authUrl}/api/auth/sign-in/email`;
        const resp = await withTimeout(
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
            credentials: 'include',
            mode: 'cors',
          })
        );
        const data = await resp.json().catch(() => ({}));
        return resp.ok ? data : { error: data?.error || { message: `Login failed (${resp.status})` } };
      } catch (err: any) {
        return { error: { message: err?.message || 'Network error' } };
      }
    },
    social: async ({ provider, callbackURL }: { provider: string; callbackURL: string }) => {
      window.location.href = `${authUrl}/api/auth/sign-in/${provider}?callbackURL=${encodeURIComponent(callbackURL)}`;
    },
  },
  signUp: {
    email: async (data: { name: string; email: string; password: string }) => {
      try {
        const resp = await withTimeout(
          fetch(`${authUrl}/api/auth/sign-up/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include',
            mode: 'cors',
          })
        );
        const json = await resp.json().catch(() => ({}));
        return resp.ok ? json : { error: json?.error || { message: `Registration failed (${resp.status})` } };
      } catch (err: any) {
        return { error: { message: err?.message || 'Network error' } };
      }
    },
  },
  signOut: async () => {
    try {
      const resp = await withTimeout(
        fetch(`${authUrl}/api/auth/sign-out`, { method: 'POST', credentials: 'include', mode: 'cors' })
      );
      return resp.json().catch(() => ({}));
    } catch (err: any) {
      return { error: { message: err?.message || 'Network error' } };
    }
  },
  getSession: async (): Promise<AuthSession> => {
    try {
      const resp = await withTimeout(
        fetch(`${authUrl}/api/auth/session`, { credentials: 'include', mode: 'cors' })
      );
      const data = await resp.json().catch(() => ({}));
      return data?.data || null;
    } catch (error) {
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
