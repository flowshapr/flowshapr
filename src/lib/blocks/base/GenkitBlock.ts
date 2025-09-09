import { BaseBlock } from './BaseBlock';
import { BlockCategory } from '../types';

/**
 * Base class for blocks that generate Genkit AI code
 */
export abstract class GenkitGenerativeBlock<TConfig = any, TOutput = any> extends BaseBlock<TConfig, TOutput> {
  readonly category: BlockCategory = 'genai';
  
  /**
   * Get supported model providers for this block
   */
  abstract getSupportedProviders(): string[];
  
  /**
   * Get default model configuration for a provider
   */
  getDefaultModelConfig(provider: string): Record<string, any> {
    const baseConfig = {
      temperature: 0.7,
      maxOutputTokens: 1000
    };

    switch (provider) {
      case 'googleai':
        return {
          ...baseConfig,
          topP: 0.95,
          topK: 40
        };
      
      case 'openai':
        return {
          ...baseConfig,
          topP: 1.0,
          frequencyPenalty: 0,
          presencePenalty: 0
        };
      
      case 'anthropic':
        return {
          ...baseConfig,
          topP: 1.0,
          topK: 250
        };
      
      default:
        return baseConfig;
    }
  }

  /**
   * Get available models for a provider
   */
  getAvailableModels(provider: string): Array<{value: string; label: string; description?: string}> {
    switch (provider) {
      case 'googleai':
        return [
          { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Most capable model for complex tasks' },
          { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Fast and efficient for most tasks' },
          { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: 'Legacy Pro model' },
          { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: 'Legacy Flash model' }
        ];
      
      case 'openai':
        return [
          { value: 'gpt-4o', label: 'GPT-4o', description: 'Latest multimodal model' },
          { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Fast and cost-effective' },
          { value: 'gpt-4', label: 'GPT-4', description: 'Previous generation flagship' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast and affordable' }
        ];
      
      case 'anthropic':
        return [
          { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', description: 'Most capable Claude model' },
          { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku', description: 'Fast and efficient' },
          { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus', description: 'Most powerful for complex tasks' }
        ];
      
      default:
        return [];
    }
  }

  /**
   * Validate model configuration
   */
  validateModelConfig(config: any, provider: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Common validations
    if (config.temperature !== undefined) {
      if (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2) {
        errors.push('Temperature must be between 0 and 2');
      }
    }

    if (config.maxOutputTokens !== undefined) {
      if (typeof config.maxOutputTokens !== 'number' || config.maxOutputTokens < 1) {
        errors.push('Max output tokens must be a positive number');
      }
    }

    // Provider-specific validations
    switch (provider) {
      case 'googleai':
        if (config.topK !== undefined && (typeof config.topK !== 'number' || config.topK < 1)) {
          errors.push('TopK must be a positive number');
        }
        if (config.topP !== undefined && (typeof config.topP !== 'number' || config.topP < 0 || config.topP > 1)) {
          errors.push('TopP must be between 0 and 1');
        }
        break;

      case 'openai':
        if (config.frequencyPenalty !== undefined && (typeof config.frequencyPenalty !== 'number' || config.frequencyPenalty < -2 || config.frequencyPenalty > 2)) {
          errors.push('Frequency penalty must be between -2 and 2');
        }
        if (config.presencePenalty !== undefined && (typeof config.presencePenalty !== 'number' || config.presencePenalty < -2 || config.presencePenalty > 2)) {
          errors.push('Presence penalty must be between -2 and 2');
        }
        break;

      case 'anthropic':
        if (config.topK !== undefined && (typeof config.topK !== 'number' || config.topK < 1)) {
          errors.push('TopK must be a positive number');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Base class for utility blocks (transform, condition, etc.)
 */
export abstract class GenkitUtilityBlock<TConfig = any, TOutput = any> extends BaseBlock<TConfig, TOutput> {
  readonly category: BlockCategory = 'logic';
  
  /**
   * Whether this block supports JavaScript code execution
   */
  abstract supportsCodeExecution(): boolean;
  
  /**
   * Validate JavaScript code if applicable
   */
  validateCode(code: string): { isValid: boolean; errors: string[] } {
    if (!this.supportsCodeExecution()) {
      return { isValid: true, errors: [] };
    }

    const errors: string[] = [];

    // Basic syntax validation
    try {
      new Function(code);
    } catch (error) {
      errors.push(`Syntax error: ${error instanceof Error ? error.message : 'Invalid JavaScript'}`);
    }

    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      /require\s*\(/,
      /import\s+/,
      /process\./,
      /__dirname/,
      /__filename/,
      /fs\./,
      /child_process/,
      /eval\s*\(/,
      /Function\s*\(/
    ];

    dangerousPatterns.forEach(pattern => {
      if (pattern.test(code)) {
        errors.push(`Potentially unsafe code detected: ${pattern.source}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Base class for data handling blocks (input, output, etc.)
 */
export abstract class GenkitDataBlock<TConfig = any, TOutput = any> extends BaseBlock<TConfig, TOutput> {
  readonly category: BlockCategory = 'data';
  
  /**
   * Get supported data types for this block
   */
  abstract getSupportedDataTypes(): string[];
  
  /**
   * Validate data format
   */
  validateDataFormat(data: any, expectedType: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (expectedType) {
      case 'string':
        if (typeof data !== 'string') {
          errors.push('Expected string value');
        }
        break;
      
      case 'number':
        if (typeof data !== 'number' || isNaN(data)) {
          errors.push('Expected numeric value');
        }
        break;
      
      case 'boolean':
        if (typeof data !== 'boolean') {
          errors.push('Expected boolean value');
        }
        break;
      
      case 'object':
        if (typeof data !== 'object' || data === null || Array.isArray(data)) {
          errors.push('Expected object value');
        }
        break;
      
      case 'array':
        if (!Array.isArray(data)) {
          errors.push('Expected array value');
        }
        break;
      
      case 'json':
        try {
          if (typeof data === 'string') {
            JSON.parse(data);
          } else if (typeof data !== 'object') {
            errors.push('Expected JSON-compatible data');
          }
        } catch {
          errors.push('Invalid JSON format');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}