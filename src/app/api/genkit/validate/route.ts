import { NextRequest, NextResponse } from 'next/server';
import { FlowNode, FlowEdge, NodeType, ValidationError } from '@/types/flow';

export async function POST(request: NextRequest) {
  try {
    const { nodes, edges } = await request.json();
    
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return NextResponse.json(
        { error: 'Nodes and edges must be arrays' },
        { status: 400 }
      );
    }
    
    const validation = validateFlow(nodes, edges);
    
    return NextResponse.json(validation);
  } catch (error) {
    console.error('Flow validation error:', error);
    
    return NextResponse.json(
      { error: 'Validation failed' },
      { status: 500 }
    );
  }
}

function validateFlow(nodes: FlowNode[], edges: FlowEdge[]): {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  // Check for empty flow
  if (nodes.length === 0) {
    errors.push({
      message: 'Flow must contain at least one node',
      severity: 'error',
    });
    
    return { isValid: false, errors, warnings };
  }
  
  // Check for input nodes
  const inputNodes = nodes.filter(n => n.data.type === NodeType.INPUT);
  if (inputNodes.length === 0) {
    errors.push({
      message: 'Flow must have at least one input node',
      severity: 'error',
    });
  } else if (inputNodes.length > 1) {
    errors.push({
      message: 'Flow can only have one input node',
      severity: 'error',
    });
  }
  
  // Check for output nodes
  const outputNodes = nodes.filter(n => n.data.type === NodeType.OUTPUT);
  if (outputNodes.length === 0) {
    warnings.push({
      message: 'Flow should have at least one output node',
      severity: 'warning',
    });
  }
  
  // Check for disconnected nodes
  const connectedNodeIds = new Set<string>();
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });
  
  const disconnectedNodes = nodes.filter(n => !connectedNodeIds.has(n.id));
  if (disconnectedNodes.length > 0) {
    disconnectedNodes.forEach(node => {
      warnings.push({
        message: `Node "${node.data.label}" is not connected to any other nodes`,
        nodeId: node.id,
        severity: 'warning',
      });
    });
  }
  
  // Check for circular dependencies
  const circularDependencies = detectCircularDependencies(nodes, edges);
  if (circularDependencies.length > 0) {
    errors.push({
      message: `Circular dependencies detected: ${circularDependencies.join(' → ')}`,
      severity: 'error',
    });
  }
  
  // Validate individual nodes
  nodes.forEach(node => {
    const nodeErrors = validateNode(node);
    errors.push(...nodeErrors);
  });
  
  // Check for invalid edges
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode) {
      errors.push({
        message: `Edge references non-existent source node: ${edge.source}`,
        severity: 'error',
      });
    }
    
    if (!targetNode) {
      errors.push({
        message: `Edge references non-existent target node: ${edge.target}`,
        severity: 'error',
      });
    }
    
    // Check for invalid connections
    if (sourceNode && targetNode) {
      const invalidConnection = validateConnection(sourceNode, targetNode);
      if (invalidConnection) {
        warnings.push({
          message: invalidConnection,
          severity: 'warning',
        });
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateNode(node: FlowNode): ValidationError[] {
  const errors: ValidationError[] = [];
  
  switch (node.data.type) {
    case NodeType.INPUT:
      if (!node.data.config.inputType) {
        errors.push({
          message: 'Input node must specify input type',
          nodeId: node.id,
          severity: 'error',
        });
      }
      break;
    
    case NodeType.MODEL:
      if (!node.data.config.provider) {
        errors.push({
          message: 'Model node must specify provider',
          nodeId: node.id,
          severity: 'error',
        });
      }
      if (!node.data.config.model) {
        errors.push({
          message: 'Model node must specify model',
          nodeId: node.id,
          severity: 'error',
        });
      }
      break;
    
    case NodeType.PROMPT:
      if (!node.data.config.template) {
        errors.push({
          message: 'Prompt node must have a template',
          nodeId: node.id,
          severity: 'error',
        });
      }
      break;
    
    case NodeType.TRANSFORM:
      if (!node.data.config.code) {
        errors.push({
          message: 'Transform node must have code',
          nodeId: node.id,
          severity: 'error',
        });
      }
      break;
    
    case NodeType.OUTPUT:
      if (!node.data.config.format) {
        errors.push({
          message: 'Output node must specify format',
          nodeId: node.id,
          severity: 'error',
        });
      }
      break;
    
    case NodeType.CONDITION:
      if (!node.data.config.condition) {
        errors.push({
          message: 'Condition node must have a condition',
          nodeId: node.id,
          severity: 'error',
        });
      }
      break;
  }
  
  return errors;
}

function validateConnection(sourceNode: FlowNode, targetNode: FlowNode): string | null {
  // Check for invalid connection patterns
  if (sourceNode.data.type === NodeType.OUTPUT) {
    return 'Output nodes cannot have outgoing connections';
  }
  
  if (targetNode.data.type === NodeType.INPUT) {
    return 'Input nodes cannot have incoming connections';
  }
  
  // Check for logical flow issues
  if (sourceNode.data.type === NodeType.INPUT && targetNode.data.type === NodeType.OUTPUT) {
    return 'Consider adding processing nodes between input and output';
  }
  
  return null;
}

function detectCircularDependencies(nodes: FlowNode[], edges: FlowEdge[]): string[] {
  const graph: { [key: string]: string[] } = {};
  
  // Build adjacency list
  nodes.forEach(node => {
    graph[node.id] = [];
  });
  
  edges.forEach(edge => {
    graph[edge.source].push(edge.target);
  });
  
  // DFS to detect cycles
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];
  
  function dfs(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      return true;
    }
    
    if (visited.has(nodeId)) {
      return false;
    }
    
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);
    
    for (const neighbor of graph[nodeId] || []) {
      if (dfs(neighbor)) {
        return true;
      }
    }
    
    recursionStack.delete(nodeId);
    path.pop();
    return false;
  }
  
  // Check each node for cycles
  for (const nodeId of Object.keys(graph)) {
    if (!visited.has(nodeId)) {
      if (dfs(nodeId)) {
        return path;
      }
    }
  }
  
  return [];
}