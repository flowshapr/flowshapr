'use client';

import React, { useState, useCallback, useEffect } from 'react';
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
}

function VariablesPanel({ nodes, edges }: VariablesPanelProps) {
  // Extract variables from Input nodes
  const extractVariables = (): FlowVariable[] => {
    const variables: FlowVariable[] = [];
    
    nodes.forEach(node => {
      if (node.data.type === NodeType.INPUT) {
        const config = node.data.config as InputNodeConfig;
        if (config.inputType === 'variable' && config.variableName) {
          variables.push({
            id: `${node.id}-${config.variableName}`,
            name: config.variableName,
            description: config.variableDescription,
            source: 'input',
            sourceNodeId: node.id,
            type: 'string' // Default type
          });
        }
      }
    });
    
    return variables;
  };
  
  const variables = extractVariables();
  
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
      
      {variables.length > 0 && (
        <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            SDK Usage
          </h4>
          <p className="text-xs text-blue-800 mb-2">
            Call this flow with variables:
          </p>
          <code className="text-xs bg-blue-100 p-2 rounded block font-mono text-blue-900">
            {`await flow.run({ ${variables.map(v => `${v.name}: "value"`).join(', ')} })`}
          </code>
        </div>
      )}
    </div>
  );
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
  const [isExecuting, setIsExecuting] = useState(false);
  const [activePanel, setActivePanel] = useState<'code' | 'test' | 'variables'>('code');
  const [panelWidth, setPanelWidth] = useState(384); // Default 384px (w-96)

  // Debounced code generation
  const debouncedGenerateCode = useCallback(
    debounce((nodes: FlowNode[], edges: FlowEdge[]) => {
      const result = generateCode(nodes, edges);
      setGeneratedCode(result);
    }, 300),
    []
  );

  // Generate code whenever nodes or edges change
  useEffect(() => {
    debouncedGenerateCode(nodes, edges);
  }, [nodes, edges, debouncedGenerateCode]);

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

    window.addEventListener('nodeConfigChange', handleNodeConfigChange as EventListener);
    return () => {
      window.removeEventListener('nodeConfigChange', handleNodeConfigChange as EventListener);
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
      const response = await fetch('/api/genkit/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flowCode: generatedCode.code,
          input,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        traces: [],
      };
    } finally {
      setIsExecuting(false);
    }
  }, [generatedCode.code]);

  const handleClearFlow = useCallback(() => {
    setNodes([]);
    setEdges([]);
  }, []);

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

  // Show different views based on activeView
  if (activeView !== 'flows') {
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

        <div className="text-sm text-gray-600">
          {selectedFlow?.name} - Flow Builder
        </div>
      </div>
      
      {/* Main Flow Builder Area */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onAddNode={handleAddNode} />
        
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex">
            <div className="flex-1 min-w-0">
              <FlowCanvasWrapper
                nodes={nodes}
                edges={edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                onAddNode={handleAddNode}
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
              
              <div className="flex-1 overflow-hidden">
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

function getNodeLabel(type: NodeType): string {
  switch (type) {
    case NodeType.INPUT:
      return 'Input';
    case NodeType.MODEL:
      return 'Model';
    case NodeType.PROMPT:
      return 'Prompt';
    case NodeType.TRANSFORM:
      return 'Transform';
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
    case NodeType.MODEL:
      return {
        provider: 'googleai',
        model: 'gemini-1.5-flash',
        temperature: 0.7,
        maxOutputTokens: 1000,
      };
    case NodeType.PROMPT:
      return {
        template: 'Process this input: {{input}}',
        variables: ['input'],
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