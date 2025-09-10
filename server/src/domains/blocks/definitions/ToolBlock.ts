import { ServerBlockDefinition, SubBlockType, CodeGenerationContext } from '../types';

interface ToolBlockConfig {
  toolType: 'mcp' | 'custom' | 'builtin';
  name: string;
  serverUrl?: string;
  apiKey?: string;
  selectedTools?: string[];
  allowRemote?: boolean;
  customCode?: string;
  description?: string;
}

export const ToolBlockDefinition: ServerBlockDefinition = {
  type: 'tool',
  name: 'Tool',
  description: 'External tool integration',
  longDescription: 'Integrate external tools and APIs including MCP (Model Context Protocol) servers, custom tools, and built-in utilities.',
  category: 'data',
  version: '1.0.0',
  
  isAvailable: () => true,

  subBlocks: [
    {
      id: 'toolType',
      type: SubBlockType.SELECT,
      label: 'Tool Type',
      required: true,
      defaultValue: 'mcp',
      options: [
        { value: 'mcp', label: 'MCP Tool', description: 'Model Context Protocol server' },
        { value: 'custom', label: 'Custom Tool', description: 'Custom JavaScript function' },
        { value: 'builtin', label: 'Built-in Tool', description: 'Pre-defined utility functions' }
      ]
    },
    {
      id: 'name',
      type: SubBlockType.TEXT,
      label: 'Tool Name',
      placeholder: 'MCP Tool',
      defaultValue: 'MCP Tool',
      required: true
    },
    {
      id: 'serverUrl',
      type: SubBlockType.TEXT,
      label: 'Server URL',
      placeholder: 'http://localhost:3001/mcp',
      visibleWhen: (config: ToolBlockConfig) => config.toolType === 'mcp',
      required: true
    },
    {
      id: 'apiKey',
      type: SubBlockType.TEXT,
      label: 'API Key',
      placeholder: 'Optional API key for authentication',
      visibleWhen: (config: ToolBlockConfig) => config.toolType === 'mcp'
    },
    {
      id: 'selectedTools',
      type: SubBlockType.TEXT,
      label: 'Selected Tools',
      placeholder: 'Comma-separated list of tool names',
      multiline: true,
      visibleWhen: (config: ToolBlockConfig) => config.toolType === 'mcp',
      description: 'Which tools from the MCP server to use'
    },
    {
      id: 'allowRemote',
      type: SubBlockType.SELECT,
      label: 'Allow Remote Access',
      defaultValue: true,
      visibleWhen: (config: ToolBlockConfig) => config.toolType === 'mcp',
      options: [
        { value: 'true', label: 'Yes', description: 'Allow remote MCP server access' },
        { value: 'false', label: 'No', description: 'Local access only' }
      ]
    },
    {
      id: 'customCode',
      type: SubBlockType.TEXT,
      label: 'Custom Code',
      placeholder: '// Custom tool function\nfunction myTool(input) {\n  // Your logic here\n  return result;\n}',
      multiline: true,
      language: 'javascript',
      visibleWhen: (config: ToolBlockConfig) => config.toolType === 'custom',
      required: true
    },
    {
      id: 'description',
      type: SubBlockType.TEXT,
      label: 'Description',
      placeholder: 'Describe what this tool does...',
      multiline: true
    }
  ],

  validateConfig: (config: ToolBlockConfig) => {
    const errors = [];

    if (!config.name) {
      errors.push({
        field: 'name',
        message: 'Tool name is required',
        severity: 'error' as const
      });
    }

    if (config.toolType === 'mcp' && !config.serverUrl) {
      errors.push({
        field: 'serverUrl',
        message: 'Server URL is required for MCP tools',
        severity: 'error' as const
      });
    }

    if (config.toolType === 'custom' && !config.customCode) {
      errors.push({
        field: 'customCode',
        message: 'Custom code is required for custom tools',
        severity: 'error' as const
      });
    }

    if (config.serverUrl) {
      try {
        new URL(config.serverUrl);
      } catch (e) {
        errors.push({
          field: 'serverUrl',
          message: 'Invalid URL format',
          severity: 'error' as const
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  generateCode: (config: ToolBlockConfig, context: CodeGenerationContext, inputVar: string, outputVar: string) => {
    const { toolType, name, serverUrl, selectedTools, customCode } = config;

    switch (toolType) {
      case 'mcp':
        const tools = selectedTools ? selectedTools.filter(Boolean) : [];
        return `// MCP Tool: ${name}
        const ${outputVar} = await callMcpTool({
          serverUrl: '${serverUrl}',
          tools: ${JSON.stringify(tools)},
          input: ${inputVar}
        });`;

      case 'custom':
        return `// Custom Tool: ${name}
        const ${outputVar} = (() => {
          const input = ${inputVar};
          ${customCode}
        })();`;

      case 'builtin':
        return `// Built-in Tool: ${name}
        const ${outputVar} = await builtinTools.${name.replace(/[^a-zA-Z0-9]/g, '')}(${inputVar});`;

      default:
        return `const ${outputVar} = ${inputVar};`;
    }
  },

  getImports: (config: ToolBlockConfig) => {
    const imports: string[] = [];
    if (config.toolType === 'mcp') {
      // imports.push({ module: '@genkit-ai/core', exports: ['tool'] });
    }
    return imports;
  },

  getDependencies: (config: ToolBlockConfig) => {
    const deps = [];
    if (config.toolType === 'mcp') {
      deps.push('@genkit-ai/core');
    }
    return deps;
  },

  getPlugins: () => []
};