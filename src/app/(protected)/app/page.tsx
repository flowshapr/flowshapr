'use client';

import React from 'react';
import { useRequireAuth } from '@/components/auth/AuthProvider';
import { AppLayout } from '@/components/navigation/AppLayout';
import { FlowBuilderView } from '@/components/flow-builder/FlowBuilderView';

export default function FlowBuilderApp() {
  // Temporarily bypass auth for UI development
  const mockSession = {
    user: {
      id: "user_1756749003851_v6sdy99q9kf",
      name: "Marcel Folaron", 
      email: "marcel@leantime.io",
      image: null,
      emailVerified: true
    },
    session: {
      id: "session_temp",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  };

  // Mock selected flow
  const mockFlow = {
    id: "flow_1",
    name: "Sample AI Flow",
    slug: "sample-ai-flow",
    description: "A sample flow for UI development",
    organizationId: "org_1",
    memberRole: "owner"
  };

  return (
    <AppLayout user={mockSession.user}>
      <FlowBuilderView 
        session={mockSession} 
        selectedFlow={mockFlow}
        activeView="flows"
        isNavCollapsed={false}
      />
    </AppLayout>
  );
}