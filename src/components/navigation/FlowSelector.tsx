import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown,
  Plus,
  Folder,
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
      console.error('Failed to fetch flows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFlowSelect = (flow: Flow) => {
    onFlowChange?.(flow);
    setIsOpen(false);
  };

  return (
    <div className="h-12 bg-gray-50 border-b border-gray-200 px-4 flex items-center">
      <div className="flex items-center gap-3 flex-1">
        <span className="text-sm font-medium text-gray-600">Flow:</span>
        
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setIsOpen(!isOpen)}
            className="gap-2 min-w-[200px] justify-between"
            disabled={loading}
          >
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4" />
              <span>
                {loading 
                  ? 'Loading...' 
                  : selectedFlow?.name || 'Select a flow'
                }
              </span>
            </div>
            <ChevronDown className="w-4 h-4" />
          </Button>

          {isOpen && !loading && (
            <>
              {/* Overlay to close dropdown */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsOpen(false)}
              />
              
              {/* Dropdown */}
              <div className="absolute left-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                <div className="p-2">
                  <div className="px-3 py-2 text-sm font-medium text-gray-900 border-b border-gray-100 mb-2">
                    Select Flow
                  </div>
                  
                  {flows.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-gray-500 text-center">
                      No flows found. Create your first flow to get started.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {flows.map((flow) => (
                        <button
                          key={flow.id}
                          onClick={() => handleFlowSelect(flow)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                        >
                          <Folder className="w-4 h-4 text-gray-400" />
                          <div className="flex-1 text-left">
                            <div className="font-medium">{flow.name}</div>
                            {flow.description && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {flow.description}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 mt-0.5">
                              Role: {flow.memberRole}
                            </div>
                          </div>
                          {selectedFlow?.id === flow.id && (
                            <Check className="w-4 h-4 text-blue-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <button
                      onClick={() => {
                        onCreateFlow?.();
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create new flow
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}