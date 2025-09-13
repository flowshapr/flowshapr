'use client';

import { useRouter, useParams } from 'next/navigation';
import { useRequireAuth } from '@/components/auth/AuthProvider';
import { AppLayout } from '@/components/navigation/AppLayout';
import { FlowBuilderView } from '@/components/flow-builder/views/FlowBuilderView';
import { useEffect, useState } from 'react';

export default function FlowPage() {
  const router = useRouter();
  const params = useParams();
  const flowId = params.flowId as string;

  // Use real authentication
  const { session, loading: authLoading } = useRequireAuth();

  const [selectedFlow, setSelectedFlow] = useState<{
    id: string;
    name: string;
    slug: string;
    description?: string;
    organizationId: string;
    memberRole: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Load flow data
  useEffect(() => {
    // Don't load flow until authentication is complete
    if (authLoading || !session || !flowId) {
      return;
    }

    const loadFlow = async () => {
      try {
        const response = await fetch(`/api/flows/${flowId}`);
        if (response.ok) {
          const result = await response.json();
          setSelectedFlow(result.data);
        } else {
          // Fallback to mock flow for development
          setSelectedFlow({
            id: flowId,
            name: "Sample AI Flow",
            slug: "sample-ai-flow",
            description: "A sample flow for UI development",
            organizationId: "org_1",
            memberRole: "owner"
          });
        }
      } catch (error) {
        console.error('Failed to load flow:', error);
        // Fallback to mock flow
        setSelectedFlow({
          id: flowId,
          name: "Sample AI Flow",
          slug: "sample-ai-flow",
          description: "A sample flow for UI development",
          organizationId: "org_1",
          memberRole: "owner"
        });
      } finally {
        setLoading(false);
      }
    };

    loadFlow();
  }, [flowId, session, authLoading]);

  // Show loading state while authentication or flow data is loading
  if (authLoading || loading) {
    return (
      <AppLayout user={session?.user}>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-base-content/70">
            <div className="w-6 h-6 border-2 border border-t-blue-500 rounded-full animate-spin" />
            <div className="text-sm">Loading flow…</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // If no session after loading, the useRequireAuth hook will handle redirect
  if (!session) {
    return null;
  }

  if (!selectedFlow) {
    return (
      <AppLayout user={session.user}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-base-content mb-2">
              Flow Not Found
            </h2>
            <p className="text-base-content/70 mb-4">
              The flow you're looking for doesn't exist or you don't have access to it.
            </p>
            <button
              onClick={() => router.push('/app')}
              className="px-4 py-2 bg-primary text-primary-content rounded-lg hover:bg-primary-focus transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={session.user}>
      <FlowBuilderView
        session={session}
        selectedFlow={selectedFlow}
        activeView="flows"
        isNavCollapsed={false}
      />
    </AppLayout>
  );
}