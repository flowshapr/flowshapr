import { ServerBlockDefinition, SubBlockType, CodeGenerationContext } from '../types';

interface OutputBlockConfig {
  format: 'text' | 'json' | 'structured';
  schema?: string;
  transformCode?: string;
}

export const OutputBlockDefinition: ServerBlockDefinition = {
  type: 'output',
  name: 'Output',
  description: 'Define output format for the flow',
  longDescription: 'Configure how data exits your flow. Support for plain text, JSON, or custom structured output with optional data transformation.',
  category: 'output',
  version: '1.0.0',
  
  isAvailable: () => true,

  subBlocks: [
    {
      id: 'format',
      type: SubBlockType.SELECT,
      label: 'Output Format',
      required: true,
      defaultValue: 'text',
      options: [
        { value: 'text', label: 'Text', description: 'Plain text output' },
        { value: 'json', label: 'JSON', description: 'JSON formatted output' },
        { value: 'structured', label: 'Structured', description: 'Custom structured output' }
      ]
    },
    {
      id: 'schema',
      type: SubBlockType.TEXT,
      label: 'Output Schema',
      placeholder: '{"type": "object", "properties": {...}}',
      multiline: true,
      visibleWhen: (config: OutputBlockConfig) => config.format === 'json' || config.format === 'structured',
      description: 'JSON schema for output validation'
    },
    {
      id: 'transformCode',
      type: SubBlockType.TEXT,
      label: 'Transform Code',
      placeholder: '// Transform the data\nreturn data;',
      multiline: true,
      language: 'javascript',
      visibleWhen: (config: OutputBlockConfig) => config.format === 'structured',
      description: 'Optional JavaScript code to transform the output'
    }
  ],

  validateConfig: (config: OutputBlockConfig) => {
    const errors = [];

    if (!config.format) {
      errors.push({
        field: 'format',
        message: 'Output format is required',
        severity: 'error' as const
      });
    }

    if ((config.format === 'json' || config.format === 'structured') && config.schema) {
      try {
        JSON.parse(config.schema);
      } catch (e) {
        errors.push({
          field: 'schema',
          message: 'Invalid JSON schema format',
          severity: 'error' as const
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  generateCode: (config: OutputBlockConfig, context: CodeGenerationContext, inputVar: string, outputVar: string) => {
    const { format, schema, transformCode } = config;

    let code = '';

    switch (format) {
      case 'text':
        code = `const ${outputVar} = String(${inputVar});`;
        break;

      case 'json':
        if (schema) {
          code = `// Validate against schema
          const schema = ${schema};
          const ${outputVar} = typeof ${inputVar} === 'object' ? ${inputVar} : JSON.parse(String(${inputVar}));
          // TODO: Add runtime schema validation`;
        } else {
          code = `const ${outputVar} = typeof ${inputVar} === 'object' ? ${inputVar} : JSON.parse(String(${inputVar}));`;
        }
        break;

      case 'structured':
        if (transformCode) {
          code = `const ${outputVar} = (() => {
            const data = ${inputVar};
            ${transformCode}
          })();`;
        } else {
          code = `const ${outputVar} = ${inputVar};`;
        }
        break;

      default:
        code = `const ${outputVar} = ${inputVar};`;
    }

    return code;
  },

  getImports: (config: any) => [],
  getDependencies: (config: any) => [],
  getPlugins: (config: any) => []
};