import { Request, Response } from 'express';
import { BlocksService } from '../services/BlocksService';
import { logError, logInfo, logDebug } from '../../../shared/utils/logger';

export class BlocksController {
  private blocksService: BlocksService;

  constructor() {
    this.blocksService = new BlocksService();
  }

  /**
   * GET /api/blocks
   * Get all available block metadata for client
   */
  getBlocksMetadata = async (req: Request, res: Response) => {
    try {
      const metadata = this.blocksService.getClientBlockMetadata();
      res.json({
        data: metadata,
        meta: {
          count: metadata.length,
          stats: this.blocksService.getStats()
        }
      });
    } catch (error) {
      logError('Error fetching blocks metadata:', error);
      res.status(500).json({
        error: {
          message: 'Failed to fetch blocks metadata',
          code: 'BLOCKS_FETCH_ERROR'
        }
      });
    }
  };

  /**
   * POST /api/blocks/validate
   * Validate block configurations server-side
   */
  validateBlockConfigs = async (req: Request, res: Response) => {
    try {
      const { blocks } = req.body;
      
      if (!Array.isArray(blocks)) {
        return res.status(400).json({
          error: {
            message: 'Blocks must be an array',
            code: 'INVALID_INPUT'
          }
        });
      }

      const results = this.blocksService.validateBlockConfigs(blocks);
      
      const isValid = results.every(r => r.isValid);
      const allErrors = results.flatMap(r => r.errors);

      res.json({
        data: {
          isValid,
          results,
          errors: allErrors
        }
      });
    } catch (error) {
      logError('Error validating blocks:', error);
      res.status(500).json({
        error: {
          message: 'Failed to validate blocks',
          code: 'VALIDATION_ERROR'
        }
      });
    }
  };

  /**
   * POST /api/blocks/generate-code
   * Generate Genkit code from flow definition
   */
  generateCode = async (req: Request, res: Response) => {
    try {
      const { blocks, edges, variables } = req.body;

      logInfo('🔍 Server received code generation request:', {
        blocksCount: Array.isArray(blocks) ? blocks.length : 'not array',
        edgesCount: Array.isArray(edges) ? edges.length : 'not array',
        variablesCount: Array.isArray(variables) ? variables.length : 'not array'
      });

      if (Array.isArray(blocks) && blocks.length > 0) {
        logInfo('🔍 First block structure:', {
          id: blocks[0].id,
          blockType: blocks[0].blockType,
          hasConfig: !!blocks[0].config,
          config: blocks[0].config
        });
      }

      if (!Array.isArray(blocks) || !Array.isArray(edges)) {
        logInfo('❌ Invalid input - blocks or edges not arrays');
        return res.status(400).json({
          error: {
            message: 'Blocks and edges must be arrays',
            code: 'INVALID_INPUT'
          }
        });
      }

      const result = this.blocksService.generateCode(blocks, edges, variables || []);

      logInfo('🔍 Generation result:', {
        isValid: result.isValid,
        hasCode: !!result.code,
        errorsCount: result.errors.length,
        errors: result.errors
      });

      if (!result.isValid) {
        logInfo('❌ Code generation failed with errors:', result.errors);
        return res.status(400).json({
          error: {
            message: 'Code generation failed',
            code: 'GENERATION_ERROR',
            errors: result.errors
          },
          data: result
        });
      }

      logInfo('✅ Code generation successful');
      res.json({
        data: result
      });
    } catch (error) {
      logError('❌ Error generating code:', error);
      res.status(500).json({
        error: {
          message: 'Failed to generate code',
          code: 'GENERATION_ERROR'
        }
      });
    }
  };

  /**
   * GET /api/blocks/stats
   * Get block registry statistics
   */
  getStats = async (req: Request, res: Response) => {
    try {
      const stats = this.blocksService.getStats();
      res.json({ data: stats });
    } catch (error) {
      logError('Error fetching stats:', error);
      res.status(500).json({
        error: {
          message: 'Failed to fetch stats',
          code: 'STATS_ERROR'
        }
      });
    }
  };
}