export interface ExecutionConfig {
  googleApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  flowId?: string;
}

export interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  meta?: {
    instance: string;
    duration: number;
  };
}

export interface ProcessExecutorConfig {
  timeout: number;
  maxConcurrentProcesses: number;
  tempDir: string;
}