import { ServerBlockDefinition, SubBlockType, CodeGenerationContext } from '../types';
import { generateContextualTemplateCode, extractTemplateVariables } from '../utils/templateUtils';

interface AgentBlockConfig {
  provider: 'googleai' | 'openai' | 'anthropic';
  model: string;
  promptType: 'static' | 'library';
  systemPrompt?: string;
  userPrompt?: string;
  promptLibraryId?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  enableStreamingResponse?: boolean;
  enableThinking?: boolean;
  enableCaching?: boolean;
  safetySettings?: string;
  responseFormat?: 'text' | 'json';
  jsonSchema?: string;
}

export const AgentBlockDefinition: ServerBlockDefinition = {
  type: 'agent',
  name: 'Agent',
  description: 'AI model for text generation and reasoning',
  longDescription: 'Configure AI agents with different providers (Google AI, OpenAI, Anthropic), models, and advanced parameters for text generation, reasoning, and structured output.',
  category: 'genai',
  version: '1.0.0',
  
  isAvailable: () => true,

  subBlocks: [
    {
      id: 'provider',
      type: SubBlockType.SELECT,
      label: 'Provider',
      required: true,
      defaultValue: 'googleai',
      options: [
        { value: 'googleai', label: 'Google AI', description: 'Google Gemini models' },
        { value: 'openai', label: 'OpenAI', description: 'GPT models' },
        { value: 'anthropic', label: 'Anthropic', description: 'Claude models' }
      ]
    },
    {
      id: 'model',
      type: SubBlockType.SELECT,
      label: 'Model',
      required: true,
      defaultValue: 'gemini-2.5-flash',
      options: [
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Fast, efficient model' },
        { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Advanced reasoning' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Cost-effective GPT-4' },
        { value: 'gpt-4o', label: 'GPT-4o', description: 'Latest GPT-4 model' },
        { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', description: 'Latest Claude model' },
        { value: 'claude-3-5-haiku', label: 'Claude 3.5 Haiku', description: 'Fast Claude model' },
        { value: 'claude-3-opus', label: 'Claude 3 Opus', description: 'Most capable Claude model' },
        { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet', description: 'Balanced Claude model' },
        { value: 'claude-3-haiku', label: 'Claude 3 Haiku', description: 'Fast Claude model' }
      ]
    },
    {
      id: 'promptType',
      type: SubBlockType.SELECT,
      label: 'Prompt Type',
      required: true,
      defaultValue: 'static',
      options: [
        { value: 'static', label: 'Static Prompts', description: 'Define prompts directly' },
        { value: 'library', label: 'Prompt Library', description: 'Use saved prompts' }
      ]
    },
    {
      id: 'systemPrompt',
      type: SubBlockType.TEXT,
      label: 'System Prompt',
      placeholder: 'You are a helpful assistant...',
      multiline: true,
      visibleWhen: (config: AgentBlockConfig) => config.promptType === 'static'
    },
    {
      id: 'userPrompt',
      type: SubBlockType.TEXT,
      label: 'User Prompt',
      placeholder: 'Process this input: {{input}}',
      multiline: true,
      visibleWhen: (config: AgentBlockConfig) => config.promptType === 'static',
      required: true
    },
    {
      id: 'promptLibraryId',
      type: SubBlockType.TEXT,
      label: 'Prompt Library ID',
      placeholder: 'Select from prompt library...',
      visibleWhen: (config: AgentBlockConfig) => config.promptType === 'library',
      required: true
    },
    {
      id: 'temperature',
      type: SubBlockType.NUMBER,
      label: 'Temperature',
      defaultValue: 0.7,
      min: 0,
      max: 2,
      step: 0.1,
      description: 'Creativity level (0=deterministic, 2=very creative)'
    },
    {
      id: 'maxTokens',
      type: SubBlockType.NUMBER,
      label: 'Max Tokens',
      defaultValue: 1000,
      min: 1,
      max: 8192,
      description: 'Maximum response length'
    },
    {
      id: 'responseFormat',
      type: SubBlockType.SELECT,
      label: 'Response Format',
      defaultValue: 'text',
      options: [
        { value: 'text', label: 'Text', description: 'Plain text response' },
        { value: 'json', label: 'JSON', description: 'Structured JSON output' }
      ]
    },
    {
      id: 'jsonSchema',
      type: SubBlockType.TEXT,
      label: 'JSON Schema',
      placeholder: '{"type": "object", "properties": {...}}',
      multiline: true,
      visibleWhen: (config: AgentBlockConfig) => config.responseFormat === 'json',
      description: 'JSON schema for structured output validation'
    }
  ],

  validateConfig: (config: AgentBlockConfig) => {
    const errors = [];

    if (!config.provider) {
      errors.push({
        field: 'provider',
        message: 'Provider is required',
        severity: 'error' as const
      });
    }

    if (!config.model) {
      errors.push({
        field: 'model',
        message: 'Model is required',
        severity: 'error' as const
      });
    }

    if (config.promptType === 'static' && !config.userPrompt) {
      errors.push({
        field: 'userPrompt',
        message: 'User prompt is required for static prompts',
        severity: 'error' as const
      });
    }

    if (config.promptType === 'library' && !config.promptLibraryId) {
      errors.push({
        field: 'promptLibraryId',
        message: 'Prompt library ID is required',
        severity: 'error' as const
      });
    }

    if (config.responseFormat === 'json' && !config.jsonSchema) {
      errors.push({
        field: 'jsonSchema',
        message: 'JSON schema is required for JSON response format',
        severity: 'error' as const
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  generateCode: (config: AgentBlockConfig, context: CodeGenerationContext, inputVar: string, outputVar: string) => {
    const { provider, model, promptType, systemPrompt, userPrompt, temperature, maxTokens, responseFormat, jsonSchema } = config;

    // Helper function to map UI model names to Anthropic model constants
    const getAnthropicModelConstant = (modelName: string): string => {
      const modelMapping: Record<string, string> = {
        'claude-3-5-sonnet-20241022': 'claude35Sonnet',
        'claude-3-5-haiku': 'claude35Haiku',
        'claude-3-opus': 'claude3Opus',
        'claude-3-sonnet': 'claude3Sonnet',
        'claude-3-haiku': 'claude3Haiku'
      };
      return modelMapping[modelName] || 'claude35Sonnet'; // Default fallback
    };

    // Add provider plugin to context
    if (provider === 'googleai') {
      context.plugins.add('googleAI()');
    } else if (provider === 'openai') {
      context.plugins.add('openai()');
    } else if (provider === 'anthropic') {
      context.plugins.add('anthropic()');
      // Add required model import to context
      const modelConstant = getAnthropicModelConstant(model);
      context.imports.add(`import { ${modelConstant} } from 'genkitx-anthropic';`);
    }

    let promptCode = '';
    if (promptType === 'static') {
      const systemText = systemPrompt ? `System: ${systemPrompt}\n` : '';
      const userText = userPrompt || 'Process this input: {{input}}';
      const fullTemplate = systemText + userText;
      
      // Use the new template system that can handle any {{variable}} pattern
      promptCode = generateContextualTemplateCode(fullTemplate, [inputVar]);
    } else {
      promptCode = `await getPromptFromLibrary('${config.promptLibraryId}', ${inputVar})`;
    }

    // Get correct model reference
    let modelRef = '';
    if (provider === 'googleai') {
      modelRef = `googleAI.model('${model}')`;
    } else if (provider === 'openai') {
      modelRef = `openai.model('${model}')`;
    } else if (provider === 'anthropic') {
      const modelConstant = getAnthropicModelConstant(model);
      modelRef = modelConstant;
    }

    const configOptions = [];
    if (temperature !== undefined && temperature !== 0.7) {
      configOptions.push(`temperature: ${temperature}`);
    }
    if (maxTokens !== undefined && maxTokens !== 1000) {
      configOptions.push(`maxOutputTokens: ${maxTokens}`);
    }
    if (responseFormat === 'json') {
      configOptions.push(`output: { format: 'json', schema: ${jsonSchema || 'undefined'} }`);
    }

    const configStr = configOptions.length > 0 ? `,\n      config: {\n        ${configOptions.join(',\n        ')}\n      }` : '';

    return `const ${outputVar}Response = await ai.generate({
      model: ${modelRef},
      prompt: ${promptCode}${configStr}
    });
    const ${outputVar} = ${responseFormat === 'json' ? `${outputVar}Response.output` : `(typeof ${outputVar}Response.text === 'function' ? ${outputVar}Response.text() : ${outputVar}Response.text || ${outputVar}Response.output || '')`};`;
  },

  getImports: (config: AgentBlockConfig) => {
    const imports = [];
    if (config.provider === 'googleai') {
      imports.push("import { googleAI } from '@genkit-ai/google-genai';");
    } else if (config.provider === 'openai') {
      imports.push("import { openai } from '@genkit-ai/compat-oai/openai';");
    } else if (config.provider === 'anthropic') {
      // Helper function to map UI model names to Anthropic model constants
      const getAnthropicModelConstant = (modelName: string): string => {
        const modelMapping: Record<string, string> = {
          'claude-3-5-sonnet-20241022': 'claude35Sonnet',
          'claude-3-5-haiku': 'claude35Haiku',
          'claude-3-opus': 'claude3Opus',
          'claude-3-sonnet': 'claude3Sonnet',
          'claude-3-haiku': 'claude3Haiku'
        };
        return modelMapping[modelName] || 'claude35Sonnet'; // Default fallback
      };

      const modelConstant = getAnthropicModelConstant(config.model);
      imports.push(`import { anthropic, ${modelConstant} } from 'genkitx-anthropic';`);
    }
    return imports;
  },

  getDependencies: (config: AgentBlockConfig) => {
    const deps = ['genkit'];
    if (config.provider === 'googleai') {
      deps.push('@genkit-ai/google-genai');
    } else if (config.provider === 'openai') {
      deps.push('@genkit-ai/compat-oai');
    } else if (config.provider === 'anthropic') {
      deps.push('genkitx-anthropic');
    }
    return deps;
  },

  getPlugins: (config: AgentBlockConfig) => {
    if (config.provider === 'googleai') {
      return ['googleAI()'];
    } else if (config.provider === 'openai') {
      return ['openai()'];
    } else if (config.provider === 'anthropic') {
      return ['anthropic()'];
    }
    return [];
  }
};