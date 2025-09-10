import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ExecutionConfig, ExecutionResult, ContainerExecutorConfig } from './types.js';
import { ContainerManager } from './ContainerManager.js';

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
      networkMode: 'none', // Disable network access by default
      ...config
    };
    
    this.containerManager = new ContainerManager();
  }

  async initialize(): Promise<void> {
    // Create temp directory if it doesn't exist
    try {
      await fs.mkdir(this.config.tempDir, { recursive: true });
      console.log(`📁 Container executor temp directory created at ${this.config.tempDir}`);
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }

    // Build Docker image if it doesn't exist
    await this.buildDockerImage();
  }

  async shutdown(): Promise<void> {
    // Shutdown container manager (this handles stopping containers)
    await this.containerManager.shutdown();

    // Clean up temp files
    try {
      const files = await fs.readdir(this.config.tempDir);
      const tempFiles = files.filter(file => file.startsWith('flow-') && file.endsWith('.mjs'));
      
      for (const file of tempFiles) {
        try {
          await fs.unlink(path.join(this.config.tempDir, file));
        } catch {
          // Ignore cleanup errors
        }
      }
      
      console.log(`🧹 Container executor cleaned up ${tempFiles.length} temp files`);
    } catch {
      // Ignore cleanup errors
    }
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

    // Code sanitization temporarily disabled for debugging
    const sanitizedCode = code;
    
    // Generate unique filename
    const filename = `flow-${crypto.randomBytes(8).toString('hex')}.mjs`;
    const filepath = path.join(this.config.tempDir, filename);
    const containerId = `flowshapr-${executionId}`;

    this.activeContainers.add(containerId);
    this.containerManager.registerContainer(containerId, `flow-${executionId}`);

    try {
      // Write sanitized code to temp file
      await fs.writeFile(filepath, sanitizedCode);
      
      console.log(`🐳 Executing Genkit flow in secure container: ${containerId}`);

      // Execute in container with strict security
      const result = await this.executeInContainer(filepath, input, config, containerId);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Flow executed successfully in container ${duration}ms`);

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
      // Clean up temp file and container
      try {
        await fs.unlink(filepath);
      } catch {
        // Ignore cleanup errors
      }
      
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

  private async executeInContainer(
    filepath: string, 
    input: any, 
    config: ExecutionConfig, 
    containerId: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const serverPort = process.env.PORT || '3001';
      
      // Prepare secure environment variables (only what's needed)
      const secureEnv = [
        `NODE_ENV=production`,
        `FLOW_INPUT=${JSON.stringify(input)}`,
        `FLOW_CONFIG=${JSON.stringify(this.sanitizeConfig(config))}`,
        // Only pass specific API keys, not entire process.env
      ];

      // Add only the API keys that are explicitly provided
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
        '--network', this.config.networkMode, // Disable network
        '--memory', this.config.memoryLimit, // Memory limit
        '--cpus', this.config.cpuLimit, // CPU limit
        '--user', '1001:1001', // Run as non-root user
        '--read-only', // Read-only filesystem
        '--tmpfs', '/tmp:noexec,nosuid,size=10m', // Small temp directory
        '--security-opt', 'no-new-privileges:true', // Prevent privilege escalation
        '--security-opt', `seccomp=${path.join(process.cwd(), 'docker', 'execution', 'security', 'seccomp.json')}`,
        '--cap-drop', 'ALL', // Drop all capabilities
        '--pids-limit', '10', // Limit number of processes
        '--ulimit', 'nofile=64:64', // Limit file descriptors
        '--ulimit', 'nproc=10:10', // Limit number of processes
        // Mount the flow file as read-only
        '-v', `${filepath}:/tmp/execution/flow.mjs:ro`,
      ];

      // Add environment variables
      secureEnv.forEach(env => {
        dockerArgs.push('-e', env);
      });

      // Add image name
      dockerArgs.push(this.config.imageName);

      console.log(`🔒 Starting secure container with ID: ${containerId}`);
      this.containerManager.updateContainerStatus(containerId, 'running');

      const child = spawn('docker', dockerArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: this.config.timeout
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
          this.containerManager.updateContainerStatus(containerId, 'stopped');
          try {
            // Parse the result from container output
            const lines = output.trim().split('\n');
            let result = lines[lines.length - 1];
            
            try {
              result = JSON.parse(result);
            } catch {
              result = output.trim();
            }
            
            resolve(result);
          } catch (parseError) {
            this.containerManager.updateContainerStatus(containerId, 'failed', parseError.message);
            reject(new Error(`Failed to parse container result: ${output}`));
          }
        } else {
          const errorMsg = error || `Container exited with code ${code}`;
          this.containerManager.updateContainerStatus(containerId, 'failed', errorMsg);
          reject(new Error(errorMsg));
        }
      });

      child.on('error', (err) => {
        this.containerManager.updateContainerStatus(containerId, 'failed', err.message);
        reject(err);
      });

      // Set up timeout to force-kill container if needed
      setTimeout(async () => {
        try {
          await this.stopContainer(containerId);
          reject(new Error('Container execution timed out'));
        } catch {
          // Container may have already stopped
        }
      }, this.config.timeout);
    });
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