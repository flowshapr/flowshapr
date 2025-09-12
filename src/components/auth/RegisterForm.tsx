"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/auth-client";
import { useAnalytics } from "@/hooks/useAnalytics";

export function RegisterForm() {
  const analytics = useAnalytics();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Track registration attempt
    analytics.trackAuth('register', 'email');

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      analytics.trackAppError("Passwords don't match", 'RegisterForm', 'low');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      analytics.trackAppError("Password too short", 'RegisterForm', 'low');
      setLoading(false);
      return;
    }

    try {
      const result = await auth.signUp.email(name, email, password);
      if (result.error) {
        // Provide more specific error messages
        const errorMessage = result.error.message || "Registration failed";
        if (errorMessage.includes("duplicate") || errorMessage.includes("already exists")) {
          setError("An account with this email already exists. Please try signing in instead.");
        } else if (errorMessage.includes("connection") || errorMessage.includes("network")) {
          setError("Unable to connect to the server. Please check your internet connection and try again.");
        } else if (errorMessage.includes("invalid email")) {
          setError("Please enter a valid email address.");
        } else {
          setError(`Registration failed: ${errorMessage}`);
        }
        
        // Track registration failure
        analytics.trackAppError(errorMessage, 'RegisterForm', 'medium');
      } else {
        // Track successful registration
        analytics.track('registration_success', 'authentication', 'email', undefined, {
          user_id: result?.data?.user?.id,
        });
        
        // Show success message or redirect
        window.location.href = "/app";
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      
      // Provide more helpful error messages based on the error type
      if (err.name === "TypeError" || err.message?.includes("fetch")) {
        setError("Unable to connect to the authentication server. Please ensure the backend server is running and try again.");
      } else if (err.message?.includes("503") || err.message?.includes("Service Unavailable")) {
        setError("The authentication service is currently unavailable. Please check that the database is configured and try again.");
      } else if (err.message?.includes("timeout")) {
        setError("The request timed out. Please try again.");
      } else {
        setError(`Registration failed: ${err.message || "An unexpected error occurred"}`);
      }
      
      // Track registration error
      analytics.trackAppError(err.message || "An unexpected error occurred", 'RegisterForm', 'high');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "github" | "microsoft" | "apple") => {
    setLoading(true);
    setError("");

    try {
      await auth.signIn.social(provider);
    } catch (err) {
      setError("Social registration failed");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Create Your Account</h1>
        <p className="text-base-content/70 mt-2">
          Get started with Flowshapr today
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleEmailRegister} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-base-content">
            Full Name
          </label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1"
            placeholder="John Doe"
          />
        </div>

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
            placeholder="you@example.com"
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
            placeholder="••••••••"
            minLength={8}
          />
          <p className="text-xs text-base-content/60 mt-1">
            Must be at least 8 characters
          </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-base-content">
            Confirm Password
          </label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="mt-1"
            placeholder="••••••••"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? "Creating Account..." : "Create Account"}
        </Button>
      </form>

      {/* Social login temporarily hidden - will be enabled later */}
      {/* 
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-base-100 px-2 text-base-content/60">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => handleSocialLogin("google")}
          disabled={loading}
          className="w-full"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </Button>

        <Button
          variant="outline"
          onClick={() => handleSocialLogin("github")}
          disabled={loading}
          className="w-full"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
              clipRule="evenodd"
            />
          </svg>
          GitHub
        </Button>
      </div>
      */}

      <div className="text-center">
        <p className="text-sm text-base-content/70">
          Already have an account?{" "}
          <a href="/login" className="font-medium text-primary hover:text-blue-500">
            Sign in
          </a>
        </p>
      </div>

      <div className="text-xs text-base-content/60 text-center">
        By creating an account, you agree to our{" "}
        <a href="/terms" className="underline">Terms of Service</a>{" "}
        and{" "}
        <a href="/privacy" className="underline">Privacy Policy</a>.
      </div>
    </div>
  );
}