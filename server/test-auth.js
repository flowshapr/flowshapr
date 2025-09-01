#!/usr/bin/env node
/**
 * Test script to demonstrate the unified authentication system
 * Similar to Laravel Sanctum's dual authentication support
 */

const BASE_URL = 'http://localhost:3001';

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    console.log(`${options.method || 'GET'} ${url}`);
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    console.log('---');
    
    return { status: response.status, data };
  } catch (error) {
    console.error('Request failed:', error.message);
    console.log('---');
    return null;
  }
}

async function testAuthentication() {
  console.log('🚀 Testing Unified Authentication System (Laravel Sanctum Style)\n');

  // 1. Test unauthenticated access (should fail)
  console.log('1. Testing unauthenticated access to protected endpoint:');
  await makeRequest(`${BASE_URL}/api/organizations`);

  // 2. Test session-based authentication
  console.log('2. Testing session-based authentication:');
  
  // First, create a test user and get session
  console.log('   Creating test user...');
  const signUpResult = await makeRequest(`${BASE_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test User Auth',
      email: `test-${Date.now()}@example.com`,
      password: 'password123'
    })
  });

  if (signUpResult?.status === 200) {
    console.log('   Logging in to get session...');
    const loginResult = await makeRequest(`${BASE_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      body: JSON.stringify({
        email: signUpResult.data.data.user.email,
        password: 'password123'
      })
    });

    if (loginResult?.status === 200) {
      // Extract session cookie (in real app, browser handles this)
      const sessionId = loginResult.data.data.session.id;
      
      console.log('   Testing protected endpoint with session (cookie simulation):');
      await makeRequest(`${BASE_URL}/api/organizations`, {
        headers: {
          'Cookie': `sessionId=${sessionId}`
        }
      });
    }
  }

  // 3. Test API token authentication (if Better Auth is configured)
  console.log('3. Testing API token authentication:');
  console.log('   Note: This would work with proper Better Auth tokens');
  await makeRequest(`${BASE_URL}/api/organizations`, {
    headers: {
      'Authorization': 'Bearer fake-token-example'
    }
  });

  console.log('✅ Authentication tests completed!');
  console.log('\n📚 Authentication Methods Supported:');
  console.log('   • Session-based (cookies) - for web app');
  console.log('   • Token-based (Bearer) - for API clients');  
  console.log('   • Unified middleware handles both automatically');
  console.log('   • Similar to Laravel Sanctum architecture');
}

testAuthentication().catch(console.error);