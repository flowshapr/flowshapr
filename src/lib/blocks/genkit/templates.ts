import { CodeTemplate, CodeGenerationContext } from '../types';

/**
 * Base code template for Genkit blocks
 */
export abstract class BaseCodeTemplate implements CodeTemplate {
  abstract generate(
    config: any,
    context: CodeGenerationContext,
    inputVar: string,
    outputVar: string
  ): string;

  abstract getImports(): string[];
  abstract getDependencies(): string[];
  abstract getPlugins(): string[];

  /**
   * Helper to process template variables like {{variable}}
   */
  protected processTemplate(template: string): string {
    // Replace {{path}} with ${v("path")} for variable interpolation
    return template.replace(/\{\{\s*([\w$.]+)\s*\}\}/g, (_match, path) => `\${v("${path}")}`);
  }

  /**
   * Helper to build model configuration
   */
  protected buildModelConfig(config: any, provider: string): string {
    const modelConfig: any = {};

    // Common parameters
    if (config.temperature !== undefined) {
      modelConfig.temperature = config.temperature;
    }

    // Provider-specific parameters
    switch (provider) {
      case 'googleai':
        if (config.maxTokens) modelConfig.maxOutputTokens = config.maxTokens;
        if (config.topP !== undefined) modelConfig.topP = config.topP;
        if (config.topK !== undefined) modelConfig.topK = config.topK;
        if (config.candidateCount !== undefined) modelConfig.candidateCount = config.candidateCount;
        break;

      case 'openai':
        if (config.maxTokens) modelConfig.maxTokens = config.maxTokens;
        if (config.topP !== undefined) modelConfig.topP = config.topP;
        if (config.frequencyPenalty !== undefined) modelConfig.frequencyPenalty = config.frequencyPenalty;
        if (config.presencePenalty !== undefined) modelConfig.presencePenalty = config.presencePenalty;
        break;

      case 'anthropic':
        if (config.maxTokens) modelConfig.maxTokens = config.maxTokens;
        if (config.topP !== undefined) modelConfig.topP = config.topP;
        if (config.topK !== undefined) modelConfig.topK = config.topK;
        break;
    }

    // Stop sequences
    if (config.stopSequences && Array.isArray(config.stopSequences) && config.stopSequences.length > 0) {
      modelConfig.stopSequences = config.stopSequences;
    }

    return JSON.stringify(modelConfig, null, 2).replace(/\n/g, '\n    ');
  }

  /**
   * Helper to build prompt messages array
   */
  protected buildPromptMessages(config: any, inputVar: string): string {
    const messages: string[] = [];

    if (config.systemPrompt) {
      const processed = this.processTemplate(config.systemPrompt);
      messages.push(`{ role: 'system', content: \`${processed}\` }`);
    }

    if (config.userPrompt) {
      const processed = this.processTemplate(config.userPrompt);
      messages.push(`{ role: 'user', content: \`${processed}\` }`);
    } else {
      // Default to using input as user message
      messages.push(`{ role: 'user', content: ${inputVar} }`);
    }

    if (messages.length === 0) {
      return inputVar;
    }

    if (messages.length === 1 && !config.systemPrompt) {
      // Single user message can be simplified
      return messages[0].replace(/\{ role: 'user', content: (.+) \}/, '$1');
    }

    return `[\n      ${messages.join(',\n      ')}\n    ]`;
  }
}

/**
 * Template for model/generate blocks
 */
export class GenkitModelTemplate extends BaseCodeTemplate {
  generate(config: any, context: CodeGenerationContext, inputVar: string, outputVar: string): string {
    const { provider, model } = config;
    const modelRef = `${provider}/${model}`;
    const modelConfig = this.buildModelConfig(config, provider);
    const prompt = this.buildPromptMessages(config, inputVar);
    
    // Add required plugins
    context.plugins.add(this.getProviderPlugin(provider));

    // Handle tools if specified
    let toolsConfig = '';
    if (config.tools && Array.isArray(config.tools) && config.tools.length > 0) {
      const toolNames = config.tools.map((tool: any) => tool.name || tool).join(', ');
      toolsConfig = `,\n    tools: [${toolNames}]`;
    }

    // Handle structured output
    let outputConfig = '';
    if (config.outputSchema) {
      outputConfig = `,\n    output: { schema: ${config.outputSchema} }`;
    }

    return `const ${outputVar}Response = await ai.generate({
    model: '${modelRef}',
    prompt: ${prompt},
    config: ${modelConfig}${toolsConfig}${outputConfig}
  });
  const ${outputVar} = ${outputVar}Response.text();`;
  }

  getImports(): string[] {
    return [];
  }

  getDependencies(): string[] {
    return [];
  }

  getPlugins(): string[] {
    return [];
  }

  private getProviderPlugin(provider: string): string {
    switch (provider) {
      case 'googleai':
        return 'googleAI()';
      case 'openai':
        return 'openAI()';
      case 'anthropic':
        return 'anthropic()';
      default:
        return `${provider}()`;
    }
  }
}

/**
 * Template for input blocks
 */
export class GenkitInputTemplate extends BaseCodeTemplate {
  generate(config: any, context: CodeGenerationContext, inputVar: string, outputVar: string): string {
    const { inputType, staticValue, variableName, defaultValue } = config;

    switch (inputType) {
      case 'static':
        const value = staticValue || defaultValue || '';
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
  }

  getImports(): string[] {
    return [];
  }

  getDependencies(): string[] {
    return [];
  }

  getPlugins(): string[] {
    return [];
  }
}

/**
 * Template for output blocks
 */
export class GenkitOutputTemplate extends BaseCodeTemplate {
  generate(config: any, context: CodeGenerationContext, inputVar: string, outputVar: string): string {
    const { format = 'text', schema } = config;

    switch (format) {
      case 'text':
        return `const ${outputVar} = typeof ${inputVar} === 'string' ? ${inputVar} : JSON.stringify(${inputVar});`;

      case 'json':
        return `const ${outputVar} = typeof ${inputVar} === 'object' ? ${inputVar} : { result: ${inputVar} };`;

      case 'structured':
        if (schema) {
          return `const ${outputVar} = ${schema}.parse(${inputVar});`;
        }
        return `const ${outputVar} = ${inputVar};`;

      default:
        return `const ${outputVar} = ${inputVar};`;
    }
  }

  getImports(): string[] {
    return [];
  }

  getDependencies(): string[] {
    return [];
  }

  getPlugins(): string[] {
    return [];
  }
}

/**
 * Template for transform/code blocks
 */
export class GenkitTransformTemplate extends BaseCodeTemplate {
  generate(config: any, context: CodeGenerationContext, inputVar: string, outputVar: string): string {
    const { code } = config;

    return `const ${outputVar} = ((data, ctx) => {
    try {
      const context = ctx; // access flow context
      ${code}
      return data;
    } catch (error) {
      console.error('Transform error:', error);
      return data;
    }
  })(${inputVar}, ctx);`;
  }

  getImports(): string[] {
    return [];
  }

  getDependencies(): string[] {
    return [];
  }

  getPlugins(): string[] {
    return [];
  }
}

/**
 * Template for conditional blocks
 */
export class GenkitConditionalTemplate extends BaseCodeTemplate {
  generate(config: any, context: CodeGenerationContext, inputVar: string, outputVar: string): string {
    const { condition } = config;

    return `const ${outputVar} = (${condition}) ? ${inputVar} : null;`;
  }

  getImports(): string[] {
    return [];
  }

  getDependencies(): string[] {
    return [];
  }

  getPlugins(): string[] {
    return [];
  }
}

/**
 * Template for tool blocks
 */
export class GenkitToolTemplate extends BaseCodeTemplate {
  generate(config: any, context: CodeGenerationContext, inputVar: string, outputVar: string): string {
    const { toolType, toolConfig } = config;

    switch (toolType) {
      case 'custom':
        return this.generateCustomTool(toolConfig, inputVar, outputVar);
      
      case 'mcp':
        return this.generateMCPTool(toolConfig, inputVar, outputVar, context);
      
      default:
        return `const ${outputVar} = ${inputVar}; // Unsupported tool type: ${toolType}`;
    }
  }

  private generateCustomTool(toolConfig: any, inputVar: string, outputVar: string): string {
    const { name, description, parameters, implementation } = toolConfig;

    return `// Custom tool: ${name}
  const ${outputVar} = await (async (input) => {
    ${implementation}
  })(${inputVar});`;
  }

  private generateMCPTool(toolConfig: any, inputVar: string, outputVar: string, context?: CodeGenerationContext): string {
    const { serverUrl, tools = [] } = toolConfig;

    if (context) {
      context.plugins.add('mcp()');
    }
    
    return `// MCP Tool integration
  const ${outputVar} = await mcpTool({
    serverUrl: '${serverUrl}',
    tools: ${JSON.stringify(tools)},
    input: ${inputVar}
  });`;
  }

  getImports(): string[] {
    return [];
  }

  getDependencies(): string[] {
    return [];
  }

  getPlugins(): string[] {
    return [];
  }
}