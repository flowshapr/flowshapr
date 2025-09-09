import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { clientBlockService } from '@/lib/blocks/client-service';
import { ClientBlockMetadata } from '@/lib/blocks/client-types';

interface BlocksContextValue {
  blocks: ClientBlockMetadata[];
  loading: boolean;
  error: string | null;
  getBlockMetadata: (type: string) => ClientBlockMetadata | undefined;
}

const BlocksContext = createContext<BlocksContextValue | undefined>(undefined);

interface BlocksProviderProps {
  children: ReactNode;
}

export function BlocksProvider({ children }: BlocksProviderProps) {
  const [blocks, setBlocks] = useState<ClientBlockMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBlocks = async () => {
      try {
        setLoading(true);
        setError(null);
        const blocksData = await clientBlockService.getBlocksMetadata();
        setBlocks(blocksData);
      } catch (err) {
        console.error('Failed to load blocks metadata:', err);
        setError(err instanceof Error ? err.message : 'Failed to load blocks');
      } finally {
        setLoading(false);
      }
    };

    loadBlocks();
  }, []);

  const getBlockMetadata = (type: string): ClientBlockMetadata | undefined => {
    return blocks.find(block => block.type === type);
  };

  const value: BlocksContextValue = {
    blocks,
    loading,
    error,
    getBlockMetadata,
  };

  return (
    <BlocksContext.Provider value={value}>
      {children}
    </BlocksContext.Provider>
  );
}

export function useBlocks(): BlocksContextValue {
  const context = useContext(BlocksContext);
  if (context === undefined) {
    // Fallback when context is not available
    console.warn('useBlocks called outside BlocksProvider, using fallback');
    return {
      blocks: [],
      loading: false,
      error: null,
      getBlockMetadata: () => undefined
    };
  }
  return context;
}