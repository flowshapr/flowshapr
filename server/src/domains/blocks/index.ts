import { serverBlockRegistry } from './registry';
import { InputBlockDefinition } from './definitions/InputBlock';
import { AgentBlockDefinition } from './definitions/AgentBlock';
import { OutputBlockDefinition } from './definitions/OutputBlock';
import { ToolBlockDefinition } from './definitions/ToolBlock';
import { ConditionBlockDefinition } from './definitions/ConditionBlock';

/**
 * Initialize all server-side block definitions
 */
export function initializeServerBlocks() {
  // Register all block definitions
  serverBlockRegistry.register(InputBlockDefinition);
  serverBlockRegistry.register(AgentBlockDefinition);
  serverBlockRegistry.register(OutputBlockDefinition);
  serverBlockRegistry.register(ToolBlockDefinition);
  serverBlockRegistry.register(ConditionBlockDefinition);

  console.log('🚀 Server blocks initialized:', serverBlockRegistry.getStats());
}

export { serverBlockRegistry } from './registry';
export { BlocksService } from './services/BlocksService';
export { CodeGeneratorService } from './services/CodeGeneratorService';
export * from './types';