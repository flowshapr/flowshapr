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
    // Extract API keys from config and set as environment variables
    if (config.googleApiKey) {
      process.env.GEMINI_API_KEY = config.googleApiKey;
      process.env.GOOGLE_API_KEY = config.googleApiKey; // Some providers use this variant
    }
    if (config.openaiApiKey) {
      process.env.OPENAI_API_KEY = config.openaiApiKey;
    }
    if (config.anthropicApiKey) {
      process.env.ANTHROPIC_API_KEY = config.anthropicApiKey;
    }
    
    // Log available API keys for debugging
    const apiKeys = {
      google: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY
    };
    
    console.log('🔑 API keys from config:', {
      google: apiKeys.google ? '✅ Set' : '❌ Missing',
      openai: apiKeys.openai ? '✅ Set' : '❌ Missing', 
      anthropic: apiKeys.anthropic ? '✅ Set' : '❌ Missing'
    });
    
    // Set execution environment
    process.env.NODE_ENV = 'production';
    process.env.NODE_PATH = '/app/node_modules';
    process.env.FLOW_INPUT = JSON.stringify(input);
    process.env.FLOW_CONFIG = JSON.stringify(config);
  }

  async executeGenkitFlow(code, input, executionId) {
    const tempDir = '/app/flows';
    const moduleId = `flow_${executionId}`;
    const codePath = path.join(tempDir, `${moduleId}.mjs`);
    
    try {
      // Create temp directory
      await fs.mkdir(tempDir, { recursive: true });
      
      // Write the code to temp file
      await fs.writeFile(codePath, code);
      console.log(`📝 Created temp flow file: ${codePath}`);
      
      // Dynamic import the generated flow
      const flowModule = await import(codePath);
      
      // Execute the generated Genkit flow (exported as default)
      if (typeof flowModule.default !== 'function') {
        throw new Error('Generated code must export a Genkit flow as default export');
      }
      
      const result = await flowModule.default(input);
      console.log(`✅ Flow execution completed: ${executionId}`);
      
      return result;
      
    } catch (error) {
      console.error(`❌ Flow execution error in ${executionId}:`, error.message);
      throw error;
    } finally {
      // Always cleanup temp file in finally block
      try {
        await fs.unlink(codePath);
        console.log(`🗑️  Cleaned up temp file: ${codePath}`);
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to cleanup temp file ${codePath}: ${cleanupError.message}`);
      }
    }
  }

  async cleanupTempFiles() {
    const tempDir = '/app/flows';
    try {
      const files = await fs.readdir(tempDir);
      const flowFiles = files.filter(file => file.startsWith('flow_') && file.endsWith('.mjs'));
      
      if (flowFiles.length > 0) {
        console.log(`🗑️  Cleaning up ${flowFiles.length} leftover temp files...`);
        for (const file of flowFiles) {
          try {
            await fs.unlink(path.join(tempDir, file));
            console.log(`   Removed: ${file}`);
          } catch (error) {
            console.warn(`   Failed to remove: ${file}`);
          }
        }
      }
    } catch (error) {
      // Temp directory doesn't exist yet, which is fine
      console.log('📁 Temp directory will be created on first execution');
    }
  }

  async start() {
    // Clean up any leftover temp files from previous runs
    await this.cleanupTempFiles();
    
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