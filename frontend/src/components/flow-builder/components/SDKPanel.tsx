'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { FlowNode, FlowEdge, InputNodeConfig, NodeType } from '@/types/flow';
import { Copy, Check } from 'lucide-react';
import Editor, { loader } from '@monaco-editor/react';

interface SDKPanelProps {
  flow?: {
    id: string;
    name: string;
    slug: string;
  };
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export function SDKPanel({ flow, nodes, edges }: SDKPanelProps) {
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  // Detect current theme
  useEffect(() => {
    const detectTheme = () => {
      const html = document.documentElement;
      const theme = html.getAttribute('data-theme');
      setIsDarkTheme(theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches));
    };

    detectTheme();
    
    // Watch for theme changes
    const observer = new MutationObserver(detectTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  // Initialize Monaco with custom theme
  useEffect(() => {
    loader.init().then((monaco) => {
      // Define custom DaisyUI-aligned theme
      monaco.editor.defineTheme('daisyui-theme', {
        base: isDarkTheme ? 'vs-dark' : 'vs',
        inherit: true,
        rules: [
          { token: '', foreground: isDarkTheme ? 'c5c5c5' : '000000' },
          { token: 'comment', foreground: isDarkTheme ? '6A9955' : '008000' },
          { token: 'keyword', foreground: isDarkTheme ? '569CD6' : '0000FF' },
          { token: 'string', foreground: isDarkTheme ? 'CE9178' : 'A31515' },
          { token: 'number', foreground: isDarkTheme ? 'B5CEA8' : '098658' },
        ],
        colors: {
          'editor.background': isDarkTheme ? '#1c1b20' : '#f7f7f7', // base-200 equivalent
          'editor.foreground': isDarkTheme ? '#c5c5c5' : '#000000',
          'editorLineNumber.foreground': isDarkTheme ? '#6A6A6A' : '#999999',
          'editor.lineHighlightBackground': 'transparent',
          'editor.selectionBackground': isDarkTheme ? '#264F78' : '#ADD6FF',
          'scrollbarSlider.background': isDarkTheme ? '#3E3E42' : '#C1C1C1',
        }
      });
    });
  }, [isDarkTheme]);

  const copyToClipboard = useCallback(async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }, []);

  // Generate input schema based on INPUT nodes
  const getInputSchema = () => {
    const inputNodes = nodes.filter(node => node.data?.type === NodeType.INPUT);
    if (inputNodes.length === 0) {
      return { type: 'string', description: 'Flow input' };
    }

    if (inputNodes.length === 1) {
      const config = (inputNodes[0].data?.config as InputNodeConfig) || {};
      return {
        type: 'string',
        description: config.description || 'Flow input'
      };
    }

    // Multiple input nodes - create object schema
    const properties: Record<string, any> = {};
    inputNodes.forEach((node, index) => {
      const config = (node.data?.config as InputNodeConfig) || {};
      const key = `input${index + 1}`;
      properties[key] = {
        type: 'string',
        description: config.description || `Input ${index + 1}`
      };
    });

    return {
      type: 'object',
      properties,
      required: Object.keys(properties)
    };
  };

  const flowEndpoint = flow ? `https://app.flowshapr.ai/api/flows/by-alias/${flow.slug}/execute` : '';
  const inputSchema = getInputSchema();

  // Generate code samples
  const javascriptSample = `// FlowShapr SDK - Simple API with flow aliases
import { runFlow } from '@flowshapr/client';

async function executeFlow() {
  try {
    // Clean API - just flow alias and input!
    const result = await runFlow(
      '${flow?.slug || 'your-flow-alias'}',
      ${inputSchema.type === 'object'
        ? `{\n      ${Object.keys(inputSchema.properties || {}).map(key =>
            `${key}: "your-${key.toLowerCase()}-value"`
          ).join(',\n      ')}\n    }`
        : `"your-input-value"`
      },
      {
        headers: {
          Authorization: 'Bearer your-api-key-here'
        }
      }
    );

    console.log('Flow result:', result);
    return result;
  } catch (error) {
    console.error('Flow execution failed:', error);
    throw error;
  }
}

// For local development
import { flowshapr } from '@flowshapr/client';

async function executeLocalFlow() {
  const result = await flowshapr.local.runFlow(
    '${flow?.slug || 'your-flow-alias'}',
    ${inputSchema.type === 'object'
      ? `{\n    ${Object.keys(inputSchema.properties || {}).map(key =>
          `${key}: "your-${key.toLowerCase()}-value"`
        ).join(',\n    ')}\n  }`
      : `"your-input-value"`
    },
    {
      headers: { Authorization: 'Bearer your-api-key-here' }
    }
  );
  return result;
}

// Using persistent client
const client = flowshapr.createClient({
  headers: { Authorization: 'Bearer your-api-key-here' },
  baseUrl: 'https://app.flowshapr.ai' // defaults to this
});

const result = await client.runFlow('${flow?.slug || 'your-flow-alias'}', 'input');

// Execute the flow
executeFlow();`;

  const curlSample = `# cURL Example - Clean flow alias API
# Endpoint: https://app.flowshapr.ai/api/flows/by-alias/{FLOW_ALIAS}/execute

curl -X POST "https://app.flowshapr.ai/api/flows/by-alias/${flow?.slug || 'your-flow-alias'}/execute" \\
  -H "Authorization: Bearer your-api-key-here" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(
    inputSchema.type === 'object'
      ? Object.keys(inputSchema.properties || {}).reduce((acc, key) => {
          acc[key] = `your-${key.toLowerCase()}-value`;
          return acc;
        }, {} as Record<string, string>)
      : "your-input-value",
    null,
    2
  ).replace(/\n/g, ' ')}'

# For local development:
# curl -X POST "http://localhost:3000/api/flows/by-alias/${flow?.slug || 'your-flow-alias'}/execute" \\`;

  const restApiSample = `# REST API - Flow Alias Endpoint
# Clean URL structure with flow aliases

POST https://app.flowshapr.ai/api/flows/by-alias/${flow?.slug || 'your-flow-alias'}/execute

Headers:
Authorization: Bearer your-api-key-here
Content-Type: application/json

Request Body (Direct input - Genkit compatible):
${JSON.stringify(
  inputSchema.type === 'object'
    ? Object.keys(inputSchema.properties || {}).reduce((acc, key) => {
        acc[key] = `your-${key.toLowerCase()}-value`;
        return acc;
      }, {} as Record<string, string>)
    : "your-input-value",
  null,
  2
)}

Response (Direct output - Genkit compatible):
"Generated response from your flow"

# Or for complex outputs:
{
  "text": "Generated response",
  "metadata": {...}
}

# Local Development:
POST http://localhost:3000/api/flows/by-alias/${flow?.slug || 'your-flow-alias'}/execute`;

  const samples = [
    { 
      key: 'javascript', 
      title: 'JavaScript/TypeScript', 
      language: 'typescript', 
      code: javascriptSample 
    },
    { 
      key: 'curl', 
      title: 'cURL', 
      language: 'bash', 
      code: curlSample 
    },
    { 
      key: 'rest', 
      title: 'REST API', 
      language: 'http', 
      code: restApiSample 
    }
  ];

  if (!flow) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-base-content/60 mb-2">No Flow Selected</div>
          <p className="text-sm text-base-content/50">
            Select a flow to view SDK integration examples
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-base-100">
      {/* Header */}
      <div className="flex-none p-4 border-b border-base-300">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-base-content">SDK Integration</h3>
            <p className="text-sm text-base-content/60 mt-1">
              Ready-to-use code samples for integrating with <span className="font-mono">{flow.slug}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6 min-h-0">
          {/* Flow Info */}
          <div className="bg-base-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-base-content mb-2">Flow Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-base-content/60">Endpoint:</span>
                <code className="bg-base-300 px-2 py-1 rounded text-xs font-mono">{flowEndpoint}</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base-content/60">Slug:</span>
                <code className="bg-base-300 px-2 py-1 rounded text-xs font-mono">{flow.slug}</code>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-base-content/60">Input Schema:</span>
                <pre className="bg-base-300 px-2 py-1 rounded text-xs font-mono flex-1 overflow-x-auto">
                  {JSON.stringify(inputSchema, null, 2)}
                </pre>
              </div>
            </div>
          </div>

          {/* Code Samples */}
          {samples.map((sample) => (
            <div key={sample.key} className="bg-base-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
                <h4 className="text-sm font-semibold text-base-content">{sample.title}</h4>
                <button
                  onClick={() => copyToClipboard(sample.code, sample.key)}
                  className="btn btn-ghost btn-xs gap-1"
                  title="Copy to clipboard"
                >
                  {copiedStates[sample.key] ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="p-4">
                <Editor
                  height="300px"
                  language={sample.language}
                  value={sample.code}
                  theme="daisyui-theme"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 12,
                    lineNumbers: 'on',
                    folding: false,
                    wordWrap: 'on',
                    automaticLayout: true,
                    contextmenu: false,
                    selectOnLineNumbers: false,
                    renderLineHighlight: 'none',
                    overviewRulerLanes: 0
                  }}
                />
              </div>
            </div>
          ))}

          {/* Installation Instructions */}
          <div className="bg-base-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-base-content mb-2">Installation</h4>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-base-content/60 mb-1">Option 1: Use Genkit Client (Official):</div>
                <div className="bg-base-300 rounded p-2">
                  <div className="flex items-center justify-between">
                    <code className="text-xs font-mono">npm install genkit</code>
                    <button
                      onClick={() => copyToClipboard('npm install genkit', 'genkit-install')}
                      className="btn btn-ghost btn-xs"
                    >
                      {copiedStates['genkit-install'] ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs text-base-content/60 mb-1">Option 2: Use FlowShapr SDK (Built-in):</div>
                <div className="bg-base-300 rounded p-2">
                  <div className="flex items-center justify-between">
                    <code className="text-xs font-mono">import {`{ runFlow }`} from '@flowshapr/client';</code>
                    <button
                      onClick={() => copyToClipboard("import { runFlow } from '@flowshapr/client';", 'sdk-import')}
                      className="btn btn-ghost btn-xs"
                    >
                      {copiedStates['sdk-import'] ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* API Key Notice */}
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-warning mb-2">API Key Required</h4>
            <p className="text-xs text-base-content/70">
              To use these code samples, you'll need an API key from your project settings. 
              Replace <code className="bg-base-300 px-1 py-0.5 rounded text-xs">your-api-key-here</code> with 
              your actual API key.
            </p>
          </div>

          {/* Authentication & Security */}
          <div className="bg-info/10 border border-info/20 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-info mb-2">Authentication & Security</h4>
            <div className="space-y-2 text-xs text-base-content/70">
              <div>
                <strong>Environment Variables:</strong> Store your API key in environment variables, not in your code:
                <div className="bg-base-300 rounded p-2 mt-1 font-mono">
                  <div>FLOWSHAPR_API_KEY=your-api-key-here</div>
                </div>
              </div>
              <div>
                <strong>Rate Limits:</strong> API calls are rate limited. Implement retry logic with exponential backoff.
              </div>
              <div>
                <strong>Error Handling:</strong> Always handle authentication (401), not found (404), and rate limit (429) errors.
              </div>
              <div>
                <strong>Timeouts:</strong> Set appropriate timeouts for long-running flows to avoid hanging requests.
              </div>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="bg-base-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-base-content mb-2">Troubleshooting</h4>
            <div className="space-y-2 text-xs">
              <div>
                <strong className="text-error">401 Unauthorized:</strong>
                <span className="text-base-content/70 ml-2">Check your API key and ensure it's active</span>
              </div>
              <div>
                <strong className="text-error">404 Not Found:</strong>
                <span className="text-base-content/70 ml-2">Verify the flow slug and ensure the flow is published</span>
              </div>
              <div>
                <strong className="text-error">429 Rate Limited:</strong>
                <span className="text-base-content/70 ml-2">Reduce request frequency or upgrade your plan</span>
              </div>
              <div>
                <strong className="text-error">500 Server Error:</strong>
                <span className="text-base-content/70 ml-2">Flow execution failed - check your flow configuration</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}