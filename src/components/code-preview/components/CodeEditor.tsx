'use client';

import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Copy, Download } from 'lucide-react';

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

  return (
    <div className="card bg-base-100 border border-base-300 rounded-lg h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-base-300">
        <div className="flex items-center gap-2">
          <h3 className="card-title text-sm">Generated Code</h3>
          {errors.length > 0 && (
            <div className="badge badge-error badge-sm gap-1">
              <span className="w-2 h-2 bg-error rounded-full"></span>
              {errors.length} error{errors.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleCopyCode} className="h-8 w-8 p-0" title="Copy code">
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownloadCode} className="h-8 w-8 p-0" title="Download code">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="relative flex-1">
        <Editor
          height="100%"
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
            theme: 'vs-dark',
            wordWrap: 'on',
            contextmenu: false,
            scrollbar: { vertical: 'auto', horizontal: 'auto' },
          }}
        />
        {code.trim() === '' && (
          <div className="absolute inset-0 flex items-center justify-center bg-base-200 bg-opacity-90">
            <div className="text-center text-base-content/60">
              <p className="text-sm">Add nodes to your flow to see generated code</p>
              <p className="text-xs mt-1">Start by dragging an Input node to the canvas</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
