import { beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';

// Global test setup
beforeAll(async () => {
  // Any global setup needed before all tests
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  // Any global cleanup needed after all tests
});

beforeEach(async () => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(async () => {
  // Cleanup after each test
});