import { create } from 'zustand';
import { ClientBlockMetadata } from '@/lib/blocks/client-types';

interface BlocksState {
  // State
  blocks: ClientBlockMetadata[];
  loading: boolean;
  error: string | null;
  
  // Actions
  setBlocks: (blocks: ClientBlockMetadata[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Selectors
  getBlockMetadata: (type: string) => ClientBlockMetadata | undefined;
}

export const useBlocksStore = create<BlocksState>()((set, get) => ({
  // Initial state
  blocks: [],
  loading: false,
  error: null,

  // Actions
  setBlocks: (blocks: ClientBlockMetadata[]) => {
    set({ blocks, error: null });
  },

  setLoading: (loading: boolean) => {
    set({ loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  // Selectors
  getBlockMetadata: (type: string) => {
    const { blocks } = get();
    return blocks.find(block => block.type === type);
  },
}));

// Export selector hooks for better performance
export const useBlocks = () => useBlocksStore(state => state.blocks);
export const useBlocksLoading = () => useBlocksStore(state => state.loading);
export const useBlocksError = () => useBlocksStore(state => state.error);
export const useBlockMetadata = (type: string) => 
  useBlocksStore(state => state.getBlockMetadata(type));