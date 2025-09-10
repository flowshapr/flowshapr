import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ExecutionConfig, ExecutionResult, ContainerExecutorConfig } from './types';
import { ContainerManager } from './ContainerManager';

export class ContainerExecutor {
  private config: ContainerExecutorConfig;
  private activeContainers: Set<string> = new Set();
  private containerManager: ContainerManager;

  constructor(config?: Partial<ContainerExecutorConfig>) {
    this.config = {
      timeout: 60000, // 60 seconds default
      maxConcurrentContainers: 5, // Reduced from processes
      tempDir: path.join(process.cwd(), 'temp'),
      imageName: 'flowshapr-genkit-executor',
      memoryLimit: '256m',
      cpuLimit: '0.5',
      networkMode: 'bridge', // Enable network for HTTP communication
      ...config
    };
    
    this.containerManager = new ContainerManager();
  }

  async initialize(): Promise<void> {
    // Build Docker image if it doesn't exist
    await this.buildDockerImage();
    console.log(`📁 Container executor initialized for HTTP communication`);
  }

  async shutdown(): Promise<void> {
    // Shutdown container manager (this handles stopping containers)
    await this.containerManager.shutdown();
    console.log(`🧹 Container executor shutdown completed`);
  }

  getStatus() {
    return {
      initialized: true,
      activeContainers: this.activeContainers.size,
      maxConcurrentContainers: this.config.maxConcurrentContainers,
      imageName: this.config.imageName
    };
  }

  async executeFlow(code: string, input: any, config: ExecutionConfig = {}): Promise<ExecutionResult> {
    const startTime = Date.now();
    const executionId = `exec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    // Check concurrent container limit
    if (this.activeContainers.size >= this.config.maxConcurrentContainers) {
      return {
        success: false,
        error: 'Maximum concurrent containers reached',
        meta: {
          instance: executionId,
          duration: Date.now() - startTime
        }
      };
    }

    const containerId = `flowshapr-${executionId}`;
    this.activeContainers.add(containerId);
    this.containerManager.registerContainer(containerId, `flow-${executionId}`);

    try {
      console.log(`🐳 Starting Genkit HTTP server container: ${containerId}`);

      // Start container with HTTP server and execute via HTTP
      const result = await this.executeViaHttp(code, input, config, containerId, executionId);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Flow executed successfully via HTTP ${duration}ms`);

      return {
        success: true,
        result: result,
        meta: {
          instance: executionId,
          duration,
          containerId
        }
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ Container execution failed in ${duration}ms:`, error.message);

      return {
        success: false,
        error: error.message,
        meta: {
          instance: executionId,
          duration,
          containerId
        }
      };
    } finally {
      try {
        await this.stopContainer(containerId);
      } catch {
        // Ignore cleanup errors
      }
      
      this.activeContainers.delete(containerId);
      this.containerManager.unregisterContainer(containerId);
    }
  }


  private async buildDockerImage(): Promise<void> {
    return new Promise((resolve, reject) => {
      const dockerBuildPath = path.join(process.cwd(), 'docker', 'execution');
      const child = spawn('docker', [
        'build',
        '-t', this.config.imageName,
        '-f', path.join(dockerBuildPath, 'Dockerfile'),
        dockerBuildPath
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
          console.log(`🐳 Docker image ${this.config.imageName} built successfully`);
          resolve();
        } else {
          console.error(`❌ Failed to build Docker image: ${error}`);
          reject(new Error(`Docker build failed: ${error}`));
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });
  }

  private async executeViaHttp(
    code: string,
    input: any,
    config: ExecutionConfig,
    containerId: string,
    executionId: string
  ): Promise<any> {
    // First, start the container with HTTP server
    const containerPort = await this.startContainerWithHttpServer(containerId, config);
    
    try {
      // Wait for container to be ready
      await this.waitForContainerReady(containerPort, containerId);
      
      // Make HTTP request to execute the flow
      const result = await this.makeExecutionRequest(containerPort, {
        code,
        input,
        config: this.sanitizeConfig(config),
        flowId: config.flowId,
        executionId: executionId  // Pass the execution ID to the daemon
      });
      
      return result;
      
    } catch (error) {
      this.containerManager.updateContainerStatus(containerId, 'failed', error.message);
      throw error;
    }
  }

  private async startContainerWithHttpServer(containerId: string, config: ExecutionConfig): Promise<number> {
    // Find available port for container
    const containerPort = 3000 + Math.floor(Math.random() * 1000);
    
    // Prepare secure environment variables
    const secureEnv = [
      `NODE_ENV=production`,
      `PORT=3000`, // Internal container port
      `EXECUTOR_ID=${containerId}`,
    ];

    // Add API keys from config
    if (config.googleApiKey) {
      secureEnv.push(`GEMINI_API_KEY=${config.googleApiKey}`);
    }
    if (config.openaiApiKey) {
      secureEnv.push(`OPENAI_API_KEY=${config.openaiApiKey}`);
    }
    if (config.anthropicApiKey) {
      secureEnv.push(`ANTHROPIC_API_KEY=${config.anthropicApiKey}`);
    }

    const dockerArgs = [
      'run',
      '--name', containerId,
      '--rm', // Auto-remove container when done
      '--detach', // Run in background
      '--network', this.config.networkMode, // Enable network for HTTP
      '--memory', this.config.memoryLimit, // Memory limit
      '--cpus', this.config.cpuLimit, // CPU limit
      '--user', '1001:1001', // Run as non-root user
      '--security-opt', 'no-new-privileges:true', // Prevent privilege escalation
      '-p', `${containerPort}:3000`, // Map container port to host
    ];

    // Add environment variables
    secureEnv.forEach(env => {
      dockerArgs.push('-e', env);
    });

    // Add image name
    dockerArgs.push(this.config.imageName);

    console.log(`🔒 Starting HTTP server container on port ${containerPort}: ${containerId}`);
    this.containerManager.updateContainerStatus(containerId, 'starting');

    return new Promise((resolve, reject) => {
      const child = spawn('docker', dockerArgs, {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let output = '';
      let error = '';

      child.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log(`[Container ${containerId}] ${text.trim()}`);
      });

      child.stderr?.on('data', (data) => {
        const text = data.toString();
        error += text;
        console.error(`[Container ${containerId} ERROR] ${text.trim()}`);
      });

      child.on('close', (code) => {
        if (code === 0) {
          this.containerManager.updateContainerStatus(containerId, 'running');
          resolve(containerPort);
        } else {
          const errorMsg = error || `Container failed to start with code ${code}`;
          this.containerManager.updateContainerStatus(containerId, 'failed', errorMsg);
          reject(new Error(errorMsg));
        }
      });

      child.on('error', (err) => {
        this.containerManager.updateContainerStatus(containerId, 'failed', err.message);
        reject(err);
      });
    });
  }

  private async waitForContainerReady(port: number, containerId: string): Promise<void> {
    const maxAttempts = 60; // 30 seconds total
    const delay = 500; // 500ms between attempts
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout per request
        
        const response = await fetch(`http://localhost:${port}/health`, {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const health = await response.json();
          console.log(`✅ Container ${containerId} is ready: ${health.status}`);
          return;
        }
      } catch (error) {
        // Container not ready yet, continue waiting
        console.log(`🔄 Waiting for container ${containerId} (attempt ${attempt}/${maxAttempts})...`);
      }
      
      if (attempt === maxAttempts) {
        throw new Error(`Container ${containerId} failed to become ready after ${maxAttempts * delay}ms`);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  private async makeExecutionRequest(port: number, requestData: any): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    try {
      const response = await fetch(`http://localhost:${port}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Flow execution failed');
      }

      return result.result;
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async stopContainer(containerId: string): Promise<void> {
    return new Promise((resolve) => {
      const child = spawn('docker', ['stop', containerId], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      child.on('close', () => {
        console.log(`🛑 Container ${containerId} stopped`);
        resolve();
      });

      child.on('error', () => {
        // Ignore errors when stopping containers
        resolve();
      });
    });
  }

  private sanitizeConfig(config: ExecutionConfig): Partial<ExecutionConfig> {
    // Remove sensitive fields from config before passing to container
    const sanitized = { ...config };
    
    // Keep only safe fields
    const safeFields = ['flowId', 'userId', 'organizationId', 'maxTokens'];
    const result: Partial<ExecutionConfig> = {};
    
    safeFields.forEach(field => {
      if (sanitized[field as keyof ExecutionConfig]) {
        result[field as keyof ExecutionConfig] = sanitized[field as keyof ExecutionConfig];
      }
    });
    
    return result;
  }
}