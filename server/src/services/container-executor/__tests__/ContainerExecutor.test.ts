import { ContainerExecutor } from '../ContainerExecutor';
import { ExecutionConfig } from '../types';

describe('ContainerExecutor HTTP Communication', () => {
  let executor: ContainerExecutor;

  beforeAll(async () => {
    executor = new ContainerExecutor({
      timeout: 30000, // 30 second timeout for tests
      maxConcurrentContainers: 2,
      imageName: 'flowshapr-genkit-executor'
    });
    
    await executor.initialize();
  });

  afterAll(async () => {
    await executor.shutdown();
  });

  it('should execute a simple Genkit flow via HTTP', async () => {
    const simpleGenkitCode = `
import { genkit, z } from 'genkit';

export const ai = genkit({
  plugins: [],
});

export const testFlow = ai.defineFlow(
  {
    name: 'testFlow',
    inputSchema: z.object({
      message: z.string(),
    }),
    outputSchema: z.object({
      result: z.string(),
      timestamp: z.string(),
    }),
  },
  async (input) => {
    return {
      result: \`Hello \${input.message}!\`,
      timestamp: new Date().toISOString(),
    };
  }
);

export default testFlow;
`;

    const input = { message: 'HTTP World' };
    const config: ExecutionConfig = {
      flowId: 'test-flow-123'
    };

    const result = await executor.executeFlow(simpleGenkitCode, input, config);

    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
    expect(result.result.result).toBe('Hello HTTP World!');
    expect(result.result.timestamp).toBeDefined();
    expect(result.meta).toBeDefined();
    expect(result.meta.containerId).toBeDefined();
    expect(result.meta.duration).toBeGreaterThan(0);
  }, 60000);

  it('should handle execution errors properly', async () => {
    const invalidCode = `
// Invalid code that will fail
export default function() {
  throw new Error("Test error from container");
}
`;

    const input = { message: 'Test' };
    const config: ExecutionConfig = {
      flowId: 'error-test-flow'
    };

    const result = await executor.executeFlow(invalidCode, input, config);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.meta).toBeDefined();
    expect(result.meta.containerId).toBeDefined();
  }, 60000);

  it('should respect concurrent container limits', async () => {
    const slowCode = `
// Slow code that takes time to execute
export default async function(input) {
  await new Promise(resolve => setTimeout(resolve, 5000));
  return { result: 'slow execution completed', input };
}
`;

    const input = { message: 'Concurrent Test' };
    const config: ExecutionConfig = {
      flowId: 'concurrent-test-flow'
    };

    // Start multiple executions simultaneously
    const promises = Array(5).fill(0).map(() => 
      executor.executeFlow(slowCode, input, config)
    );

    const results = await Promise.all(promises);

    // Some should succeed (within limits) and some should be rejected due to limits
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success && r.error?.includes('Maximum concurrent containers'));

    expect(successful.length).toBeGreaterThan(0);
    expect(failed.length).toBeGreaterThan(0);
    expect(successful.length + failed.length).toBe(5);
  }, 90000); // Long timeout for concurrent test

  it('should provide correct status information', () => {
    const status = executor.getStatus();
    
    expect(status.initialized).toBe(true);
    expect(status.maxConcurrentContainers).toBe(2);
    expect(status.imageName).toBe('flowshapr-genkit-executor');
    expect(typeof status.activeContainers).toBe('number');
  });
});