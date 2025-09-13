import { NextRequest } from 'next/server';
import { proxyJson } from '@/lib/api/proxy';

/**
 * Frontend API proxy for Genkit flow execution - forwards to backend server
 * POST /api/genkit/execute - Execute Genkit flows using server-side execution
 */
export async function POST(request: NextRequest) {
  // Forward all Genkit execution requests to the backend server
  // The backend will handle all business logic, validation, and execution
  return proxyJson(request, '/api/genkit/execute', { method: 'POST' });
}