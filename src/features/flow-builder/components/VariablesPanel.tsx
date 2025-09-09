'use client';

import React from 'react';
import { FlowEdge, FlowNode, FlowVariable } from '@/types/flow';
import { Variable, Settings } from 'lucide-react';

interface VariablesPanelProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  startNodeId: string | null;
  variables: FlowVariable[];
  runtimeOnly: FlowVariable[];
}

export function VariablesPanel({ nodes, edges, startNodeId, variables, runtimeOnly }: VariablesPanelProps) {
  return (
    <div className="h-full p-4 bg-base-200">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-base-content mb-2 flex items-center gap-2">
          <Variable className="w-5 h-5" />
          Flow Variables
        </h3>
        <p className="text-sm text-base-content/70">Variables defined in your flow that can be provided at runtime.</p>
      </div>

      <div className="space-y-3">
        {variables.length === 0 ? (
          <div className="text-center py-8 text-base-content/60">
            <Variable className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No variables defined yet.</p>
            <p className="text-xs mt-1">Add Input nodes with Variable type to create flow variables.</p>
          </div>
        ) : (
          variables.map((variable) => (
            <div key={variable.id} className="bg-base-100 rounded-lg p-3 border border shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono text-primary bg-blue-50 px-2 py-1 rounded">${variable.name}</span>
                    <span className="text-xs text-base-content/60 bg-gray-100 px-2 py-1 rounded">{variable.source}</span>
                  </div>
                  {variable.description && <p className="text-xs text-base-content/70 mt-1">{variable.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">Defined in: {nodes.find(n => n.id === variable.sourceNodeId)?.data.label || 'Unknown'}</p>
                </div>
                <Settings className="w-4 h-4 text-gray-400 cursor-pointer hover:text-base-content/70" />
              </div>
            </div>
          ))
        )}
      </div>

      {runtimeOnly.length > 0 && (
        <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-2">SDK Usage</h4>
          <p className="text-xs text-blue-800 mb-2">Call this flow with variables:</p>
          <code className="text-xs bg-blue-100 p-2 rounded block font-mono text-blue-900">{`await flow.run({ ${runtimeOnly.map(v => `${v.name}: "value"`).join(', ')} })`}</code>
        </div>
      )}
    </div>
  );
}

