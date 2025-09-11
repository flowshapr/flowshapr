# SimStudio AI Node/Block Architecture

## Core Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          SIMSTUDIO NODE SYSTEM                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   Registry   │◄───│ Block Config │◄───│   Block UI   │          │
│  │   Pattern    │    │  Definition  │    │  Component   │          │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘          │
│         │                   │                    │                   │
│         ▼                   ▼                    ▼                   │
│  ┌──────────────────────────────────────────────────────┐          │
│  │                  WORKFLOW CANVAS                      │          │
│  │                   (ReactFlow)                         │          │
│  └──────────────────────────────────────────────────────┘          │
│         │                                                           │
│         ▼                                                           │
│  ┌──────────────────────────────────────────────────────┐          │
│  │              EXECUTION ENGINE                         │          │
│  │            (Socket.io + Next.js API)                  │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## 1. Block Configuration Structure (`BlockConfig<T>`)

```typescript
interface BlockConfig<T = any> {
  // Core Identity
  type: string;                    // Unique identifier (e.g., 'agent', 'function', 'api')
  name: string;                    // Display name in UI
  description: string;             // Short description
  longDescription?: string;        // Detailed explanation
  
  // Visual Properties
  category: 'llm' | 'tools' | 'logic' | 'data' | 'workflow';
  bgColor: string;                 // Background color (hex)
  icon: React.ComponentType;       // Icon component reference
  
  // Authentication
  provider?: string;               // OAuth provider ID (e.g., 'openai', 'slack')
  
  // Configuration
  subBlocks: SubBlock[];           // UI configuration elements
  
  // Execution
  execute?: (params: ExecutionParams<T>) => Promise<T>;
  transformResponse?: (response: any) => T;
  transformError?: (error: any) => Error;
  
  // Validation
  validateConfig?: (config: any) => ValidationResult;
  
  // Metadata
  version?: string;                // Block version
  deprecated?: boolean;            // Deprecation flag
  experimental?: boolean;          // Feature flag
}
```

## 2. SubBlock Configuration System

```typescript
interface SubBlock {
  id: string;                      // Unique subblock ID
  type: SubBlockType;              // UI control type
  label: string;                   // Display label
  placeholder?: string;            // Input placeholder
  required?: boolean;              // Validation flag
  defaultValue?: any;              // Default value
  
  // Type-specific configurations
  options?: SelectOption[];        // For select/radio types
  min?: number;                    // For number inputs
  max?: number;                    // For number inputs
  multiline?: boolean;             // For text inputs
  
  // Dynamic behavior
  visibleWhen?: (config: any) => boolean;
  enabledWhen?: (config: any) => boolean;
  
  // Validation
  validate?: (value: any) => string | null;
}

enum SubBlockType {
  TEXT = 'text',
  NUMBER = 'number',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  CODE = 'code',
  JSON = 'json',
  MODEL_SELECTOR = 'model',
  TOOL_SELECTOR = 'tools',
  PROMPT = 'prompt',
  SCHEMA = 'schema'
}
```

## 3. Node Instance Runtime Structure

```typescript
interface NodeInstance {
  // Identity
  id: string;                      // Unique instance ID (UUID)
  blockType: string;               // References BlockConfig.type
  
  // Position & Visual
  position: { x: number; y: number };
  selected: boolean;
  
  // Configuration
  config: Record<string, any>;     // User-configured values
  
  // Connections (ReactFlow)
  inputs: NodeConnection[];
  outputs: NodeConnection[];
  
  // Runtime State
  state: NodeState;
  executionResult?: any;
  error?: Error;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

interface NodeConnection {
  id: string;
  nodeId: string;                  // Connected node ID
  portId: string;                  // Port identifier
  type: 'source' | 'target';
  dataType?: string;               // Expected data type
}

enum NodeState {
  IDLE = 'idle',
  WAITING = 'waiting',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  ERROR = 'error',
  SKIPPED = 'skipped'
}
```

## 4. Execution Context & Flow

```typescript
interface ExecutionContext {
  // Workflow Context
  workflowId: string;
  executionId: string;
  
  // Variables & Data
  variables: Map<string, any>;      // Workflow variables
  blockOutputs: Map<string, any>;   // Outputs from completed blocks
  
  // Execution Path
  activePath: string[];             // Active execution path
  completedBlocks: Set<string>;     // Completed block IDs
  
  // Environment
  env: Record<string, string>;      // Environment variables
  secrets: Record<string, string>;  // Encrypted secrets
  
  // Services
  storage: StorageService;          // File/data storage
  logger: Logger;                   // Execution logging
  
  // Limits
  timeout: number;                  // Execution timeout
  memoryLimit: number;              // Memory constraint
}

interface ExecutionParams<T> {
  // Input Data
  inputs: Record<string, any>;      // Input values from connections
  config: Record<string, any>;      // Block configuration
  
  // Context
  context: ExecutionContext;
  
  // Utilities
  getVariable: (name: string) => any;
  setVariable: (name: string, value: any) => void;
  getBlockOutput: (blockId: string) => any;
  
  // Async Operations
  signal: AbortSignal;              // Cancellation signal
}
```

## 5. Registry Pattern Implementation

```typescript
// /apps/sim/blocks/registry.ts
class BlockRegistry {
  private blocks: Map<string, BlockConfig> = new Map();
  
  register(block: BlockConfig): void {
    if (this.blocks.has(block.type)) {
      throw new Error(`Block ${block.type} already registered`);
    }
    this.blocks.set(block.type, block);
  }
  
  get(type: string): BlockConfig | undefined {
    return this.blocks.get(type);
  }
  
  getAll(): BlockConfig[] {
    return Array.from(this.blocks.values());
  }
  
  getByCategory(category: string): BlockConfig[] {
    return this.getAll().filter(b => b.category === category);
  }
}

// Registration example
export const registry = new BlockRegistry();

// Auto-registration from blocks directory
import { AgentBlock } from './blocks/agent';
import { FunctionBlock } from './blocks/function';
import { APIBlock } from './blocks/api';
import { ConditionBlock } from './blocks/condition';

registry.register(AgentBlock);
registry.register(FunctionBlock);
registry.register(APIBlock);
registry.register(ConditionBlock);
```

## 6. Tool Integration System

```typescript
interface ToolConfig<TParams = any, TResponse = any> {
  // Identity
  id: string;                      // Format: provider_tool_name
  name: string;
  description: string;
  version: string;
  
  // Provider
  provider: string;                // OAuth provider ID
  
  // Parameters
  params: ParamSchema;              // Input parameters schema
  
  // Request Configuration
  request: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    endpoint: string;
    headers?: Record<string, string>;
    auth?: AuthConfig;
  };
  
  // Transform Functions
  transformRequest?: (params: TParams) => any;
  transformResponse?: (response: Response) => Promise<TResponse>;
  transformError?: (error: any) => Error;
  
  // Retry Policy
  retry?: {
    attempts: number;
    backoff: 'linear' | 'exponential';
    delay: number;
  };
}
```

## 7. Execution Engine Flow

```
┌────────────────────────────────────────────────────────┐
│                   EXECUTION FLOW                        │
├────────────────────────────────────────────────────────┤
│                                                         │
│  1. VALIDATION PHASE                                   │
│     ├─ Validate workflow structure                     │
│     ├─ Check for cycles                                │
│     └─ Verify all connections                          │
│                                                         │
│  2. INITIALIZATION PHASE                               │
│     ├─ Create execution context                        │
│     ├─ Initialize variables                            │
│     └─ Set up monitoring/logging                       │
│                                                         │
│  3. LAYER IDENTIFICATION                               │
│     ├─ Topological sort of nodes                       │
│     ├─ Group into execution layers                     │
│     └─ Identify parallelizable blocks                  │
│                                                         │
│  4. EXECUTION LOOP                                     │
│     For each layer:                                    │
│     ├─ Execute blocks in parallel                      │
│     ├─ Collect outputs                                 │
│     ├─ Update execution context                        │
│     └─ Handle errors/retries                           │
│                                                         │
│  5. ROUTING & BRANCHING                                │
│     ├─ Evaluate conditions                             │
│     ├─ Update active path                              │
│     └─ Skip non-active blocks                          │
│                                                         │
│  6. COMPLETION                                         │
│     ├─ Collect final outputs                           │
│     ├─ Clean up resources                              │
│     └─ Return results                                  │
│                                                         │
└────────────────────────────────────────────────────────┘
```

## 8. ReactFlow Integration

```typescript
// Custom node component wrapper
const BlockNode: React.FC<NodeProps> = ({ data, selected }) => {
  const blockConfig = registry.get(data.blockType);
  
  return (
    <div className={`node ${selected ? 'selected' : ''}`}
         style={{ backgroundColor: blockConfig.bgColor }}>
      
      {/* Node Header */}
      <div className="node-header">
        <blockConfig.icon />
        <span>{blockConfig.name}</span>
      </div>
      
      {/* Input Handles */}
      {data.inputs.map(input => (
        <Handle
          key={input.id}
          type="target"
          position={Position.Left}
          id={input.id}
          style={{ top: input.position }}
        />
      ))}
      
      {/* Node Body - SubBlocks */}
      <div className="node-body">
        {blockConfig.subBlocks.map(subBlock => (
          <SubBlockRenderer
            key={subBlock.id}
            subBlock={subBlock}
            value={data.config[subBlock.id]}
            onChange={(value) => updateConfig(subBlock.id, value)}
          />
        ))}
      </div>
      
      {/* Output Handles */}
      {data.outputs.map(output => (
        <Handle
          key={output.id}
          type="source"
          position={Position.Right}
          id={output.id}
          style={{ top: output.position }}
        />
      ))}
      
      {/* Status Indicator */}
      <NodeStatus state={data.state} />
    </div>
  );
};
```

## 9. Socket.io Real-time Execution

```typescript
// Server-side execution handler
io.on('connection', (socket) => {
  socket.on('execute-block', async (data) => {
    const { blockId, workflowId, inputs, config } = data;
    
    try {
      // Emit execution started
      socket.emit('block-status', { 
        blockId, 
        status: 'executing' 
      });
      
      // Get block configuration
      const blockConfig = registry.get(data.blockType);
      
      // Execute block
      const result = await blockConfig.execute({
        inputs,
        config,
        context: executionContext
      });
      
      // Emit result
      socket.emit('block-complete', { 
        blockId, 
        result,
        status: 'completed'
      });
      
    } catch (error) {
      socket.emit('block-error', { 
        blockId, 
        error: error.message,
        status: 'error'
      });
    }
  });
});
```

## 10. Example Block Implementation

```typescript
// /apps/sim/blocks/blocks/function.ts
export const FunctionBlock: BlockConfig<FunctionResponse> = {
  type: 'function',
  name: 'Function',
  description: 'Execute custom JavaScript code',
  category: 'logic',
  bgColor: '#6B46C1',
  icon: CodeIcon,
  
  subBlocks: [
    {
      id: 'code',
      type: SubBlockType.CODE,
      label: 'JavaScript Code',
      placeholder: '// Write your code here\nreturn { result: "Hello" };',
      required: true,
      multiline: true,
      validate: (value) => {
        try {
          new AsyncFunction(value);
          return null;
        } catch (e) {
          return 'Invalid JavaScript syntax';
        }
      }
    },
    {
      id: 'timeout',
      type: SubBlockType.NUMBER,
      label: 'Timeout (ms)',
      defaultValue: 5000,
      min: 100,
      max: 30000
    }
  ],
  
  execute: async ({ inputs, config, context }) => {
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    
    // Create sandboxed function with limited context
    const func = new AsyncFunction(
      'inputs', 'context', 'console',
      config.code
    );
    
    // Execute with timeout
    const result = await Promise.race([
      func(inputs, context, console),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), config.timeout)
      )
    ]);
    
    return { output: result };
  },
  
  validateConfig: (config) => {
    if (!config.code) {
      return { valid: false, error: 'Code is required' };
    }
    return { valid: true };
  }
};
```

This architecture provides:
- **Modularity**: Each block is self-contained with its own configuration
- **Type Safety**: TypeScript interfaces ensure type safety
- **Extensibility**: Easy to add new blocks via the registry pattern
- **Real-time Updates**: Socket.io enables live execution status
- **Visual Programming**: ReactFlow provides the drag-and-drop interface
- **Sandboxed Execution**: Function blocks execute in controlled environments