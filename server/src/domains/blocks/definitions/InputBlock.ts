import { ServerBlockDefinition, SubBlockType, CodeGenerationContext } from '../types';

interface InputBlockConfig {
  inputType: 'static' | 'variable';
  staticValue?: string;
  variableName?: string;
  variableDescription?: string;
  defaultValue?: string;
}

export const InputBlockDefinition: ServerBlockDefinition = {
  type: 'input',
  name: 'Input',
  description: 'Define input data for the flow',
  longDescription: 'Configure how data enters your flow. Can be static values or dynamic variables from the flow input.',
  category: 'input',
  version: '1.0.0',
  
  isAvailable: () => true,

  subBlocks: [
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
      visibleWhen: (config: InputBlockConfig) => config.inputType === 'static'
    },
    {
      id: 'variableName',
      type: SubBlockType.TEXT,
      label: 'Variable Name',
      placeholder: 'input',
      defaultValue: 'input',
      visibleWhen: (config: InputBlockConfig) => config.inputType === 'variable',
      validate: (value: string) => {
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
      visibleWhen: (config: InputBlockConfig) => config.inputType === 'variable',
      multiline: true
    },
    {
      id: 'defaultValue',
      type: SubBlockType.TEXT,
      label: 'Default Value',
      placeholder: 'Default value if not provided...',
      visibleWhen: (config: InputBlockConfig) => config.inputType === 'variable'
    }
  ],

  validateConfig: (config: InputBlockConfig) => {
    const errors = [];

    if (config.inputType === 'static' && (!config.staticValue && config.staticValue !== '')) {
      errors.push({
        field: 'staticValue',
        message: 'Static value is required when input type is static',
        severity: 'error' as const
      });
    }

    if (config.inputType === 'variable') {
      const varName = config.variableName || 'input';
      if (varName !== 'input' && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
        errors.push({
          field: 'variableName',
          message: 'Variable name must be a valid JavaScript identifier',
          severity: 'error' as const
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  generateCode: (config: InputBlockConfig, context: CodeGenerationContext, inputVar: string, outputVar: string) => {
    const { inputType, staticValue, variableName, defaultValue } = config;

    switch (inputType) {
      case 'static':
        const value = staticValue || defaultValue || 'Hello World';
        return `const ${outputVar} = ${JSON.stringify(value)};`;

      case 'variable':
        const varName = variableName || 'input';
        if (varName === 'input') {
          return `const ${outputVar} = ${inputVar};`;
        } else {
          return `const ${outputVar} = ${inputVar}.${varName} || ${inputVar};`;
        }

      default:
        return `const ${outputVar} = ${inputVar};`;
    }
  },

  getImports: (config: InputBlockConfig) => [],
  getDependencies: (config: InputBlockConfig) => [],
  getPlugins: (config: InputBlockConfig) => []
};