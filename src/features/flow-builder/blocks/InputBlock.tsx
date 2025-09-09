import React from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode } from './common/BaseNode';
import { FlowNodeData, InputNodeConfig } from '@/types/flow';

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

  const inputType = config.inputType || 'static';

  return (
    <BaseNode id={id as unknown as string} data={nodeData} selected={selected} showTargetHandle={false}>
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-base-content/70 mb-1">Input Type</label>
          <select
            value={inputType}
            onChange={(e) => handleConfigChange('inputType', e.target.value)}
            className="select select-bordered select-xs w-full"
          >
            <option value="static">Static Value</option>
            <option value="variable">Variable</option>
          </select>
        </div>

        {inputType === 'static' ? (
          <div>
            <label className="block text-xs font-medium text-base-content/70 mb-1">Value</label>
            <input
              type="text"
              value={config.staticValue || config.defaultValue || ''}
              onChange={(e) => handleConfigChange('staticValue', e.target.value)}
              placeholder="Enter a static value"
              className="input input-bordered input-xs w-full text-xs"
            />
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-base-content/70 mb-1">Variable Name</label>
              <input
                type="text"
                value={config.variableName || ''}
                onChange={(e) => handleConfigChange('variableName', e.target.value)}
                placeholder="e.g. userInput"
                className="input input-bordered input-xs w-full text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-base-content/70 mb-1">Description (optional)</label>
              <input
                type="text"
                value={config.variableDescription || ''}
                onChange={(e) => handleConfigChange('variableDescription', e.target.value)}
                placeholder="Describe this variable..."
                className="input input-bordered input-xs w-full text-xs"
              />
            </div>
          </>
        )}

        {inputType === 'variable' && config.variableName && (
          <div className="flex items-center gap-1 mt-1">
            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
            <span className="text-xs text-primary font-mono">${config.variableName}</span>
          </div>
        )}
      </div>
    </BaseNode>
  );
}

