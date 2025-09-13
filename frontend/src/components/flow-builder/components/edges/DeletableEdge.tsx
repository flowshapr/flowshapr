import React from 'react';
import { EdgeProps, getSmoothStepPath } from '@xyflow/react';

export function DeletableEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, data, selected }: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  const onDelete = data?.onDelete as ((id: string) => void) | undefined;

  return (
    <g className="deletable-edge group">
      <path id={id} className="react-flow__edge-path" d={edgePath} markerEnd={markerEnd} style={style} />
      <foreignObject
        x={labelX - 12}
        y={labelY - 12}
        width={24}
        height={24}
        className="pointer-events-none"
      >
        <div className="w-6 h-6 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            title="Delete connection"
            onClick={(e) => { e.stopPropagation(); onDelete && onDelete(id); }}
            className={`w-6 h-6 rounded-full text-[12px] leading-6 text-primary-content ${selected ? 'bg-error' : 'bg-error hover:bg-error'} flex items-center justify-center shadow border border-white`}
          >
            ×
          </button>
        </div>
      </foreignObject>
    </g>
  );
}

