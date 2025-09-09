import React from 'react';
import { Brain } from 'lucide-react';
import { z } from 'zod';
import { GenkitGenerativeBlock } from '../base/GenkitBlock';
import { SubBlock, SubBlockType, BlockCategory } from '../types';
import { GenkitModelTemplate } from '../genkit/templates';

interface ModelBlockConfig {
  provider: 'googleai' | 'openai' | 'anthropic';
  model: string;
  systemPrompt?: string;
  userPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  outputSchema?: string;
  tools?: string[];
}

export class ModelBlock extends GenkitGenerativeBlock<ModelBlockConfig, string> {
  readonly type = 'model';
  readonly name = 'AI Model';
  readonly description = 'Generate content using AI models';
  readonly longDescription = 'Connect to various AI providers (Google, OpenAI, Anthropic) to generate text, analyze content, and perform AI-powered tasks.';
  readonly category: BlockCategory = 'genai';
  readonly version = '1.0.0';
  readonly bgColor = '#16a34a';
  readonly icon = React.createElement(Brain, { className: "w-4 h-4" });

  readonly subBlocks: SubBlock[] = [
    {
      id: 'provider',
      type: SubBlockType.SELECT,
      label: 'Provider',
      required: true,
      defaultValue: 'googleai',
      options: [
        { value: 'googleai', label: 'Google AI', description: 'Gemini models via Google AI Studio' },
        { value: 'openai', label: 'OpenAI', description: 'GPT models via OpenAI API' },
        { value: 'anthropic', label: 'Anthropic', description: 'Claude models via Anthropic API' }
      ]
    },
    {
      id: 'model',
      type: SubBlockType.SELECT,
      label: 'Model',
      required: true,
      defaultValue: 'gemini-2.5-flash',
      options: [], // Will be populated dynamically based on provider
      visibleWhen: (config) => !!config.provider
    },
    {
      id: 'systemPrompt',
      type: SubBlockType.PROMPT,
      label: 'System Prompt',
      placeholder: 'You are a helpful assistant...',
      description: 'Instructions that define the AI\'s behavior and persona',
      multiline: true
    },
    {
      id: 'userPrompt',
      type: SubBlockType.PROMPT,
      label: 'User Prompt',
      placeholder: 'Process this input: {{input}}',
      description: 'The main prompt template. Use {{variable}} for dynamic values.',
      multiline: true
    },
    {
      id: 'temperature',
      type: SubBlockType.NUMBER,
      label: 'Temperature',
      defaultValue: 0.7,
      min: 0,
      max: 2,
      description: 'Controls randomness (0 = deterministic, 2 = very creative)',
      validate: (value) => {
        const num = parseFloat(value);
        if (isNaN(num) || num < 0 || num > 2) return 'Temperature must be between 0 and 2';
        return null;
      }
    },
    {
      id: 'maxTokens',
      type: SubBlockType.NUMBER,
      label: 'Max Tokens',
      defaultValue: 1000,
      min: 1,
      max: 8192,
      description: 'Maximum number of tokens to generate',
      validate: (value) => {
        const num = parseInt(value);
        if (isNaN(num) || num < 1) return 'Max tokens must be a positive number';
        return null;
      }
    },
    {
      id: 'topP',
      type: SubBlockType.NUMBER,
      label: 'Top P',
      defaultValue: 0.95,
      min: 0,
      max: 1,
      description: 'Nucleus sampling parameter',
      visibleWhen: (config) => config.provider === 'googleai' || config.provider === 'openai'
    },
    {
      id: 'topK',
      type: SubBlockType.NUMBER,
      label: 'Top K',
      defaultValue: 40,
      min: 1,
      max: 100,
      description: 'Top-K sampling parameter',
      visibleWhen: (config) => config.provider === 'googleai' || config.provider === 'anthropic'
    },
    {
      id: 'frequencyPenalty',
      type: SubBlockType.NUMBER,
      label: 'Frequency Penalty',
      defaultValue: 0,
      min: -2,
      max: 2,
      description: 'Penalty for frequently used tokens',
      visibleWhen: (config) => config.provider === 'openai'
    },
    {
      id: 'presencePenalty',
      type: SubBlockType.NUMBER,
      label: 'Presence Penalty',
      defaultValue: 0,
      min: -2,
      max: 2,
      description: 'Penalty for tokens that have appeared',
      visibleWhen: (config) => config.provider === 'openai'
    },
    {
      id: 'stopSequences',
      type: SubBlockType.ARRAY,
      label: 'Stop Sequences',
      placeholder: 'Enter stop sequences...',
      description: 'Sequences that will stop generation'
    },
    {
      id: 'outputSchema',
      type: SubBlockType.SCHEMA,
      label: 'Output Schema',
      placeholder: 'z.object({ ... })',
      description: 'Zod schema for structured output',
      multiline: true
    }
  ];

  readonly codeTemplate = new GenkitModelTemplate();

  readonly inputSchema = z.object({
    provider: z.enum(['googleai', 'openai', 'anthropic']),
    model: z.string(),
    systemPrompt: z.string().optional(),
    userPrompt: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().positive().optional(),
    topP: z.number().min(0).max(1).optional(),
    topK: z.number().positive().optional(),
    frequencyPenalty: z.number().min(-2).max(2).optional(),
    presencePenalty: z.number().min(-2).max(2).optional(),
    stopSequences: z.array(z.string()).optional(),
    outputSchema: z.string().optional(),
    tools: z.array(z.string()).optional()
  });

  getSupportedProviders(): string[] {
    return ['googleai', 'openai', 'anthropic'];
  }

  validateConfig(config: ModelBlockConfig) {
    const result = super.validateConfig(config);

    // Validate provider-specific settings
    const modelValidation = this.validateModelConfig(config, config.provider);
    if (!modelValidation.isValid) {
      modelValidation.errors.forEach(error => {
        result.errors.push({
          message: error,
          severity: 'error'
        });
      });
      result.isValid = false;
    }

    // Validate output schema syntax if provided
    if (config.outputSchema) {
      try {
        // Simple validation - check if it looks like valid Zod syntax
        if (!config.outputSchema.trim().startsWith('z.')) {
          result.errors.push({
            field: 'outputSchema',
            message: 'Output schema must start with "z." (e.g., z.object({...}))',
            severity: 'error'
          });
          result.isValid = false;
        }
      } catch (error) {
        result.errors.push({
          field: 'outputSchema',
          message: 'Invalid output schema format',
          severity: 'error'
        });
        result.isValid = false;
      }
    }

    return result;
  }

  getDefaultConfig(): Partial<ModelBlockConfig> {
    return {
      provider: 'googleai',
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      maxTokens: 1000
    };
  }

  /**
   * Get model options dynamically based on provider
   */
  getModelOptions(provider: string) {
    return this.getAvailableModels(provider);
  }
}