import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft,
  Workflow,
  MessageSquare,
  Activity,
  Settings,
  Database,
  Key
} from 'lucide-react';

export type ProjectView = 'flows' | 'prompts' | 'traces' | 'access-tokens' | 'connections' | 'settings';

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
      id: 'access-tokens' as ProjectView,
      icon: Key,
      label: 'Access Tokens',
      description: 'Tokens for SDK/API access'
    },
    {
      id: 'connections' as ProjectView,
      icon: Database,
      label: 'Connections',
      description: 'Provider & external keys'
    },
    {
      id: 'settings' as ProjectView,
      icon: Settings,
      label: 'Settings',
      description: 'Project configuration'
    }
  ];

  return (
    <div className={`bg-base-100 border-r flex flex-col transition-all duration-200 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header with collapse toggle */}
      <div className="h-12 flex items-center justify-between px-4 border-b">
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-base-content truncate">
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
      <div className="flex-1 py-2">
        <ul className="menu menu-md w-full">
          {menuItems.map((item) => (
            <li key={item.id} className="w-full">
              <a
                onClick={() => onViewChange?.(item.id)}
                className={`flex items-center gap-3 cursor-pointer w-full justify-start ${
                  activeView === item.id ? 'active bg-primary/10 text-primary border-r-2 border-primary' : ''
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <div className="flex-1 text-left">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-base-content/60 mt-0.5">
                      {item.description}
                    </div>
                  </div>
                )}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
