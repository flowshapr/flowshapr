import React, { useEffect, useRef, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { 
  FlowNodeData, 
  NodeType, 
  InputNodeConfig, 
  AgentNodeConfig, 
  PromptNodeConfig, 
  TransformNodeConfig, 
  OutputNodeConfig, 
  ConditionNodeConfig,
  MODEL_PROVIDERS,
  AVAILABLE_MODELS,
  MODEL_DISPLAY_NAMES,
  DEFAULT_MODEL_PARAMS,
  ProviderStatus
} from '@/types/flow';
// Using native form elements for cleaner styling inside nodes
import { 
  FileText, 
  Brain, 
  MessageSquare, 
  Code, 
  Download, 
  GitBranch,
  Settings,
  Trash2
} from 'lucide-react';

function getAvailableVariables(): Array<{ name: string; source: string }> {
  const store = (window as any).__flowVars;
  const vars = (store?.all || []) as Array<{ name: string; source: string }>;
  return vars;
}

function InsertVarButton({ onInsert, variant = 'prompt' }: { onInsert: (token: string) => void; variant?: 'prompt' | 'code' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const makeToken = (name: string) => (variant === 'prompt' ? `{{ ${name} }}` : `ctx.${name}`);
  const vars = getAvailableVariables();

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div ref={ref} className="relative inline-block" onMouseDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="p-1 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded"
        aria-label="Insert variable"
        title="Insert variable"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {/* simple braces icon */}
        <span className="inline-block font-mono text-xs">{`{ }`}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-40 max-h-56 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg z-20">
          {vars.length === 0 ? (
            <div className="px-2 py-1 text-xs text-gray-500">No variables</div>
          ) : (
            vars.map((v) => (
              <button
                key={`${v.source}-${v.name}`}
                type="button"
                className="w-full text-left px-2 py-1 text-xs hover:bg-gray-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onInsert(makeToken(v.name));
                  setOpen(false);
                }}
              >
                {v.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const nodeStyles = {
  base: 'px-4 py-3 rounded-lg border-2 bg-white text-gray-900 min-w-[200px] shadow-lg !outline-none',
  input: 'border-blue-400 bg-blue-50',
  model: 'border-green-400 bg-green-50', 
  agent: 'border-green-400 bg-green-50',
  prompt: 'border-purple-400 bg-purple-50',
  transform: 'border-orange-400 bg-orange-50',
  output: 'border-red-400 bg-red-50',
  condition: 'border-yellow-400 bg-yellow-50',
};

const nodeIcons = {
  [NodeType.INPUT]: FileText,
  [NodeType.AGENT]: Brain,
  [NodeType.TRANSFORM]: Code,
  [NodeType.OUTPUT]: Download,
  [NodeType.CONDITION]: GitBranch,
};

interface BaseNodeProps {
  id: string;
  data: FlowNodeData;
  selected?: boolean;
  onConfigChange?: (nodeId: string, config: any) => void;
}

function BaseNode({ 
  id,
  data, 
  selected, 
  onConfigChange, 
  children, 
  showSourceHandle = true,
  showTargetHandle = true 
}: BaseNodeProps & { 
  children: React.ReactNode;
  showSourceHandle?: boolean;
  showTargetHandle?: boolean;
}) {
  const Icon = nodeIcons[data.type];
  const styleKey = data.type as keyof typeof nodeStyles;
  const isStart = (data as any)?.isStart === true;
  
  return (
    <div 
      className={`flow-node ${nodeStyles.base} ${nodeStyles[styleKey]} ${selected ? '!border-blue-500' : ''}`}
      style={{
        border: selected ? '2px solid rgb(59 130 246)' : undefined,
        outline: 'none',
        boxShadow: selected ? 'none' : undefined
      }}
    >
      {showTargetHandle && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-7 h-7 !bg-gray-600 !border-2 !border-white rounded-full !z-10"
        />
      )}
      
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-gray-600" />
          <div className="font-semibold text-sm text-gray-800">{data.label}</div>
        </div>
        <div className="flex items-center gap-2">
          {isStart ? (
            <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 border border-green-200" title="Start node">Start</span>
          ) : (
            <button
              type="button"
              aria-label="Set as start"
              title="Set as start"
              className="text-xs text-gray-500 hover:text-green-700 hover:underline"
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('nodeSetStart', { detail: { nodeId: id } }));
              }}
            >
              Set start
            </button>
          )}
          <button
            type="button"
            aria-label="Delete node"
            title="Delete node"
            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('nodeDelete', { detail: { nodeId: id } }));
            }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {children}
      
      {showSourceHandle && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-7 h-7 !bg-gray-600 !border-2 !border-white rounded-full !z-10"
        />
      )}
    </div>
  );
}

export function InputNode({ data, selected, id }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const config = nodeData.config as InputNodeConfig;
  
  const handleConfigChange = (field: string, value: any) => {
    // Update the node's config by directly modifying the data
    // React Flow will handle the re-render automatically
    const newConfig = { ...config, [field]: value };
    nodeData.config = newConfig;
    
    // Force a re-render by triggering a state change
    // We'll dispatch a custom event that the parent can listen to
    window.dispatchEvent(new CustomEvent('nodeConfigChange', {
      detail: { nodeId: id, field, value, config: newConfig }
    }));
  };
  
  const inputType = config.inputType || 'static';
  
  return (
    <BaseNode id={id} data={nodeData} selected={selected} showTargetHandle={false}>
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Input Type
          </label>
          <select
            value={inputType}
            onChange={(e) => handleConfigChange('inputType', e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-blue-300 focus:outline-none"
          >
            <option value="static">Static Value</option>
            <option value="variable">Variable</option>
          </select>
        </div>
        
        {inputType === 'static' ? (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Value
            </label>
            <input
              type="text"
              value={config.staticValue || config.defaultValue || ''}
              onChange={(e) => handleConfigChange('staticValue', e.target.value)}
              placeholder="Enter static value..."
              className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-blue-300 focus:outline-none"
            />
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Variable Name
              </label>
              <input
                type="text"
                value={config.variableName || ''}
                onChange={(e) => handleConfigChange('variableName', e.target.value)}
                placeholder="e.g. userInput, apiKey..."
                className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-blue-300 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                value={config.variableDescription || ''}
                onChange={(e) => handleConfigChange('variableDescription', e.target.value)}
                placeholder="Describe this variable..."
                className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-blue-300 focus:outline-none"
              />
            </div>
          </>
        )}
        
        {/* Show visual indicator for variable inputs */}
        {inputType === 'variable' && config.variableName && (
          <div className="flex items-center gap-1 mt-1">
            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
            <span className="text-xs text-blue-600 font-mono">
              ${config.variableName}
            </span>
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export function AgentNode({ data, selected, id }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const config = nodeData.config as AgentNodeConfig;
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [providerStatus, setProviderStatus] = React.useState<ProviderStatus[]>([
    { provider: 'googleai', isActive: true, hasApiKey: false },
    { provider: 'openai', isActive: true, hasApiKey: false }, 
    { provider: 'anthropic', isActive: true, hasApiKey: false }
  ]);
  const [connections, setConnections] = React.useState<Array<{ id: string; name: string; provider: string }>>([]);
  const [prompts, setPrompts] = React.useState<Array<{ id: string; name: string; template?: string }>>([]);

  React.useEffect(() => {
    const conns = ((window as any).__connections || []) as Array<{ id: string; name: string; provider: string }>;
    setConnections(conns.map(c => ({ id: c.id, name: c.name, provider: c.provider })));
    const status: ProviderStatus[] = [
      { provider: 'googleai', isActive: true, hasApiKey: conns.some(c => c.provider === 'googleai') },
      { provider: 'openai', isActive: true, hasApiKey: conns.some(c => c.provider === 'openai') },
      { provider: 'anthropic', isActive: true, hasApiKey: conns.some(c => c.provider === 'anthropic') },
    ];
    setProviderStatus(status);
    const handler = (e: any) => {
      const list = e?.detail || (window as any).__connections || [];
      setConnections(list.map((c: any) => ({ id: c.id, name: c.name, provider: c.provider })));
      setProviderStatus([
        { provider: 'googleai', isActive: true, hasApiKey: list.some((c: any) => c.provider === 'googleai') },
        { provider: 'openai', isActive: true, hasApiKey: list.some((c: any) => c.provider === 'openai') },
        { provider: 'anthropic', isActive: true, hasApiKey: list.some((c: any) => c.provider === 'anthropic') },
      ]);
    };
    window.addEventListener('connectionsChange', handler as EventListener);
    const ph = (ev: any) => {
      const arr = ev?.detail || (window as any).__prompts || [];
      setPrompts(arr.map((p: any) => ({ id: p.id, name: p.name, template: p.template })));
    };
    try {
      const arr = (window as any).__prompts || [];
      setPrompts(arr.map((p: any) => ({ id: p.id, name: p.name, template: p.template })));
    } catch {}
    window.addEventListener('promptsChange', ph as EventListener);
    return () => {
      window.removeEventListener('connectionsChange', handler as EventListener);
      window.removeEventListener('promptsChange', ph as EventListener);
    };
  }, []);
  
  const handleConfigChange = (field: string, value: any) => {
    const newConfig = { ...config, [field]: value };
    nodeData.config = newConfig;
    
    // Apply provider defaults when provider changes
    if (field === 'provider') {
      const defaults = DEFAULT_MODEL_PARAMS[value as keyof typeof DEFAULT_MODEL_PARAMS];
      Object.assign(newConfig, defaults);
      // Set default model for provider
      newConfig.model = AVAILABLE_MODELS[value as keyof typeof AVAILABLE_MODELS][0];
    }
    
    window.dispatchEvent(new CustomEvent('nodeConfigChange', {
      detail: { nodeId: id, field, value, config: newConfig }
    }));
  };
  
  const selectedProvider = config.provider || 'googleai';
  const selectedProviderStatus = providerStatus.find(p => p.provider === selectedProvider);
  const availableModels = AVAILABLE_MODELS[selectedProvider] || [];
  
  const promptType = config.promptType || 'static';
  
  return (
    <BaseNode id={id} data={nodeData} selected={selected}>
      <div className="space-y-2">
        {/* Provider Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Provider
          </label>
          <div className="relative">
            <select
              value={selectedProvider}
              onChange={(e) => handleConfigChange('provider', e.target.value)}
              className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-green-300 focus:outline-none pr-6"
            >
              {Object.entries(MODEL_PROVIDERS).map(([key, name]) => {
                const status = providerStatus.find(p => p.provider === key);
                return (
                  <option key={key} value={key} disabled={!status?.hasApiKey}>
                    {name} {status?.hasApiKey ? '' : '(API Key Missing)'}
                  </option>
                );
              })}
            </select>
            <div className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-2 h-2 rounded-full ${
              selectedProviderStatus?.isActive ? 'bg-green-400' : 'bg-gray-400'
            }`} />
          </div>
        </div>
        
        {/* Connection Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Connection
          </label>
          <select
            value={(config as any).connectionId || ''}
            onChange={(e) => handleConfigChange('connectionId', e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-green-300 focus:outline-none"
          >
            <option value="" disabled>
              {connections.filter(c => c.provider === selectedProvider).length ? 'Select a connection' : 'No connections for provider'}
            </option>
            {connections.filter(c => c.provider === selectedProvider).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Model Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Model
          </label>
          <select
            value={config.model || availableModels[0]}
            onChange={(e) => handleConfigChange('model', e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-green-300 focus:outline-none"
          >
            {availableModels.map(model => (
              <option key={model} value={model}>
                {MODEL_DISPLAY_NAMES[model] || model}
              </option>
            ))}
          </select>
        </div>
        
        {/* Prompt Configuration */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Prompt Source
          </label>
          <select
            value={promptType}
            onChange={(e) => handleConfigChange('promptType', e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-green-300 focus:outline-none"
          >
            <option value="static">Static Prompts</option>
            <option value="library">Prompt Library</option>
          </select>
        </div>
        
        {promptType === 'static' ? (
          <div className="space-y-2">
            <div>
          <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center justify-between">
            <span>System Prompt</span>
            <InsertVarButton
              variant="prompt"
              onInsert={(token) => handleConfigChange('systemPrompt', `${config.systemPrompt || ''}${token}`)}
            />
          </label>
              <textarea
                value={config.systemPrompt || ''}
                onChange={(e) => handleConfigChange('systemPrompt', e.target.value)}
                placeholder="You are a helpful assistant..."
                className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-green-300 focus:outline-none resize-none"
                rows={2}
              />
            </div>
            <div>
          <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center justify-between">
            <span>User Prompt</span>
            <InsertVarButton
              variant="prompt"
              onInsert={(token) => handleConfigChange('userPrompt', `${config.userPrompt || ''}${token}`)}
            />
          </label>
              <textarea
                value={config.userPrompt || ''}
                onChange={(e) => handleConfigChange('userPrompt', e.target.value)}
                placeholder="{{input}} or custom prompt..."
                className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-green-300 focus:outline-none resize-none"
                rows={2}
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Select Prompt
            </label>
            <select
              value={(config as any).promptLibraryId || ''}
              onChange={(e) => {
                const pid = e.target.value;
                const p = prompts.find(x => x.id === pid);
                handleConfigChange('promptLibraryId', pid);
                if (p?.template) {
                  handleConfigChange('userPrompt', p.template);
                }
              }}
              className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-green-300 focus:outline-none"
            >
              <option value="" disabled>{prompts.length ? 'Choose from library...' : 'No prompts available'}</option>
              {prompts.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
        
        {/* Basic Parameters */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Temperature: {config.temperature || 0.7}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={config.temperature || 0.7}
            onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value))}
            className="w-full h-1 bg-white/80 rounded appearance-none cursor-pointer slider"
          />
        </div>
        
        {/* Advanced Settings Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
        </button>
        
        {/* Advanced Parameters */}
        {showAdvanced && (
          <div className="space-y-2 pt-2 border-t border-gray-200">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Max Tokens
              </label>
              <input
                type="number"
                min="1"
                max="8192"
                value={config.maxTokens || DEFAULT_MODEL_PARAMS[selectedProvider].maxTokens}
                onChange={(e) => handleConfigChange('maxTokens', parseInt(e.target.value))}
                className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-green-300 focus:outline-none"
              />
            </div>
            
            {/* Provider-specific parameters */}
            {selectedProvider === 'openai' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Top P
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={config.topP ?? 0.95}
                    onChange={(e) => handleConfigChange('topP', parseFloat(e.target.value))}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-green-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Frequency Penalty
                  </label>
                  <input
                    type="number"
                    min="-2"
                    max="2"
                    step="0.1"
                    value={config.frequencyPenalty ?? 0}
                    onChange={(e) => handleConfigChange('frequencyPenalty', parseFloat(e.target.value))}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-green-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Presence Penalty
                  </label>
                  <input
                    type="number"
                    min="-2"
                    max="2"
                    step="0.1"
                    value={config.presencePenalty ?? 0}
                    onChange={(e) => handleConfigChange('presencePenalty', parseFloat(e.target.value))}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-green-300 focus:outline-none"
                  />
                </div>
              </>
            )}
            
            {selectedProvider === 'googleai' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Top K
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={config.topK || 40}
                    onChange={(e) => handleConfigChange('topK', parseInt(e.target.value))}
                    className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-green-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Top P
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={config.topP ?? 0.95}
                    onChange={(e) => handleConfigChange('topP', parseFloat(e.target.value))}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-green-300 focus:outline-none"
                  />
                </div>
              </>
            )}
            
            {selectedProvider === 'anthropic' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Top K
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={config.topKAnthropic || 40}
                    onChange={(e) => handleConfigChange('topKAnthropic', parseInt(e.target.value))}
                    className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-green-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Top P
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={config.topP ?? 0.95}
                    onChange={(e) => handleConfigChange('topP', parseFloat(e.target.value))}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-green-300 focus:outline-none"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export function PromptNode({ data, selected, id }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const config = nodeData.config as PromptNodeConfig;
  
  const handleConfigChange = (field: string, value: any) => {
    console.log('Config change:', field, value);
  };
  
  return (
    <BaseNode id={id as unknown as string} data={nodeData} selected={selected}>
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Template
          </label>
          <textarea
            value={config.template || ''}
            onChange={(e) => handleConfigChange('template', e.target.value)}
            placeholder="Enter your prompt template..."
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-purple-300 focus:outline-none resize-none"
            rows={3}
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Variables
          </label>
          <input
            type="text"
            value={config.variables?.join(', ') || ''}
            onChange={(e) => handleConfigChange('variables', e.target.value.split(', ').filter(Boolean))}
            placeholder="variable1, variable2..."
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-purple-300 focus:outline-none"
          />
        </div>
      </div>
    </BaseNode>
  );
}

export function TransformNode({ data, selected, id }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const config = nodeData.config as TransformNodeConfig;
  
  const handleConfigChange = (field: string, value: any) => {
    const newConfig = { ...config, [field]: value };
    nodeData.config = newConfig;
    window.dispatchEvent(new CustomEvent('nodeConfigChange', {
      detail: { nodeId: id as unknown as string, field, value, config: newConfig }
    }));
  };
  
  return (
    <BaseNode id={id as unknown as string} data={nodeData} selected={selected}>
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Language
          </label>
          <select
            value={config.language || 'javascript'}
            onChange={(e) => handleConfigChange('language', e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-orange-300 focus:outline-none"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center justify-between">
            <span>Code</span>
            <InsertVarButton
              variant="code"
              onInsert={(token) => handleConfigChange('code', `${config.code || ''}${token}`)}
            />
          </label>
          <textarea
            value={config.code || ''}
            onChange={(e) => handleConfigChange('code', e.target.value)}
            placeholder="// Transform the data&#10;return data;"
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-orange-300 focus:outline-none font-mono resize-none"
            rows={3}
          />
        </div>
      </div>
    </BaseNode>
  );
}

export function OutputNode({ data, selected, id }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const config = nodeData.config as OutputNodeConfig;
  
  const handleConfigChange = (field: string, value: any) => {
    console.log('Config change:', field, value);
  };
  
  return (
    <BaseNode id={id as unknown as string} data={nodeData} selected={selected} showSourceHandle={false}>
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Format
          </label>
          <select
            value={config.format || 'text'}
            onChange={(e) => handleConfigChange('format', e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-red-300 focus:outline-none"
          >
            <option value="text">Text</option>
            <option value="json">JSON</option>
            <option value="html">HTML</option>
            <option value="markdown">Markdown</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Schema (optional)
          </label>
          <textarea
            value={config.schema || ''}
            onChange={(e) => handleConfigChange('schema', e.target.value)}
            placeholder="Output schema definition..."
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-red-300 focus:outline-none resize-none"
            rows={2}
          />
        </div>
      </div>
    </BaseNode>
  );
}

export function ConditionNode({ data, selected, id }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const config = nodeData.config as ConditionNodeConfig;
  
  const handleConfigChange = (field: string, value: any) => {
    console.log('Config change:', field, value);
  };
  
  return (
    <BaseNode id={id as unknown as string} data={nodeData} selected={selected}>
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Condition
          </label>
          <input
            type="text"
            value={config.condition || ''}
            onChange={(e) => handleConfigChange('condition', e.target.value)}
            placeholder="data.score > 0.5"
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-yellow-300 focus:outline-none font-mono"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              True Label
            </label>
            <input
              type="text"
              value={config.trueLabel || 'Yes'}
              onChange={(e) => handleConfigChange('trueLabel', e.target.value)}
              className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-yellow-300 focus:outline-none"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              False Label
            </label>
            <input
              type="text"
              value={config.falseLabel || 'No'}
              onChange={(e) => handleConfigChange('falseLabel', e.target.value)}
              className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white focus:bg-white focus:ring-1 focus:ring-yellow-300 focus:outline-none"
            />
          </div>
        </div>
      </div>
      
      {/* Custom handles for condition node */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="w-7 h-7 !bg-green-500 !border-2 !border-white rounded-full !z-10"
        style={{ top: '30%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="w-7 h-7 !bg-red-500 !border-2 !border-white rounded-full !z-10"
        style={{ top: '70%' }}
      />
    </BaseNode>
  );
}

export const nodeTypes = {
  [NodeType.INPUT]: InputNode,
  [NodeType.AGENT]: AgentNode,
  [NodeType.TRANSFORM]: TransformNode,
  [NodeType.OUTPUT]: OutputNode,
  [NodeType.CONDITION]: ConditionNode,
};
