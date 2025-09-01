import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft,
  Workflow,
  MessageSquare,
  Activity,
  Settings,
  Database,
  Key,
  BarChart3
} from 'lucide-react';

export type ProjectView = 'flows' | 'prompts' | 'traces' | 'datasets' | 'api-keys' | 'analytics' | 'settings';

interface ProjectNavigationProps {
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
  activeView?: ProjectView;
  onViewChange?: (view: ProjectView) => void;
  projectName?: string;
}

export function ProjectNavigation({ 
  isCollapsed = false, 
  onToggleCollapsed,
  activeView = 'flows',
  onViewChange,
  projectName 
}: ProjectNavigationProps) {
  const menuItems = [
    {
      id: 'flows' as ProjectView,
      icon: Workflow,
      label: 'Flows',
      description: 'Visual AI workflows'
    },
    {
      id: 'prompts' as ProjectView,
      icon: MessageSquare,
      label: 'Prompts',
      description: 'Reusable prompt templates'
    },
    {
      id: 'traces' as ProjectView,
      icon: Activity,
      label: 'Traces',
      description: 'Execution logs and traces'
    },
    {
      id: 'datasets' as ProjectView,
      icon: Database,
      label: 'Datasets',
      description: 'Training and test data'
    },
    {
      id: 'api-keys' as ProjectView,
      icon: Key,
      label: 'API Keys',
      description: 'Manage API access'
    },
    {
      id: 'analytics' as ProjectView,
      icon: BarChart3,
      label: 'Analytics',
      description: 'Usage metrics and insights'
    },
    {
      id: 'settings' as ProjectView,
      icon: Settings,
      label: 'Settings',
      description: 'Project configuration'
    }
  ];

  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-200 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header with collapse toggle */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-gray-100">
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {projectName || 'Project Menu'}
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapsed}
          className="p-1 h-8 w-8"
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${
            isCollapsed ? 'rotate-180' : ''
          }`} />
        </Button>
      </div>

      {/* Navigation items */}
      <div className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange?.(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                activeView === item.id
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <div className="flex-1 text-left">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {item.description}
                  </div>
                </div>
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}