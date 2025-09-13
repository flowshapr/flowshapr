import React from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode, InsertVarButton } from './common/BaseNode';
import { FlowNodeData, TransformNodeConfig } from '@/types/flow';

export default function TransformBlock({ data, selected, id }: NodeProps) {
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
          <label className="block text-xs font-medium text-base-content/70 mb-1">Language</label>
          <select
            value={config.language || 'javascript'}
            onChange={(e) => handleConfigChange('language', e.target.value)}
            className="nodrag w-full px-2 py-1 text-xs rounded border border bg-base-100 focus:bg-base-100 focus:ring-1 focus:ring-orange-300 focus:outline-none"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-base-content/70 mb-1 flex items-center justify-between">
            <span>Code</span>
            <InsertVarButton variant="code" onInsert={(token) => handleConfigChange('code', `${config.code || ''}${token}`)} />
          </label>
          <textarea
            value={config.code || ''}
            onChange={(e) => handleConfigChange('code', e.target.value)}
            placeholder={`// Transform the data\nreturn data;`}
            className="nodrag w-full px-2 py-1 text-xs rounded border border bg-base-100 focus:bg-base-100 focus:ring-1 focus:ring-orange-300 focus:outline-none font-mono resize-none"
            rows={3}
          />
        </div>
      </div>
    </BaseNode>
  );
}

