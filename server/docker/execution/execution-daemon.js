#!/usr/bin/env node

const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const PORT = process.env.PORT || 3000;
const EXECUTOR_ID = process.env.EXECUTOR_ID || 'executor-unknown';

console.log(`🚀 Starting Genkit HTTP Execution Server (${EXECUTOR_ID})`);
console.log(`   Listening on port: ${PORT}`);

class GenkitExecutionServer {
  constructor() {
    this.app = express();
    this.flowCache = new Map();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSignalHandlers();
  }

  setupMiddleware() {
    // Parse JSON requests
    this.app.use(express.json({ limit: '10mb' }));
    
    // Basic logging
    this.app.use((req, res, next) => {
      console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        executorId: EXECUTOR_ID,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // Flow execution endpoint
    this.app.post('/execute', async (req, res) => {
      try {
        const result = await this.executeFlow(req.body);
        res.json(result);
      } catch (error) {
        console.error(`❌ Execution failed:`, error.message);
        res.status(500).json({
          success: false,
          error: error.message,
          executorId: EXECUTOR_ID,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Shutdown endpoint (for graceful container shutdown)
    this.app.post('/shutdown', (req, res) => {
      console.log('📡 Received shutdown request');
      res.json({ status: 'shutting down' });
      setTimeout(() => process.exit(0), 1000);
    });
  }

  setupSignalHandlers() {
    process.on('SIGTERM', () => {
      console.log('📡 Received SIGTERM, shutting down gracefully...');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('📡 Received SIGINT, shutting down gracefully...');
      process.exit(0);
    });
  }

  async executeFlow(requestData) {
    const { code, input, config, flowId, executionId: providedExecutionId } = requestData;
    const executionId = providedExecutionId || `exec_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    
    console.log(`⚡ Executing flow ${flowId || executionId}...`);
    
    try {
      // Set up environment variables for API keys
      this.setupEnvironmentFromConfig(config, input);
      
      // Execute the generated Genkit flow code directly
      const result = await this.executeGenkitFlow(code, input, executionId);
      
      console.log(`✅ Execution ${executionId} completed successfully`);
      
      return {
        success: true,
        result: result,
        executionId,
        executorId: EXECUTOR_ID,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`❌ Execution ${executionId} failed:`, error.message);
      
      return {
        success: false,
        error: error.message,
        executionId,
        executorId: EXECUTOR_ID,
        timestamp: new Date().toISOString()
      };
    }
  }

  setupEnvironmentFromConfig(config, input) {
    // Set API keys from config
    if (config.googleApiKey) {
      process.env.GEMINI_API_KEY = config.googleApiKey;
      process.env.GOOGLE_API_KEY = config.googleApiKey;
      process.env.GOOGLE_GENAI_API_KEY = config.googleApiKey;
    }
    if (config.openaiApiKey) {
      process.env.OPENAI_API_KEY = config.openaiApiKey;
    }
    if (config.anthropicApiKey) {
      process.env.ANTHROPIC_API_KEY = config.anthropicApiKey;
    }
    
    // Set execution environment
    process.env.NODE_ENV = 'production';
    process.env.NODE_PATH = '/app/node_modules';
    process.env.FLOW_INPUT = JSON.stringify(input);
    process.env.FLOW_CONFIG = JSON.stringify(config);
  }

  async executeGenkitFlow(code, input, executionId) {
    try {
      // Create a unique module identifier to avoid caching issues
      const moduleId = `flow_${executionId}`;
      
      // Write the code to app directory where node_modules is available
      const tempDir = '/app/flows';
      await fs.mkdir(tempDir, { recursive: true });
      
      const codePath = path.join(tempDir, `${moduleId}.mjs`);
      await fs.writeFile(codePath, code);
      
      // Dynamic import the generated flow
      const flowModule = await import(codePath);
      
      // Look for the flow execution function
      // The generated code should export a function or have a specific pattern
      let result;
      
      if (typeof flowModule.default === 'function') {
        // If default export is a function, call it with input
        result = await flowModule.default(input);
      } else if (flowModule.executeFlow && typeof flowModule.executeFlow === 'function') {
        // If there's an executeFlow function, use it
        result = await flowModule.executeFlow(input);
      } else if (flowModule.ai && flowModule.flows && Array.isArray(flowModule.flows)) {
        // If we have Genkit flows defined, execute the first one
        const flow = flowModule.flows[0];
        if (flow) {
          result = await flow(input);
        } else {
          throw new Error('No executable flows found in generated code');
        }
      } else {
        // Try to find any exported function that could be a flow
        const exportedFunctions = Object.keys(flowModule).filter(key => 
          typeof flowModule[key] === 'function' && !key.startsWith('_')
        );
        
        if (exportedFunctions.length > 0) {
          const flowFunction = flowModule[exportedFunctions[0]];
          result = await flowFunction(input);
        } else {
          throw new Error('No executable function found in generated code');
        }
      }
      
      // Cleanup temp file
      try {
        await fs.unlink(codePath);
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup temp file: ${error.message}`);
      }
      
      return result;
      
    } catch (error) {
      // Enhanced error handling for common issues
      if (error.message.includes('Cannot resolve module')) {
        throw new Error(`Missing dependency: ${error.message}`);
      } else if (error.message.includes('SyntaxError')) {
        throw new Error(`Code syntax error: ${error.message}`);
      } else if (error.message.includes('API_KEY')) {
        throw new Error(`Missing API key: ${error.message}`);
      } else {
        throw error;
      }
    }
  }

  async start() {
    return new Promise((resolve) => {
      const server = this.app.listen(PORT, () => {
        console.log(`✅ Genkit HTTP Execution Server ready on port ${PORT}`);
        console.log(`   Health check: http://localhost:${PORT}/health`);
        console.log(`   Execute endpoint: http://localhost:${PORT}/execute`);
        resolve(server);
      });

      server.on('error', (error) => {
        console.error('💥 Server failed to start:', error);
        process.exit(1);
      });
    });
  }
}

// Start the server
const server = new GenkitExecutionServer();
server.start().catch(error => {
  console.error('💥 Failed to start execution server:', error);
  process.exit(1);
});