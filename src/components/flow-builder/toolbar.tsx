import React from 'react';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/auth/UserMenu';
import { 
  Play, 
  Square, 
  Trash2, 
  Save, 
  FolderOpen, 
  Download, 
  Upload,
  Zap
} from 'lucide-react';

interface ToolbarProps {
  onExecute?: () => void;
  onClear?: () => void;
  onSave?: () => void;
  onLoad?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  isExecuting?: boolean;
  canExecute?: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

export function Toolbar({ 
  onExecute, 
  onClear, 
  onSave, 
  onLoad, 
  onExport, 
  onImport,
  isExecuting = false,
  canExecute = false,
  user
}: ToolbarProps) {
  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
          <Button
            onClick={onExecute}
            disabled={!canExecute || isExecuting}
            size="sm"
            className="gap-2"
          >
            {isExecuting ? (
              <>
                <Square className="w-4 h-4" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Execute
              </>
            )}
          </Button>
          
          <Button
            onClick={onClear}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </Button>
        </div>
        
        <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
          <Button
            onClick={onSave}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </Button>
          
          <Button
            onClick={onLoad}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <FolderOpen className="w-4 h-4" />
            Load
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={onExport}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          
          <Button
            onClick={onImport}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Import
          </Button>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Zap className="w-4 h-4" />
          <span>Flowshapr</span>
        </div>
        
        {user && <UserMenu user={user} />}
      </div>
    </div>
  );
}