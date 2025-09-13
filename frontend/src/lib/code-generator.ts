/**
 * Frontend code generator - now uses server-side generation
 */

// Import server-side client
export * from './code-generator/server-client';

// Re-export the main function for compatibility
export { generateCode } from './code-generator/server-client';