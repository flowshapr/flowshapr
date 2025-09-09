import { serverBlockRegistry } from '../registry';
import { CodeGeneratorService } from './CodeGeneratorService';
import { ClientBlockMetadata, BlockInstance, FlowEdge, FlowVariable, ValidationResult } from '../types';

export class BlocksService {
  
  /**
   * Get client-safe block metadata
   */
  getClientBlockMetadata(): ClientBlockMetadata[] {
    return serverBlockRegistry.getClientMetadata();
  }

  /**
   * Get registry statistics
   */
  getStats() {
    return serverBlockRegistry.getStats();
  }

  /**
   * Validate multiple block configurations
   */
  validateBlockConfigs(blocks: Array<{ blockType: string; config: any }>): ValidationResult[] {
    return blocks.map(({ blockType, config }) => 
      serverBlockRegistry.validateBlockConfig(blockType, config)
    );
  }

  /**
   * Generate code from flow definition
   */
  generateCode(blocks: BlockInstance[], edges: FlowEdge[], variables: FlowVariable[]) {
    const generator = new CodeGeneratorService(blocks, edges, variables);
    return generator.generate();
  }

  /**
   * Get available block types
   */
  getAvailableTypes(): string[] {
    return serverBlockRegistry.getTypes();
  }

  /**
   * Get blocks by category
   */
  getBlocksByCategory(category: string): ClientBlockMetadata[] {
    return this.getClientBlockMetadata().filter(block => block.category === category);
  }

  /**
   * Get single block metadata
   */
  getBlockMetadata(blockType: string): ClientBlockMetadata | null {
    const metadata = this.getClientBlockMetadata();
    return metadata.find(block => block.type === blockType) || null;
  }

  /**
   * Check if block type is available
   */
  isBlockAvailable(blockType: string): boolean {
    const block = serverBlockRegistry.get(blockType);
    return block ? block.isAvailable() : false;
  }
}