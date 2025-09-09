import React, { useState, useEffect } from 'react';
import { clientBlockService } from '@/lib/blocks/client-service';
import { BlockCategory, ClientBlockMetadata } from '@/lib/blocks/client-types';
import { Search, FileText, Brain, Download, Wrench, Code, GitBranch, Square, Bot } from 'lucide-react';

// Icon mapping function to convert server icon strings to React components
const getIconComponent = (iconName: string) => {
  const iconMap = {
    'FileText': FileText,
    'Brain': Brain,
    'Download': Download, 
    'Wrench': Wrench,
    'Code': Code,
    'GitBranch': GitBranch,
    'Bot': Bot,
    'Square': Square
  };
  
  const IconComponent = iconMap[iconName] || Square;
  return <IconComponent className="w-4 h-4" />;
};

interface SidebarProps {
  onAddNode?: (blockType: string) => void;
}

export function Sidebar({ onAddNode }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BlockCategory | 'all'>('all');
  const [blocks, setBlocks] = useState<ClientBlockMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load blocks from server
  useEffect(() => {
    const loadBlocks = async () => {
      try {
        setLoading(true);
        const blocksData = await clientBlockService.getBlocksMetadata();
        setBlocks(blocksData);
        console.log('✅ Loaded blocks from server:', blocksData.length);
      } catch (err) {
        console.error('❌ Failed to load blocks:', err);
        setError(err instanceof Error ? err.message : 'Failed to load blocks');
      } finally {
        setLoading(false);
      }
    };

    loadBlocks();
  }, []);

  const handleDragStart = (event: React.DragEvent, blockType: string) => {
    event.dataTransfer.setData('application/reactflow', blockType);
    event.dataTransfer.setData('text/plain', blockType);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Get available blocks and categories
  const allBlocks = blocks.filter(block => block.isAvailable);
  const categories = [...new Set(allBlocks.map(block => block.category))].sort();
  
  const filteredBlocks = allBlocks.filter(block => {
    const matchesSearch = !searchQuery || 
      block.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || block.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getBlockColor = (category: BlockCategory): string => {
    switch (category) {
      case 'input':
        return 'bg-blue-900/20 border-blue-700/50 hover:bg-blue-900/30 text-blue-100';
      case 'genai':
        return 'bg-green-900/20 border-green-700/50 hover:bg-green-900/30 text-green-100';
      case 'output':
        return 'bg-red-900/20 border-red-700/50 hover:bg-red-900/30 text-red-100';
      case 'logic':
        return 'bg-purple-900/20 border-purple-700/50 hover:bg-purple-900/30 text-purple-100';
      case 'data':
        return 'bg-indigo-900/20 border-indigo-700/50 hover:bg-indigo-900/30 text-indigo-100';
      case 'advanced':
        return 'bg-orange-900/20 border-orange-700/50 hover:bg-orange-900/30 text-orange-100';
      default:
        return 'bg-gray-900/20 border-gray-700/50 hover:bg-gray-900/30 text-gray-100';
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="w-64 bg-base-100 border-r border flex flex-col">
        <div className="p-4 border-b border-base-300">
          <h2 className="text-lg font-semibold text-base-content">Block Palette</h2>
          <p className="text-sm text-base-content/70 mt-1">Drag blocks to the canvas</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-base-content/70">
            <div className="w-6 h-6 border-2 border-t-blue-500 rounded-full animate-spin" />
            <div className="text-sm">Loading blocks...</div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="w-64 bg-base-100 border-r border flex flex-col">
        <div className="p-4 border-b border-base-300">
          <h2 className="text-lg font-semibold text-base-content">Block Palette</h2>
          <p className="text-sm text-base-content/70 mt-1">Drag blocks to the canvas</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-base-content/70">
            <div className="text-sm mb-2">Failed to load blocks</div>
            <div className="text-xs mb-2">{error}</div>
            <button 
              onClick={() => window.location.reload()} 
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-base-100 border-r border flex flex-col">
      <div className="p-4 border-b border-base-300">
        <h2 className="text-lg font-semibold text-base-content">Block Palette</h2>
        <p className="text-sm text-base-content/70 mt-1">Drag blocks to the canvas</p>
        
        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50" />
          <input
            type="text"
            placeholder="Search blocks..."
            className="input input-sm w-full pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Category Filter */}
        <div className="mt-3">
          <select 
            className="select select-sm w-full"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as BlockCategory | 'all')}
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-2 overflow-y-auto">
        {filteredBlocks.length === 0 ? (
          <div className="text-center text-base-content/60 py-8">
            <p className="text-sm">No blocks found</p>
            {searchQuery && (
              <button 
                className="btn btn-ghost btn-xs mt-2"
                onClick={() => setSearchQuery('')}
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          filteredBlocks.map((block) => {
            const colorClass = getBlockColor(block.category);

            return (
              <div
                key={block.type}
                className={`p-3 rounded-lg border-2 cursor-grab transition-colors ${colorClass} flex items-center gap-3 hover:shadow-md`}
                draggable
                onDragStart={(e) => handleDragStart(e, block.type)}
              >
                <div className="w-5 h-5 opacity-90 flex items-center justify-center">
                  {getIconComponent(block.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{block.name}</div>
                  <div className="text-xs text-base-content/70 truncate">{block.description}</div>
                  {block.experimental && (
                    <div className="badge badge-warning badge-xs mt-1">Beta</div>
                  )}
                </div>
                <div className="text-xs text-base-content/60 flex-shrink-0">Drag</div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 border-t border-base-300">
        <div className="text-xs text-base-content/60">
          <p className="font-medium mb-1">Quick Tips:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Drag blocks to canvas</li>
            <li>Connect blocks with edges</li>
            <li>Start with an Input block</li>
            <li>End with an Output block</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

