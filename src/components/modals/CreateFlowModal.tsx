import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface CreateFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFlow: (flowData: { name: string; alias: string; description?: string }) => void;
  organizationId?: string;
}

export function CreateFlowModal({ 
  isOpen, 
  onClose, 
  onCreateFlow, 
  organizationId 
}: CreateFlowModalProps) {
  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !alias.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateFlow({
        name: name.trim(),
        alias: alias.trim(),
        description: description.trim() || undefined,
      });
      
      // Reset form and close
      setName('');
      setAlias('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Failed to create flow:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Flow</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="flowName" className="block text-sm font-medium text-gray-700 mb-2">
                Flow Name *
              </label>
              <input
                id="flowName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter flow name..."
                required
                autoFocus
              />
            </div>
            
            <div>
              <label htmlFor="flowAlias" className="block text-sm font-medium text-gray-700 mb-2">
                Flow Alias *
              </label>
              <input
                id="flowAlias"
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., my-flow-alias"
                required
                pattern="[a-z0-9-_]+"
                title="Only lowercase letters, numbers, hyphens, and underscores allowed"
              />
              <p className="mt-1 text-xs text-gray-500">
                Unique identifier for SDK calls. Only lowercase letters, numbers, hyphens, and underscores allowed.
              </p>
            </div>
            
            <div>
              <label htmlFor="flowDescription" className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                id="flowDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe what this flow does..."
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || !alias.trim() || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Flow'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}