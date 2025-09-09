import React from 'react';
import { FileText } from 'lucide-react';
import { z } from 'zod';
import { GenkitDataBlock } from '../base/GenkitBlock';
import { SubBlock, SubBlockType, BlockCategory } from '../types';
import { GenkitInputTemplate } from '../genkit/templates';

interface InputBlockConfig {
  inputType: 'static' | 'variable';
  staticValue?: string;
  variableName?: string;
  variableDescription?: string;
  defaultValue?: string;
}

export class InputBlock extends GenkitDataBlock<InputBlockConfig, any> {
  readonly type = 'input';
  readonly name = 'Input';
  readonly description = 'Define input data for the flow';
  readonly longDescription = 'Configure how data enters your flow. Can be static values or dynamic variables from the flow input.';
  readonly category: BlockCategory = 'input';
  readonly version = '1.0.0';
  readonly bgColor = '#1e40af';
  readonly icon = React.createElement(FileText, { className: "w-4 h-4" });

  readonly subBlocks: SubBlock[] = [
    {
      id: 'inputType',
      type: SubBlockType.SELECT,
      label: 'Input Type',
      required: true,
      defaultValue: 'variable',
      options: [
        { value: 'static', label: 'Static Value', description: 'Use a fixed value' },
        { value: 'variable', label: 'Variable', description: 'Extract from flow input' }
      ]
    },
    {
      id: 'staticValue',
      type: SubBlockType.TEXT,
      label: 'Static Value',
      placeholder: 'Enter static value...',
      multiline: true,
      visibleWhen: (config) => config.inputType === 'static',
      required: true
    },
    {
      id: 'variableName',
      type: SubBlockType.TEXT,
      label: 'Variable Name',
      placeholder: 'input',
      defaultValue: 'input',
      visibleWhen: (config) => config.inputType === 'variable',
      validate: (value) => {
        if (!value || typeof value !== 'string') return 'Variable name is required';
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) return 'Invalid variable name format';
        return null;
      }
    },
    {
      id: 'variableDescription',
      type: SubBlockType.TEXT,
      label: 'Variable Description',
      placeholder: 'Describe what this variable represents...',
      visibleWhen: (config) => config.inputType === 'variable',
      multiline: true
    },
    {
      id: 'defaultValue',
      type: SubBlockType.TEXT,
      label: 'Default Value',
      placeholder: 'Default value if not provided...',
      visibleWhen: (config) => config.inputType === 'variable'
    }
  ];

  readonly codeTemplate = new GenkitInputTemplate();

  readonly inputSchema = z.object({
    inputType: z.enum(['static', 'variable']),
    staticValue: z.string().optional(),
    variableName: z.string().optional(),
    variableDescription: z.string().optional(),
    defaultValue: z.string().optional()
  });

  getSupportedDataTypes(): string[] {
    return ['string', 'number', 'boolean', 'object', 'array', 'json'];
  }

  validateConfig(config: InputBlockConfig) {
    const result = super.validateConfig(config);

    // Additional validation
    if (config.inputType === 'static' && !config.staticValue) {
      result.errors.push({
        field: 'staticValue',
        message: 'Static value is required when input type is static',
        severity: 'error'
      });
      result.isValid = false;
    }

    if (config.inputType === 'variable') {
      const varName = config.variableName || 'input';
      if (varName !== 'input' && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
        result.errors.push({
          field: 'variableName',
          message: 'Variable name must be a valid JavaScript identifier',
          severity: 'error'
        });
        result.isValid = false;
      }
    }

    return result;
  }

  getDefaultConfig(): Partial<InputBlockConfig> {
    return {
      inputType: 'variable',
      variableName: 'input'
    };
  }
}