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
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
  base: 'px-4 py-3 rounded-lg border-2 bg-white text-gray-900 min-w-[200px] shadow-lg',
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
  onConfigChange?: (config: any) => void;
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
    <div className={`${nodeStyles.base} ${nodeStyles[styleKey]} ${selected ? 'ring-2 ring-blue-500' : ''}`}>
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

export function InputNode({ data, selected }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const config = nodeData.config as InputNodeConfig;
  
  const handleConfigChange = (field: string, value: any) => {
    // In a real app, this would update the node's config
    console.log('Config change:', field, value);
  };
  
  return (
    <BaseNode data={nodeData} selected={selected} showTargetHandle={false}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Input Type
          </label>
          <Select
            value={config.inputType || 'text'}
            onValueChange={(value) => handleConfigChange('inputType', value)}
          >
            <option value="text">Text</option>
            <option value="json">JSON</option>
            <option value="file">File</option>
          </Select>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Default Value
          </label>
          <Input
            value={config.defaultValue || ''}
            onChange={(e) => handleConfigChange('defaultValue', e.target.value)}
            placeholder="Enter default value..."
            className="text-xs"
          />
        </div>
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
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Provider
          </label>
          <Select
            value={config.provider || 'googleai'}
            onValueChange={(value) => handleConfigChange('provider', value)}
          >
            <option value="googleai">Google AI</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
          </Select>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Model
          </label>
          <Select
            value={config.model || 'gemini-1.5-flash'}
            onValueChange={(value) => handleConfigChange('model', value)}
          >
            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            <option value="gpt-4">GPT-4</option>
            <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
          </Select>
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
            className="w-full"
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
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Template
          </label>
          <Textarea
            value={config.template || ''}
            onChange={(e) => handleConfigChange('template', e.target.value)}
            placeholder="Enter your prompt template..."
            className="text-xs min-h-[60px]"
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Variables
          </label>
          <Input
            value={config.variables?.join(', ') || ''}
            onChange={(e) => handleConfigChange('variables', e.target.value.split(', ').filter(Boolean))}
            placeholder="variable1, variable2..."
            className="text-xs"
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
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Language
          </label>
          <Select
            value={config.language || 'javascript'}
            onValueChange={(value) => handleConfigChange('language', value)}
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
          </Select>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Code
          </label>
          <Textarea
            value={config.code || ''}
            onChange={(e) => handleConfigChange('code', e.target.value)}
            placeholder="// Transform the data\nreturn data;"
            className="text-xs min-h-[60px] font-mono"
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
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Format
          </label>
          <Select
            value={config.format || 'text'}
            onValueChange={(value) => handleConfigChange('format', value)}
          >
            <option value="text">Text</option>
            <option value="json">JSON</option>
            <option value="html">HTML</option>
            <option value="markdown">Markdown</option>
          </Select>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Schema (optional)
          </label>
          <Textarea
            value={config.schema || ''}
            onChange={(e) => handleConfigChange('schema', e.target.value)}
            placeholder="Output schema definition..."
            className="text-xs min-h-[40px]"
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
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Condition
          </label>
          <Input
            value={config.condition || ''}
            onChange={(e) => handleConfigChange('condition', e.target.value)}
            placeholder="data.score > 0.5"
            className="text-xs font-mono"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              True Label
            </label>
            <Input
              value={config.trueLabel || 'Yes'}
              onChange={(e) => handleConfigChange('trueLabel', e.target.value)}
              className="text-xs"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              False Label
            </label>
            <Input
              value={config.falseLabel || 'No'}
              onChange={(e) => handleConfigChange('falseLabel', e.target.value)}
              className="text-xs"
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