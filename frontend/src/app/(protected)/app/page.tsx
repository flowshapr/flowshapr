'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/components/auth/AuthProvider';
import { AppLayout } from '@/components/navigation/AppLayout';

export default function FlowBuilderApp() {
  const router = useRouter();
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Use real authentication
  const { session, loading: authLoading } = useRequireAuth();

  // Load flows and redirect to first one
  useEffect(() => {
    // Don't load flows until authentication is complete
    if (authLoading || !session) {
      return;
    }

    const loadFlows = async () => {
      try {
        const response = await fetch('/api/flows');
        if (response.ok) {
          const result = await response.json();
          const userFlows = result.data || [];
          if (userFlows.length > 0) {
            // Redirect to the first flow
            router.replace(`/app/flows/${userFlows[0].id}/flows`);
            return;
          }
        }
        // No flows found, stay on main page
        setFlows([]);
      } catch (error) {
        console.error('Failed to load flows:', error);
        setFlows([]);
      } finally {
        setLoading(false);
      }
    };

    loadFlows();
  }, [router, session, authLoading]);

  // Show loading state while authentication or flows are loading
  if (authLoading || loading) {
    return (
      <AppLayout user={session?.user}>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-base-content/70">
            <div className="w-6 h-6 border-2 border border-t-primary rounded-full animate-spin" />
            <div className="text-sm">Loading…</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // If no session after loading, the useRequireAuth hook will handle redirect
  if (!session) {
    return null;
  }

  return (
    <AppLayout user={session.user}>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-base-content mb-2">
            Welcome to Flowshapr
          </h2>
          <p className="text-base-content/70 mb-4">
            Create your first flow to get started with building AI workflows.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
