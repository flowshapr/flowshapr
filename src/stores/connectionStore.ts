import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useMemo } from 'react';
import { Connection, CreateConnectionRequest, UpdateConnectionRequest, ApiResponse } from './types';

interface ConnectionState {
  // State
  connections: Connection[];
  loading: boolean;
  error: string | null;
  currentFlowId: string | null;
  
  // Actions
  loadConnections: (flowId: string) => Promise<void>;
  createConnection: (flowId: string, connection: CreateConnectionRequest) => Promise<Connection>;
  updateConnection: (connectionId: string, updates: UpdateConnectionRequest) => Promise<Connection>;
  deleteConnection: (connectionId: string) => Promise<void>;
  clearConnections: () => void;
  
  // Selectors (computed properties)
  getConnectionsByProvider: (provider: string) => Connection[];
  hasApiKeyForProvider: (provider: string) => boolean;
  getActiveConnections: () => Connection[];
}

export const useConnectionStore = create<ConnectionState>()(
  immer((set, get) => ({
    // Initial state
    connections: [],
    loading: false,
    error: null,
    currentFlowId: null,

    // Actions
    loadConnections: async (flowId: string) => {
      const state = get();
      
      // Don't reload if we already have data for this flow
      if (state.currentFlowId === flowId && state.connections.length > 0 && !state.loading) {
        console.log('📦 Using cached connections for flow:', flowId);
        return;
      }

      console.log('🔄 Loading connections for flow:', flowId);
      
      set((state) => {
        state.loading = true;
        state.error = null;
        state.currentFlowId = flowId;
      });

      try {
        const response = await fetch(`/api/flows/${flowId}/connections`, {
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result: ApiResponse<Connection[]> = await response.json();
        const connections = result.data || [];

        console.log('✅ Loaded connections:', connections);

        set((state) => {
          state.connections = connections;
          state.loading = false;
          state.error = null;
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load connections';
        console.error('❌ Failed to load connections:', errorMessage);
        
        set((state) => {
          state.loading = false;
          state.error = errorMessage;
          state.connections = []; // Clear stale data
        });
      }
    },

    createConnection: async (flowId: string, connectionData: CreateConnectionRequest) => {
      console.log('➕ Creating connection:', connectionData.name);
      
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const response = await fetch(`/api/flows/${flowId}/connections`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(connectionData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result: ApiResponse<Connection> = await response.json();
        const newConnection = result.data;

        console.log('✅ Created connection:', newConnection.name);

        set((state) => {
          state.connections.push(newConnection);
          state.loading = false;
        });

        return newConnection;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create connection';
        console.error('❌ Failed to create connection:', errorMessage);
        
        set((state) => {
          state.loading = false;
          state.error = errorMessage;
        });
        
        throw error;
      }
    },

    updateConnection: async (connectionId: string, updates: UpdateConnectionRequest) => {
      console.log('📝 Updating connection:', connectionId);
      
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const response = await fetch(`/api/flows/${get().currentFlowId}/connections/${connectionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result: ApiResponse<Connection> = await response.json();
        const updatedConnection = result.data;

        console.log('✅ Updated connection:', updatedConnection.name);

        set((state) => {
          const index = state.connections.findIndex(c => c.id === connectionId);
          if (index !== -1) {
            state.connections[index] = updatedConnection;
          }
          state.loading = false;
        });

        return updatedConnection;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update connection';
        console.error('❌ Failed to update connection:', errorMessage);
        
        set((state) => {
          state.loading = false;
          state.error = errorMessage;
        });
        
        throw error;
      }
    },

    deleteConnection: async (connectionId: string) => {
      console.log('🗑️ Deleting connection:', connectionId);
      
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const response = await fetch(`/api/flows/${get().currentFlowId}/connections/${connectionId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        console.log('✅ Deleted connection');

        set((state) => {
          state.connections = state.connections.filter(c => c.id !== connectionId);
          state.loading = false;
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete connection';
        console.error('❌ Failed to delete connection:', errorMessage);
        
        set((state) => {
          state.loading = false;
          state.error = errorMessage;
        });
        
        throw error;
      }
    },

    clearConnections: () => {
      console.log('🧹 Clearing connections');
      set((state) => {
        state.connections = [];
        state.currentFlowId = null;
        state.error = null;
        state.loading = false;
      });
    },

    // Selectors
    getConnectionsByProvider: (provider: string) => {
      return get().connections.filter(c => c.provider === provider);
    },

    hasApiKeyForProvider: (provider: string) => {
      return get().connections.some(c => c.provider === provider && c.isActive);
    },

    getActiveConnections: () => {
      return get().connections.filter(c => c.isActive);
    },
  }))
);

// Export selector hooks for better performance
export const useConnections = () => useConnectionStore(state => state.connections);
export const useConnectionsLoading = () => useConnectionStore(state => state.loading);
export const useConnectionsError = () => useConnectionStore(state => state.error);
export const useHasApiKey = (provider: string) => 
  useConnectionStore(state => state.hasApiKeyForProvider(provider));

// Combined selector for AgentBlock to prevent multiple subscriptions
export const useProviderStatus = () => {
  const hasGoogleKey = useConnectionStore(state => state.hasApiKeyForProvider('googleai'));
  const hasOpenaiKey = useConnectionStore(state => state.hasApiKeyForProvider('openai'));
  const hasAnthropicKey = useConnectionStore(state => state.hasApiKeyForProvider('anthropic'));
  
  return useMemo(() => ({ 
    hasGoogleKey, 
    hasOpenaiKey, 
    hasAnthropicKey 
  }), [hasGoogleKey, hasOpenaiKey, hasAnthropicKey]);
};