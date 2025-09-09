'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/features/flow-builder/components/Sidebar';
import { clientBlockService } from '@/lib/blocks/client-service';

export default function TestBlocksPage() {
  const [serverStats, setServerStats] = useState<any>(null);
  const [serverBlocks, setServerBlocks] = useState<any[]>([]);
  
  useEffect(() => {
    const loadServerData = async () => {
      try {
        const [stats, blocks] = await Promise.all([
          clientBlockService.getStats(),
          clientBlockService.getBlocksMetadata()
        ]);
        setServerStats(stats);
        setServerBlocks(blocks);
        console.log('🚀 Server blocks loaded:', blocks.length);
        console.log('📊 Server stats:', stats);
      } catch (error) {
        console.error('❌ Failed to load server data:', error);
      }
    };

    loadServerData();
  }, []);

  const handleAddNode = (blockType: string) => {
    console.log('Would add node of type:', blockType);
  };

  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-base-content mb-8">Block System Test</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold text-base-content mb-4">Available Blocks</h2>
            <div className="bg-base-200 rounded-lg p-4 h-[600px] overflow-y-auto">
              <Sidebar onAddNode={handleAddNode} />
            </div>
          </div>
          
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-base-content mb-4">Server-Side Registry Information</h2>
            <div className="bg-base-200 rounded-lg p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-base-content mb-2">Server Stats</h3>
                  <pre className="text-sm bg-base-300 p-3 rounded">
                    {serverStats ? JSON.stringify(serverStats, null, 2) : 'Loading...'}
                  </pre>
                </div>
                
                <div>
                  <h3 className="font-semibold text-base-content mb-2">Available Block Types</h3>
                  <pre className="text-sm bg-base-300 p-3 rounded">
                    {serverBlocks.length > 0 ? JSON.stringify(serverBlocks.map(b => b.type), null, 2) : 'Loading...'}
                  </pre>
                </div>
                
                <div>
                  <h3 className="font-semibold text-base-content mb-2">Block Details</h3>
                  <div className="space-y-2">
                    {serverBlocks.map(block => (
                      <div key={block.type} className="bg-base-300 p-3 rounded">
                        <div className="font-semibold">{block.name} ({block.type})</div>
                        <div className="text-sm opacity-75">{block.description}</div>
                        <div className="text-xs opacity-60">Category: {block.category}</div>
                        <div className="text-xs opacity-60">Version: {block.version}</div>
                        <div className="text-xs opacity-60">SubBlocks: {block.subBlocks.length}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}