// Export all types and interfaces
export * from './types';
export * from './registry';

// Export base classes
export * from './base/BaseBlock';
export * from './base/GenkitBlock';

// Export templates
export * from './genkit/templates';

// Export code generator
export * from '../code-generator/BlockCodeGenerator';

// Export core blocks
export { InputBlock } from './core/InputBlock';
export { ModelBlock } from './core/ModelBlock';
export { OutputBlock } from './core/OutputBlock';
export { ToolBlock } from './core/ToolBlock';

// Export advanced blocks
export { TransformBlock } from './advanced/TransformBlock';
export { ConditionalBlock } from './advanced/ConditionalBlock';

// Registry setup and initialization
import { blockRegistry } from './registry';
import { InputBlock } from './core/InputBlock';
import { ModelBlock } from './core/ModelBlock';
import { OutputBlock } from './core/OutputBlock';
import { ToolBlock } from './core/ToolBlock';
import { TransformBlock } from './advanced/TransformBlock';
import { ConditionalBlock } from './advanced/ConditionalBlock';

/**
 * Initialize and register all built-in blocks
 */
export function initializeBlocks() {
  // Clear any existing registrations
  blockRegistry.clear();

  // Register core blocks
  blockRegistry.register(new InputBlock());
  blockRegistry.register(new ModelBlock());
  blockRegistry.register(new OutputBlock());
  blockRegistry.register(new ToolBlock());

  // Register advanced blocks
  blockRegistry.register(new TransformBlock());
  blockRegistry.register(new ConditionalBlock());

  console.log('Initialized blocks registry with', blockRegistry.getStats());
}

// Auto-initialize blocks when this module is imported
initializeBlocks();