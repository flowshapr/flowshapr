import React, { useEffect, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
// Minimal interface to support both legacy BlockInstance and current FlowNodeData
type BaseNodeData = { blockType?: string; type?: string } & Record<string, any>;
import { useBlocks } from '@/contexts/BlocksContext';
import { Trash2, FileText, Brain, Download, Wrench, Code, GitBranch, Square, Bot } from 'lucide-react';

// Icon mapping function to convert server icon strings to React components
const getIconComponent = (iconName: string) => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    'FileText': FileText,
    'Brain': Brain,
    'Download': Download, 
    'Wrench': Wrench,
    'Code': Code,
    'GitBranch': GitBranch,
    'Bot': Bot,
    'Square': Square
  };
  
  const IconComponent = iconMap[iconName] || Square;
  return <IconComponent className="w-4 h-4" />;
};

export function getAvailableVariables(): Array<{ name: string; source: string }> {
  const store = (window as any).__flowVars;
  const vars = (store?.all || []) as Array<{ name: string; source: string }>;
  return vars;
}

export function InsertVarButton({ onInsert, variant = 'prompt' }: { onInsert: (token: string) => void; variant?: 'prompt' | 'code' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const makeToken = (name: string) => (variant === 'prompt' ? `{{ ${name} }}` : `ctx.${name}`);
  const vars = getAvailableVariables();

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div ref={ref} className="relative inline-block" onMouseDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="btn btn-ghost btn-xs"
        aria-label="Insert variable"
        title="Insert variable"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span className="inline-block font-mono text-xs">{`{ }`}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-40 max-h-56 overflow-auto rounded-md bg-base-100 shadow-lg z-20 menu">
          {vars.length === 0 ? (
            <div className="px-2 py-1 text-xs text-base-content/60">No variables</div>
          ) : (
            vars.map((v) => (
              <button
                key={`${v.source}-${v.name}`}
                type="button"
                className="w-full text-left px-2 py-1 text-xs hover:bg-base-200"
                onClick={(e) => {
                  e.stopPropagation();
                  onInsert(makeToken(v.name));
                  setOpen(false);
                }}
              >
                {v.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const nodeStyles = {
  base: 'card bg-base-100 border border shadow-lg min-w-[200px] !outline-none relative',
};

/**
 * Get node styling based on block configuration
 */
function getNodeStyle(blockType: string, getBlockMetadata: (type: string) => any): string {
  try {
    const blockConfig = getBlockMetadata(blockType);
    if (!blockConfig || !blockConfig.bgColor) {
      return 'border-l-4 !border-l-gray-600/70';
    }
    
    return `border-l-4` + ` ${blockConfig.bgColor.startsWith('#') ? 
      `!border-l-[${blockConfig.bgColor}]/70` : 
      `!border-l-${blockConfig.bgColor}/70`}`;
  } catch (error) {
    console.warn('Error getting node style:', error);
    return 'border-l-4 !border-l-gray-600/70';
  }
}

export interface BaseNodeProps {
  id: string;
  data: BaseNodeData;
  selected?: boolean;
}

export function BaseNode({ id, data, selected, children, showSourceHandle = true, showTargetHandle = true }: React.PropsWithChildren<BaseNodeProps & { showSourceHandle?: boolean; showTargetHandle?: boolean }>) {
  const { getBlockMetadata } = useBlocks();
  // Handle both BlockInstance (data.blockType) and FlowNodeData (data.type) interfaces
  const blockType = (data as any).blockType || (data as any).type;
  const blockConfig = getBlockMetadata(blockType);
  const nodeStyle = getNodeStyle(blockType, getBlockMetadata);
  
  // Fallback if block type not found
  if (!blockConfig) {
    return (
      <div className={`flow-node ${nodeStyles.base} border-l-4 !border-l-red-600/70 ${selected ? 'ring-2 ring-error' : ''}`}>
        <div className="card-body">
          <div className="text-error text-sm">Unknown block type: {blockType}</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flow-node ${nodeStyles.base} ${nodeStyle} ${selected ? 'ring-2 ring-primary' : ''}`}
    >
      {showTargetHandle && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-7 h-7 !bg-gray-600 !border-2 !border-white rounded-full !z-10 hover:!bg-gray-500"
        />
      )}

      <div className="card-body">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {getIconComponent(blockConfig.icon || 'Square')}
            <div className="font-semibold text-sm">{blockConfig.name}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Delete node"
              title="Delete node"
              className="btn btn-ghost btn-xs btn-square hover:btn-error"
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('nodeDelete', { detail: { nodeId: id } }));
              }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {children}
      </div>

      {showSourceHandle && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-7 h-7 !bg-gray-600 !border-2 !border-white rounded-full !z-10 hover:!bg-gray-500"
        />
      )}
    </div>
  );
}
