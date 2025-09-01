'use client';

import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Copy, Download, Maximize2, Minimize2 } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  language?: string;
  readOnly?: boolean;
  height?: string;
  onCodeChange?: (code: string | undefined) => void;
  errors?: Array<{
    message: string;
    line?: number;
    column?: number;
    severity?: 'error' | 'warning';
  }>;
}

export function CodeEditor({ 
  code, 
  language = 'typescript', 
  readOnly = true,
  height: _height = '400px',
  onCodeChange,
  errors = []
}: CodeEditorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editor, setEditor] = useState<any>(null);

  useEffect(() => {
    if (editor && errors.length > 0) {
      const monaco = (window as any).monaco;
      if (monaco) {
        const markers = errors.map(error => ({
          severity: error.severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
          message: error.message,
          startLineNumber: error.line || 1,
          startColumn: error.column || 1,
          endLineNumber: error.line || 1,
          endColumn: error.column || 1,
        }));
        
        monaco.editor.setModelMarkers(editor.getModel(), 'owner', markers);
      }
    }
  }, [editor, errors]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    setEditor(editor);
    
    // Configure TypeScript compiler options
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      allowJs: true,
      typeRoots: ['node_modules/@types'],
    });
    
    // Add Genkit type definitions (simplified)
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      `
      declare module 'genkit' {
        export function genkit(config: any): any;
        export function generate(config: any): Promise<any>;
      }
      declare module '@genkit-ai/core' {
        export function z: any;
      }
      declare module '@genkit-ai/googleai' {
        export function googleAI(): any;
      }
      declare module '@genkit-ai/dotprompt' {
        export function dotprompt(): any;
      }
      `,
      'genkit.d.ts'
    );
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      // You could add a toast notification here
      console.log('Code copied to clipboard');
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleDownloadCode = () => {
    const blob = new Blob([code], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated-flow.ts';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const editorHeight = isFullscreen ? 'calc(100vh - 60px)' : '100%';

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full flex flex-col'}`}>
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Generated Code</h3>
          {errors.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-red-600">
              <span className="w-2 h-2 bg-red-600 rounded-full"></span>
              {errors.length} error{errors.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyCode}
            className="h-8 w-8 p-0"
            title="Copy code"
          >
            <Copy className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadCode}
            className="h-8 w-8 p-0"
            title="Download code"
          >
            <Download className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="gap-1 ml-1"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4" />
                Exit
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                Fullscreen
              </>
            )}
          </Button>
        </div>
      </div>
      
      <div className="relative flex-1">
        <Editor
          height={editorHeight}
          language={language}
          value={code}
          onChange={(value) => onCodeChange?.(value)}
          onMount={handleEditorDidMount}
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            theme: 'vs',
            wordWrap: 'on',
            contextmenu: false,
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
            },
          }}
        />
        
        {code.trim() === '' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90">
            <div className="text-center text-gray-500">
              <p className="text-sm">Add nodes to your flow to see generated code</p>
              <p className="text-xs mt-1">Start by dragging an Input node to the canvas</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}