'use client';

import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  ReactFlowProvider,
  Node,
  BackgroundVariant,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from './node-types';
import { DeletableEdge } from './edges/DeletableEdge';
import { FlowNode, FlowEdge, NodeType, FlowNodeData } from '@/types/flow';
import { generateId } from '@/lib/utils';

interface FlowCanvasProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  onNodesChange?: (nodes: FlowNode[]) => void;
  onEdgesChange?: (edges: FlowEdge[]) => void;
  onAddNode?: (type: NodeType, position?: { x: number; y: number }) => void;
  viewport?: { x: number; y: number; zoom: number };
  onViewportChange?: (viewport: { x: number; y: number; zoom: number }) => void;
  onDraggingChange?: (dragging: boolean) => void;
}

const initialNodes: FlowNode[] = [];
const initialEdges: FlowEdge[] = [];

export function FlowCanvas({ 
  nodes: externalNodes, 
  edges: externalEdges, 
  onNodesChange,
  onEdgesChange,
  onAddNode,
  viewport,
  onViewportChange,
  onDraggingChange
}: FlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(externalNodes || initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(externalEdges || initialEdges);
  const edgeTypes = { deletable: DeletableEdge } as const;

  // Sync external state with internal state
  useEffect(() => {
    if (externalNodes) {
      setNodes(externalNodes);
    }
  }, [externalNodes, setNodes]);

  useEffect(() => {
    if (externalEdges) {
      setEdges(externalEdges);
    }
  }, [externalEdges, setEdges]);

  // Apply incoming viewport from parent when available
  useEffect(() => {
    if (reactFlowInstance && viewport) {
      try {
        // setViewport({ x, y, zoom }, options)
        reactFlowInstance.setViewport(viewport, { duration: 0 });
      } catch {}
    }
  }, [viewport, reactFlowInstance]);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = addEdge({ ...params, type: 'deletable', animated: false, updatable: true }, edges);
      setEdges(newEdge);
      onEdgesChange?.(newEdge);
    },
    [edges, setEdges, onEdgesChange]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      
      if (!reactFlowBounds || !reactFlowInstance) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      handleAddNode(type, position);
    },
    [reactFlowInstance]
  );

  const handleAddNode = useCallback((type: NodeType, position?: { x: number; y: number }) => {
    // Only delegate to parent's onAddNode - don't create the node here
    onAddNode?.(type, position);
  }, [onAddNode]);

  const handleNodesChange = useCallback((changes: any) => {
    onNodesChangeInternal(changes);
    // Call parent callback with current nodes after change
    requestAnimationFrame(() => {
      onNodesChange?.(nodes);
    });
  }, [nodes, onNodesChangeInternal, onNodesChange]);

  const handleEdgesChange = useCallback((changes: any) => {
    onEdgesChangeInternal(changes);
    // Call parent callback with current edges after change
    requestAnimationFrame(() => {
      onEdgesChange?.(edges);
    });
  }, [edges, onEdgesChangeInternal, onEdgesChange]);

  const handleEdgeDelete = useCallback((id: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== id));
  }, [setEdges]);

  const displayEdges = useMemo(() => (
    edges.map((e: any) => ({
      ...e,
      type: e.type || 'deletable',
      animated: false,
      updatable: true,
      data: { ...(e.data || {}), onDelete: handleEdgeDelete },
    }))
  ), [edges, handleEdgeDelete]);

  return (
    <div className="flex-1 h-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={displayEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        
        onNodeDragStart={() => onDraggingChange?.(true)}
        onNodeDrag={() => onDraggingChange?.(true)}
        onNodeDragStop={() => onDraggingChange?.(false)}
        onInit={(instance) => {
          setReactFlowInstance(instance);
          // Initialize viewport if provided
          if (viewport) {
            try {
              instance.setViewport(viewport, { duration: 0 });
            } catch {}
          }
        }}
        onMoveEnd={(_, vp) => {
          // vp: { x, y, zoom }
          onViewportChange?.(vp as any);
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Strict}
        connectionLineType="step"
        fitView
        attributionPosition="bottom-left"
        defaultEdgeOptions={{
          type: 'deletable',
          animated: false,
          updatable: true,
          style: { strokeWidth: 2, stroke: '#8b5cf6' },
          data: { onDelete: handleEdgeDelete },
        }}
        connectionLineStyle={{ strokeWidth: 2, stroke: '#8b5cf6', strokeDasharray: '6 3' }}
      >
        <Controls />
        <MiniMap 
          nodeColor={(node) => getNodeColor(node.type as NodeType)}
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1} 
        />
      </ReactFlow>
    </div>
  );
}

function getNodeColor(type: NodeType): string {
  switch (type) {
    case NodeType.INPUT:
      return '#3b82f6';
    case NodeType.AGENT:
      return '#10b981';
    case NodeType.TRANSFORM:
      return '#f59e0b';
    case NodeType.OUTPUT:
      return '#ef4444';
    case NodeType.CONDITION:
      return '#eab308';
    default:
      return '#6b7280';
  }
}

export function FlowCanvasWrapper(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvas {...props} />
    </ReactFlowProvider>
  );
}
