import React from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode } from './common/BaseNode';
import { FlowNodeData, OutputNodeConfig } from '@/types/flow';

export default function OutputBlock({ data, selected, id }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const config = nodeData.config as OutputNodeConfig;

  const handleConfigChange = (field: string, value: any) => {
    const newConfig = { ...config, [field]: value };
    nodeData.config = newConfig;
    window.dispatchEvent(new CustomEvent('nodeConfigChange', {
      detail: { nodeId: id as unknown as string, field, value, config: newConfig }
    }));
  };

  return (
    <BaseNode id={id as unknown as string} data={nodeData} selected={selected} showSourceHandle={false}>
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-base-content/70 mb-1">Format</label>
          <select
            value={config.format || 'text'}
            onChange={(e) => handleConfigChange('format', e.target.value)}
            className="nodrag w-full px-2 py-1 text-xs rounded border border bg-base-100 focus:bg-base-100 focus:ring-1 focus:ring-red-300 focus:outline-none"
          >
            <option value="text">Text</option>
            <option value="json">JSON</option>
            <option value="structured">Structured</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-base-content/70 mb-1">Schema (optional)</label>
          <textarea
            value={config.schema || ''}
            onChange={(e) => handleConfigChange('schema', e.target.value)}
            placeholder="Output schema definition..."
            className="nodrag w-full px-2 py-1 text-xs rounded border border bg-base-100 focus:bg-base-100 focus:ring-1 focus:ring-red-300 focus:outline-none resize-none"
            rows={2}
          />
        </div>
      </div>
    </BaseNode>
  );
}

