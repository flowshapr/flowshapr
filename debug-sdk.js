#!/usr/bin/env node

import { runFlow } from '@flowshapr/client';

async function debugSDK() {
  console.log('🔍 Debugging SDK call...');

  try {
    const result = await runFlow(
      'test',
      'Hello FlowShapr!',
      {
        baseUrl: 'http://localhost:3000',
        headers: { Authorization: 'Bearer fs_6bd31dd7c4b45e6d9b6cfe5369289767cc57dcba51e98994285bb6c9b62e07bf' }
      }
    );

    console.log('✅ SUCCESS! Result type:', typeof result);
    console.log('✅ Result content:', result);
  } catch (error) {
    console.log('❌ ERROR occurred:');
    console.log('Error type:', typeof error);
    console.log('Error constructor:', error.constructor.name);
    console.log('Error message:', error.message);
    console.log('Error stack:', error.stack);

    if (error.cause) {
      console.log('Error cause:', error.cause);
    }
  }
}

debugSDK();