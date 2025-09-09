import { BlockConfig, BlockCategory, ValidationResult } from './types';

/**
 * Central registry for all block types in the system
 */
export class BlockRegistry {
  private blocks: Map<string, BlockConfig> = new Map();
  private static instance: BlockRegistry | null = null;

  private constructor() {}

  /**
   * Get the singleton instance of the block registry
   */
  static getInstance(): BlockRegistry {
    if (!BlockRegistry.instance) {
      BlockRegistry.instance = new BlockRegistry();
    }
    return BlockRegistry.instance;
  }

  /**
   * Register a new block type
   */
  register(block: BlockConfig): void {
    if (this.blocks.has(block.type)) {
      throw new Error(`Block type '${block.type}' is already registered`);
    }
    
    // Validate block configuration
    const validation = this.validateBlock(block);
    if (!validation.isValid) {
      const errors = validation.errors.map(e => e.message).join(', ');
      throw new Error(`Invalid block configuration for '${block.type}': ${errors}`);
    }

    this.blocks.set(block.type, block);
  }

  /**
   * Get a block by type
   */
  get(type: string): BlockConfig | undefined {
    return this.blocks.get(type);
  }

  /**
   * Get all registered blocks
   */
  getAll(): BlockConfig[] {
    return Array.from(this.blocks.values());
  }

  /**
   * Get blocks by category
   */
  getByCategory(category: BlockCategory): BlockConfig[] {
    return this.getAll().filter(block => block.category === category);
  }

  /**
   * Get blocks by provider
   */
  getByProvider(provider: string): BlockConfig[] {
    return this.getAll().filter(block => block.provider === provider);
  }

  /**
   * Check if a block type exists
   */
  has(type: string): boolean {
    return this.blocks.has(type);
  }

  /**
   * Get all block types
   */
  getTypes(): string[] {
    return Array.from(this.blocks.keys());
  }

  /**
   * Get all categories
   */
  getCategories(): BlockCategory[] {
    const categories = new Set<BlockCategory>();
    this.getAll().forEach(block => categories.add(block.category));
    return Array.from(categories);
  }

  /**
   * Search blocks by name or description
   */
  search(query: string): BlockConfig[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(block => 
      block.name.toLowerCase().includes(lowerQuery) ||
      block.description.toLowerCase().includes(lowerQuery) ||
      (block.longDescription && block.longDescription.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Validate a block configuration
   */
  private validateBlock(block: BlockConfig): ValidationResult {
    const errors: { message: string; severity: 'error' | 'warning' }[] = [];

    // Required fields
    if (!block.type) {
      errors.push({ message: 'Block type is required', severity: 'error' });
    }

    if (!block.name) {
      errors.push({ message: 'Block name is required', severity: 'error' });
    }

    if (!block.description) {
      errors.push({ message: 'Block description is required', severity: 'error' });
    }

    if (!block.category) {
      errors.push({ message: 'Block category is required', severity: 'error' });
    }

    if (!block.version) {
      errors.push({ message: 'Block version is required', severity: 'error' });
    }

    // Validate sub-blocks
    if (block.subBlocks) {
      const subBlockIds = new Set<string>();
      block.subBlocks.forEach((subBlock, index) => {
        if (!subBlock.id) {
          errors.push({ message: `Sub-block at index ${index} is missing id`, severity: 'error' });
        } else if (subBlockIds.has(subBlock.id)) {
          errors.push({ message: `Duplicate sub-block id: ${subBlock.id}`, severity: 'error' });
        } else {
          subBlockIds.add(subBlock.id);
        }

        if (!subBlock.label) {
          errors.push({ message: `Sub-block '${subBlock.id}' is missing label`, severity: 'error' });
        }

        if (!subBlock.type) {
          errors.push({ message: `Sub-block '${subBlock.id}' is missing type`, severity: 'error' });
        }
      });
    }

    // Code template validation
    if (!block.codeTemplate) {
      errors.push({ message: 'Block must have a code template', severity: 'error' });
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors
    };
  }

  /**
   * Clear all registered blocks (mainly for testing)
   */
  clear(): void {
    this.blocks.clear();
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const blocks = this.getAll();
    const categories = this.getCategories();
    const providers = new Set(blocks.map(b => b.provider).filter(Boolean));

    return {
      totalBlocks: blocks.length,
      categories: categories.length,
      providers: providers.size,
      deprecated: blocks.filter(b => b.deprecated).length,
      experimental: blocks.filter(b => b.experimental).length
    };
  }
}

/**
 * Get the global block registry instance
 */
export const blockRegistry = BlockRegistry.getInstance();