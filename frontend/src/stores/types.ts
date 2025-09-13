// Shared types for Zustand stores

export interface Connection {
  id: string;
  name: string;
  provider: 'googleai' | 'openai' | 'anthropic';
  isActive: boolean;
  apiKey?: string; // Optional for security
  createdAt: string;
  updatedAt: string;
}

export interface CreateConnectionRequest {
  name: string;
  provider: 'googleai' | 'openai' | 'anthropic';
  apiKey: string;
}

export interface UpdateConnectionRequest {
  name?: string;
  apiKey?: string;
  isActive?: boolean;
}

export interface Flow {
  id: string;
  name: string;
  slug: string;
  description?: string;
  organizationId: string;
  memberRole: string;
}

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: FlowNodeData;
  selected?: boolean;
  dragging?: boolean;
}

export interface FlowNodeData {
  label: string;
  config: Record<string, any>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Prompt {
  id: string;
  name: string;
  template?: string;
  description?: string;
}

export interface ExecutionTrace {
  id: string;
  flowId: string;
  input: any;
  output: any;
  duration: number;
  timestamp: string;
  status: 'success' | 'error';
  error?: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  message?: string;
}

// Store State Types
export interface LoadingState {
  loading: boolean;
  error: string | null;
}

export interface PaginatedState<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}