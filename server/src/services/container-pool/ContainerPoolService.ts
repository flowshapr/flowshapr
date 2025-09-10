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
  workVolume: string;
  resultsVolume: string;
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
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🏊 Initializing Container Pool Service...');
    console.log(`   Pool Size: ${this.config.poolSize}`);
    console.log(`   Work Timeout: ${this.config.workTimeout}ms`);

    // Discover existing containers from docker-compose
    await this.discoverContainers();
    
    // Start health monitoring
    this.startHealthChecking();
    
    this.isInitialized = true;
    console.log('✅ Container Pool Service initialized');
    console.log(`   Discovered ${this.containers.length} containers`);
    console.log(`   Healthy containers: ${this.containers.filter(c => c.isHealthy).length}`);
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
        workVolume: container.workVolume,
        resultsVolume: container.resultsVolume,
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

      child.on('close', (code) => {
        if (code === 0) {
          try {
            const lines = output.trim().split('\n').filter(line => line.trim());
            const containers = lines.map(line => {
              const containerInfo = JSON.parse(line);
              const name = containerInfo.Names;
              const id = containerInfo.ID;
              
              // Determine volume names based on container name
              const executorNum = name.match(/executor-(\d+)/)?.[1] || '1';
              
              return {
                id,
                name,
                workVolume: `genkit-builder_executor_work_${executorNum}`,
                resultsVolume: `genkit-builder_executor_results_${executorNum}`
              };
            });
            
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
      // Write execution request to container's work volume
      await this.writeExecutionRequest(container, request);

      // Wait for result with timeout
      const result = await this.waitForResult(container, executionId);
      
      return result;
    } catch (error) {
      // Clean up if possible
      try {
        await this.cleanupExecution(container, executionId);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  private async writeExecutionRequest(container: PoolContainer, request: ExecutionRequest): Promise<void> {
    const requestData = {
      code: request.code,
      input: request.input,
      config: request.config,
      flowId: request.flowId
    };

    // Write to temp file first
    const tempFile = path.join(os.tmpdir(), `exec_${request.executionId}.json`);
    await fs.writeFile(tempFile, JSON.stringify(requestData, null, 2));

    // Copy to container using docker cp
    try {
      const result = await this.dockerCommand([
        'cp',
        tempFile,
        `${container.name}:/app/work/exec_${request.executionId}.json`
      ]);
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(tempFile);
      } catch {}
    }
  }

  private async waitForResult(container: PoolContainer, executionId: string): Promise<{ result: any }> {
    const timeout = Date.now() + this.config.workTimeout;
    const tempFile = path.join(os.tmpdir(), `result_${executionId}.json`);
    
    while (Date.now() < timeout) {
      try {
        // Check if result file exists in container
        const checkResult = await this.dockerCommand([
          'exec', container.name, 'test', '-f', `/app/results/result_${executionId}.json`
        ]);
        
        if (checkResult.code === 0) {
          // File exists, copy it out
          const copyResult = await this.dockerCommand([
            'cp',
            `${container.name}:/app/results/result_${executionId}.json`,
            tempFile
          ]);
          
          if (copyResult.code === 0) {
            try {
              const resultData = await fs.readFile(tempFile, 'utf8');
              const result = JSON.parse(resultData);
              
              // Clean up both local temp file and container file
              try {
                await fs.unlink(tempFile);
                await this.dockerCommand(['exec', container.name, 'rm', `-f`, `/app/results/result_${executionId}.json`]);
              } catch {
                // Ignore cleanup errors
              }
              
              if (result.success === false) {
                throw new Error(result.error || 'Container execution failed');
              }
              
              return { result: result.result || result };
            } catch (parseError: any) {
              // If JSON parsing failed, clean up and try again
              try {
                await fs.unlink(tempFile);
              } catch {}
            }
          }
        }
        
        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error: any) {
        if (error.message.includes('execution failed') || error.message.includes('Container execution failed')) {
          throw error;
        }
        // Continue polling for other errors
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Clean up temp file on timeout
    try {
      await fs.unlink(tempFile);
    } catch {}
    
    throw new Error('Container execution timeout');
  }

  private async cleanupExecution(container: PoolContainer, executionId: string): Promise<void> {
    const files = [
      `/app/work/exec_${executionId}.json`,
      `/app/work/exec_${executionId}.json.processing`,
      `/app/work/flow_${executionId}.mjs`,
      `/app/results/result_${executionId}.json`
    ];

    for (const file of files) {
      try {
        await this.dockerCommand(['exec', container.name, 'rm', '-f', file]);
      } catch {
        // Ignore cleanup errors
      }
    }
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
      // Check if .ready file exists in container work directory
      const result = await this.dockerCommand(['exec', container.name, 'test', '-f', '/app/work/.ready']);
      return result.code === 0;
    } catch {
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