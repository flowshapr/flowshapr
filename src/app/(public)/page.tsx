"use client";

export const dynamic = 'force-dynamic';

import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Users, Settings, Globe } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LandingPage() {
  const { session, loading } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to the app
  useEffect(() => {
    if (session && !loading) {
      router.push("/app");
    }
  }, [session, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (session) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-base-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold">F</span>
              </div>
              <h1 className="text-xl font-bold text-base-content">Flowshapr</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="outline">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-base-content sm:text-5xl md:text-6xl">
            Build AI Flows
            <span className="text-blue-600"> Visually</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-base-content/60">
            Create, manage, and deploy Firebase Genkit AI flows with our visual drag-and-drop interface. 
            Deploy to any platform and call remotely with our thin SDK.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Start Building
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-md bg-blue-500 text-white">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-base-content">Visual Flow Builder</h3>
            <p className="mt-2 text-sm text-base-content/60">
              Drag and drop nodes to create complex AI workflows without writing code
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-md bg-blue-500 text-white">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-base-content">Team Collaboration</h3>
            <p className="mt-2 text-sm text-base-content/60">
              Work together with your team on AI flows with role-based access control
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-md bg-blue-500 text-white">
              <Globe className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-base-content">Multi-Platform Deploy</h3>
            <p className="mt-2 text-sm text-base-content/60">
              Deploy to Firebase, Google Cloud, AWS, or keep with us - your choice
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-md bg-blue-500 text-white">
              <Settings className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-base-content">Remote SDK</h3>
            <p className="mt-2 text-sm text-base-content/60">
              Call your deployed flows remotely with our lightweight SDK
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            <span className="block">Ready to start building?</span>
            <span className="block text-blue-200">Create your account today.</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Link href="/register">
                <Button size="lg" className="bg-base-100 text-blue-600 hover:bg-base-200">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-base-100">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center mr-2">
                <span className="text-white text-sm font-bold">F</span>
              </div>
              <span className="text-base-content/60 text-sm">© 2024 Flowshapr. All rights reserved.</span>
            </div>
            <div className="flex space-x-6">
              <Link href="/privacy" className="text-gray-400 hover:text-base-content/60 text-sm">
                Privacy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-base-content/60 text-sm">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
