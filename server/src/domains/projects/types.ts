export interface CreateProjectData {
  name: string;
  description?: string;
  organizationId: string;
  teamId?: string;
  settings?: Record<string, any>;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  settings?: Record<string, any>;
}

export interface ProjectSettings {
  deployment?: {
    autoDeployLatest?: boolean;
    environment?: 'development' | 'staging' | 'production';
    customDomain?: string;
  };
  apiKeys?: {
    allowedOrigins?: string[];
    rateLimit?: number;
  };
  integrations?: {
    [provider: string]: {
      enabled: boolean;
      config: Record<string, any>;
    };
  };
}

export interface ProjectMemberData {
  userId: string;
  role: 'owner' | 'admin' | 'developer' | 'viewer';
}

export interface InviteProjectMemberData {
  email: string;
  role: 'admin' | 'developer' | 'viewer';
}

export interface ProjectWithMembers {
  id: string;
  name: string;
  slug: string;
  description?: string;
  settings?: ProjectSettings;
  createdAt: Date;
  updatedAt: Date;
  organizationId: string;
  teamId?: string;
  createdBy: string;
  members: Array<{
    id: string;
    role: string;
    joinedAt: Date;
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
    };
  }>;
  _count?: {
    flows: number;
    prompts: number;
    datasets: number;
    apiKeys: number;
  };
}