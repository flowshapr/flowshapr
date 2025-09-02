import React from 'react';
import { NodeType, NODE_TYPES } from '@/types/flow';
import { 
  FileText, 
  Brain, 
  MessageSquare, 
  Code, 
  Download, 
  GitBranch,
  Plus
} from 'lucide-react';

const nodeIcons = {
  [NodeType.INPUT]: FileText,
  [NodeType.AGENT]: Brain,
  [NodeType.TRANSFORM]: Code,
  [NodeType.OUTPUT]: Download,
  [NodeType.CONDITION]: GitBranch,
};

const nodeColors = {
  [NodeType.INPUT]: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
  [NodeType.AGENT]: 'bg-green-50 border-green-200 hover:bg-green-100',
  [NodeType.TRANSFORM]: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
  [NodeType.OUTPUT]: 'bg-red-50 border-red-200 hover:bg-red-100',
  [NodeType.CONDITION]: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
};

interface SidebarProps {
  onAddNode?: (type: NodeType) => void;
}

export function Sidebar({ onAddNode }: SidebarProps) {
  const handleDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };


  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Node Palette</h2>
        <p className="text-sm text-gray-600 mt-1">
          Drag nodes to the canvas
        </p>
      </div>
      
      <div className="flex-1 p-4 space-y-2">
        {Object.entries(NODE_TYPES).map(([nodeType, label]) => {
          const Icon = nodeIcons[nodeType as NodeType];
          const colorClass = nodeColors[nodeType as NodeType];
          
          return (
            <div
              key={nodeType}
              className={`
                p-3 rounded-lg border-2 cursor-pointer transition-colors
                ${colorClass}
                flex items-center gap-3
                hover:shadow-md
              `}
              draggable
              onDragStart={(e) => handleDragStart(e, nodeType as NodeType)}
            >
              <Icon className="w-5 h-5" />
              <div className="flex-1">
                <div className="font-medium text-sm">{label}</div>
                <div className="text-xs text-gray-600">
                  {getNodeDescription(nodeType as NodeType)}
                </div>
              </div>
              <div className="text-xs text-gray-500">Drag</div>
            </div>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p className="font-medium mb-1">Quick Tips:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Drag nodes to canvas</li>
            <li>Connect nodes with edges</li>
            <li>Start with an Input node</li>
            <li>End with an Output node</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function getNodeDescription(type: NodeType): string {
  switch (type) {
    case NodeType.INPUT:
      return 'Define flow input data';
    case NodeType.AGENT:
      return 'AI agent with integrated prompts';
    case NodeType.TRANSFORM:
      return 'Function (JavaScript)';
    case NodeType.OUTPUT:
      return 'Flow output format';
    case NodeType.CONDITION:
      return 'Conditional branching';
    default:
      return 'Node component';
  }
}
