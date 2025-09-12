import { ContainerPoolService } from '../ContainerPoolService';
import { ExecutionConfig } from '../types';

describe('ContainerPoolService HTTP Communication', () => {
  let poolService: ContainerPoolService;

  beforeAll(async () => {
    poolService = new ContainerPoolService({
      poolSize: 3,
      workTimeout: 30000, // 30 second timeout for tests
    });
    
    await poolService.initialize();
  });

  afterAll(async () => {
    await poolService.shutdown();
  });

  it('should execute a simple flow via HTTP pool', async () => {
    const simpleCode = `
export default function(input) {
  return {
    result: "Hello from pool: " + input.message,
    timestamp: new Date().toISOString(),
    executedBy: "container-pool"
  };
}`;

    const input = { message: 'Pool Test' };
    const config: ExecutionConfig = {
      flowId: 'test-pool-flow-123'
    };

    const result = await poolService.executeFlow(simpleCode, input, config);

    expect(result.success).toBe(true);
    expect(result.runtime).toBe('flowshapr');
    expect(result.result).toBeDefined();
    expect(result.result.result).toBe('Hello from pool: Pool Test');
    expect(result.result.executedBy).toBe('container-pool');
    expect(result.meta).toBeDefined();
    expect(result.meta.containerId).toBeDefined();
    expect(result.meta.duration).toBeGreaterThan(0);
  }, 45000);

  it('should handle execution errors properly', async () => {
    const invalidCode = `
export default function(input) {
  throw new Error("Test error from pool container");
}`;

    const input = { message: 'Error Test' };
    const config: ExecutionConfig = {
      flowId: 'error-pool-flow'
    };

    const result = await poolService.executeFlow(invalidCode, input, config);

    expect(result.success).toBe(false);
    expect(result.runtime).toBe('flowshapr');
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Test error from pool container');
    expect(result.meta).toBeDefined();
    expect(result.meta.containerId).toBeDefined();
  }, 45000);

  it('should provide correct pool status', () => {
    const status = poolService.getStatus();
    
    expect(status.initialized).toBe(true);
    expect(status.poolSize).toBeGreaterThan(0);
    expect(status.containers).toBeDefined();
    expect(Array.isArray(status.containers)).toBe(true);
    expect(status.containers.length).toBeGreaterThan(0);
    
    // Check that containers have the expected structure
    const container = status.containers[0];
    expect(container.id).toBeDefined();
    expect(container.name).toBeDefined();
    expect(typeof container.isHealthy).toBe('boolean');
    expect(typeof container.isBusy).toBe('boolean');
  });

  it('should distribute work across available containers', async () => {
    const quickCode = `
export default function(input) {
  return { result: "Quick execution: " + input.id };
}`;

    const promises = Array(3).fill(0).map((_, i) => 
      poolService.executeFlow(quickCode, { id: i }, { flowId: `concurrent-${i}` })
    );

    const results = await Promise.all(promises);
    
    // All should succeed
    expect(results.every(r => r.success)).toBe(true);
    
    // Should use different containers (likely)
    const containerIds = results.map(r => r.meta?.containerId).filter(Boolean);
    expect(containerIds.length).toBe(3);
  }, 60000);
});