export interface Flow {
  id: string;
  name: string;
  alias: string; // Unique identifier for SDK calls
  slug?: string;
  description?: string;
  version: string;
  isLatest: boolean;
  status: 'draft' | 'published' | 'archived';
  nodes: any[];
  edges: any[];
  metadata?: any;
  config?: any;
  deploymentSettings?: any;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  organizationId: string;
  teamId?: string; // Optional team association
  createdBy: string;
  memberRole: string;
}

export interface FlowVersion {
  id: string;
  version: string;
  changelog?: string;
  nodes: any[];
  edges: any[];
  metadata?: any;
  config?: any;
  createdAt: Date;
  flowId: string;
  createdBy: string;
}

export interface FlowMember {
  id: string;
  role: 'owner' | 'admin' | 'developer' | 'viewer';
  joinedAt: Date;
  updatedAt: Date;
  flowId: string;
  userId: string;
  invitedBy?: string;
}

export interface CreateFlowRequest {
  name: string;
  description?: string;
  organizationId: string;
  teamId?: string;
}

export interface UpdateFlowRequest {
  name?: string;
  description?: string;
}

export interface SaveFlowDefinitionRequest {
  nodes: any[];
  edges: any[];
  metadata?: any;
}

export interface PublishFlowRequest {
  version?: string;
  changelog?: string;
}

export interface FlowQueryOptions {
  organizationId?: string;
  teamId?: string;
  search?: string;
  limit: number;
  offset: number;
  includeArchived?: boolean;
}
