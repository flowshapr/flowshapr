import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface CreateFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFlow: (flowData: { name: string; description?: string }) => void;
  organizationId?: string;
}

export function CreateFlowModal({
  isOpen,
  onClose,
  onCreateFlow,
  organizationId
}: CreateFlowModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateFlow({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      // Reset form and close
      setName('');
      setDescription('');
      onClose();
    } catch (error) {
      console.warn('Failed to create flow:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  console.log('CreateFlowModal render - isOpen:', isOpen);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-base-100 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-base-content">Create New Flow</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="flowName" className="block text-sm font-medium text-base-content mb-2">
                Flow Name *
              </label>
              <input
                id="flowName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Enter flow name..."
                required
                autoFocus
              />
            </div>
            
            <div className="bg-base-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-sm font-medium text-base-content">Auto-Generated Flow Alias</span>
              </div>
              <p className="text-xs text-base-content/70">
                A unique URL-friendly alias will be automatically generated from your flow name for SDK access.
                For example: "Customer Support Bot" → "customer-support-bot-a7b3c"
              </p>
            </div>
            
            <div>
              <label htmlFor="flowDescription" className="block text-sm font-medium text-base-content mb-2">
                Description (Optional)
              </label>
              <textarea
                id="flowDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
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
              disabled={!name.trim() || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Flow'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
