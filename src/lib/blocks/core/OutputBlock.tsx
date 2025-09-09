import React from 'react';
import { Download } from 'lucide-react';
import { z } from 'zod';
import { GenkitDataBlock } from '../base/GenkitBlock';
import { SubBlock, SubBlockType, BlockCategory } from '../types';
import { GenkitOutputTemplate } from '../genkit/templates';

interface OutputBlockConfig {
  format: 'text' | 'json' | 'structured';
  schema?: string;
  transform?: string;
}

export class OutputBlock extends GenkitDataBlock<OutputBlockConfig, any> {
  readonly type = 'output';
  readonly name = 'Output';
  readonly description = 'Define how data exits your flow';
  readonly longDescription = 'Configure the final output format of your flow. Supports text, JSON, and structured output with schema validation.';
  readonly category: BlockCategory = 'output';
  readonly version = '1.0.0';
  readonly bgColor = '#dc2626';
  readonly icon = React.createElement(Download, { className: "w-4 h-4" });

  readonly subBlocks: SubBlock[] = [
    {
      id: 'format',
      type: SubBlockType.SELECT,
      label: 'Output Format',
      required: true,
      defaultValue: 'text',
      options: [
        { value: 'text', label: 'Text', description: 'Convert to string output' },
        { value: 'json', label: 'JSON', description: 'Structured JSON object' },
        { value: 'structured', label: 'Structured', description: 'Schema-validated output' }
      ]
    },
    {
      id: 'schema',
      type: SubBlockType.SCHEMA,
      label: 'Output Schema',
      placeholder: 'z.object({\n  result: z.string(),\n  timestamp: z.string()\n})',
      multiline: true,
      visibleWhen: (config) => config.format === 'structured',
      required: false, // Only required when format is structured, handled in validateConfig
      description: 'Zod schema to validate and structure the output'
    },
    {
      id: 'transform',
      type: SubBlockType.CODE,
      label: 'Transform Code',
      placeholder: '// Transform the data before output\nreturn data;',
      multiline: true,
      language: 'javascript',
      description: 'Optional JavaScript code to transform data before output'
    }
  ];

  readonly codeTemplate = new GenkitOutputTemplate();

  readonly inputSchema = z.object({
    format: z.enum(['text', 'json', 'structured']),
    schema: z.string().optional(),
    transform: z.string().optional()
  });

  getSupportedDataTypes(): string[] {
    return ['string', 'number', 'boolean', 'object', 'array', 'json'];
  }

  validateConfig(config: OutputBlockConfig) {
    const result = super.validateConfig(config);

    // Validate schema if structured format
    if (config.format === 'structured' && !config.schema) {
      result.errors.push({
        field: 'schema',
        message: 'Schema is required for structured output format',
        severity: 'error'
      });
      result.isValid = false;
    }

    // Validate schema syntax
    if (config.schema) {
      try {
        if (!config.schema.trim().startsWith('z.')) {
          result.errors.push({
            field: 'schema',
            message: 'Schema must start with "z." (e.g., z.object({...}))',
            severity: 'error'
          });
          result.isValid = false;
        }
      } catch (error) {
        result.errors.push({
          field: 'schema',
          message: 'Invalid schema format',
          severity: 'error'
        });
        result.isValid = false;
      }
    }

    // Validate transform code if provided
    if (config.transform) {
      try {
        new Function('data', 'ctx', config.transform);
      } catch (error) {
        result.errors.push({
          field: 'transform',
          message: `Transform code syntax error: ${error instanceof Error ? error.message : 'Invalid JavaScript'}`,
          severity: 'error'
        });
        result.isValid = false;
      }
    }

    return result;
  }

  getDefaultConfig(): Partial<OutputBlockConfig> {
    return {
      format: 'text'
    };
  }
}