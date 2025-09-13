import React from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';
import { BaseNode } from '../common/BaseNode';
import { FlowNodeData } from '@/types/flow';
import { Plug, Link2, KeyRound } from 'lucide-react';

export default function McpToolBlock({ data, selected, id }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const config = (nodeData.config || {}) as any;

  const handleChange = (field: string, value: any) => {
    const next = { ...config, [field]: value };
    nodeData.config = next;
    window.dispatchEvent(new CustomEvent('nodeConfigChange', { detail: { nodeId: String(id), field, value, config: next } }));
  };

  return (
    <BaseNode id={String(id)} data={nodeData} selected={selected} showTargetHandle={false} showSourceHandle={false}>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-base-content/70">
          <Plug className="w-4 h-4" /> MCP Tool
        </div>

        <div>
          <label className="block text-xs font-medium text-base-content/70 mb-1">Name</label>
          <input
            type="text"
            value={config.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g. Leantime MCP"
            className="nodrag w-full px-2 py-1 text-xs rounded border border bg-base-100 focus:ring-1 focus:ring-teal-300 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-base-content/70 mb-1 flex items-center gap-1">
            <Link2 className="w-3 h-3" /> MCP Server URL
          </label>
          <input
            type="url"
            value={config.serverUrl || ''}
            onChange={(e) => handleChange('serverUrl', e.target.value)}
            placeholder="https://mcp.example.com"
            className="nodrag w-full px-2 py-1 text-xs rounded border border bg-base-100 focus:ring-1 focus:ring-teal-300 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-base-content/70 mb-1 flex items-center gap-1">
            <KeyRound className="w-3 h-3" /> API Key (optional)
          </label>
          <input
            type="password"
            value={config.apiKey || ''}
            onChange={(e) => handleChange('apiKey', e.target.value)}
            placeholder="••••••••"
            className="nodrag w-full px-2 py-1 text-xs rounded border border bg-base-100 focus:ring-1 focus:ring-teal-300 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-base-content/70 mb-1">Selected Tools (comma-separated)</label>
          <input
            type="text"
            value={(config.selectedTools || []).join(', ')}
            onChange={(e) => handleChange('selectedTools', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
            placeholder="e.g. create_task, list_projects"
            className="nodrag w-full px-2 py-1 text-xs rounded border border bg-base-100 focus:ring-1 focus:ring-teal-300 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-[11px] text-base-content/70">
          <span>Connect this tool node to an Agent to enable it as a tool.</span>
        </div>
      </div>
      {/* Source handle at top to connect into Agent tools */}
      <Handle
        type="source"
        position={Position.Top}
        className="w-5 h-5 !bg-teal-500 !border-2 !border-white rounded-full !z-10"
        style={{ left: '50%', transform: 'translateX(-50%)' }}
      />
    </BaseNode>
  );
}
