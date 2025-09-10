import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ExecutionConfig, ExecutionResult, ProcessExecutorConfig } from './types.js';

export class ProcessExecutor {
  private config: ProcessExecutorConfig;
  private activeProcesses: Set<string> = new Set();

  constructor(config?: Partial<ProcessExecutorConfig>) {
    this.config = {
      timeout: 60000, // 60 seconds default
      maxConcurrentProcesses: 10,
      tempDir: path.join(process.cwd(), 'temp'),
      ...config
    };
  }

  async initialize(): Promise<void> {
    // Create temp directory if it doesn't exist
    try {
      await fs.mkdir(this.config.tempDir, { recursive: true });
      console.log(`📁 Process executor temp directory created at ${this.config.tempDir}`);
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async shutdown(): Promise<void> {
    // Clean up any remaining temp files
    try {
      const files = await fs.readdir(this.config.tempDir);
      const tempFiles = files.filter(file => file.startsWith('temp-') && file.endsWith('.js'));
      
      for (const file of tempFiles) {
        try {
          await fs.unlink(path.join(this.config.tempDir, file));
        } catch {
          // Ignore cleanup errors
        }
      }
      
      console.log(`🧹 Process executor cleaned up ${tempFiles.length} temp files`);
    } catch {
      // Ignore cleanup errors
    }
  }

  getStatus() {
    return {
      initialized: true,
      activeProcesses: this.activeProcesses.size,
      maxConcurrentProcesses: this.config.maxConcurrentProcesses
    };
  }

  async executeFlow(code: string, input: any, config: ExecutionConfig = {}): Promise<ExecutionResult> {
    const startTime = Date.now();
    const executionId = `exec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    // Check concurrent process limit
    if (this.activeProcesses.size >= this.config.maxConcurrentProcesses) {
      return {
        success: false,
        error: 'Maximum concurrent processes reached',
        meta: {
          instance: executionId,
          duration: Date.now() - startTime
        }
      };
    }

    // Generate unique filename
    const filename = `temp-${crypto.randomBytes(8).toString('hex')}.js`;
    const filepath = path.join(this.config.tempDir, filename);

    this.activeProcesses.add(executionId);

    try {
      // Write code to temp file
      await fs.writeFile(filepath, code);
      
      console.log(`🚀 Executing Genkit flow in child process: ${filename}`);

      // Execute with timeout
      const result = await this.executeChildProcess(filepath, input, config, executionId);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Flow executed successfully in ${duration}ms`);

      return {
        success: true,
        result: result,
        meta: {
          instance: executionId,
          duration
        }
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ Flow execution failed in ${duration}ms:`, error.message);

      return {
        success: false,
        error: error.message,
        meta: {
          instance: executionId,
          duration
        }
      };
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(filepath);
      } catch {
        // Ignore cleanup errors
      }
      
      this.activeProcesses.delete(executionId);
    }
  }

  async *streamFlow(code: string, input: any, config: ExecutionConfig = {}): AsyncGenerator<any> {
    const startTime = Date.now();
    const executionId = `stream_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    // Check concurrent process limit
    if (this.activeProcesses.size >= this.config.maxConcurrentProcesses) {
      yield {
        event: 'error',
        data: {
          error: 'Maximum concurrent processes reached',
          instance: executionId,
          duration: Date.now() - startTime
        }
      };
      return;
    }

    // Generate unique filename
    const filename = `temp-${crypto.randomBytes(8).toString('hex')}.js`;
    const filepath = path.join(this.config.tempDir, filename);

    this.activeProcesses.add(executionId);

    try {
      // Write code to temp file
      await fs.writeFile(filepath, code);
      
      console.log(`🌊 Streaming Genkit flow in child process: ${filename}`);

      yield {
        event: 'progress',
        data: { message: 'Executing flow...', instance: executionId }
      };

      // Execute with streaming
      const result = await this.executeChildProcess(filepath, input, config, executionId);
      
      const duration = Date.now() - startTime;

      yield {
        event: 'complete',
        data: {
          result: result,
          instance: executionId,
          duration
        }
      };

      console.log(`✅ Flow streamed successfully in ${duration}ms`);

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ Stream execution failed in ${duration}ms:`, error.message);

      yield {
        event: 'error',
        data: {
          error: error.message,
          instance: executionId,
          duration
        }
      };
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(filepath);
      } catch {
        // Ignore cleanup errors
      }
      
      this.activeProcesses.delete(executionId);
    }
  }

  private async executeChildProcess(filepath: string, input: any, config: ExecutionConfig, executionId: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        // Get the current server port from environment or config
        const serverPort = process.env.PORT || '3001';
        
        // Create execution context following Genkit best practices
        const executionContext = {
          auth: {
            uid: config.userId || 'anonymous',
            token: config.authToken ? { decoded: 'placeholder' } : null,
            rawToken: config.authToken || null
          },
          execution: {
            flowId: config.flowId || executionId,
            organizationId: config.organizationId || null,
            executionId: executionId,
            timestamp: new Date().toISOString()
          },
          security: {
            allowedProviders: this.getAllowedProviders(config),
            rateLimits: {
              maxTokens: config.maxTokens || 10000,
              timeout: this.config.timeout
            }
          },
          telemetry: {
            enabled: true,
            serverUrl: `http://localhost:${serverPort}/telemetry`
          }
        };
        
        // Prepare environment variables with API keys set BEFORE child process starts
        const env: NodeJS.ProcessEnv = {
          ...process.env,
          NODE_ENV: 'production',
          // Pass input, config, and context as environment variables
          FLOW_INPUT: JSON.stringify(input),
          FLOW_CONFIG: JSON.stringify(config),
          FLOW_CONTEXT: JSON.stringify(executionContext),
          // Configure Genkit telemetry to send traces to our server
          GENKIT_TELEMETRY_SERVER: `http://localhost:${serverPort}/telemetry`,
          GENKIT_ENV: 'dev'
        };

        // Add API keys to environment BEFORE spawning child process
        if (config.googleApiKey) {
          // Set all supported env var names for Google Generative AI
          env.GEMINI_API_KEY = config.googleApiKey;
          env.GOOGLE_API_KEY = config.googleApiKey;
          (env as any).GOOGLE_GENAI_API_KEY = config.googleApiKey;
        }
        if (config.openaiApiKey) {
          env.OPENAI_API_KEY = config.openaiApiKey;
        }
        if (config.anthropicApiKey) {
          env.ANTHROPIC_API_KEY = config.anthropicApiKey;
        }

        console.log(`🔒 [CONTEXT] Execution context for ${executionId}:`, JSON.stringify(executionContext, null, 2));

        // Convert .js to .mjs for ES module support
        const mjsFilepath = filepath.replace('.js', '.mjs');
        await fs.rename(filepath, mjsFilepath);
        // Ensure our local genkit shim takes precedence for provider packages
        const shimNodePath = path.join(process.cwd(), 'server', 'shims', 'node_modules');
        env.NODE_PATH = env.NODE_PATH ? `${shimNodePath}:${env.NODE_PATH}` : shimNodePath;
        const child = spawn('node', [mjsFilepath], {
          env,
          cwd: process.cwd(), // keep server root; NODE_PATH will surface our shim
          timeout: this.config.timeout,
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        let output = '';
        let error = '';

        child.stdout?.on('data', (data) => {
          const text = data.toString();
          output += text;
          // Forward child process logs to main console
          console.log(`[Child Process] ${text.trim()}`);
        });

        child.stderr?.on('data', (data) => {
          const text = data.toString();
          error += text;
          // Forward child process errors to main console
          console.error(`[Child Process ERROR] ${text.trim()}`);
        });

        child.on('close', async (code) => {
          // Clean up file
          try {
            //await fs.unlink(mjsFilepath);
          } catch {
            // Ignore cleanup errors
          }

          if (code === 0) {
            try {
              // The generated code should return the result directly
              // Look for the last line that could be JSON
              const lines = output.trim().split('\n');
              let result = lines[lines.length - 1];
              
              // If it's not JSON, treat the entire output as the result
              try {
                result = JSON.parse(result);
              } catch {
                result = output.trim();
              }
              
              resolve(result);
            } catch (parseError) {
              reject(new Error(`Failed to parse execution result: ${output}`));
            }
          } else {
            const errorMsg = error || `Child process exited with code ${code}`;
            reject(new Error(errorMsg));
          }
        });

        child.on('error', async (err) => {
          // Clean up file
          try {
            //await fs.unlink(mjsFilepath);
          } catch {
            // Ignore cleanup errors
          }
          reject(err);
        });

      } catch (err) {
        reject(err);
      }
    });
  }

  private getAllowedProviders(config: ExecutionConfig): string[] {
    const providers: string[] = [];
    
    if (config.googleApiKey) providers.push('googleai');
    if (config.openaiApiKey) providers.push('openai'); 
    if (config.anthropicApiKey) providers.push('anthropic');
    
    return providers;
  }
}
