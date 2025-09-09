import React from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';
import { BaseNode } from './common/BaseNode';
import { FlowNodeData, ConditionNodeConfig } from '@/types/flow';

export default function ConditionBlock({ data, selected, id }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const config = nodeData.config as ConditionNodeConfig;

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
          <label className="block text-xs font-medium text-base-content/70 mb-1">Condition</label>
          <input
            type="text"
            value={config.condition || ''}
            onChange={(e) => handleConfigChange('condition', e.target.value)}
            placeholder="data.score > 0.5"
            className="w-full px-2 py-1 text-xs rounded border border bg-base-100 focus:bg-base-100 focus:ring-1 focus:ring-yellow-300 focus:outline-none font-mono"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-base-content/70 mb-1">True Label</label>
            <input
              type="text"
              value={config.trueLabel || 'Yes'}
              onChange={(e) => handleConfigChange('trueLabel', e.target.value)}
              className="w-full px-2 py-1 text-xs rounded border border bg-base-100 focus:bg-base-100 focus:ring-1 focus:ring-yellow-300 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-base-content/70 mb-1">False Label</label>
            <input
              type="text"
              value={config.falseLabel || 'No'}
              onChange={(e) => handleConfigChange('falseLabel', e.target.value)}
              className="w-full px-2 py-1 text-xs rounded border border bg-base-100 focus:bg-base-100 focus:ring-1 focus:ring-yellow-300 focus:outline-none"
            />
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} id="true" className="w-7 h-7 !bg-success !border-2 !border-white rounded-full !z-10" style={{ top: '30%' }} />
      <Handle type="source" position={Position.Right} id="false" className="w-7 h-7 !bg-error !border-2 !border-white rounded-full !z-10" style={{ top: '70%' }} />
    </BaseNode>
  );
}

