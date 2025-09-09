import React from 'react';
import { GitBranch } from 'lucide-react';
import { z } from 'zod';
import { GenkitUtilityBlock } from '../base/GenkitBlock';
import { SubBlock, SubBlockType, BlockCategory } from '../types';
import { GenkitConditionalTemplate } from '../genkit/templates';

interface ConditionalBlockConfig {
  condition: string;
  description?: string;
  trueValue?: any;
  falseValue?: any;
  mode: 'filter' | 'branch' | 'gate';
}

export class ConditionalBlock extends GenkitUtilityBlock<ConditionalBlockConfig, any> {
  readonly type = 'conditional';
  readonly name = 'Conditional';
  readonly description = 'Control flow based on conditions';
  readonly longDescription = 'Add conditional logic to your flow. Filter data, branch execution paths, or gate data flow based on JavaScript conditions.';
  readonly category: BlockCategory = 'logic';
  readonly version = '1.0.0';
  readonly bgColor = '#8b5cf6';
  readonly icon = React.createElement(GitBranch, { className: "w-4 h-4" });

  readonly subBlocks: SubBlock[] = [
    {
      id: 'mode',
      type: SubBlockType.SELECT,
      label: 'Mode',
      required: true,
      defaultValue: 'filter',
      options: [
        { value: 'filter', label: 'Filter', description: 'Pass data through only if condition is true' },
        { value: 'branch', label: 'Branch', description: 'Return different values based on condition' },
        { value: 'gate', label: 'Gate', description: 'Block or allow data flow' }
      ],
      description: 'How the condition should affect the data flow'
    },
    {
      id: 'description',
      type: SubBlockType.TEXT,
      label: 'Description',
      placeholder: 'What does this condition check?',
      multiline: true,
      description: 'Optional description of the conditional logic'
    },
    {
      id: 'condition',
      type: SubBlockType.CODE,
      label: 'Condition',
      placeholder: `// JavaScript condition that evaluates to true/false
// Available variables:
//   - data: the input data
//   - ctx: flow context with variables

// Examples:
// data && data.length > 0
// typeof data === 'string' && data.includes('important')
// data.score > 0.8
// ctx.user && ctx.user.role === 'admin'

return true;`,
      multiline: true,
      language: 'javascript',
      required: true,
      description: 'JavaScript condition that returns true or false'
    },
    {
      id: 'trueValue',
      type: SubBlockType.JSON,
      label: 'True Value',
      placeholder: '{"result": "condition met"}',
      visibleWhen: (config) => config.mode === 'branch',
      description: 'Value to return when condition is true'
    },
    {
      id: 'falseValue',
      type: SubBlockType.JSON,
      label: 'False Value',
      placeholder: '{"result": "condition not met"}',
      visibleWhen: (config) => config.mode === 'branch',
      description: 'Value to return when condition is false'
    }
  ];

  readonly codeTemplate = new GenkitConditionalTemplate();

  readonly inputSchema = z.object({
    condition: z.string().min(1),
    description: z.string().optional(),
    trueValue: z.any().optional(),
    falseValue: z.any().optional(),
    mode: z.enum(['filter', 'branch', 'gate'])
  });

  supportsCodeExecution(): boolean {
    return true;
  }

  validateConfig(config: ConditionalBlockConfig) {
    const result = super.validateConfig(config);

    // Validate condition syntax
    const codeValidation = this.validateCode(config.condition);
    if (!codeValidation.isValid) {
      codeValidation.errors.forEach(error => {
        result.errors.push({
          field: 'condition',
          message: error,
          severity: 'error'
        });
      });
      result.isValid = false;
    }

    // Validate branch mode requirements
    if (config.mode === 'branch') {
      if (config.trueValue === undefined && config.falseValue === undefined) {
        result.errors.push({
          message: 'Branch mode requires at least one of true/false values to be defined',
          severity: 'warning'
        });
      }
    }

    // Check for proper boolean return in condition
    if (!config.condition.includes('return') && !this.looksLikeBooleanExpression(config.condition)) {
      result.errors.push({
        field: 'condition',
        message: 'Condition should return a boolean value or be a boolean expression',
        severity: 'warning'
      });
    }

    return result;
  }

  /**
   * Check if code looks like a boolean expression
   */
  private looksLikeBooleanExpression(code: string): boolean {
    const booleanOperators = ['>', '<', '>=', '<=', '===', '!==', '==', '!=', '&&', '||', '!'];
    const booleanKeywords = ['true', 'false', 'Boolean'];
    
    return booleanOperators.some(op => code.includes(op)) ||
           booleanKeywords.some(keyword => code.includes(keyword));
  }

  getDefaultConfig(): Partial<ConditionalBlockConfig> {
    return {
      mode: 'filter',
      condition: 'return data != null && data !== "";'
    };
  }

  /**
   * Get condition examples for different scenarios
   */
  getConditionExamples() {
    return [
      {
        name: 'Check if data exists',
        code: 'return data != null && data !== "";',
        description: 'Pass through only non-empty data'
      },
      {
        name: 'Number threshold',
        code: 'return typeof data === "number" && data > 100;',
        description: 'Pass numbers greater than 100'
      },
      {
        name: 'String contains',
        code: 'return typeof data === "string" && data.includes("important");',
        description: 'Pass strings containing "important"'
      },
      {
        name: 'Array has items',
        code: 'return Array.isArray(data) && data.length > 0;',
        description: 'Pass non-empty arrays'
      },
      {
        name: 'Object property check',
        code: 'return data && typeof data === "object" && data.status === "approved";',
        description: 'Pass objects with approved status'
      },
      {
        name: 'Context variable check',
        code: 'return ctx.user && ctx.user.role === "admin";',
        description: 'Pass only for admin users'
      },
      {
        name: 'Score threshold',
        code: 'return data && typeof data.score === "number" && data.score >= 0.8;',
        description: 'Pass items with score >= 0.8'
      }
    ];
  }
}