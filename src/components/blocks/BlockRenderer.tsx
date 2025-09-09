import React from 'react';
import { BlockInstance, ClientSubBlock, SubBlockType } from '@/lib/blocks/client-types';

interface BlockRendererProps {
  block: BlockInstance;
  onChange: (config: Record<string, any>) => void;
}

export function BlockRenderer({ block, onChange }: BlockRendererProps) {
  return (
    <div className="p-4 bg-base-200 rounded-lg">
      <h3 className="font-semibold text-base-content mb-2">Block Configuration</h3>
      <p className="text-sm text-base-content/70">
        Block type: {block.blockType}
      </p>
      <p className="text-sm text-base-content/70">
        This component needs to be updated to work with the new server-side block system.
      </p>
      <div className="mt-2">
        <button 
          onClick={() => onChange({})}
          className="btn btn-sm btn-primary"
        >
          Update Config
        </button>
      </div>
    </div>
  );
}