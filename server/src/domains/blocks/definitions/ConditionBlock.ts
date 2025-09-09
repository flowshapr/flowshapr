import { ServerBlockDefinition, SubBlockType, CodeGenerationContext } from '../types';

interface ConditionBlockConfig {
  condition: string;
  trueLabel?: string;
  falseLabel?: string;
  conditionType?: 'expression' | 'function';
}

export const ConditionBlockDefinition: ServerBlockDefinition = {
  type: 'condition',
  name: 'Condition',
  description: 'Conditional branching logic',
  longDescription: 'Create conditional branching in your flow based on data evaluation. Supports JavaScript expressions and custom condition functions.',
  category: 'logic',
  version: '1.0.0',
  
  isAvailable: () => true,

  subBlocks: [
    {
      id: 'conditionType',
      type: SubBlockType.SELECT,
      label: 'Condition Type',
      required: true,
      defaultValue: 'expression',
      options: [
        { value: 'expression', label: 'Expression', description: 'Simple JavaScript expression' },
        { value: 'function', label: 'Function', description: 'Custom JavaScript function' }
      ]
    },
    {
      id: 'condition',
      type: SubBlockType.TEXT,
      label: 'Condition',
      placeholder: 'data.score > 0.5',
      multiline: true,
      language: 'javascript',
      required: true,
      description: 'JavaScript expression or function to evaluate'
    },
    {
      id: 'trueLabel',
      type: SubBlockType.TEXT,
      label: 'True Label',
      placeholder: 'Yes',
      defaultValue: 'Yes',
      description: 'Label for the true branch'
    },
    {
      id: 'falseLabel',
      type: SubBlockType.TEXT,
      label: 'False Label',
      placeholder: 'No',
      defaultValue: 'No',
      description: 'Label for the false branch'
    }
  ],

  validateConfig: (config: ConditionBlockConfig) => {
    const errors = [];

    if (!config.condition) {
      errors.push({
        field: 'condition',
        message: 'Condition is required',
        severity: 'error' as const
      });
    }

    // Basic syntax validation for expressions
    if (config.conditionType === 'expression' && config.condition) {
      // Check for dangerous patterns
      const dangerous = ['eval(', 'Function(', 'require(', 'import(', 'process.', 'global.'];
      const hasDangerous = dangerous.some(pattern => config.condition.includes(pattern));
      
      if (hasDangerous) {
        errors.push({
          field: 'condition',
          message: 'Condition contains potentially unsafe code',
          severity: 'error' as const
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  generateCode: (config: ConditionBlockConfig, context: CodeGenerationContext, inputVar: string, outputVar: string) => {
    const { condition, conditionType } = config;

    if (conditionType === 'function') {
      return `const ${outputVar} = (() => {
        const data = ${inputVar};
        ${condition}
      })();`;
    } else {
      // Simple expression evaluation
      const safeCondition = condition.replace(/data\./g, `${inputVar}.`);
      return `const ${outputVar} = ${safeCondition};`;
    }
  },

  getImports: (config: any) => [],
  getDependencies: (config: any) => [],
  getPlugins: (config: any) => []
};