'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { FlowCanvasWrapper } from './flow-canvas';
import { Sidebar } from './sidebar';
import { CodeEditor } from '@/components/code-preview/code-editor';
import { TestPanel } from '@/components/test-panel/test-panel';
import { FlowNode, FlowEdge, NodeType, GeneratedCode, ExecutionResult, InputNodeConfig, FlowVariable } from '@/types/flow';
import { generateCode } from '@/lib/code-generator';
import { generateId, debounce } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Square, 
  Trash2, 
  Save, 
  FolderOpen, 
  Download, 
  Upload,
  Variable,
  Settings
} from 'lucide-react';

interface Flow {
  id: string;
  name: string;
  slug: string;
  description?: string;
  organizationId: string;
  memberRole: string;
  projectId?: string;
}

interface FlowBuilderViewProps {
  selectedFlow?: Flow;
  activeView?: string;
  isNavCollapsed?: boolean;
  session?: {
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
}

// Variables Panel Component
interface VariablesPanelProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  startNodeId: string | null;
  variables: FlowVariable[];
  runtimeOnly: FlowVariable[];
}

function VariablesPanel({ nodes, edges, startNodeId, variables, runtimeOnly }: VariablesPanelProps) {
  
  return (
    <div className="h-full p-4 bg-gray-50">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Variable className="w-5 h-5" />
          Flow Variables
        </h3>
        <p className="text-sm text-gray-600">
          Variables defined in your flow that can be provided at runtime.
        </p>
      </div>
      
      <div className="space-y-3">
        {variables.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Variable className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              No variables defined yet.
            </p>
            <p className="text-xs mt-1">
              Add Input nodes with Variable type to create flow variables.
            </p>
          </div>
        ) : (
          variables.map((variable) => (
            <div 
              key={variable.id} 
              className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      ${variable.name}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {variable.source}
                    </span>
                  </div>
                  {variable.description && (
                    <p className="text-xs text-gray-600 mt-1">
                      {variable.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Defined in: {nodes.find(n => n.id === variable.sourceNodeId)?.data.label || 'Unknown'}
                  </p>
                </div>
                <Settings className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
              </div>
            </div>
          ))
        )}
      </div>
      
      {runtimeOnly.length > 0 && (
        <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            SDK Usage
          </h4>
          <p className="text-xs text-blue-800 mb-2">
            Call this flow with variables:
          </p>
          <code className="text-xs bg-blue-100 p-2 rounded block font-mono text-blue-900">
            {`await flow.run({ ${runtimeOnly.map(v => `${v.name}: "value"`).join(', ')} })`}
          </code>
        </div>
      )}
    </div>
  );
}

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes === 1) {
    return '1 minute ago';
  }
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minutes ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours === 1) {
    return '1 hour ago';
  }
  if (diffInHours < 24) {
    return `${diffInHours} hours ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return '1 day ago';
  }
  return `${diffInDays} days ago`;
}

export function FlowBuilderView({ 
  selectedFlow, 
  activeView, 
  isNavCollapsed,
  session 
}: FlowBuilderViewProps) {
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode>({
    code: '',
    isValid: false,
    errors: [],
  });
  const [viewport, setViewport] = useState<{ x: number; y: number; zoom: number }>({ x: 0, y: 0, zoom: 1 });
  const [startNodeId, setStartNodeId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activePanel, setActivePanel] = useState<'code' | 'test' | 'variables'>('code');
  const [panelWidth, setPanelWidth] = useState(384); // Default 384px (w-96)
  const [apiKeys, setApiKeys] = useState<{ googleai?: string; openai?: string; anthropic?: string }>({});
  const [connections, setConnections] = useState<Array<{ id: string; name: string; provider: 'googleai'|'openai'|'anthropic'; apiKey: string; isActive: boolean }>>([]);
  
  // Autosave state
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Autosave function
  const autosaveFlow = useCallback(async (nodes: FlowNode[], edges: FlowEdge[]) => {
    if (!selectedFlow || nodes.length === 0) return;

    try {
      setAutosaveStatus('saving');
      
      const flowDefinitionData = {
        nodes,
        edges,
        metadata: {
          lastModified: new Date().toISOString(),
          version: '1.0.0',
          viewport,
          startNodeId,
          apiKeys,
          connections,
        }
      };

      // First try API save, fall back to localStorage if it fails
      try {
        const response = await fetch(`/api/flows/${selectedFlow.id}/definition`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(flowDefinitionData),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        // API save successful
        setAutosaveStatus('saved');
        setLastSaved(new Date());
      } catch (apiError) {
        console.warn('API autosave failed, using localStorage:', apiError);
        
        // Fallback to localStorage
        const storageKey = `flow_${selectedFlow.id}`;
        const flowData = {
          ...flowDefinitionData,
          flowInfo: {
            id: selectedFlow.id,
            name: selectedFlow.name,
            description: selectedFlow.description,
          },
          savedAt: new Date().toISOString()
        };
        
        localStorage.setItem(storageKey, JSON.stringify(flowData));
        
        setAutosaveStatus('saved');
        setLastSaved(new Date());
      }
      
      // Reset to idle after 2 seconds
      setTimeout(() => setAutosaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Autosave failed completely:', error);
      setAutosaveStatus('error');
      setTimeout(() => setAutosaveStatus('idle'), 3000);
    }
  }, [selectedFlow, viewport, startNodeId, apiKeys]);

  // Debounced autosave
  const debouncedAutosave = useCallback(
    debounce((nodes: FlowNode[], edges: FlowEdge[]) => {
      autosaveFlow(nodes, edges);
    }, 2000), // Auto-save after 2 seconds of inactivity
    [autosaveFlow]
  );

  // Debounced code generation
  const debouncedGenerateCode = useCallback(
    debounce((nodes: FlowNode[], edges: FlowEdge[], startId: string | null) => {
      const nodesWithStart = nodes.map(n => ({ ...n, data: { ...n.data, isStart: n.id === startId } })) as FlowNode[];
      const result = generateCode(nodesWithStart, edges);
      setGeneratedCode(result);
    }, 300),
    []
  );

  // Generate code whenever nodes or edges change
  useEffect(() => {
    debouncedGenerateCode(nodes, edges, startNodeId);
  }, [nodes, edges, startNodeId, debouncedGenerateCode]);

  // Autosave whenever nodes or edges change
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      debouncedAutosave(nodes, edges);
    }
  }, [nodes, edges, debouncedAutosave]);

  // Load flow from localStorage on mount
  useEffect(() => {
    if (selectedFlow) {
      const storageKey = `flow_${selectedFlow.id}`;
      const savedFlow = localStorage.getItem(storageKey);
      
      if (savedFlow) {
        try {
          const flowData = JSON.parse(savedFlow);
          if (flowData.nodes && flowData.edges) {
            setNodes(flowData.nodes);
            setEdges(flowData.edges);
            setLastSaved(new Date(flowData.savedAt || flowData.metadata?.lastModified));
            if (flowData.metadata?.startNodeId) {
              setStartNodeId(flowData.metadata.startNodeId);
            }
            // Restore viewport if available
            const vp = flowData.metadata?.viewport || flowData.viewport;
            if (vp && typeof vp.zoom === 'number') {
              setViewport({ x: vp.x || 0, y: vp.y || 0, zoom: vp.zoom });
            }
            // Restore API keys
            if (flowData.metadata?.apiKeys) {
              setApiKeys(flowData.metadata.apiKeys);
            }
            if (flowData.metadata?.connections) {
              setConnections(flowData.metadata.connections);
            }
            console.log('Loaded flow from localStorage:', flowData);
          }
        } catch (error) {
          console.error('Failed to load flow from localStorage:', error);
        }
      }
    }
  }, [selectedFlow]);

  // Listen for node config changes
  useEffect(() => {
    const handleNodeConfigChange = (event: CustomEvent) => {
      const { nodeId, config } = event.detail;
      setNodes(prevNodes => 
        prevNodes.map(node => 
          node.id === nodeId 
            ? { ...node, data: { ...node.data, config } }
            : node
        )
      );
    };

    const handleNodeDelete = (event: CustomEvent) => {
      const { nodeId } = event.detail || {};
      if (!nodeId) return;
      setNodes(prev => prev.filter(n => n.id !== nodeId));
      setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    };

    const handleNodeSetStart = (event: CustomEvent) => {
      const { nodeId } = event.detail || {};
      if (nodeId) setStartNodeId(nodeId);
    };

    window.addEventListener('nodeConfigChange', handleNodeConfigChange as EventListener);
    window.addEventListener('nodeSetStart', handleNodeSetStart as EventListener);
    window.addEventListener('nodeDelete', handleNodeDelete as EventListener);
    return () => {
      window.removeEventListener('nodeConfigChange', handleNodeConfigChange as EventListener);
      window.removeEventListener('nodeSetStart', handleNodeSetStart as EventListener);
      window.removeEventListener('nodeDelete', handleNodeDelete as EventListener);
    };
  }, []);

  const handleNodesChange = useCallback((newNodes: FlowNode[]) => {
    setNodes(newNodes);
  }, []);

  const handleEdgesChange = useCallback((newEdges: FlowEdge[]) => {
    setEdges(newEdges);
  }, []);

  const handleAddNode = useCallback((type: NodeType, position?: { x: number; y: number }) => {
    const defaultPosition = position || {
      x: 100 + (nodes.length * 250),
      y: 100,
    };

    const newNode: FlowNode = {
      id: generateId(),
      type,
      position: defaultPosition,
      data: {
        label: getNodeLabel(type),
        type,
        config: getDefaultConfig(type),
      },
    };

    setNodes(prev => [...prev, newNode]);
  }, [nodes.length]);

  const handleExecuteFlow = useCallback(async (input: any): Promise<ExecutionResult> => {
    setIsExecuting(true);
    try {
      if (!selectedFlow) throw new Error('No flow selected');
      const body = {
        input,
        nodes,
        edges,
        metadata: { startNodeId, viewport },
        connections,
      };
      const resp = await fetch(`/api/flows/${selectedFlow.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      let json: any = null;
      try { json = await resp.json(); } catch { /* fall back */ }
      if (!resp.ok) {
        const msg = json?.error?.message || json?.message || `Execution failed (${resp.status})`;
        throw new Error(msg);
      }
      return (json || { success: false, error: 'Empty response', traces: [] }) as ExecutionResult;
    } catch (error) {
      return { success: false, error: (error as Error).message, traces: [] };
    } finally {
      setIsExecuting(false);
    }
  }, [nodes, edges, startNodeId, viewport, connections, selectedFlow]);

  const handleClearFlow = useCallback(() => {
    setNodes([]);
    setEdges([]);
  }, []);

  const handleDeleteSelected = useCallback(() => {
    const selectedIds = new Set(nodes.filter((n: any) => n.selected).map(n => n.id));
    if (selectedIds.size === 0) return;
    setNodes(prev => prev.filter(n => !selectedIds.has(n.id)) as FlowNode[]);
    setEdges(prev => prev.filter(e => !selectedIds.has(e.source) && !selectedIds.has(e.target)) as FlowEdge[]);
  }, [nodes]);

  const handleSaveFlow = useCallback(() => {
    const flowData = {
      nodes,
      edges,
      timestamp: new Date().toISOString(),
      userId: session?.user.id,
      userName: session?.user.name,
      flowId: selectedFlow?.id,
    };
    
    const blob = new Blob([JSON.stringify(flowData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flow.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [nodes, edges, session, selectedFlow]);

  const handleLoadFlow = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const flowData = JSON.parse(e.target?.result as string);
            setNodes(flowData.nodes || []);
            setEdges(flowData.edges || []);
          } catch (error) {
            console.error('Failed to load flow:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, []);

  const canExecute = nodes.length > 0 && generatedCode.isValid;

  // Compute variables available for prompts/transforms and expose globally for insert menus
  const computedVars = useMemo(() => {
    const idMap = new Map(nodes.map(n => [n.id, n]));
    const children = new Map<string, string[]>();
    edges.forEach(e => {
      children.set(e.source, [...(children.get(e.source) || []), e.target]);
    });
    const visited = new Set<string>();
    const order: FlowNode[] = [];
    const dfs = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      const n = idMap.get(id);
      if (!n) return;
      order.push(n);
      (children.get(id) || []).forEach(dfs);
    };
    if (startNodeId && idMap.has(startNodeId)) {
      dfs(startNodeId);
    } else {
      const inputNodes = nodes.filter(n => n.data.type === NodeType.INPUT);
      if (inputNodes.length === 1) dfs(inputNodes[0].id);
      else if (nodes.length > 0) dfs(nodes[0].id);
    }

    const runtimeOnly: FlowVariable[] = [];
    nodes.forEach(node => {
      if (node.data.type === NodeType.INPUT) {
        const config = node.data.config as InputNodeConfig;
        if (config.inputType === 'variable' && config.variableName) {
          runtimeOnly.push({
            id: `${node.id}-${config.variableName}`,
            name: config.variableName,
            description: config.variableDescription,
            source: 'input',
            sourceNodeId: node.id,
            type: 'string',
          });
        }
      }
    });
    const all: FlowVariable[] = [...runtimeOnly];
    order.forEach((n, index) => {
      const stepName = `step${index + 1}`;
      all.push({ id: `${n.id}-${stepName}`, name: stepName, description: `Output of ${n.data.label}`, source: 'auto', sourceNodeId: n.id, type: 'object' });
    });
    if (order.length > 0) {
      const last = order[order.length - 1];
      all.push({ id: `${last.id}-result`, name: 'result', description: `Final output (from ${last.data.label})`, source: 'auto', sourceNodeId: last.id, type: 'object' });
    }
    return { all, runtimeOnly };
  }, [nodes, edges, startNodeId]);

  useEffect(() => {
    (window as any).__flowVars = computedVars;
    (window as any).__apiKeys = apiKeys;
    (window as any).__connections = connections;
    window.dispatchEvent(new CustomEvent('apiKeysChange', { detail: apiKeys }));
  }, [computedVars]);

  useEffect(() => {
    (window as any).__apiKeys = apiKeys;
    window.dispatchEvent(new CustomEvent('apiKeysChange', { detail: apiKeys }));
  }, [apiKeys]);

  useEffect(() => {
    (window as any).__connections = connections;
    window.dispatchEvent(new CustomEvent('connectionsChange', { detail: connections }));
  }, [connections]);

  // Optional: keyboard delete support (when canvas is focused)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected();
        return;
      }
      if (e.key.toLowerCase() === 's') {
        const selected = nodes.filter((n: any) => n.selected);
        if (selected.length > 0) setStartNodeId(selected[selected.length - 1].id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleDeleteSelected, nodes]);

  // Show different views based on activeView
  if (activeView && activeView !== 'flows') {
    if (activeView === 'access-tokens') {
      return (
        <div className="flex-1 p-6">
          <div className="max-w-xl space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Access Tokens</h2>
            <p className="text-sm text-gray-600">Project-scoped tokens for Flowshapr SDK/API access. Create and revoke tokens below.</p>
            <AccessTokensPanel projectId={selectedFlow?.projectId || ''} />
          </div>
        </div>
      );
    }
    if (activeView === 'connections') {
      return (
        <div className="flex-1 p-6">
          <div className="max-w-2xl space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Connections</h2>
            <p className="text-sm text-gray-600">Manage provider API keys and other external connections. These are saved with the flow for now.</p>
            <div className="space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md" id="conn-name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                  <select className="px-3 py-2 border border-gray-300 rounded-md" id="conn-provider">
                    <option value="googleai">Google AI</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md" id="conn-key" type="password" />
                </div>
                <button
                  className="px-3 py-2 bg-blue-600 text-white rounded-md"
                  onClick={() => {
                    const name = (document.getElementById('conn-name') as HTMLInputElement)?.value?.trim();
                    const provider = (document.getElementById('conn-provider') as HTMLSelectElement)?.value as any;
                    const apiKey = (document.getElementById('conn-key') as HTMLInputElement)?.value?.trim();
                    if (!name || !apiKey) return;
                    const id = `${provider}_${Date.now()}`;
                    setConnections(prev => [...prev, { id, name, provider, apiKey, isActive: true }]);
                    (document.getElementById('conn-name') as HTMLInputElement).value = '';
                    (document.getElementById('conn-key') as HTMLInputElement).value = '';
                  }}
                >Add</button>
              </div>
              <div className="divide-y border rounded">
                {connections.length === 0 && (
                  <div className="p-3 text-sm text-gray-500">No connections yet.</div>
                )}
                {connections.map((c, idx) => (
                  <div key={c.id} className="p-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{c.name} <span className="text-xs text-gray-500">({c.provider})</span></div>
                      <div className="text-xs text-gray-500">{c.isActive ? 'Active' : 'Disabled'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="text-sm text-red-600" onClick={() => setConnections(prev => prev.filter(x => x.id !== c.id))}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-500">Changes auto-save with the flow.</div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {activeView?.charAt(0).toUpperCase()}{activeView?.slice(1)} View
          </h2>
          <p className="text-gray-600">
            This view is coming soon. Currently showing the flow builder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Flow Builder Toolbar */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
            <Button
              onClick={() => setActivePanel('test')}
              disabled={!canExecute || isExecuting}
              size="sm"
              className="gap-2"
            >
              {isExecuting ? (
                <>
                  <Square className="w-4 h-4" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Execute
                </>
              )}
            </Button>
            
          <Button
            onClick={handleClearFlow}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </Button>
            <Button
              onClick={handleDeleteSelected}
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={!nodes.some((n: any) => n.selected)}
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSaveFlow}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </Button>
            
            <Button
              onClick={handleLoadFlow}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              Load
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            {selectedFlow?.name} - Flow Builder
          </div>
          
          {/* Autosave Status Indicator */}
          <div className="flex items-center gap-2 text-xs">
            {autosaveStatus === 'saving' && (
              <>
                <div className="w-3 h-3 border border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="text-blue-600">Saving...</span>
              </>
            )}
            {autosaveStatus === 'saved' && (
              <>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-600">Saved</span>
              </>
            )}
            {autosaveStatus === 'error' && (
              <>
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-red-600">Save failed</span>
              </>
            )}
            {autosaveStatus === 'idle' && lastSaved && (
              <span className="text-gray-500">
                Last saved {formatTimeAgo(lastSaved)}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Main Flow Builder Area */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onAddNode={handleAddNode} />
        
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex">
            <div className="flex-1 min-w-0">
          <FlowCanvasWrapper 
            nodes={nodes.map(n => ({ ...n, data: { ...n.data, isStart: n.id === startNodeId } }))}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onAddNode={handleAddNode}
            viewport={viewport}
            onViewportChange={setViewport}
          />
            </div>
            
            <div 
              className="flex flex-col border-l border-gray-200 relative"
              style={{ width: `${panelWidth}px`, minWidth: '300px', maxWidth: '600px' }}
            >
              {/* Resize Handle */}
              <div
                className="absolute left-0 top-0 h-full w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors"
                onMouseDown={(e) => {
                  const startX = e.clientX;
                  const startWidth = panelWidth;
                  
                  const handleMouseMove = (e: MouseEvent) => {
                    const newWidth = startWidth - (e.clientX - startX);
                    const clampedWidth = Math.min(Math.max(newWidth, 300), 600);
                    setPanelWidth(clampedWidth);
                  };
                  
                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };
                  
                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
              />
              <div className="pl-2"> {/* Add padding to account for resize handle */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActivePanel('code')}
                  className={`flex-1 px-3 py-2 text-sm font-medium ${
                    activePanel === 'code'
                      ? 'bg-white text-gray-900 border-b-2 border-blue-500'
                      : 'bg-gray-50 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Code
                </button>
                <button
                  onClick={() => setActivePanel('test')}
                  className={`flex-1 px-3 py-2 text-sm font-medium ${
                    activePanel === 'test'
                      ? 'bg-white text-gray-900 border-b-2 border-blue-500'
                      : 'bg-gray-50 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Test
                </button>
                <button
                  onClick={() => setActivePanel('variables')}
                  className={`flex-1 px-3 py-2 text-sm font-medium ${
                    activePanel === 'variables'
                      ? 'bg-white text-gray-900 border-b-2 border-blue-500'
                      : 'bg-gray-50 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Variables
                </button>
              </div>
              
              <div className="flex-1 overflow-hidden h-full">
                {activePanel === 'code' && (
                  <CodeEditor
                    code={generatedCode.code}
                    errors={generatedCode.errors}
                    height="100%"
                  />
                )}
                {activePanel === 'test' && (
                  <TestPanel
                    onExecute={handleExecuteFlow}
                    isExecuting={isExecuting}
                    canExecute={canExecute}
                  />
                )}
                {activePanel === 'variables' && (
                  <VariablesPanel
                    nodes={nodes}
                    edges={edges}
                    startNodeId={startNodeId}
                    variables={computedVars.all}
                    runtimeOnly={computedVars.runtimeOnly}
                  />
                )}
              </div>
              </div> {/* Close padding div */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccessTokensPanel({ projectId }: { projectId: string }) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState('execute_flow');
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  const load = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const resp = await fetch(`/api/projects/${projectId}/api-keys`, { cache: 'no-store' });
      const json = await resp.json();
      setList(json?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  const create = async () => {
    if (!projectId || !name.trim()) return;
    const resp = await fetch(`/api/projects/${projectId}/api-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), scopes: scopes.split(',').map(s => s.trim()).filter(Boolean) }),
    });
    const json = await resp.json();
    if (resp.ok) {
      setCreatedToken(json?.data?.token || null);
      setName('');
      await load();
    }
  };

  const revoke = async (keyId: string) => {
    if (!projectId) return;
    const resp = await fetch(`/api/projects/${projectId}/api-keys/${keyId}`, { method: 'DELETE' });
    if (resp.ok) await load();
  };

  return (
    <div className="space-y-4">
      <div className="p-3 border rounded">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input className="px-3 py-2 border border-gray-300 rounded" placeholder="Token name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="px-3 py-2 border border-gray-300 rounded" placeholder="Scopes (comma-separated)" value={scopes} onChange={(e) => setScopes(e.target.value)} />
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={create} disabled={!name.trim()}>Create Token</button>
        </div>
        {createdToken && (
          <div className="mt-3 text-xs">
            <div className="font-medium text-green-700">Token created. Copy it now — it will be shown only once:</div>
            <code className="block mt-1 p-2 bg-gray-100 rounded break-all">{createdToken}</code>
          </div>
        )}
      </div>
      <div className="border rounded divide-y">
        {loading && <div className="p-3 text-sm text-gray-500">Loading…</div>}
        {!loading && list.length === 0 && <div className="p-3 text-sm text-gray-500">No tokens yet.</div>}
        {list.map((k: any) => (
          <div key={k.id} className="p-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{k.name} <span className="text-xs text-gray-500">({k.prefix}…)</span></div>
              <div className="text-xs text-gray-500">{(k.scopes || []).join(', ') || 'no scopes'} {k.expiresAt ? `· expires ${new Date(k.expiresAt).toLocaleString()}` : ''}</div>
            </div>
            <button className="text-sm text-red-600" onClick={() => revoke(k.id)}>Revoke</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function getNodeLabel(type: NodeType): string {
  switch (type) {
    case NodeType.INPUT:
      return 'Input';
    case NodeType.AGENT:
      return 'Agent';
    case NodeType.TRANSFORM:
      return 'Function';
    case NodeType.OUTPUT:
      return 'Output';
    case NodeType.CONDITION:
      return 'Condition';
    default:
      return 'Node';
  }
}

function getDefaultConfig(type: NodeType): any {
  switch (type) {
    case NodeType.INPUT:
      return {
        inputType: 'static',
        staticValue: '',
        variableName: '',
        variableDescription: '',
        schema: '',
      };
    case NodeType.AGENT:
      return {
        provider: 'googleai',
        model: 'gemini-1.5-flash',
        temperature: 0.7,
        maxTokens: 1000,
        promptType: 'static',
        systemPrompt: '',
        userPrompt: 'Process this input: {{input}}',
      };
    case NodeType.TRANSFORM:
      return {
        code: '// Transform the data\nreturn data;',
        language: 'javascript',
      };
    case NodeType.OUTPUT:
      return {
        format: 'text',
        schema: '',
      };
    case NodeType.CONDITION:
      return {
        condition: 'data.score > 0.5',
        trueLabel: 'Yes',
        falseLabel: 'No',
      };
    default:
      return {};
  }
}
