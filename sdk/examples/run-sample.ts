/*
  Example: run a Flowshapr flow by alias using the SDK.

  Usage:
    BASE_URL=http://localhost:8787 \
    API_KEY=your_flow_api_key \
    tsx sdk/examples/run-sample.ts

  Note: The API key must be a Flow-scoped API key created in the server.
*/

import { FlowshaprClient } from '../src/index.js';

async function main() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error('Set API_KEY env var to a flow API key');

  // Per request, use the alias "testlfow" (typo intentional to match request)
  const alias = 'my-test-flow-alias';

  const client = new FlowshaprClient({ baseUrl, apiKey });

  console.log(`Running flow by alias: ${alias}`);
  const input = 'Hello from SDK example!';

  try {
    const resp = await client.runByAlias<string>(alias, input);
    if (resp.success) {
      console.log('Success:', resp.result);
    } else {
      console.error('Error:', resp.error);
      process.exitCode = 1;
    }
  } catch (err: any) {
    console.error('Failed:', err?.message || err);
    process.exitCode = 1;
  }
}

main();

