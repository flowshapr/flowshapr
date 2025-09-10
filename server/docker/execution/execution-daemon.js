#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

const WORK_DIR = process.env.WORK_DIR || '/app/work';
const RESULTS_DIR = process.env.RESULTS_DIR || '/app/results';
const EXECUTOR_ID = process.env.EXECUTOR_ID || 'executor-unknown';
const POLL_INTERVAL = 1000; // 1 second

console.log(`🚀 Starting Genkit Execution Daemon (${EXECUTOR_ID})`);
console.log(`   Work Directory: ${WORK_DIR}`);
console.log(`   Results Directory: ${RESULTS_DIR}`);

class ExecutionDaemon {
  constructor() {
    this.isRunning = true;
    this.currentExecution = null;
    this.setupSignalHandlers();
  }

  async initialize() {
    // Ensure directories exist
    await fs.mkdir(WORK_DIR, { recursive: true });
    await fs.mkdir(RESULTS_DIR, { recursive: true });
    
    // Create ready file to signal container is ready
    await fs.writeFile(path.join(WORK_DIR, '.ready'), EXECUTOR_ID);
    
    console.log(`✅ Daemon initialized and ready for work`);
  }

  setupSignalHandlers() {
    process.on('SIGTERM', async () => {
      console.log('📡 Received SIGTERM, shutting down gracefully...');
      this.isRunning = false;
      if (this.currentExecution) {
        console.log('⏳ Waiting for current execution to complete...');
        // Let current execution finish
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('📡 Received SIGINT, shutting down gracefully...');
      this.isRunning = false;
      process.exit(0);
    });
  }

  async start() {
    await this.initialize();
    
    while (this.isRunning) {
      try {
        await this.pollForWork();
      } catch (error) {
        console.error(`❌ Error in daemon loop:`, error);
      }
      
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
  }

  async pollForWork() {
    try {
      const files = await fs.readdir(WORK_DIR);
      
      // Look for execution request files (format: exec_<id>.json)
      const execFiles = files.filter(file => 
        file.startsWith('exec_') && file.endsWith('.json') && !file.includes('.processing')
      );

      if (execFiles.length > 0) {
        // Process the first available execution
        const execFile = execFiles[0];
        await this.processExecution(execFile);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`❌ Error polling for work:`, error);
      }
    }
  }

  async processExecution(execFile) {
    const execPath = path.join(WORK_DIR, execFile);
    const processingPath = path.join(WORK_DIR, execFile + '.processing');
    const executionId = execFile.replace('exec_', '').replace('.json', '');
    
    try {
      console.log(`🔄 Processing execution: ${executionId}`);
      this.currentExecution = executionId;

      // Rename file to indicate we're processing it
      await fs.rename(execPath, processingPath);

      // Read execution request
      const requestData = JSON.parse(await fs.readFile(processingPath, 'utf8'));
      const { code, input, config, flowId } = requestData;

      // Write the code to a temporary file
      const codeFile = `flow_${executionId}.mjs`;
      const codePath = path.join(WORK_DIR, codeFile);
      await fs.writeFile(codePath, code);

      console.log(`⚡ Executing flow ${flowId || executionId}...`);
      
      // Execute the flow
      const result = await this.executeFlow(codePath, input, config);
      
      // Write result
      const resultPath = path.join(RESULTS_DIR, `result_${executionId}.json`);
      await fs.writeFile(resultPath, JSON.stringify(result, null, 2));

      console.log(`✅ Execution ${executionId} completed successfully`);

      // Cleanup
      await this.cleanup(processingPath, codePath);
      
    } catch (error) {
      console.error(`❌ Execution ${executionId} failed:`, error.message);
      
      // Write error result
      const errorResult = {
        success: false,
        error: error.message,
        executionId,
        timestamp: new Date().toISOString()
      };
      
      const resultPath = path.join(RESULTS_DIR, `result_${executionId}.json`);
      await fs.writeFile(resultPath, JSON.stringify(errorResult, null, 2));
      
      // Cleanup
      try {
        await this.cleanup(processingPath, path.join(WORK_DIR, `flow_${executionId}.mjs`));
      } catch (cleanupError) {
        console.error(`⚠️  Cleanup failed:`, cleanupError.message);
      }
    } finally {
      this.currentExecution = null;
    }
  }

  async executeFlow(codePath, input, config) {
    return new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      
      // Prepare environment
      const env = {
        ...process.env,
        FLOW_INPUT: JSON.stringify(input),
        FLOW_CONFIG: JSON.stringify(config),
        NODE_ENV: 'production'
      };

      // Add API keys from config
      if (config.googleApiKey) {
        env.GEMINI_API_KEY = config.googleApiKey;
        env.GOOGLE_API_KEY = config.googleApiKey;
        env.GOOGLE_GENAI_API_KEY = config.googleApiKey;
      }
      if (config.openaiApiKey) {
        env.OPENAI_API_KEY = config.openaiApiKey;
      }
      if (config.anthropicApiKey) {
        env.ANTHROPIC_API_KEY = config.anthropicApiKey;
      }

      console.log(`🎯 Spawning Node.js process for: ${codePath}`);
      
      const child = spawn('node', [codePath], {
        env,
        cwd: WORK_DIR,
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 120000 // 2 minutes timeout
      });

      let output = '';
      let error = '';

      child.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log(`[Flow Output] ${text.trim()}`);
      });

      child.stderr.on('data', (data) => {
        const text = data.toString();
        error += text;
        console.error(`[Flow Error] ${text.trim()}`);
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            // Try to parse the last line as JSON result
            const lines = output.trim().split('\n');
            let result = lines[lines.length - 1];
            
            try {
              result = JSON.parse(result);
            } catch {
              // If not JSON, use the entire output
              result = output.trim();
            }
            
            resolve({
              success: true,
              result: result,
              executionId: this.currentExecution,
              timestamp: new Date().toISOString()
            });
          } catch (parseError) {
            reject(new Error(`Failed to parse execution result: ${output}`));
          }
        } else {
          const errorMsg = error || `Process exited with code ${code}`;
          reject(new Error(errorMsg));
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });
  }

  async cleanup(processingPath, codePath) {
    try {
      await fs.unlink(processingPath);
    } catch (error) {
      console.warn(`⚠️  Failed to cleanup processing file: ${error.message}`);
    }
    
    try {
      await fs.unlink(codePath);
    } catch (error) {
      console.warn(`⚠️  Failed to cleanup code file: ${error.message}`);
    }
  }
}

// Start the daemon
const daemon = new ExecutionDaemon();
daemon.start().catch(error => {
  console.error('💥 Daemon failed to start:', error);
  process.exit(1);
});