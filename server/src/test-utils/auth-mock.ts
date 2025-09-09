import { jest } from '@jest/globals';

// Simple mock data generators
const randomString = () => Math.random().toString(36).substring(2, 15);
const randomEmail = () => `${randomString()}@example.com`;
const randomUuid = () => `${randomString()}-${randomString()}-${randomString()}-${randomString()}`;
const randomName = () => `User ${randomString()}`;
const randomCompanyName = () => `Company ${randomString()}`;

// Mock user context
export const createMockUser = (overrides: any = {}) => ({
  id: randomUuid(),
  name: randomName(),
  email: randomEmail(),
  organizationId: randomUuid(),
  teamId: randomUuid(),
  role: 'member',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Mock organization context
export const createMockOrganization = (overrides: any = {}) => ({
  id: randomUuid(),
  name: randomCompanyName(),
  slug: `slug-${randomString()}`,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Mock team context
export const createMockTeam = (overrides: any = {}) => ({
  id: randomUuid(),
  name: `Team ${randomString()}`,
  organizationId: randomUuid(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Mock authentication middleware
export const mockRequireAuth = jest.fn();
export const mockRequireSessionAuth = jest.fn();
export const mockRequireTokenAuth = jest.fn();
export const mockOptionalAuth = jest.fn();

// Mock authorization functions
export const mockRequireUserAbility = jest.fn();
export const mockCheckUserAbility = jest.fn();

// Mock request with authenticated user
export const createMockAuthenticatedRequest = (user: any = createMockUser()) => ({
  user,
  authMethod: 'session',
  params: {},
  body: {},
  query: {},
  headers: {},
});

// Mock Express response
export const createMockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  return res;
};

// Reset all auth mocks
export const resetAuthMocks = () => {
  jest.clearAllMocks();
  mockRequireAuth.mockClear();
  mockRequireSessionAuth.mockClear();
  mockRequireTokenAuth.mockClear();
  mockOptionalAuth.mockClear();
  mockRequireUserAbility.mockClear();
  mockCheckUserAbility.mockClear();
};