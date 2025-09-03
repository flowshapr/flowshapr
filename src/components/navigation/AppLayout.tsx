import React, { useState } from 'react';
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
  const [selectedFlow, setSelectedFlow] = useState<Flow | undefined>(undefined);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<ProjectView>('flows');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleFlowChange = (flow: Flow) => {
    setSelectedFlow(flow);
    // Reset to flows view when switching flows  
    setActiveView('flows');
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
    setActiveView(view);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
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
              {React.cloneElement(children as React.ReactElement, {
                selectedFlow,
                activeView,
                isNavCollapsed
              })}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  No Flow Selected
                </h2>
                <p className="text-gray-600 mb-4">
                  Select a flow from the dropdown above or create a new one to get started.
                </p>
                <button
                  onClick={handleCreateFlow}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
