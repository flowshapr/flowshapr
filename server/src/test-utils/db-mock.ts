import { jest } from '@jest/globals';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

// Mock for database transaction
export const mockTransaction = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// Mock for database connection
export const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  transaction: jest.fn().mockImplementation((callback) => callback(mockTransaction)),
  $with: jest.fn(),
};

// Mock query builder functions
export const createMockQueryBuilder = () => ({
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  and: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  eq: jest.fn(),
  ne: jest.fn(),
  isNull: jest.fn(),
  isNotNull: jest.fn(),
  like: jest.fn(),
  ilike: jest.fn(),
  inArray: jest.fn(),
  notInArray: jest.fn(),
  exists: jest.fn(),
  notExists: jest.fn(),
  between: jest.fn(),
  notBetween: jest.fn(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  having: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  execute: jest.fn(),
});

// Helper to create mock database responses
export const createMockDbResponse = <T>(data: T[]): T[] => data;

// Helper to create single record mock
export const createMockDbRecord = <T>(data: T): T => data;

// Mock database error helper
export const createMockDbError = (code: string, message: string) => {
  const error = new Error(message) as any;
  error.code = code;
  return error;
};

// Reset all database mocks
export const resetDbMocks = () => {
  jest.clearAllMocks();
  mockDb.select.mockReturnValue(createMockQueryBuilder());
  mockDb.insert.mockReturnValue(createMockQueryBuilder());
  mockDb.update.mockReturnValue(createMockQueryBuilder());
  mockDb.delete.mockReturnValue(createMockQueryBuilder());
  
  mockTransaction.select.mockReturnValue(createMockQueryBuilder());
  mockTransaction.insert.mockReturnValue(createMockQueryBuilder());
  mockTransaction.update.mockReturnValue(createMockQueryBuilder());
  mockTransaction.delete.mockReturnValue(createMockQueryBuilder());
};