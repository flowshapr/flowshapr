'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { FlowCanvasWrapper } from '@/features/flow-builder/components/FlowCanvas';
import { Sidebar } from '@/features/flow-builder/components/Sidebar';
import { VariablesPanel } from '@/features/flow-builder/components/VariablesPanel';
import { SettingsPanel } from '@/features/flow-builder/components/SettingsPanel';
import { SDKPanel } from '@/features/flow-builder/components/SDKPanel';
import { CodeEditor } from '@/features/code-preview/components/CodeEditor';
import { TestPanel } from '@/features/testing/views/TestPanel';
import { ConsolePanel, type ConsoleEntry } from '@/features/flow-builder/views/ConsolePanel';
import { FlowNode, FlowEdge, NodeType, GeneratedCode, ExecutionResult, InputNodeConfig, FlowVariable } from '@/types/flow';
import { generateCode } from '@/lib/code-generator';
import { generateId, debounce } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getDefaultConfig, getNodeLabel } from '@/features/flow-builder/blocks/registry';
import { Save, FolderOpen, Rocket } from 'lucide-react';
import { SidebarList, SidebarListHeader, SidebarListItem } from '@/components/ui/SidebarList';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useConnectionStore } from '@/stores';

interface Flow {
  id: string;
  name: string;
  slug: string;
  description?: string;
  organizationId: string;
  memberRole: string;
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

// VariablesPanel moved to features/components

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
  // Initialize analytics with user context
  const analytics = useAnalytics({
    userId: session?.user?.id,
    organizationId: selectedFlow?.organizationId,
  });

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
  const [activePanel, setActivePanel] = useState<'code' | 'test' | 'variables' | 'console' | 'sdk'>('code');
  const [panelWidth, setPanelWidth] = useState(384); // Default 384px (w-96)
  const [apiKeys, setApiKeys] = useState<{ googleai?: string; openai?: string; anthropic?: string }>({});
  
  // Use Zustand store for connections
  const { loadConnections, clearConnections, connections } = useConnectionStore();
  
  const [prompts, setPrompts] = useState<any[]>([]);
  const [flowLoading, setFlowLoading] = useState(false);
  const flowVersionRef = React.useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);

  // Note: Blocks are now loaded by Sidebar component from server API

  const pushConsole = useCallback((entry: Omit<ConsoleEntry, 'id' | 'time'> & { time?: Date }) => {
    setConsoleEntries((prev) => [
      { id: `${Date.now()}_${Math.random().toString(36).slice(2,8)}`, time: entry.time || new Date(), level: entry.level, message: entry.message, details: entry.details },
      ...prev,
    ].slice(0, 200));
  }, []);
  
  // Autosave state
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Autosave function
  const autosaveFlow = useCallback(async (nodes: FlowNode[], edges: FlowEdge[], version?: number) => {
    if (!selectedFlow || nodes.length === 0) return;
    if (flowLoading) return;
    if (version !== undefined && version !== flowVersionRef.current) return;

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
  }, [selectedFlow, viewport, startNodeId, apiKeys, flowLoading]);

  // Debounced autosave
  const debouncedAutosave = useCallback(
    debounce((nodes: FlowNode[], edges: FlowEdge[], version: number) => {
      autosaveFlow(nodes, edges, version);
    }, 2000),
    [autosaveFlow]
  );

  // Debounced code generation (now async)
  const debouncedGenerateCode = useCallback(
    debounce(async (nodes: FlowNode[], edges: FlowEdge[], startId: string | null) => {
      const nodesWithStart = nodes.map(n => ({ ...n, data: { ...n.data, isStart: n.id === startId } })) as FlowNode[];
      try {
        const result = await generateCode(nodesWithStart, edges);
        setGeneratedCode(result);
      } catch (error) {
        console.error('Code generation failed:', error);
        setGeneratedCode({
          code: '',
          isValid: false,
          errors: [{
            message: `Code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'error' as const
          }]
        });
      }
    }, 300),
    []
  );

  // Generate code whenever nodes or edges change
  useEffect(() => {
    if (isDragging || flowLoading) return;
    debouncedGenerateCode(nodes, edges, startNodeId);
  }, [nodes, edges, startNodeId, debouncedGenerateCode, isDragging, flowLoading]);

  // Autosave whenever nodes or edges change
  useEffect(() => {
    if (isDragging || flowLoading) return;
    if (nodes.length > 0 || edges.length > 0) {
      debouncedAutosave(nodes, edges, flowVersionRef.current);
    }
  }, [nodes, edges, debouncedAutosave, isDragging, flowLoading]);

  // Load flow from backend when selectedFlow changes; fallback to localStorage
  useEffect(() => {
    const load = async () => {
      if (!selectedFlow) {
        clearConnections();
        return;
      }
      
      // Prevent duplicate loading - check if already loading
      if (flowLoading) {
        console.log('🔄 Flow already loading, skipping duplicate request');
        return;
      }
      
      setFlowLoading(true);
      flowVersionRef.current += 1;
      
      // Clear connections and prompts to avoid cross-flow bleed
      clearConnections();
      try {
        (window as any).__prompts = [];
        window.dispatchEvent(new CustomEvent('promptsChange', { detail: [] }));
      } catch {}
      
      // Try to load flow from API first
      try {
        const resp = await fetch(`/api/flows/${selectedFlow.id}`, { cache: 'no-store' });
        if (resp.ok) {
          const json = await resp.json();
          const flow = json?.data;
          if (flow?.nodes && flow?.edges) {
            setNodes(flow.nodes);
            setEdges(flow.edges);
            if (flow.metadata?.startNodeId) setStartNodeId(flow.metadata.startNodeId);
            if (flow.metadata?.viewport && typeof flow.metadata.viewport.zoom === 'number') {
              setViewport({ x: flow.metadata.viewport.x || 0, y: flow.metadata.viewport.y || 0, zoom: flow.metadata.viewport.zoom });
            }
            if (flow.metadata?.apiKeys) setApiKeys(flow.metadata.apiKeys);
            
            setFlowLoading(false);
            // Load connections using Zustand store
            await loadConnections(selectedFlow.id);
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to load flow from backend, falling back to localStorage');
      }
      
      // Fallback to localStorage
      try {
        const storageKey = `flow_${selectedFlow.id}`;
        const savedFlow = localStorage.getItem(storageKey);
        if (savedFlow) {
          const flowData = JSON.parse(savedFlow);
          if (flowData.nodes && flowData.edges) {
            setNodes(flowData.nodes);
            setEdges(flowData.edges);
            setLastSaved(new Date(flowData.savedAt || flowData.metadata?.lastModified));
            if (flowData.metadata?.startNodeId) setStartNodeId(flowData.metadata.startNodeId);
            const vp = flowData.metadata?.viewport || flowData.viewport;
            if (vp && typeof vp.zoom === 'number') setViewport({ x: vp.x || 0, y: vp.y || 0, zoom: vp.zoom });
            if (flowData.metadata?.apiKeys) setApiKeys(flowData.metadata.apiKeys);
          }
        }
      } catch (err) {
        console.error('Failed to load flow state:', err);
      }
      
      setFlowLoading(false);
      // Load connections using Zustand store - only call once at the end
      try {
        await loadConnections(selectedFlow.id);
      } catch (err) {
        console.error('Failed to load connections:', err);
      }
    };
    
    // Clear current graph before loading new one
    setNodes([]);
    setEdges([]);
    load();
  }, [selectedFlow?.id, loadConnections, clearConnections]);

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
      
      // Find the node being deleted to get its type
      const nodeToDelete = nodes.find(n => n.id === nodeId);
      
      setNodes(prev => prev.filter(n => n.id !== nodeId));
      setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));

      // Track node deletion
      if (nodeToDelete) {
        analytics.trackNode('delete', nodeToDelete.data?.type || 'unknown', nodeId);
      }
    };

    const handleNodeSetStart = (event: CustomEvent) => {
      const { nodeId } = event.detail || {};
      if (nodeId) setStartNodeId(nodeId);
    };

    const handleConsoleLog = (event: CustomEvent) => {
      const detail: any = event.detail || {};
      if (!detail || !detail.message) return;
      pushConsole({ level: detail.level || 'info', message: detail.message, details: detail.details });
    };

    const handleNavigate = (event: CustomEvent) => {
      const detail: any = event.detail || {};
      if (detail?.view === 'connections') {
        setActivePanel('variables');
        // Optionally switch sidebar/active view if you expand views beyond current tabs
      }
    };

    window.addEventListener('nodeConfigChange', handleNodeConfigChange as EventListener);
    window.addEventListener('nodeSetStart', handleNodeSetStart as EventListener);
    window.addEventListener('nodeDelete', handleNodeDelete as EventListener);
    window.addEventListener('consoleLog', handleConsoleLog as EventListener);
    window.addEventListener('navigate', handleNavigate as EventListener);
    return () => {
      window.removeEventListener('nodeConfigChange', handleNodeConfigChange as EventListener);
      window.removeEventListener('nodeSetStart', handleNodeSetStart as EventListener);
      window.removeEventListener('nodeDelete', handleNodeDelete as EventListener);
      window.removeEventListener('consoleLog', handleConsoleLog as EventListener);
      window.removeEventListener('navigate', handleNavigate as EventListener);
    };
  }, [pushConsole, nodes, analytics]);

  const handleNodesChange = useCallback((newNodes: FlowNode[]) => {
    setNodes(newNodes);
  }, []);

  const handleEdgesChange = useCallback((newEdges: FlowEdge[]) => {
    setEdges(newEdges);
  }, []);

  const handleAddNode = useCallback((type: string, position?: { x: number; y: number }) => {
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

    // Track node addition
    analytics.trackNodeAdd(type, position);
  }, [nodes.length, analytics]);

  const handleExecuteFlow = useCallback(async (input: any): Promise<ExecutionResult> => {
    setIsExecuting(true);
    const startTime = analytics.trackExecutionStart(selectedFlow?.id || 'unknown');
    
    try {
      if (!selectedFlow) throw new Error('No flow selected');
      const body = {
        input,
        nodes,
        edges,
        metadata: { startNodeId, viewport },
        connections,
      };
      let resp = await fetch(`/api/flows/${selectedFlow.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      let json: any = null;
      try { json = await resp.json(); } catch { /* fall back */ }
      if (!resp.ok && resp.status === 401) {
        // Fallback: call backend directly with credentials (browser will send cookies)
        const backendUrl = (process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');
        resp = await fetch(`${backendUrl}/api/flows/${selectedFlow.id}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          credentials: 'include',
          mode: 'cors',
        });
        try { json = await resp.json(); } catch { /* ignore */ }
      }
      if (!resp.ok) {
        const msg = json?.error?.message || json?.message || `Execution failed (${resp.status})`;
        pushConsole({ level: 'error', message: `Execution error: ${msg}`, details: json });
        throw new Error(msg);
      }
      pushConsole({ level: 'info', message: 'Execution completed successfully' });
      const result = (json || { success: false, error: 'Empty response', traces: [] }) as ExecutionResult;
      
      // Track successful execution
      analytics.trackExecutionEnd(selectedFlow.id, startTime, result.success);
      
      return result;
    } catch (error) {
      const message = (error as Error).message;
      pushConsole({ level: 'error', message: `Execution failed: ${message}` });
      
      // Track failed execution
      analytics.trackExecutionEnd(selectedFlow?.id || 'unknown', startTime, false);
      analytics.trackAppError(message, 'FlowExecution', 'high');
      
      return { success: false, error: message, traces: [] };
    } finally {
      setIsExecuting(false);
    }
  }, [nodes, edges, startNodeId, viewport, connections, selectedFlow, analytics]);

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

  const handlePanelChange = useCallback((panel: 'code' | 'test' | 'variables' | 'console' | 'sdk') => {
    setActivePanel(panel);
    analytics.trackFeatureUsage(`panel_${panel}`);
  }, [analytics]);

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

    // Track flow save/export
    analytics.trackFlow('save', selectedFlow?.id, { 
      node_count: nodes.length, 
      edge_count: edges.length,
      export_format: 'json'
    });
  }, [nodes, edges, session, selectedFlow, analytics]);

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
    // projectId deprecated; flows are top-level containers
    window.dispatchEvent(new CustomEvent('apiKeysChange', { detail: apiKeys }));
  }, [computedVars, apiKeys]);

  useEffect(() => {
    (window as any).__apiKeys = apiKeys;
    window.dispatchEvent(new CustomEvent('apiKeysChange', { detail: apiKeys }));
  }, [apiKeys]);

  // Connections are now managed by Zustand store - no window globals needed

  // Load prompts for flow (via flow-scoped API) and expose globally
  useEffect(() => {
    const loadPrompts = async () => {
      const fid = selectedFlow?.id;
      if (!fid) return;
      
      // Prevent duplicate loading during flow loading
      if (flowLoading) {
        console.log('📦 Skipping prompts load during flow loading');
        return;
      }
      
      try {
        console.log('🔄 Loading prompts for flow:', fid);
        const resp = await fetch(`/api/flows/${fid}/prompts`, { cache: 'no-store' });
        const json = await resp.json();
        const arr = json?.data || [];
        setPrompts(arr);
        (window as any).__prompts = arr;
        window.dispatchEvent(new CustomEvent('promptsChange', { detail: arr }));
        console.log('✅ Loaded prompts:', arr.length);
      } catch (err) {
        console.error('❌ Failed to load prompts:', err);
      }
    };
    loadPrompts();
  }, [selectedFlow?.id, flowLoading]); // Add flowLoading as dependency

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
    if (activeView === 'settings') {
      return <SettingsPanel selectedFlow={selectedFlow} />;
    }
    if (activeView === 'traces') {
      return <TracesPanel flowId={selectedFlow?.id || ''} />;
    }
    if (activeView === 'prompts') {
      return <PromptsPanel flowId={selectedFlow?.id || ''} />;
    }
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-base-content mb-2">
            {activeView?.charAt(0).toUpperCase()}{activeView?.slice(1)} View
          </h2>
          <p className="text-base-content/70">
            This view is coming soon. Currently showing the flow builder.
          </p>
        </div>
      </div>
    );
  }

  if (activeView === 'flows' && flowLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-base-content/70">
          <div className="w-6 h-6 border-2 border border-t-blue-500 rounded-full animate-spin" />
          <div className="text-sm">Loading flow…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Flow Builder Toolbar */}
      <div className="h-12 bg-base-100 border-b border flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={async () => {
              if (!selectedFlow) return;
              try {
                const resp = await fetch(`/api/flows/${selectedFlow.id}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
                if (!resp.ok) throw new Error('Deploy failed');
              } catch (e) {
                console.error('Deploy failed', e);
              }
            }}
            size="sm"
            className="gap-2"
          >
            <Rocket className="w-4 h-4" />
            Deploy
          </Button>
          <Button onClick={handleSaveFlow} variant="ghost" size="icon" title="Save">
            <Save className="w-4 h-4" />
          </Button>
          <Button onClick={handleLoadFlow} variant="ghost" size="icon" title="Load">
            <FolderOpen className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {autosaveStatus === 'saving' && (
            <>
              <div className="w-3 h-3 border border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="text-primary">Saving...</span>
            </>
          )}
          {autosaveStatus === 'saved' && (
            <>
              <div className="w-3 h-3 bg-success rounded-full"></div>
              <span className="text-success">Saved</span>
            </>
          )}
          {autosaveStatus === 'error' && (
            <>
              <div className="w-3 h-3 bg-error rounded-full"></div>
              <span className="text-error">Save failed</span>
            </>
          )}
          {autosaveStatus === 'idle' && lastSaved && (
            <span className="text-base-content/60">Last saved {formatTimeAgo(lastSaved)}</span>
          )}
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
            onDraggingChange={setIsDragging}
          />
            </div>
            
            <div 
              className="flex flex-col border-l border relative"
              style={{ width: `${panelWidth}px`, minWidth: '300px', maxWidth: '600px' }}
            >
              {/* Resize Handle */}
              <div
                className="absolute left-0 top-0 h-full w-1 bg-gray-300 hover:bg-primary cursor-col-resize transition-colors"
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
              <div className="pl-2 flex flex-col h-full"> {/* Add padding to account for resize handle */}
            <div role="tablist" className="tabs tabs-bordered">
              <button
                role="tab"
                onClick={() => handlePanelChange('code')}
                className={`tab text-sm font-medium ${
                  activePanel === 'code' ? 'tab-active' : ''
                }`}
              >
                Code
              </button>
              <button
                role="tab"
                onClick={() => handlePanelChange('test')}
                className={`tab text-sm font-medium ${
                  activePanel === 'test' ? 'tab-active' : ''
                }`}
              >
                Test
              </button>
              <button
                role="tab"
                onClick={() => handlePanelChange('variables')}
                className={`tab text-sm font-medium ${
                  activePanel === 'variables' ? 'tab-active' : ''
                }`}
              >
                Variables
              </button>
              <button
                role="tab"
                onClick={() => handlePanelChange('console')}
                className={`tab text-sm font-medium ${
                  activePanel === 'console' ? 'tab-active' : ''
                }`}
              >
                Console
              </button>
              <button
                role="tab"
                onClick={() => handlePanelChange('sdk')}
                className={`tab text-sm font-medium ${
                  activePanel === 'sdk' ? 'tab-active' : ''
                }`}
              >
                SDK
              </button>
            </div>
              
              <div className="flex-1 overflow-hidden h-full">
                {activePanel === 'code' && (
                  <CodeEditor
                    code={generatedCode.code}
                    errors={generatedCode.errors
                      .filter(err => err.severity !== 'info')
                      .map(err => ({
                        message: err.message,
                        line: err.field ? undefined : undefined,
                        column: undefined,
                        severity: err.severity as 'error' | 'warning'
                      }))}
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
                {activePanel === 'console' && (
                  <ConsolePanel
                    entries={consoleEntries}
                    onClear={() => setConsoleEntries([])}
                  />
                )}
                {activePanel === 'sdk' && (
                  <SDKPanel
                    flow={selectedFlow}
                    nodes={nodes}
                    edges={edges}
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

function TracesPanel({ flowId }: { flowId: string }) {
  const [list, setList] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!flowId) return;
    setLoading(true);
    try {
      const resp = await fetch(`/api/flows/${flowId}/traces`, { cache: 'no-store' });
      const json = await resp.json();
      setList((json?.data || []).reverse());
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [flowId]);

  const open = async (execId: string) => {
    const resp = await fetch(`/api/flows/${flowId}/traces/${execId}`);
    const json = await resp.json();
    setSelected(json?.data || null);
    setSelectedNodeIndex(0);
  };

  const nodeTraces = (selected?.nodeTraces || []) as any[];
  const selectedNode = nodeTraces[selectedNodeIndex];

  return (
    <div className="flex-1 h-full flex">
      {/* Left column: executions table */}
      <div className="w-[320px] border-r border flex flex-col">
        <div className="h-12 flex items-center justify-between px-3 border-b">
          <div className="text-sm font-medium">Executions</div>
          <button className="text-xs text-primary" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
        </div>
        <SidebarList
          items={list.map((t: any): SidebarListItem => ({
            id: t.executionId,
            title: `${t.status.charAt(0).toUpperCase() + t.status.slice(1)} • ${t.duration}ms`,
            subtitle: new Date(t.createdAt).toLocaleString(),
            onClick: () => open(t.executionId)
          }))}
          selectedId={selected?.executionId}
          emptyMessage="No traces yet."
        />
      </div>

      {/* Right column: trace tree + details */}
      <div className="flex-1 grid grid-cols-12 h-full">
        {/* Tree */}
        <div className="col-span-5 border-r border flex flex-col">
          <div className="h-12 flex items-center px-3 border-b text-sm font-medium">Trace Tree</div>
          <div className="flex-1 overflow-auto p-3">
            {!selected && <div className="text-sm text-base-content/60">Select an execution to view the trace</div>}
            {selected && (
              <ol className="space-y-2">
                {nodeTraces.map((nt, i) => (
                  <li key={i}>
                    <button
                      className={`w-full text-left px-3 py-2 rounded border ${i === selectedNodeIndex ? 'bg-primary/10 border-primary/30' : 'bg-base-200 border-transparent hover:bg-base-100'}`}
                      onClick={() => setSelectedNodeIndex(i)}
                    >
                      <div className="text-xs font-medium">{nt.nodeTitle || nt.nodeId}</div>
                      <div className="text-[11px] text-base-content/60">{nt.nodeType} · {nt.duration}ms</div>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
        {/* Details */}
        <div className="col-span-7 flex flex-col">
          <div className="h-12 flex items-center justify-between px-3 border-b">
            <div className="text-sm font-medium">Trace Details</div>
            {selected && <div className="text-xs text-base-content/60">{selected.status} · {selected.duration}ms · {new Date(selected.createdAt).toLocaleString?.() || ''}</div>}
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-3">
            {!selected && <div className="text-sm text-base-content/60">Select an execution to see details</div>}
            {selected && (
              <>
                <div>
                  <label className="block text-xs font-medium text-base-content/70 mb-1">Execution Input</label>
                  <pre className="text-xs bg-base-200 p-2 rounded border overflow-x-auto">{JSON.stringify(selected.input, null, 2)}</pre>
                </div>
                <div>
                  <label className="block text-xs font-medium text-base-content/70 mb-1">Execution Output</label>
                  <pre className="text-xs bg-base-200 p-2 rounded border overflow-x-auto">{JSON.stringify(selected.output, null, 2)}</pre>
                </div>
                {selectedNode && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Node: {selectedNode.nodeTitle || selectedNode.nodeId}</div>
                    <div>
                      <div className="text-[11px] text-base-content/70">Node Input</div>
                      <pre className="text-[11px] bg-base-100 p-2 rounded border overflow-x-auto">{JSON.stringify(selectedNode.input, null, 2)}</pre>
                    </div>
                    <div>
                      <div className="text-[11px] text-base-content/70">Node Output</div>
                      <pre className="text-[11px] bg-base-100 p-2 rounded border overflow-x-auto">{JSON.stringify(selectedNode.output, null, 2)}</pre>
                    </div>
                    {selectedNode.error && <div className="text-[11px] text-error">{selectedNode.error}</div>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PromptsPanel({ flowId }: { flowId: string }) {
  const [list, setList] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<{ name: string; description?: string; variables: string; template: string }>({ name: '', description: '', variables: '', template: '' });

  const load = async () => {
    if (!flowId) return;
    setLoading(true);
    try {
      const resp = await fetch(`/api/flows/${flowId}/prompts`, { cache: 'no-store' });
      const json = await resp.json();
      const items = json?.data || [];
      setList(items);
      try {
        (window as any).__prompts = items;
        window.dispatchEvent(new CustomEvent('promptsChange', { detail: items }));
      } catch {}
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [flowId]);

  const resetForm = () => setForm({ name: '', description: '', variables: '', template: '' });

  const select = (p: any) => {
    setSelected(p);
    setForm({ name: p.name, description: p.description || '', variables: (p.variables || []).join(', '), template: p.template || '' });
  };

  const save = async () => {
    if (!flowId) return;
    const payload = { name: form.name.trim(), description: form.description?.trim() || '', variables: form.variables.split(',').map(s => s.trim()).filter(Boolean), template: form.template };
    if (selected) {
      const resp = await fetch(`/api/flows/${flowId}/prompts/${selected.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await resp.json();
      if (resp.ok) { await load(); select(json.data); }
    } else {
      const resp = await fetch(`/api/flows/${flowId}/prompts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await resp.json();
      if (resp.ok) { await load(); select(json.data); }
    }
  };

  const del = async () => {
    if (!flowId || !selected) return;
    const resp = await fetch(`/api/flows/${flowId}/prompts/${selected.id}`, { method: 'DELETE' });
    if (resp.ok) { setSelected(null); resetForm(); await load(); }
  };

  const exportPrompt = async () => {
    if (!flowId || !selected) return;
    const resp = await fetch(`/api/flows/${flowId}/prompts/${selected.id}/export`);
    const text = await resp.text();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${selected.name}.prompt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="flex-1 h-full flex">
      <div className="w-[320px] border-r border flex flex-col">
        <div className="h-12 flex items-center justify-between px-3 border-b">
          <div className="text-sm font-medium">Prompts</div>
          <button className="text-xs text-primary" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
        </div>
        <SidebarList
          items={list.map((p: any): SidebarListItem => ({
            id: p.id,
            title: p.name,
            subtitle: p.description || 'No description',
            onClick: () => select(p)
          }))}
          selectedId={selected?.id}
          emptyMessage="No prompts yet."
          headerAction={
            <SidebarListHeader 
              onClick={() => { setSelected(null); resetForm(); }} 
              label="New Prompt" 
            />
          }
        />
      </div>
      <div className="flex-1 flex flex-col">
        <div className="h-12 flex items-center justify-between px-3 border-b">
          <div className="text-sm font-medium">{selected ? 'Edit Prompt' : 'New Prompt'}</div>
          <div className="flex items-center gap-2">
            {selected && <button className="text-sm text-error" onClick={del}>Delete</button>}
            {selected && <button className="text-sm text-base-content/70" onClick={exportPrompt}>Export .prompt</button>}
            <button className="btn btn-primary btn-sm" onClick={save}>Save</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-base-content/70 mb-1">Name</label>
            <input className="input input-bordered w-full" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-base-content/70 mb-1">Description</label>
            <input className="input input-bordered w-full" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-base-content/70 mb-1">Variables (comma-separated)</label>
            <input className="input input-bordered w-full" value={form.variables} onChange={e => setForm({ ...form, variables: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-base-content/70 mb-1">Template</label>
            <textarea className="textarea textarea-bordered w-full h-[300px] font-mono" value={form.template} onChange={e => setForm({ ...form, template: e.target.value })} />
          </div>
        </div>
      </div>
    </div>
  );
}
