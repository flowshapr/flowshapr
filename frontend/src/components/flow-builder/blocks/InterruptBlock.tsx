import React from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';
import { BaseNode } from './common/BaseNode';
import { FlowNodeData, InterruptNodeConfig } from '@/types/flow';

export default function InterruptBlock({ data, selected, id }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const config = nodeData.config as InterruptNodeConfig;

  const handleConfigChange = (field: string, value: any) => {
    const newConfig = { ...config, [field]: value } as InterruptNodeConfig;
    nodeData.config = newConfig;
    window.dispatchEvent(new CustomEvent('nodeConfigChange', {
      detail: { nodeId: id as unknown as string, field, value, config: newConfig }
    }));
  };

  const handleArrayChange = (field: string, values: string[]) => {
    handleConfigChange(field, values);
  };

  return (
    <BaseNode id={id as unknown as string} data={nodeData} selected={selected} showTargetHandle={false} showSourceHandle={false}>
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-base-content/70 mb-1">Interrupt Type</label>
          <select
            value={config.interruptType || 'manual-response'}
            onChange={(e) => handleConfigChange('interruptType', e.target.value)}
            className="nodrag select select-bordered select-xs w-full"
          >
            <option value="manual-response">Manual Response</option>
            <option value="restartable">Restartable</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-base-content/70 mb-1">Interrupt Message</label>
          <textarea
            value={config.message || 'Human review required'}
            onChange={(e) => handleConfigChange('message', e.target.value)}
            className="nodrag textarea textarea-bordered textarea-xs w-full text-xs resize-none"
            rows={3}
            placeholder="Please review the data and provide your response..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-base-content/70 mb-1">Response Schema (Optional)</label>
          <textarea
            value={config.responseSchema || ''}
            onChange={(e) => handleConfigChange('responseSchema', e.target.value)}
            className="nodrag textarea textarea-bordered textarea-xs w-full text-xs font-mono resize-none"
            rows={4}
            placeholder='{\n  "type": "object",\n  "properties": {\n    "approved": { "type": "boolean" },\n    "feedback": { "type": "string" }\n  }\n}'
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-base-content/70 mb-1">Timeout (milliseconds)</label>
          <input
            type="number"
            min="1000"
            max="3600000"
            value={config.timeout || ''}
            onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value) || undefined)}
            className="nodrag input input-bordered input-xs w-full text-xs"
            placeholder="300000"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-base-content/70 mb-1">Allowed Responses (Optional)</label>
          <div className="space-y-1">
            {(config.allowedResponses || []).map((response, index) => (
              <div key={index} className="flex gap-1">
                <input
                  type="text"
                  value={response}
                  onChange={(e) => {
                    const newResponses = [...(config.allowedResponses || [])];
                    newResponses[index] = e.target.value;
                    handleArrayChange('allowedResponses', newResponses);
                  }}
                  className="nodrag input input-bordered input-xs flex-1 text-xs"
                  placeholder="approve"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newResponses = (config.allowedResponses || []).filter((_, i) => i !== index);
                    handleArrayChange('allowedResponses', newResponses);
                  }}
                  className="btn btn-xs btn-error"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const newResponses = [...(config.allowedResponses || []), ''];
                handleArrayChange('allowedResponses', newResponses);
              }}
              className="btn btn-xs btn-outline w-full"
            >
              Add Response
            </button>
          </div>
        </div>
      </div>
      {/* Single top connection point to attach as a tool to an Agent */}
      <Handle
        type="source"
        position={Position.Top}
        className="w-5 h-5 !bg-orange-500 !border-2 !border-white rounded-full !z-10"
        style={{ left: '50%', transform: 'translateX(-50%)' }}
      />
    </BaseNode>
  );
}
