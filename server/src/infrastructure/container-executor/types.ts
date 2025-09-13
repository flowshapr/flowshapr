export interface ExecutionConfig {
  googleApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  flowId?: string;
  userId?: string;
  authToken?: string;
  organizationId?: string;
  maxTokens?: number;
}

export interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  meta?: {
    instance: string;
    duration: number;
    containerId?: string;
  };
}

export interface ContainerExecutorConfig {
  timeout: number;
  maxConcurrentContainers: number;
  tempDir: string;
  imageName: string;
  memoryLimit: string;
  cpuLimit: string;
  networkMode: string;
}

export interface SecurityPolicy {
  allowedImports: string[];
  blockedPatterns: RegExp[];
  maxExecutionTime: number;
  memoryLimit: string;
  cpuLimit: string;
  networkAccess: boolean;
  fileSystemAccess: 'none' | 'readonly' | 'limited';
}