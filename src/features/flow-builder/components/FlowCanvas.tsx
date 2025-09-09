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
  ConnectionLineType,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes, getNodeColor } from '@/features/flow-builder/blocks/registry';
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
  
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState<FlowNode>(externalNodes || initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState<FlowEdge>(externalEdges || initialEdges);
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
      const isTool = params.sourceHandle === 'tool' || params.targetHandle === 'tool';
      const newEdge = addEdge({ ...params, type: 'deletable', animated: false, data: { kind: isTool ? 'tool' : 'flow' } }, edges);
      setEdges(newEdge);
      onEdgesChange?.(newEdge);
    },
    [edges, setEdges, onEdgesChange]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow') as NodeType;
    if (!type) return;
    const bounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (!bounds || !reactFlowInstance) return;
    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
    handleAddNode(type, position);
  }, [reactFlowInstance]);

  const handleAddNode = useCallback((type: NodeType, position?: { x: number; y: number }) => {
    // Only delegate to parent's onAddNode - don't create the node here
    onAddNode?.(type, position);
  }, [onAddNode]);

  const handleNodesChange = useCallback((changes: NodeChange<FlowNode>[]) => {
    const next = applyNodeChanges(changes, nodes) as FlowNode[];
    onNodesChangeInternal(changes);
    onNodesChange?.(next);
  }, [nodes, onNodesChangeInternal, onNodesChange]);

  const handleEdgesChange = useCallback((changes: EdgeChange<FlowEdge>[]) => {
    const next = applyEdgeChanges(changes, edges) as FlowEdge[];
    onEdgesChangeInternal(changes);
    onEdgesChange?.(next);
  }, [edges, onEdgesChangeInternal, onEdgesChange]);

  const handleEdgeDelete = useCallback((id: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== id));
  }, [setEdges]);

  const displayEdges = useMemo(() => (
    edges.map((e: any) => {
      const isTool = e?.data?.kind === 'tool' || e?.targetHandle === 'tool' || e?.sourceHandle === 'tool';
      const style = isTool
        ? { strokeWidth: 2, stroke: '#14b8a6', strokeDasharray: '4 2' }
        : { strokeWidth: 2, stroke: '#8b5cf6' };
      return ({
        ...e,
        type: e.type || 'deletable',
        animated: false,
        style,
        data: { ...(e.data || {}), onDelete: handleEdgeDelete },
      });
    })
  ), [edges, handleEdgeDelete]);

  return (
    <div className="flex-1 h-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={displayEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
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
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Strict}
        connectionLineType={ConnectionLineType.Step}
        
        fitView
        attributionPosition="bottom-left"
        defaultEdgeOptions={{
          type: 'deletable',
          animated: false,
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

// color provided by registry

export function FlowCanvasWrapper(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvas {...props} />
    </ReactFlowProvider>
  );
}
