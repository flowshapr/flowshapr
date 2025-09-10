#!/usr/bin/env node

// Simple test script for the container pool
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

async function testContainerPool() {
  console.log('🧪 Testing Container Pool...');
  
  const executionId = `test_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  
  // Simple test code that should work
  const testCode = `
// Test Genkit flow
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI()],
});

// Simple flow that returns a greeting
const greetFlow = ai.defineFlow(
  {
    name: 'greetFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (name) => {
    return \`Hello, \${name}! The container pool is working!\`;
  }
);

// Execute the flow
const result = await greetFlow('Container Pool Test');
console.log(JSON.stringify(result));
`;

  const testInput = 'Container Pool Test';
  const testConfig = {};

  // Write execution request to container 1
  const workPath = '/var/lib/docker/volumes/genkit-builder_executor_work_1/_data';
  const resultsPath = '/var/lib/docker/volumes/genkit-builder_executor_results_1/_data';
  
  const requestFile = path.join(workPath, `exec_${executionId}.json`);
  const resultFile = path.join(resultsPath, `result_${executionId}.json`);

  try {
    console.log(`📝 Writing test request: ${executionId}`);
    
    const requestData = {
      code: testCode,
      input: testInput,
      config: testConfig
    };

    await fs.writeFile(requestFile, JSON.stringify(requestData, null, 2));
    
    console.log('⏳ Waiting for result...');
    
    // Wait for result (with timeout)
    const timeout = Date.now() + 30000; // 30 seconds
    
    while (Date.now() < timeout) {
      try {
        const resultData = await fs.readFile(resultFile, 'utf8');
        const result = JSON.parse(resultData);
        
        console.log('✅ Container pool test successful!');
        console.log('📋 Result:', result);
        
        // Clean up
        try {
          await fs.unlink(resultFile);
        } catch {}
        
        return true;
        
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        
        // Wait before trying again
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw new Error('Test timeout - no result received');
    
  } catch (error) {
    console.error('❌ Container pool test failed:', error.message);
    
    // Clean up
    try {
      await fs.unlink(requestFile);
    } catch {}
    
    return false;
  }
}

testContainerPool()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test script error:', error);
    process.exit(1);
  });