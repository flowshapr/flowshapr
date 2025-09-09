import { ReactNode } from 'react';
import { z } from 'zod';
import { 
  BlockConfig, 
  BlockCategory, 
  SubBlock, 
  CodeTemplate,
  ExecutionParams,
  ExecutionResult,
  ValidationResult,
  ValidationError
} from '../types';

/**
 * Abstract base class for all blocks
 */
export abstract class BaseBlock<TConfig = any, TOutput = any> implements BlockConfig<TConfig, TOutput> {
  // Core identity
  abstract readonly type: string;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly category: BlockCategory;
  abstract readonly version: string;
  
  // Visual properties
  abstract readonly bgColor: string;
  abstract readonly icon: ReactNode;
  
  // Optional properties
  longDescription?: string;
  provider?: string;
  deprecated = false;
  experimental = false;

  // Sub-blocks for UI configuration
  abstract readonly subBlocks: SubBlock[];
  
  // Code generation
  abstract readonly codeTemplate: CodeTemplate;
  
  // Schema definitions
  inputSchema?: z.ZodSchema;
  outputSchema?: z.ZodSchema;

  /**
   * Execute the block (optional - some blocks are only for code generation)
   */
  async execute?(params: ExecutionParams<TConfig>): Promise<ExecutionResult<TOutput>> {
    throw new Error(`Block '${this.type}' does not support runtime execution`);
  }

  /**
   * Validate block configuration
   */
  validateConfig(config: TConfig): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate using Zod schema if available
    if (this.inputSchema) {
      try {
        this.inputSchema.parse(config);
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach(err => {
            errors.push({
              field: err.path.join('.'),
              message: err.message,
              severity: 'error'
            });
          });
        }
      }
    }

    // Custom validation for sub-blocks
    this.subBlocks.forEach(subBlock => {
      const value = (config as any)?.[subBlock.id];
      
      // Check if this subBlock is visible based on visibleWhen condition
      const isVisible = !subBlock.visibleWhen || subBlock.visibleWhen(config);
      
      // Check required fields only if visible
      if (isVisible && subBlock.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field: subBlock.id,
          message: `${subBlock.label} is required`,
          severity: 'error'
        });
      }

      // Run custom validation
      if (subBlock.validate && value !== undefined && value !== null) {
        const validationError = subBlock.validate(value);
        if (validationError) {
          errors.push({
            field: subBlock.id,
            message: validationError,
            severity: 'error'
          });
        }
      }

      // Validate with Zod schema if available
      if (subBlock.schema && value !== undefined && value !== null) {
        try {
          subBlock.schema.parse(value);
        } catch (error) {
          if (error instanceof z.ZodError) {
            error.errors.forEach(err => {
              errors.push({
                field: subBlock.id,
                message: err.message,
                severity: 'error'
              });
            });
          }
        }
      }
    });

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors
    };
  }

  /**
   * Get default configuration for this block
   */
  getDefaultConfig(): Partial<TConfig> {
    const config: any = {};
    
    this.subBlocks.forEach(subBlock => {
      if (subBlock.defaultValue !== undefined) {
        config[subBlock.id] = subBlock.defaultValue;
      }
    });

    return config;
  }

  /**
   * Get display name for the block
   */
  getDisplayName(): string {
    return this.name;
  }

  /**
   * Get description for the block
   */
  getDescription(): string {
    return this.longDescription || this.description;
  }

  /**
   * Check if block is available (not deprecated unless explicitly shown)
   */
  isAvailable(showDeprecated = false): boolean {
    return !this.deprecated || showDeprecated;
  }

  /**
   * Get block metadata
   */
  getMetadata() {
    return {
      type: this.type,
      name: this.name,
      category: this.category,
      provider: this.provider,
      version: this.version,
      deprecated: this.deprecated,
      experimental: this.experimental
    };
  }
}