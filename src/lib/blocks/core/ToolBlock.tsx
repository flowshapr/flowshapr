import React from 'react';
import { Plug } from 'lucide-react';
import { z } from 'zod';
import { GenkitGenerativeBlock } from '../base/GenkitBlock';
import { SubBlock, SubBlockType, BlockCategory } from '../types';
import { GenkitToolTemplate } from '../genkit/templates';

interface ToolBlockConfig {
  toolType: 'custom' | 'mcp' | 'builtin';
  name?: string;
  description?: string;
  parameters?: string;
  implementation?: string;
  serverUrl?: string;
  selectedTools?: string[];
  builtinTool?: string;
}

export class ToolBlock extends GenkitGenerativeBlock<ToolBlockConfig, any> {
  readonly type = 'tool';
  readonly name = 'Tool';
  readonly description = 'Add tools and functions for AI models to use';
  readonly longDescription = 'Enable AI models to call external functions, APIs, or custom tools. Supports custom JavaScript functions, MCP servers, and built-in tools.';
  readonly category: BlockCategory = 'genai';
  readonly version = '1.0.0';
  readonly bgColor = '#7c3aed';
  readonly icon = React.createElement(Plug, { className: "w-4 h-4" });

  readonly subBlocks: SubBlock[] = [
    {
      id: 'toolType',
      type: SubBlockType.SELECT,
      label: 'Tool Type',
      required: true,
      defaultValue: 'custom',
      options: [
        { value: 'custom', label: 'Custom Function', description: 'Define a custom JavaScript function' },
        { value: 'mcp', label: 'MCP Server', description: 'Connect to a Model Context Protocol server' },
        { value: 'builtin', label: 'Built-in Tool', description: 'Use a pre-built tool' }
      ]
    },
    {
      id: 'name',
      type: SubBlockType.TEXT,
      label: 'Tool Name',
      placeholder: 'my_tool',
      required: true,
      visibleWhen: (config) => config.toolType === 'custom',
      validate: (value) => {
        if (!value || typeof value !== 'string') return 'Tool name is required';
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) return 'Invalid tool name format (use alphanumeric and underscores)';
        return null;
      }
    },
    {
      id: 'description',
      type: SubBlockType.TEXT,
      label: 'Tool Description',
      placeholder: 'What does this tool do?',
      multiline: true,
      visibleWhen: (config) => config.toolType === 'custom',
      required: true
    },
    {
      id: 'parameters',
      type: SubBlockType.SCHEMA,
      label: 'Parameters Schema',
      placeholder: 'z.object({\n  input: z.string().describe("Input to process")\n})',
      multiline: true,
      visibleWhen: (config) => config.toolType === 'custom',
      description: 'Zod schema defining the tool parameters'
    },
    {
      id: 'implementation',
      type: SubBlockType.CODE,
      label: 'Implementation',
      placeholder: '// Tool implementation\nconst { input } = params;\nreturn `Processed: ${input}`;',
      multiline: true,
      language: 'javascript',
      visibleWhen: (config) => config.toolType === 'custom',
      required: true,
      description: 'JavaScript code that implements the tool logic'
    },
    {
      id: 'serverUrl',
      type: SubBlockType.TEXT,
      label: 'MCP Server URL',
      placeholder: 'stdio:///path/to/server',
      visibleWhen: (config) => config.toolType === 'mcp',
      required: true,
      description: 'URL or stdio path to the MCP server'
    },
    {
      id: 'selectedTools',
      type: SubBlockType.ARRAY,
      label: 'Selected Tools',
      placeholder: 'Enter tool names...',
      visibleWhen: (config) => config.toolType === 'mcp',
      description: 'Specific tools to use from the MCP server (leave empty for all)'
    },
    {
      id: 'builtinTool',
      type: SubBlockType.SELECT,
      label: 'Built-in Tool',
      visibleWhen: (config) => config.toolType === 'builtin',
      required: true,
      options: [
        { value: 'web_search', label: 'Web Search', description: 'Search the web for information' },
        { value: 'calculator', label: 'Calculator', description: 'Perform mathematical calculations' },
        { value: 'weather', label: 'Weather', description: 'Get weather information' },
        { value: 'time', label: 'Time', description: 'Get current time and date' }
      ]
    }
  ];

  readonly codeTemplate = new GenkitToolTemplate();

  readonly inputSchema = z.object({
    toolType: z.enum(['custom', 'mcp', 'builtin']),
    name: z.string().optional(),
    description: z.string().optional(),
    parameters: z.string().optional(),
    implementation: z.string().optional(),
    serverUrl: z.string().optional(),
    selectedTools: z.array(z.string()).optional(),
    builtinTool: z.string().optional()
  });

  getSupportedProviders(): string[] {
    return ['googleai', 'openai', 'anthropic']; // Most providers support tools
  }

  validateConfig(config: ToolBlockConfig) {
    const result = super.validateConfig(config);

    switch (config.toolType) {
      case 'custom':
        // Validate custom tool configuration
        if (!config.name) {
          result.errors.push({
            field: 'name',
            message: 'Tool name is required for custom tools',
            severity: 'error'
          });
          result.isValid = false;
        } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(config.name)) {
          result.errors.push({
            field: 'name',
            message: 'Tool name must be a valid identifier',
            severity: 'error'
          });
          result.isValid = false;
        }

        if (!config.description) {
          result.errors.push({
            field: 'description',
            message: 'Tool description is required for custom tools',
            severity: 'error'
          });
          result.isValid = false;
        }

        if (!config.implementation) {
          result.errors.push({
            field: 'implementation',
            message: 'Implementation is required for custom tools',
            severity: 'error'
          });
          result.isValid = false;
        } else {
          // Validate JavaScript syntax
          try {
            new Function('params', 'context', config.implementation);
          } catch (error) {
            result.errors.push({
              field: 'implementation',
              message: `Implementation syntax error: ${error instanceof Error ? error.message : 'Invalid JavaScript'}`,
              severity: 'error'
            });
            result.isValid = false;
          }
        }

        // Validate parameters schema if provided
        if (config.parameters) {
          try {
            if (!config.parameters.trim().startsWith('z.')) {
              result.errors.push({
                field: 'parameters',
                message: 'Parameters schema must start with "z." (e.g., z.object({...}))',
                severity: 'error'
              });
              result.isValid = false;
            }
          } catch (error) {
            result.errors.push({
              field: 'parameters',
              message: 'Invalid parameters schema format',
              severity: 'error'
            });
            result.isValid = false;
          }
        }
        break;

      case 'mcp':
        // Validate MCP configuration
        if (!config.serverUrl) {
          result.errors.push({
            field: 'serverUrl',
            message: 'Server URL is required for MCP tools',
            severity: 'error'
          });
          result.isValid = false;
        }
        break;

      case 'builtin':
        // Validate built-in tool selection
        if (!config.builtinTool) {
          result.errors.push({
            field: 'builtinTool',
            message: 'Built-in tool selection is required',
            severity: 'error'
          });
          result.isValid = false;
        }
        break;
    }

    return result;
  }

  getDefaultConfig(): Partial<ToolBlockConfig> {
    return {
      toolType: 'custom',
      name: 'my_tool',
      description: 'A custom tool',
      implementation: 'return "Hello from custom tool!";'
    };
  }

  /**
   * Get available built-in tools
   */
  getBuiltinTools() {
    return [
      { value: 'web_search', label: 'Web Search', description: 'Search the web for information' },
      { value: 'calculator', label: 'Calculator', description: 'Perform mathematical calculations' },
      { value: 'weather', label: 'Weather', description: 'Get weather information' },
      { value: 'time', label: 'Time', description: 'Get current time and date' }
    ];
  }
}