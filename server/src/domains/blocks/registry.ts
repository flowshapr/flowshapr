import { ServerBlockDefinition, ClientBlockMetadata } from './types';

/**
 * Server-side block registry - handles business logic securely
 */
export class ServerBlockRegistry {
  private blocks: Map<string, ServerBlockDefinition> = new Map();

  register(block: ServerBlockDefinition): void {
    this.blocks.set(block.type, block);
  }

  get(type: string): ServerBlockDefinition | undefined {
    return this.blocks.get(type);
  }

  getAll(): ServerBlockDefinition[] {
    return Array.from(this.blocks.values());
  }

  getAvailable(): ServerBlockDefinition[] {
    return this.getAll().filter(block => block.isAvailable());
  }

  getTypes(): string[] {
    return Array.from(this.blocks.keys());
  }

  getCategories(): string[] {
    const categories = new Set(this.getAvailable().map(block => block.category));
    return Array.from(categories).sort();
  }

  getStats() {
    const all = this.getAll();
    return {
      totalBlocks: all.length,
      availableBlocks: this.getAvailable().length,
      categories: this.getCategories().length,
      providers: 0, // TODO: Count provider-specific blocks
      deprecated: 0, // TODO: Count deprecated blocks
      experimental: 0 // TODO: Count experimental blocks
    };
  }

  /**
   * Convert server block definitions to client-safe metadata
   */
  getClientMetadata(): ClientBlockMetadata[] {
    return this.getAvailable().map(block => ({
      type: block.type,
      name: block.name,
      description: block.description,
      longDescription: block.longDescription,
      category: block.category,
      version: block.version,
      bgColor: this.getBlockColor(block.category),
      icon: this.getBlockIcon(block.type),
      isAvailable: true,
      subBlocks: block.subBlocks.map(subBlock => ({
        id: subBlock.id,
        type: subBlock.type,
        label: subBlock.label,
        placeholder: subBlock.placeholder,
        required: subBlock.required,
        defaultValue: subBlock.defaultValue,
        options: subBlock.options,
        multiline: subBlock.multiline,
        language: subBlock.language,
        min: subBlock.min,
        max: subBlock.max,
        step: subBlock.step,
        description: subBlock.description
        // Explicitly exclude visibleWhen and validate functions
      }))
    }));
  }

  /**
   * Validate a block configuration server-side
   */
  validateBlockConfig(blockType: string, config: any) {
    const block = this.get(blockType);
    if (!block) {
      return {
        isValid: false,
        errors: [{
          message: `Unknown block type: ${blockType}`,
          severity: 'error' as const
        }]
      };
    }

    return block.validateConfig(config);
  }

  private getBlockColor(category: string): string {
    const colors: Record<string, string> = {
      'input': '#1e40af',
      'genai': '#059669', 
      'output': '#dc2626',
      'logic': '#8b5cf6',
      'data': '#ea580c',
      'control': '#6366f1'
    };
    return colors[category] || '#6b7280';
  }

  private getBlockIcon(type: string): string {
    const icons: Record<string, string> = {
      'input': 'FileText',
      'agent': 'Bot',
      'output': 'Download',
      'tool': 'Wrench',
      'condition': 'GitBranch'
    };
    return icons[type] || 'Square';
  }
}

export const serverBlockRegistry = new ServerBlockRegistry();