"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/auth-client";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useAuth } from "./AuthProvider";

export function LoginForm() {
  const analytics = useAnalytics();
  const { refreshSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Track login attempt
    analytics.trackAuth('login', 'email');

    try {
      const result = await auth.signIn.email(email, password);
      console.log("Frontend received login result:", result);
      if (result.error) {
        // Provide more specific error messages
        const errorMessage = result.error.message || "Login failed";
        if (errorMessage.includes("credentials") || errorMessage.includes("password")) {
          setError("Invalid email or password. Please check your credentials and try again.");
        } else if (errorMessage.includes("not found") || errorMessage.includes("user")) {
          setError("No account found with this email address. Please check your email or sign up.");
        } else if (errorMessage.includes("connection") || errorMessage.includes("network")) {
          setError("Unable to connect to the server. Please check your internet connection and try again.");
        } else {
          setError(`Login failed: ${errorMessage}`);
        }
        
        // Track login failure
        analytics.trackAppError(errorMessage, 'LoginForm', 'medium');
      } else {
        // Mirror session cookie on frontend domain for server-side proxy routes
        const sessionId = result?.data?.session?.id;
        if (sessionId) {
          try {
            document.cookie = `sessionId=${sessionId}; Path=/; SameSite=Lax`;
          } catch (e) {
            console.warn('Failed to set frontend session cookie:', e);
          }
        }
        const uid = result?.data?.user?.id;
        if (uid) {
          try { document.cookie = `uid=${uid}; Path=/; SameSite=Lax`; } catch {}
        }
        
        // Track successful login
        analytics.track('login_success', 'authentication', 'email', undefined, {
          user_id: uid,
          session_id: sessionId,
        });
        
        // Refresh session state in AuthProvider
        await refreshSession();
        
        // Redirect to app
        window.location.href = "/app";
      }
    } catch (err: any) {
      console.error("Login error:", err);
      
      // Provide more helpful error messages based on the error type
      if (err.name === "TypeError" || err.message?.includes("fetch")) {
        setError("Unable to connect to the authentication server. Please ensure the backend server is running and try again.");
      } else if (err.message?.includes("503") || err.message?.includes("Service Unavailable")) {
        setError("The authentication service is currently unavailable. Please check that the database is configured and try again.");
      } else if (err.message?.includes("timeout")) {
        setError("The request timed out. Please try again.");
      } else {
        setError(`Login failed: ${err.message || "An unexpected error occurred"}`);
      }
      
      // Track login error
      analytics.trackAppError(err.message || "An unexpected error occurred", 'LoginForm', 'high');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "github" | "microsoft" | "apple") => {
    setLoading(true);
    
    // Track social login attempt
    analytics.trackAuth('login', provider);
    setError("");

    try {
      await auth.signIn.social(provider);
    } catch (err) {
      setError("Social login failed");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center">

        <p className="text-base-content/70 mt-2">
          Welcome back! Sign in to your account
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-base-content">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-base-content">
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1"
            placeholder="Enter your password"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          loading={loading}
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-base-content/70">
          Don't have an account?{' '}
          <a href="/register" className="text-primary hover:text-primary/80 font-medium">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
