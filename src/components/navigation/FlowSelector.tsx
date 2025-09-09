import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown,
  Plus,
  Workflow,
  Check
} from 'lucide-react';

interface Flow {
  id: string;
  name: string;
  slug: string;
  description?: string;
  organizationId: string;
  memberRole: string;
}

interface FlowSelectorProps {
  selectedFlow?: Flow;
  onFlowChange?: (flow: Flow) => void;
  onCreateFlow?: () => void;
}

export function FlowSelector({ 
  selectedFlow, 
  onFlowChange, 
  onCreateFlow 
}: FlowSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    try {
      const response = await fetch('/api/flows', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        setFlows(result.data || []);
        
        // Auto-select first flow if none selected
        if (!selectedFlow && result.data?.length > 0) {
          onFlowChange?.(result.data[0]);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch flows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFlowSelect = (flow: Flow) => {
    onFlowChange?.(flow);
    setIsOpen(false);
  };

  return (
    <div className="h-12 bg-base-200 border-b border-base-300 px-4 flex items-center">
      <div className="flex items-center gap-3 flex-1">
        <div className="dropdown">
          <div 
            tabIndex={0} 
            role="button" 
            className="btn btn-outline gap-2 min-w-[200px] justify-between"
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="flex items-center gap-2">
              <Workflow className="w-4 h-4" />
              <span>
                {loading 
                  ? 'Loading...' 
                  : selectedFlow?.name || 'Select a flow'
                }
              </span>
            </div>
            <ChevronDown className="w-4 h-4" />
          </div>

          {isOpen && !loading && (
            <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[1] w-80 p-2 shadow-lg mt-2">
              <li className="menu-title">
                <span>Select Flow</span>
              </li>
              
              {flows.length === 0 ? (
                <li>
                  <div className="text-center text-base-content/60 py-4">
                    No flows found. Create your first flow to get started.
                  </div>
                </li>
              ) : (
                <>
                  {flows.map((flow) => (
                    <li key={flow.id}>
                      <button
                        onClick={() => handleFlowSelect(flow)}
                        className="flex items-center gap-3 justify-between"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Workflow className="w-4 h-4 text-base-content/60" />
                          <div className="flex-1 text-left">
                            <div className="font-medium">{flow.name}</div>
                            {flow.description && (
                              <div className="text-xs text-base-content/60 mt-0.5">
                                {flow.description}
                              </div>
                            )}
                            <div className="text-xs text-base-content/40 mt-0.5">
                              Role: {flow.memberRole}
                            </div>
                          </div>
                        </div>
                        {selectedFlow?.id === flow.id && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </button>
                    </li>
                  ))}
                </>
              )}
              
              <div className="divider my-1"></div>
              <li>
                <button
                  onClick={() => {
                    onCreateFlow?.();
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-3 text-primary"
                >
                  <Plus className="w-4 h-4" />
                  Create new flow
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
