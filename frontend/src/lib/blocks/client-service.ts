import { ClientBlockMetadata, BlockInstance, FlowEdge, FlowVariable, CodeGenerationResult } from './client-types';

/**
 * Client-side service for communicating with server block system
 */
export class ClientBlockService {
  private baseUrl = '/api/blocks';

  /**
   * Fetch available block metadata from server
   */
  async getBlocksMetadata(): Promise<ClientBlockMetadata[]> {
    try {
      const response = await fetch(this.baseUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch blocks: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error fetching blocks metadata:', error);
      throw error;
    }
  }

  /**
   * Generate code on server from flow definition
   */
  async generateCode(
    blocks: BlockInstance[], 
    edges: FlowEdge[], 
    variables: FlowVariable[] = []
  ): Promise<CodeGenerationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/generate-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blocks, edges, variables })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || `Server error: ${response.statusText}`);
      }

      return result.data;
    } catch (error) {
      console.error('Error generating code:', error);
      throw error;
    }
  }

  /**
   * Validate block configurations on server
   */
  async validateBlocks(blocks: Array<{ blockType: string; config: any }>) {
    try {
      const response = await fetch(`${this.baseUrl}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blocks })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || `Server error: ${response.statusText}`);
      }

      return result.data;
    } catch (error) {
      console.error('Error validating blocks:', error);
      throw error;
    }
  }

  /**
   * Get registry statistics from server
   */
  async getStats() {
    try {
      const response = await fetch(`${this.baseUrl}/stats`);
      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  }
}

// Singleton instance
export const clientBlockService = new ClientBlockService();