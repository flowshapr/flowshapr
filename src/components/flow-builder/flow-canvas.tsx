'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
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
import { FlowNode, FlowEdge, NodeType, FlowNodeData } from '@/types/flow';
import { generateId } from '@/lib/utils';

interface FlowCanvasProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  onNodesChange?: (nodes: FlowNode[]) => void;
  onEdgesChange?: (edges: FlowEdge[]) => void;
  onAddNode?: (type: NodeType, position?: { x: number; y: number }) => void;
}

const initialNodes: FlowNode[] = [];
const initialEdges: FlowEdge[] = [];

export function FlowCanvas({ 
  nodes: externalNodes, 
  edges: externalEdges, 
  onNodesChange,
  onEdgesChange,
  onAddNode
}: FlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(externalNodes || initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(externalEdges || initialEdges);

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

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = addEdge(params, edges);
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

  return (
    <div className="flex-1 h-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        attributionPosition="bottom-left"
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { 
            strokeWidth: 3,
            stroke: '#8b5cf6',
          },
        }}
        connectionLineStyle={{ 
          strokeWidth: 3, 
          stroke: '#8b5cf6' 
        }}
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
    case NodeType.MODEL:
      return '#10b981';
    case NodeType.PROMPT:
      return '#8b5cf6';
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