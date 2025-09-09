#!/usr/bin/env tsx

/**
 * Simple test to verify the new block system works
 */

import { initializeBlocks, blockRegistry, BlockCodeGenerator } from './src/lib/blocks';
import { BlockInstance, FlowEdge } from './src/lib/blocks/types';

// Initialize the blocks
console.log('🚀 Initializing new block system...');
initializeBlocks();

console.log('📊 Registry stats:', blockRegistry.getStats());
console.log('📋 Available blocks:', blockRegistry.getTypes());

// Create a simple flow: Input -> Model -> Output
console.log('\n🔧 Creating test flow...');

const blocks: BlockInstance[] = [
  {
    id: 'input-1',
    blockType: 'input',
    position: { x: 0, y: 0 },
    selected: false,
    config: {
      inputType: 'variable',
      variableName: 'userQuery',
      variableDescription: 'The user\'s question'
    },
    inputs: [],
    outputs: [],
    state: 'idle',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1
  },
  {
    id: 'model-1',
    blockType: 'model',
    position: { x: 300, y: 0 },
    selected: false,
    config: {
      provider: 'googleai',
      model: 'gemini-2.5-flash',
      systemPrompt: 'You are a helpful assistant.',
      userPrompt: 'Please answer this question: {{userQuery}}',
      temperature: 0.7,
      maxTokens: 1000
    },
    inputs: [],
    outputs: [],
    state: 'idle',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1
  },
  {
    id: 'output-1',
    blockType: 'output',
    position: { x: 600, y: 0 },
    selected: false,
    config: {
      format: 'text'
    },
    inputs: [],
    outputs: [],
    state: 'idle',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1
  }
];

const edges: FlowEdge[] = [
  {
    id: 'edge-1',
    source: 'input-1',
    target: 'model-1'
  },
  {
    id: 'edge-2',
    source: 'model-1',
    target: 'output-1'
  }
];

const variables = [
  {
    name: 'userQuery',
    type: 'string' as const,
    description: 'The user\'s question'
  }
];

// Generate code
console.log('⚙️ Generating code...');
const generator = new BlockCodeGenerator(blocks, edges, variables);
const result = generator.generate();

if (result.isValid) {
  console.log('✅ Code generation successful!');
  console.log('\n📄 Generated Code:');
  console.log('=' .repeat(80));
  console.log(result.code);
  console.log('=' .repeat(80));
} else {
  console.log('❌ Code generation failed!');
  console.log('Errors:', result.errors);
}

console.log('\n🎉 Test completed!');