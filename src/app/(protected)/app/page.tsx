'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/components/auth/AuthProvider';
import { AppLayout } from '@/components/navigation/AppLayout';

export default function FlowBuilderApp() {
  const router = useRouter();
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Temporarily bypass auth for UI development
  const mockSession = {
    user: {
      id: "user_1756749003851_v6sdy99q9kf",
      name: "Marcel Folaron", 
      email: "marcel@leantime.io",
      emailVerified: true
    },
    session: {
      id: "session_temp",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  };

  // Load flows and redirect to first one
  useEffect(() => {
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
  }, [router]);

  if (loading) {
    return (
      <AppLayout user={mockSession.user}>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-gray-600">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            <div className="text-sm">Loading…</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={mockSession.user}>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Welcome to Flowshapr
          </h2>
          <p className="text-gray-600 mb-4">
            Create your first flow to get started with building AI workflows.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
