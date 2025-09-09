// Quick test to see what might be wrong with the data format conversion

const testFrontendNodes = [
  {
    id: "input-1",
    type: "input", // This might be the issue - frontend might use different types
    position: { x: 100, y: 100 },
    data: {
      label: "Input",
      type: "input",
      config: {
        inputType: "variable",
        variableName: "userInput"
      }
    }
  },
  {
    id: "agent-1", 
    type: "agent",
    position: { x: 300, y: 100 },
    data: {
      label: "Agent",
      type: "agent",
      config: {
        provider: "googleai",
        model: "gemini-2.5-flash",
        promptType: "static",
        userPrompt: "Process this: {{input}}"
      }
    }
  }
];

const testEdges = [
  {
    id: "edge-1",
    source: "input-1", 
    target: "agent-1"
  }
];

// Test the conversion function
function convertNodesToBlocks(nodes) {
  return nodes.map(node => ({
    id: node.id,
    blockType: node.type || node.data?.type || 'unknown',
    position: node.position,
    config: node.data?.config || {},
    selected: false,
    inputs: [],
    outputs: [],
    state: 'idle',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1
  }));
}

const converted = convertNodesToBlocks(testFrontendNodes);
console.log('Frontend nodes:', JSON.stringify(testFrontendNodes, null, 2));
console.log('Converted blocks:', JSON.stringify(converted, null, 2));

// Test API call
async function testAPI() {
  try {
    const response = await fetch('http://localhost:3001/api/blocks/generate-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        blocks: converted,
        edges: testEdges,
        variables: []
      })
    });

    const result = await response.json();
    console.log('API Response status:', response.status);
    console.log('API Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('API Error:', error);
  }
}

testAPI();