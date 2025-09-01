import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { 
  FlowNodeData, 
  NodeType, 
  InputNodeConfig, 
  ModelNodeConfig, 
  PromptNodeConfig, 
  TransformNodeConfig, 
  OutputNodeConfig, 
  ConditionNodeConfig,
  MODEL_PROVIDERS,
  AVAILABLE_MODELS
} from '@/types/flow';
// Using native form elements for cleaner styling inside nodes
import { 
  FileText, 
  Brain, 
  MessageSquare, 
  Code, 
  Download, 
  GitBranch,
  Settings
} from 'lucide-react';

const nodeStyles = {
  base: 'px-4 py-3 rounded-lg border-2 bg-white text-gray-900 min-w-[200px] shadow-lg !outline-none',
  input: 'border-blue-400 bg-blue-50',
  model: 'border-green-400 bg-green-50', 
  prompt: 'border-purple-400 bg-purple-50',
  transform: 'border-orange-400 bg-orange-50',
  output: 'border-red-400 bg-red-50',
  condition: 'border-yellow-400 bg-yellow-50',
};

const nodeIcons = {
  [NodeType.INPUT]: FileText,
  [NodeType.MODEL]: Brain,
  [NodeType.PROMPT]: MessageSquare,
  [NodeType.TRANSFORM]: Code,
  [NodeType.OUTPUT]: Download,
  [NodeType.CONDITION]: GitBranch,
};

interface BaseNodeProps {
  data: FlowNodeData;
  selected?: boolean;
  onConfigChange?: (nodeId: string, config: any) => void;
}

function BaseNode({ 
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
  
  return (
    <div 
      className={`${nodeStyles.base} ${nodeStyles[styleKey]} ${selected ? '!border-blue-500' : ''}`}
      style={{
        border: selected ? '2px solid rgb(59 130 246)' : undefined,
        outline: 'none',
        boxShadow: selected ? 'none' : undefined
      }}
    >
      {showTargetHandle && (
        <Handle type="target" position={Position.Top} className="w-4 h-2 !bg-gray-400 !border-0" />
      )}
      
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5 text-gray-600" />
        <div className="font-semibold text-sm text-gray-800">{data.label}</div>
      </div>
      
      {children}
      
      {showSourceHandle && (
        <Handle type="source" position={Position.Bottom} className="w-4 h-2 !bg-gray-400 !border-0" />
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
    <BaseNode data={nodeData} selected={selected} showTargetHandle={false}>
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Input Type
          </label>
          <select
            value={inputType}
            onChange={(e) => handleConfigChange('inputType', e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border-0 bg-white/80 focus:bg-white focus:ring-1 focus:ring-blue-300 focus:outline-none"
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
              className="w-full px-2 py-1 text-xs rounded border-0 bg-white/80 focus:bg-white focus:ring-1 focus:ring-blue-300 focus:outline-none"
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
                className="w-full px-2 py-1 text-xs rounded border-0 bg-white/80 focus:bg-white focus:ring-1 focus:ring-blue-300 focus:outline-none font-mono"
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
                className="w-full px-2 py-1 text-xs rounded border-0 bg-white/80 focus:bg-white focus:ring-1 focus:ring-blue-300 focus:outline-none"
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

export function ModelNode({ data, selected }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const config = nodeData.config as ModelNodeConfig;
  
  const handleConfigChange = (field: string, value: any) => {
    console.log('Config change:', field, value);
  };
  
  return (
    <BaseNode data={nodeData} selected={selected}>
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Provider
          </label>
          <select
            value={config.provider || 'googleai'}
            onChange={(e) => handleConfigChange('provider', e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border-0 bg-white/80 focus:bg-white focus:ring-1 focus:ring-green-300 focus:outline-none"
          >
            <option value="googleai">Google AI</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Model
          </label>
          <select
            value={config.model || 'gemini-1.5-flash'}
            onChange={(e) => handleConfigChange('model', e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border-0 bg-white/80 focus:bg-white focus:ring-1 focus:ring-green-300 focus:outline-none"
          >
            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            <option value="gpt-4">GPT-4</option>
            <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
          </select>
        </div>
        
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
      </div>
    </BaseNode>
  );
}

export function PromptNode({ data, selected }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const config = nodeData.config as PromptNodeConfig;
  
  const handleConfigChange = (field: string, value: any) => {
    console.log('Config change:', field, value);
  };
  
  return (
    <BaseNode data={nodeData} selected={selected}>
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Template
          </label>
          <textarea
            value={config.template || ''}
            onChange={(e) => handleConfigChange('template', e.target.value)}
            placeholder="Enter your prompt template..."
            className="w-full px-2 py-1 text-xs rounded border-0 bg-white/80 focus:bg-white focus:ring-1 focus:ring-purple-300 focus:outline-none resize-none"
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
            className="w-full px-2 py-1 text-xs rounded border-0 bg-white/80 focus:bg-white focus:ring-1 focus:ring-purple-300 focus:outline-none"
          />
        </div>
      </div>
    </BaseNode>
  );
}

export function TransformNode({ data, selected }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const config = nodeData.config as TransformNodeConfig;
  
  const handleConfigChange = (field: string, value: any) => {
    console.log('Config change:', field, value);
  };
  
  return (
    <BaseNode data={nodeData} selected={selected}>
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Language
          </label>
          <select
            value={config.language || 'javascript'}
            onChange={(e) => handleConfigChange('language', e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border-0 bg-white/80 focus:bg-white focus:ring-1 focus:ring-orange-300 focus:outline-none"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Code
          </label>
          <textarea
            value={config.code || ''}
            onChange={(e) => handleConfigChange('code', e.target.value)}
            placeholder="// Transform the data&#10;return data;"
            className="w-full px-2 py-1 text-xs rounded border-0 bg-white/80 focus:bg-white focus:ring-1 focus:ring-orange-300 focus:outline-none font-mono resize-none"
            rows={3}
          />
        </div>
      </div>
    </BaseNode>
  );
}

export function OutputNode({ data, selected }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const config = nodeData.config as OutputNodeConfig;
  
  const handleConfigChange = (field: string, value: any) => {
    console.log('Config change:', field, value);
  };
  
  return (
    <BaseNode data={nodeData} selected={selected} showSourceHandle={false}>
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Format
          </label>
          <select
            value={config.format || 'text'}
            onChange={(e) => handleConfigChange('format', e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border-0 bg-white/80 focus:bg-white focus:ring-1 focus:ring-red-300 focus:outline-none"
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
            className="w-full px-2 py-1 text-xs rounded border-0 bg-white/80 focus:bg-white focus:ring-1 focus:ring-red-300 focus:outline-none resize-none"
            rows={2}
          />
        </div>
      </div>
    </BaseNode>
  );
}

export function ConditionNode({ data, selected }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const config = nodeData.config as ConditionNodeConfig;
  
  const handleConfigChange = (field: string, value: any) => {
    console.log('Config change:', field, value);
  };
  
  return (
    <BaseNode data={nodeData} selected={selected}>
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
            className="w-full px-2 py-1 text-xs rounded border-0 bg-white/80 focus:bg-white focus:ring-1 focus:ring-yellow-300 focus:outline-none font-mono"
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
              className="w-full px-2 py-1 text-xs rounded border-0 bg-white/80 focus:bg-white focus:ring-1 focus:ring-yellow-300 focus:outline-none"
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
              className="w-full px-2 py-1 text-xs rounded border-0 bg-white/80 focus:bg-white focus:ring-1 focus:ring-yellow-300 focus:outline-none"
            />
          </div>
        </div>
      </div>
      
      {/* Custom handles for condition node */}
      <Handle type="source" position={Position.Bottom} id="true" className="w-3 h-2 !bg-green-500 !border-0" style={{left: '25%'}} />
      <Handle type="source" position={Position.Bottom} id="false" className="w-3 h-2 !bg-red-500 !border-0" style={{left: '75%'}} />
    </BaseNode>
  );
}

export const nodeTypes = {
  [NodeType.INPUT]: InputNode,
  [NodeType.MODEL]: ModelNode,
  [NodeType.PROMPT]: PromptNode,
  [NodeType.TRANSFORM]: TransformNode,
  [NodeType.OUTPUT]: OutputNode,
  [NodeType.CONDITION]: ConditionNode,
};