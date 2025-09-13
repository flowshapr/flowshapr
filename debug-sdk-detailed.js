#!/usr/bin/env node

// Detailed debugging of the SDK issue

async function testWithFetchDirectly() {
  console.log('🔍 Testing with fetch directly...');

  const url = 'http://localhost:3000/api/flows/by-alias/test/execute';
  const input = 'Hello FlowShapr!';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer fs_6bd31dd7c4b45e6d9b6cfe5369289767cc57dcba51e98994285bb6c9b62e07bf'
  };

  console.log('Request details:');
  console.log('URL:', url);
  console.log('Headers:', headers);
  console.log('Body:', JSON.stringify(input));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(input)
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    console.log('Response headers:', Object.fromEntries(response.headers));

    if (!response.ok) {
      console.log('❌ Response not OK');
      const text = await response.text();
      console.log('Response text:', text);

      // Try to parse as JSON
      try {
        const errorData = JSON.parse(text);
        console.log('Parsed error data:', errorData);
      } catch {
        console.log('Could not parse response as JSON');
      }
    } else {
      console.log('✅ Response OK');
      const result = await response.json();
      console.log('Result:', result);
    }
  } catch (error) {
    console.log('❌ Fetch error:', error.message);
  }
}

testWithFetchDirectly();