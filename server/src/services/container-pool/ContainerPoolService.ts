import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import * as crypto from 'crypto';

export interface ContainerPoolConfig {
  poolSize: number;
  workTimeout: number;
  healthCheckInterval: number;
  volumeBasePath: string;
  workerUrls?: string[];
}

export interface ExecutionRequest {
  executionId: string;
  code: string;
  input: any;
  config: ExecutionConfig;
  flowId?: string;
}

export interface ExecutionConfig {
  googleApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  flowId?: string;
  userId?: string;
  organizationId?: string;
  maxTokens?: number;
}

export interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  meta: {
    instance: string;
    duration: number;
    containerId?: string;
  };
  runtime: string;
  traces?: any[];
}

interface PoolContainer {
  id: string;
  name: string;
  url: string;
  isHealthy: boolean;
  isBusy: boolean;
  lastUsed: Date;
  executions: number;
}

export class ContainerPoolService extends EventEmitter {
  private config: ContainerPoolConfig;
  private containers: PoolContainer[] = [];
  private healthCheckInterval?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(config?: Partial<ContainerPoolConfig>) {
    super();
    this.config = {
      poolSize: 3,
      workTimeout: 120000, // 2 minutes
      healthCheckInterval: 30000, // 30 seconds
      volumeBasePath: '/tmp/flowshapr-pool',
      workerUrls: this.parseWorkerUrls(),
      ...config
    };
  }

  private parseWorkerUrls(): string[] {
    // Check both environment variable names for compatibility
    const envUrls = process.env.EXECUTOR_URLS || process.env.GENKIT_WORKER_URLS;
    if (envUrls) {
      return envUrls.split(',').map(url => url.trim()).filter(Boolean);
    }
    return [];
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🏊 Initializing Container Pool Service...');
    console.log(`   Pool Size: ${this.config.poolSize}`);
    console.log(`   Work Timeout: ${this.config.workTimeout}ms`);

    // Try environment variable configuration first
    if (this.config.workerUrls && this.config.workerUrls.length > 0) {
      console.log('🔗 Using worker URLs from environment variables');
      await this.initializeFromUrls(this.config.workerUrls);
    } else {
      // Fallback to Docker discovery
      console.log('🔍 No worker URLs found, attempting Docker discovery...');
      const dockerAvailable = await this.checkDockerAvailability();
      if (!dockerAvailable) {
        console.warn('⚠️  Docker not available and no worker URLs configured');
        console.log('⚠️  Container pool will be initialized but no workers will be available');
        console.log('💡 Set EXECUTOR_URLS or GENKIT_WORKER_URLS environment variable to configure workers');
        this.isInitialized = true;
        return;
      }
      await this.discoverContainers();
    }
    
    // Start health monitoring
    this.startHealthChecking();
    
    this.isInitialized = true;
    console.log('✅ Container Pool Service initialized');
    console.log(`   Discovered ${this.containers.length} workers`);
    console.log(`   Healthy workers: ${this.containers.filter(c => c.isHealthy).length}`);
  }

  async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.isInitialized = false;
    console.log('🏊 Container Pool Service shut down');
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      poolSize: this.containers.length,
      healthyContainers: this.containers.filter(c => c.isHealthy).length,
      busyContainers: this.containers.filter(c => c.isBusy).length,
      totalExecutions: this.containers.reduce((sum, c) => sum + c.executions, 0),
      containers: this.containers.map(c => ({
        id: c.id,
        name: c.name,
        isHealthy: c.isHealthy,
        isBusy: c.isBusy,
        executions: c.executions,
        lastUsed: c.lastUsed
      }))
    };
  }

  async executeFlow(code: string, input: any, config: ExecutionConfig = {}): Promise<ExecutionResult> {
    const startTime = Date.now();
    const executionId = `exec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    if (!this.isInitialized) {
      await this.initialize();
    }

    // Find available container
    const container = this.getAvailableContainer();
    if (!container) {
      return {
        success: false,
        error: 'No available containers in pool',
        meta: {
          instance: executionId,
          duration: Date.now() - startTime
        },
        runtime: 'container-pool'
      };
    }

    console.log(`🏊 Executing flow in container: ${container.name} (${executionId})`);
    
    // Mark container as busy
    container.isBusy = true;
    container.lastUsed = new Date();

    try {
      const result = await this.executeInContainer(container, {
        executionId,
        code,
        input,
        config,
        flowId: config.flowId
      });

      container.executions++;
      const duration = Date.now() - startTime;
      console.log(`✅ Flow executed successfully in ${duration}ms`);

      return {
        success: true,
        result: result.result,
        meta: {
          instance: executionId,
          duration,
          containerId: container.id
        },
        runtime: 'container-pool'
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ Container pool execution failed in ${duration}ms:`, error.message);

      return {
        success: false,
        error: error.message,
        meta: {
          instance: executionId,
          duration,
          containerId: container.id
        },
        runtime: 'container-pool'
      };
    } finally {
      // Mark container as available
      container.isBusy = false;
    }
  }

  private async initializeFromUrls(urls: string[]): Promise<void> {
    console.log(`🔗 Initializing ${urls.length} workers from URLs:`);
    urls.forEach(url => console.log(`   - ${url}`));
    
    this.containers = urls.map((url, index) => ({
      id: `worker-${index + 1}`,
      name: `worker-${index + 1}`,
      url: url,
      isHealthy: false,
      isBusy: false,
      lastUsed: new Date(),
      executions: 0
    }));

    // Initial health check
    console.log('🏥 Running initial health checks...');
    await this.checkAllContainerHealth();
  }

  private async discoverContainers(): Promise<void> {
    console.log('🔍 Discovering containers from docker-compose...');
    
    try {
      // Get running containers matching our pattern
      const containers = await this.getDockerComposeContainers();
      
      console.log(`🔍 Found ${containers.length} matching containers:`);
      containers.forEach(c => console.log(`   - ${c.name} (${c.id})`));
      
      this.containers = containers.map(container => ({
        id: container.id,
        name: container.name,
        url: container.url,
        isHealthy: false,
        isBusy: false,
        lastUsed: new Date(),
        executions: 0
      }));

      console.log(`🔍 Mapped to ${this.containers.length} pool containers`);

      // Initial health check
      console.log('🏥 Running initial health checks...');
      await this.checkAllContainerHealth();
    } catch (error) {
      console.error('❌ Container discovery failed:', error);
      throw error;
    }
  }

  private async getDockerComposeContainers(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      // List containers with genkit-executor label
      const child = spawn('docker', [
        'ps',
        '--filter', 'name=flowshapr-genkit-executor',
        '--format', 'json'
      ], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let output = '';
      let error = '';

      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.stderr?.on('data', (data) => {
        error += data.toString();
      });

      child.on('close', async (code) => {
        if (code === 0) {
          try {
            const lines = output.trim().split('\n').filter(line => line.trim());
            const containers = await Promise.all(lines.map(async (line) => {
              const containerInfo = JSON.parse(line);
              const name = containerInfo.Names;
              const id = containerInfo.ID;
              
              // Get container's exposed port
              const port = await this.getContainerPortFromId(id);
              
              return {
                id,
                name,
                url: `http://localhost:${port}`
              };
            }));
            
            resolve(containers);
          } catch (parseError) {
            reject(new Error(`Failed to parse container list: ${parseError}`));
          }
        } else {
          reject(new Error(`Docker ps failed: ${error}`));
        }
      });

      child.on('error', reject);
    });
  }

  private getAvailableContainer(): PoolContainer | null {
    // Find healthy, non-busy container
    const available = this.containers.filter(c => c.isHealthy && !c.isBusy);
    
    if (available.length === 0) {
      return null;
    }

    // Return least recently used container
    return available.reduce((lru, current) => 
      current.lastUsed < lru.lastUsed ? current : lru
    );
  }

  private async executeInContainer(
    container: PoolContainer, 
    request: ExecutionRequest
  ): Promise<{ result: any }> {
    const { executionId, code, input, config } = request;

    try {
      // Make HTTP request to container's execution daemon
      const result = await this.makeHttpRequest(container, {
        code,
        input,
        config,
        flowId: config.flowId
      });
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  private async makeHttpRequest(container: PoolContainer, requestData: any): Promise<{ result: any }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.workTimeout);
    
    try {
      const response = await fetch(`${container.url}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const result = await response.json() as any;

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Flow execution failed');
      }

      return { result: result.result };
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async getContainerPortFromId(containerId: string): Promise<number> {
    try {
      const result = await this.dockerCommand([
        'port', containerId, '3000'
      ]);
      
      if (result.code !== 0) {
        throw new Error('Container port not exposed');
      }
      
      // Parse "0.0.0.0:XXXXX" format
      const portMatch = result.output.match(/:(\d+)$/);
      if (!portMatch) {
        throw new Error('Could not parse container port mapping');
      }
      
      return parseInt(portMatch[1], 10);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get container port: ${errorMessage}`);
    }
  }

  private async cleanupExecution(container: PoolContainer, executionId: string): Promise<void> {
    // No cleanup needed for HTTP-based execution
    // The execution-daemon handles its own cleanup
  }

  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.checkAllContainerHealth();
    }, this.config.healthCheckInterval);
    
    console.log('💊 Health checking started');
  }

  private async checkAllContainerHealth(): Promise<void> {
    for (const container of this.containers) {
      try {
        const isHealthy = await this.checkContainerHealth(container);
        
        if (container.isHealthy !== isHealthy) {
          container.isHealthy = isHealthy;
          console.log(`💊 Container ${container.name} health changed: ${isHealthy ? 'healthy' : 'unhealthy'}`);
          this.emit('containerHealthChanged', container);
        }
      } catch (error) {
        console.warn(`⚠️  Health check failed for ${container.name}:`, (error as Error).message);
        container.isHealthy = false;
      }
    }
  }

  private async checkContainerHealth(container: PoolContainer): Promise<boolean> {
    try {
      // Check container health via HTTP endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${container.url}/health`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const health = await response.json() as any;
        return health.status === 'healthy';
      }
      
      return false;
    } catch {
      return false;
    }
  }

  private async checkDockerAvailability(): Promise<boolean> {
    try {
      const result = await this.dockerCommand(['--version']);
      return result.code === 0;
    } catch (error) {
      return false;
    }
  }

  private async dockerCommand(args: string[]): Promise<{ output: string; error: string; code: number }> {
    return new Promise((resolve, reject) => {
      const child = spawn('docker', args, {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let output = '';
      let error = '';

      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.stderr?.on('data', (data) => {
        error += data.toString();
      });

      child.on('close', (code) => {
        resolve({ output: output.trim(), error: error.trim(), code: code || 0 });
      });

      child.on('error', reject);
    });
  }
}