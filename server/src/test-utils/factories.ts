// Simple mock data generators without faker
const randomString = () => Math.random().toString(36).substring(2, 15);
const randomEmail = () => `${randomString()}@example.com`;
const randomUuid = () => `${randomString()}-${randomString()}-${randomString()}-${randomString()}`;
const randomDate = () => new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 365);
const randomNumber = (max: number = 1000) => Math.floor(Math.random() * max);
const randomBoolean = () => Math.random() > 0.5;
const randomArrayElement = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

// Flow factory
export const createMockFlow = (overrides: any = {}) => ({
  id: randomUuid(),
  name: `Flow ${randomString()}`,
  alias: `flow-${randomString()}`,
  description: `Description for ${randomString()}`,
  version: '1.0.0',
  isLatest: true,
  status: 'draft' as const,
  nodes: [],
  edges: [],
  metadata: {},
  config: {},
  organizationId: randomUuid(),
  teamId: randomUuid(),
  createdBy: randomUuid(),
  createdAt: randomDate(),
  updatedAt: randomDate(),
  slug: `slug-${randomString()}`,
  memberRole: 'owner' as const,
  ...overrides,
});

// User factory
export const createMockUser = (overrides: any = {}) => ({
  id: randomUuid(),
  name: `User ${randomString()}`,
  email: randomEmail(),
  createdAt: randomDate(),
  updatedAt: randomDate(),
  ...overrides,
});

// Flow node factory
export const createMockFlowNode = (overrides: any = {}) => ({
  id: randomUuid(),
  type: randomArrayElement(['input', 'model', 'prompt', 'transform', 'output', 'condition']),
  position: { x: randomNumber(1000), y: randomNumber(1000) },
  data: {
    label: `Node ${randomString()}`,
    config: {},
  },
  ...overrides,
});

// Flow edge factory
export const createMockFlowEdge = (overrides: any = {}) => ({
  id: randomUuid(),
  source: randomUuid(),
  target: randomUuid(),
  type: 'default',
  ...overrides,
});

// Prompt factory
export const createMockPrompt = (overrides: any = {}) => ({
  id: randomUuid(),
  name: `Prompt ${randomString()}`,
  template: `Template for {{${randomString()}}}`,
  variables: [],
  flowId: randomUuid(),
  projectId: randomUuid(),
  createdBy: randomUuid(),
  createdAt: randomDate(),
  updatedAt: randomDate(),
  ...overrides,
});

// Trace factory
export const createMockTrace = (overrides: any = {}) => ({
  id: randomUuid(),
  flowId: randomUuid(),
  executionId: randomUuid(),
  status: randomArrayElement(['success', 'error', 'pending']),
  input: { data: `Input ${randomString()}` },
  output: { result: `Output ${randomString()}` },
  duration: randomNumber(5000),
  metadata: {},
  createdAt: randomDate(),
  ...overrides,
});

// Connection factory
export const createMockConnection = (overrides: any = {}) => ({
  id: randomUuid(),
  name: `Connection ${randomString()}`,
  provider: randomArrayElement(['openai', 'anthropic', 'google']),
  config: {
    apiKey: randomString(),
    baseUrl: `https://api.${randomString()}.com`,
  },
  flowId: randomUuid(),
  projectId: randomUuid(),
  createdBy: randomUuid(),
  createdAt: randomDate(),
  updatedAt: randomDate(),
  ...overrides,
});

// API Key factory
export const createMockApiKey = (overrides: any = {}) => ({
  id: randomUuid(),
  name: `API Key ${randomString()}`,
  keyHash: randomString(),
  prefix: randomString().substring(0, 8),
  lastUsedAt: randomDate(),
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days from now
  flowId: randomUuid(),
  projectId: randomUuid(),
  createdBy: randomUuid(),
  createdAt: randomDate(),
  ...overrides,
});

// Execution data factory
export const createMockExecutionData = (overrides: any = {}) => ({
  input: { message: `Message ${randomString()}` },
  config: {},
  userId: randomUuid(),
  ...overrides,
});

// Flow definition factory
export const createMockFlowDefinition = (overrides: any = {}) => ({
  nodes: [
    createMockFlowNode({ type: 'input' }),
    createMockFlowNode({ type: 'prompt' }),
    createMockFlowNode({ type: 'model' }),
    createMockFlowNode({ type: 'output' }),
  ],
  edges: [
    createMockFlowEdge(),
    createMockFlowEdge(),
    createMockFlowEdge(),
  ],
  ...overrides,
});

// Error factory
export const createMockError = (code: string, message: string) => {
  const error = new Error(message) as any;
  error.code = code;
  return error;
};

// Validation error factory
export const createMockValidationError = (errors: Record<string, string[]>) => ({
  error: {
    message: 'The given data was invalid.',
    code: 'VALIDATION_ERROR',
    errors,
  },
});

// Conflict error factory
export const createMockConflictError = (message: string) => ({
  error: {
    message,
    code: 'CONFLICT_ERROR',
  },
});

// Not found error factory
export const createMockNotFoundError = (resource: string) => ({
  error: {
    message: `${resource} not found`,
    code: 'NOT_FOUND_ERROR',
  },
});