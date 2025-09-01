s

# claude.md - Codebase Explanation

## Architecture Overview

This codebase implements a visual drag-and-drop interface for building Firebase Genkit AI flows. The architecture follows a clean separation between the visual editor (React Flow), code generation engine, and Genkit execution layer.

### Core Concepts

1. **Visual Flows**: Users create flows by dragging nodes (AI models, prompts, transformations) and connecting them
2. **Code Generation**: The visual flow is converted to executable Genkit TypeScript code in real-time
3. **Live Execution**: Generated flows can be tested immediately within the interface
4. **Real-time Preview**: Monaco editor shows the generated code with syntax highlighting

### Key Components

#### FlowCanvas (`src/components/flow-builder/FlowCanvas.tsx`)
The main React Flow canvas that handles:
- Node rendering and positioning
- Edge connections between nodes
- Canvas interactions (zoom, pan, select)
- Flow state management

#### NodeTypes (`src/components/flow-builder/NodeTypes.tsx`)
Defines custom node types:
- **ModelNode**: AI model selection (Gemini, OpenAI, Claude)
- **PromptNode**: Template definition with variables
- **TransformNode**: Data transformation logic
- **OutputNode**: Flow output configuration

#### CodeGenerator (`src/lib/code-generator.ts`)
Converts visual flows to Genkit code:
- Traverses the node graph
- Generates TypeScript using templates
- Handles dependency injection
- Validates flow structure

#### GenkitIntegration (`src/lib/genkit-integration.ts`)
Manages Genkit execution:
- Dynamic flow creation
- Model provider switching
- Error handling and logging
- Trace collection

### Data Flow

1. **User Interaction**: User drags nodes onto canvas and connects them
2. **State Update**: React Flow updates the nodes and edges state
3. **Code Generation**: CodeGenerator converts the visual flow to TypeScript
4. **Live Preview**: Monaco editor displays the generated code
5. **Execution**: API routes execute the generated Genkit flow
6. **Results**: Output is displayed in the test panel

### File Structure Explained

#### `/src/types/flow.ts`
Core TypeScript interfaces:
```typescript
interface FlowNode {
  id: string;
  type: NodeType;
  data: NodeData;
  position: { x: number; y: number };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
}
```

#### `/src/lib/code-generator.ts`
Template-based code generation:
```typescript
generateFlow(nodes: FlowNode[], edges: FlowEdge[]): string {
  // Topological sort for execution order
  // Template interpolation
  // TypeScript generation
}
```

#### `/src/app/api/genkit/execute.ts`
Next.js API route for flow execution:
```typescript
export async function POST(request: Request) {
  const { flowCode, input } = await request.json();
  // Safely execute generated Genkit code
  // Return results and traces
}
```

### Security Considerations

- **Code Execution**: Generated code is validated before execution
- **Input Sanitization**: All user inputs are sanitized
- **API Key Management**: Secure handling of AI provider API keys
- **Rate Limiting**: Prevent abuse of AI model APIs

### Extension Points

The architecture is designed for easy extension:

1. **New Node Types**: Add to NodeTypes.tsx and update code generator
2. **New AI Providers**: Extend the model configuration
3. **New Features**: Plugin architecture for additional capabilities
4. **Custom Templates**: Template system for pre-built flows

### Performance Optimizations

- **Lazy Loading**: Components load on demand
- **Memoization**: React.memo for expensive re-renders
- **Debounced Generation**: Code generation throttled for performance
- **Virtual Scrolling**: For large flow canvases

### Testing Strategy

- **Unit Tests**: Individual component testing
- **Integration Tests**: Flow generation and execution
- **E2E Tests**: Complete user workflows
- **Visual Regression**: UI component snapshots

This codebase demonstrates both technical competency with modern React/TypeScript development and deep understanding of AI application architecture, making it ideal for showcasing CTO-level capabilities in the AI tooling space.