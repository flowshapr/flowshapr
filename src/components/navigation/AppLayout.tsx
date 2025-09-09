import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { TopNavigation } from './TopNavigation';
import { FlowSelector } from './FlowSelector';
import { ProjectNavigation, ProjectView } from './ProjectNavigation';
import { CreateFlowModal } from '../modals/CreateFlowModal';

interface Flow {
  id: string;
  name: string;
  slug: string;
  description?: string;
  organizationId: string;
  memberRole: string;
}

interface AppLayoutProps {
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  children: React.ReactNode;
}

export function AppLayout({ user, children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedFlow, setSelectedFlow] = useState<Flow | undefined>(undefined);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<ProjectView>('flows');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Extract flow ID and view from URL
  useEffect(() => {
    const match = pathname.match(/^\/app\/flows\/([^\/]+)(?:\/([^\/]+))?/);
    if (match) {
      const flowId = match[1];
      const view = (match[2] as ProjectView) || 'flows';
      setActiveView(view);
      
      // Load flow data if not already loaded or different flow
      if (!selectedFlow || selectedFlow.id !== flowId) {
        loadFlowData(flowId);
      }
    }
  }, [pathname, selectedFlow]);

  const loadFlowData = async (flowId: string) => {
    try {
      const response = await fetch(`/api/flows/${flowId}`);
      if (response.ok) {
        const result = await response.json();
        setSelectedFlow(result.data);
      }
    } catch (error) {
      console.error('Failed to load flow:', error);
    }
  };

  const handleFlowChange = (flow: Flow) => {
    console.log('FlowSelector: handleFlowChange called', { 
      flowId: flow.id, 
      flowName: flow.name,
      currentPath: pathname,
      selectedFlowId: selectedFlow?.id 
    });
    
    setSelectedFlow(flow);
    
    // Always navigate to the selected flow
    // Preserve current view if we're already in a flow route, otherwise use 'flows'
    const currentView = pathname.match(/^\/app\/flows\/[^\/]+\/([^\/]+)/)?.[1] || 'flows';
    const targetUrl = `/app/flows/${flow.id}/${currentView}`;
    
    console.log('FlowSelector: navigating to', targetUrl);
    router.push(targetUrl);
  };

  const handleCreateFlow = () => {
    setShowCreateModal(true);
  };

  const handleCreateFlowSubmit = async (flowData: { name: string; alias: string; description?: string }) => {
    try {
      // Get the first organization (for now) - in a real app, this would be selected
      const orgResponse = await fetch('/api/organizations', { credentials: 'include' });
      if (!orgResponse.ok) throw new Error('Failed to fetch organizations');
      const orgResult = await orgResponse.json();
      
      if (!orgResult.data || orgResult.data.length === 0) {
        throw new Error('No organization found. Please create an organization first.');
      }

      const response = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...flowData,
          organizationId: orgResult.data[0].id,
        }),
      });

      if (!response.ok) throw new Error('Failed to create flow');
      
      const result = await response.json();
      setSelectedFlow(result.data);
      
      // Refresh the flow list by triggering a re-fetch (could be improved with state management)
      window.location.reload();
    } catch (error) {
      console.warn('Failed to create flow:', error);
      alert('Failed to create flow. Please try again.');
    }
  };

  const handleToggleNav = () => {
    setIsNavCollapsed(!isNavCollapsed);
  };

  const handleViewChange = (view: ProjectView) => {
    if (selectedFlow) {
      router.push(`/app/flows/${selectedFlow.id}/${view}`);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-base-200">
      {/* Top Navigation */}
      <TopNavigation user={user} />
      
      {/* Flow Selector */}
      <FlowSelector
        selectedFlow={selectedFlow}
        onFlowChange={handleFlowChange}
        onCreateFlow={handleCreateFlow}
      />
      
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Project Navigation Sidebar */}
        {selectedFlow && (
          <ProjectNavigation
            isCollapsed={isNavCollapsed}
            onToggleCollapsed={handleToggleNav}
            activeView={activeView}
            onViewChange={handleViewChange}
            projectName={selectedFlow.name}
          />
        )}
        
        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedFlow ? (
            <div className="flex-1 overflow-hidden">
{children}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-base-content mb-2">
                  No Flow Selected
                </h2>
                <p className="text-base-content/70 mb-4">
                  Select a flow from the dropdown above or create a new one to get started.
                </p>
                <button
                  onClick={handleCreateFlow}
                  className="btn btn-primary"
                >
                  Create New Flow
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Flow Modal */}
      <CreateFlowModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateFlow={handleCreateFlowSubmit}
      />
    </div>
  );
}
