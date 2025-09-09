import React from 'react';
import { Code } from 'lucide-react';
import { z } from 'zod';
import { GenkitUtilityBlock } from '../base/GenkitBlock';
import { SubBlock, SubBlockType, BlockCategory } from '../types';
import { GenkitTransformTemplate } from '../genkit/templates';

interface TransformBlockConfig {
  code: string;
  timeout?: number;
  description?: string;
}

export class TransformBlock extends GenkitUtilityBlock<TransformBlockConfig, any> {
  readonly type = 'transform';
  readonly name = 'Transform';
  readonly description = 'Transform data with JavaScript code';
  readonly longDescription = 'Execute custom JavaScript code to transform, filter, or manipulate data flowing through your pipeline. Has access to flow context and variables.';
  readonly category: BlockCategory = 'logic';
  readonly version = '1.0.0';
  readonly bgColor = '#ea580c';
  readonly icon = React.createElement(Code, { className: "w-4 h-4" });

  readonly subBlocks: SubBlock[] = [
    {
      id: 'description',
      type: SubBlockType.TEXT,
      label: 'Description',
      placeholder: 'What does this transform do?',
      multiline: true,
      description: 'Optional description of the transformation logic'
    },
    {
      id: 'code',
      type: SubBlockType.CODE,
      label: 'Transform Code',
      placeholder: `// Transform the input data
// Available variables:
//   - data: the input data
//   - ctx: flow context with variables
//   - context: flow execution context

// Example transformations:
// return data.toUpperCase();
// return { ...data, processed: true };
// return data.filter(item => item.active);

return data;`,
      multiline: true,
      language: 'javascript',
      required: true,
      description: 'JavaScript code to transform the data. Must return the transformed data.'
    },
    {
      id: 'timeout',
      type: SubBlockType.NUMBER,
      label: 'Timeout (ms)',
      defaultValue: 5000,
      min: 100,
      max: 30000,
      description: 'Maximum execution time in milliseconds'
    }
  ];

  readonly codeTemplate = new GenkitTransformTemplate();

  readonly inputSchema = z.object({
    code: z.string().min(1),
    timeout: z.number().positive().optional(),
    description: z.string().optional()
  });

  supportsCodeExecution(): boolean {
    return true;
  }

  validateConfig(config: TransformBlockConfig) {
    const result = super.validateConfig(config);

    // Validate code syntax and safety
    const codeValidation = this.validateCode(config.code);
    if (!codeValidation.isValid) {
      codeValidation.errors.forEach(error => {
        result.errors.push({
          field: 'code',
          message: error,
          severity: 'error'
        });
      });
      result.isValid = false;
    }

    // Check for return statement
    if (!config.code.includes('return')) {
      result.errors.push({
        field: 'code',
        message: 'Transform code must include a return statement',
        severity: 'warning'
      });
    }

    // Validate timeout
    if (config.timeout !== undefined) {
      if (config.timeout < 100 || config.timeout > 30000) {
        result.errors.push({
          field: 'timeout',
          message: 'Timeout must be between 100ms and 30000ms',
          severity: 'error'
        });
        result.isValid = false;
      }
    }

    return result;
  }

  getDefaultConfig(): Partial<TransformBlockConfig> {
    return {
      code: 'return data;',
      timeout: 5000
    };
  }

  /**
   * Get code examples for common transformations
   */
  getCodeExamples() {
    return [
      {
        name: 'Upper Case Text',
        code: 'return typeof data === "string" ? data.toUpperCase() : data;'
      },
      {
        name: 'Add Timestamp',
        code: 'return { ...data, timestamp: new Date().toISOString() };'
      },
      {
        name: 'Filter Array',
        code: 'return Array.isArray(data) ? data.filter(item => item.active) : data;'
      },
      {
        name: 'Map Array Values',
        code: 'return Array.isArray(data) ? data.map(item => ({ ...item, processed: true })) : data;'
      },
      {
        name: 'Extract Fields',
        code: `if (typeof data === 'object' && data !== null) {
  const { name, email, id } = data;
  return { name, email, id };
}
return data;`
      },
      {
        name: 'Parse JSON String',
        code: `try {
  return typeof data === 'string' ? JSON.parse(data) : data;
} catch (error) {
  console.error('Failed to parse JSON:', error);
  return data;
}`
      }
    ];
  }
}