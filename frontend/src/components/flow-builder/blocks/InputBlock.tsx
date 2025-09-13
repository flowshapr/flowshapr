import React from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode } from './common/BaseNode';
import { FlowNodeData, InputNodeConfig } from '@/types/flow';
import { Play } from 'lucide-react';

export default function InputBlock({ data, selected, id }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const config = nodeData.config as InputNodeConfig;

  const handleConfigChange = (field: string, value: any) => {
    const newConfig = { ...config, [field]: value };
    nodeData.config = newConfig;
    window.dispatchEvent(new CustomEvent('nodeConfigChange', {
      detail: { nodeId: id as unknown as string, field, value, config: newConfig }
    }));
  };

  return (
    <BaseNode 
      id={id as unknown as string} 
      data={nodeData} 
      selected={selected} 
      showTargetHandle={false}
    >
      <div className="space-y-3">
        {/* Start indicator */}
        <div className="flex items-center gap-2 text-green-600">
          <Play className="w-4 h-4 fill-current" />
          <span className="text-sm font-medium">Flow Start</span>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-base-content/70 mb-1">
            Input Description
          </label>
          <textarea
            value={config.description || ''}
            onChange={(e) => handleConfigChange('description', e.target.value)}
            placeholder="Describe what input this flow expects..."
            rows={2}
            className="nodrag textarea textarea-bordered textarea-xs w-full text-xs resize-none"
          />
        </div>

        {/* Input variable indicator */}
        <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
          <span className="text-xs text-blue-600 dark:text-blue-400 font-mono">input</span>
          <span className="text-xs text-base-content/60">- Flow input data</span>
        </div>
      </div>
    </BaseNode>
  );
}