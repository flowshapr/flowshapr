'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ExecutionResult, ExecutionTrace } from '@/types/flow';
import { formatTimestamp } from '@/lib/utils';
import { 
  Play, 
  Square, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Terminal
} from 'lucide-react';

interface TestPanelProps {
  onExecute?: (input: any) => Promise<ExecutionResult>;
  isExecuting?: boolean;
  canExecute?: boolean;
}

export function TestPanel({ onExecute, isExecuting = false, canExecute = false }: TestPanelProps) {
  const [input, setInput] = useState('');
  const [inputType, setInputType] = useState<'text' | 'json'>('text');
  const [results, setResults] = useState<ExecutionResult[]>([]);
  const [expandedTraces, setExpandedTraces] = useState<Set<string>>(new Set());

  const handleExecute = async () => {
    if (!onExecute) return;
    
    try {
      let parsedInput = input;
      
      if (inputType === 'json' && input.trim()) {
        try {
          parsedInput = JSON.parse(input);
        } catch (error) {
          setResults([...results, {
            success: false,
            error: 'Invalid JSON input',
            traces: [],
          }]);
          return;
        }
      }
      
      const result = await onExecute(parsedInput);
      setResults([...results, result]);
    } catch (error) {
      setResults([...results, {
        success: false,
        error: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        traces: [],
      }]);
    }
  };

  const handleClearResults = () => {
    setResults([]);
  };

  const toggleTraceExpansion = (resultIndex: number, traceId: string) => {
    const key = `${resultIndex}-${traceId}`;
    const newExpanded = new Set(expandedTraces);
    
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    
    setExpandedTraces(newExpanded);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Test Panel</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearResults}
              disabled={results.length === 0}
            >
              Clear Results
            </Button>
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Input Type
            </label>
            <select
              value={inputType}
              onChange={(e) => setInputType(e.target.value as 'text' | 'json')}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="text">Text</option>
              <option value="json">JSON</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Test Input
            </label>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={inputType === 'json' ? '{"message": "Hello World"}' : 'Hello World'}
              className="text-xs font-mono"
              rows={3}
            />
          </div>
          
          <Button
            onClick={handleExecute}
            disabled={!canExecute || isExecuting}
            className="w-full gap-2"
            size="sm"
          >
            {isExecuting ? (
              <>
                <Square className="w-4 h-4" />
                Executing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Execute Flow
              </>
            )}
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {results.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <Terminal className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">No test results yet</p>
            <p className="text-xs mt-1">Execute your flow to see results here</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {results.map((result, index) => (
              <ExecutionResultCard
                key={index}
                result={result}
                index={index}
                expandedTraces={expandedTraces}
                onToggleTrace={toggleTraceExpansion}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ExecutionResultCardProps {
  result: ExecutionResult;
  index: number;
  expandedTraces: Set<string>;
  onToggleTrace: (resultIndex: number, traceId: string) => void;
}

function ExecutionResultCard({ result, index, expandedTraces, onToggleTrace }: ExecutionResultCardProps) {
  const timestamp = new Date();
  
  return (
    <div className="border border-gray-200 rounded-lg">
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {result.success ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm font-medium">
              Execution #{index + 1}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            {formatTimestamp(timestamp)}
          </div>
        </div>
      </div>
      
      <div className="p-3">
        {result.success ? (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Result
            </label>
            <pre className="text-xs bg-gray-50 p-2 rounded border overflow-x-auto">
              {JSON.stringify(result.result, null, 2)}
            </pre>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-red-700 mb-1">
              Error
            </label>
            <div className="text-xs bg-red-50 text-red-700 p-2 rounded border">
              {result.error}
            </div>
          </div>
        )}
        
        {result.traces.length > 0 && (
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Execution Traces ({result.traces.length})
            </label>
            <div className="space-y-2">
              {result.traces.map((trace, traceIndex) => (
                <TraceCard
                  key={traceIndex}
                  trace={trace}
                  traceIndex={traceIndex}
                  isExpanded={expandedTraces.has(`${index}-${traceIndex}`)}
                  onToggle={() => onToggleTrace(index, traceIndex.toString())}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface TraceCardProps {
  trace: ExecutionTrace;
  traceIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function TraceCard({ trace, traceIndex, isExpanded, onToggle }: TraceCardProps) {
  return (
    <div className="border border-gray-200 rounded">
      <button
        onClick={onToggle}
        className="w-full p-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          <span className="text-xs font-medium">
            {trace.nodeId} ({trace.duration}ms)
          </span>
          {trace.error && (
            <AlertCircle className="w-3 h-3 text-red-500" />
          )}
        </div>
        <div className="text-xs text-gray-500">
          {formatTimestamp(trace.timestamp)}
        </div>
      </button>
      
      {isExpanded && (
        <div className="p-2 border-t border-gray-200 bg-gray-50">
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Input
              </label>
              <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                {JSON.stringify(trace.input, null, 2)}
              </pre>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Output
              </label>
              <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                {JSON.stringify(trace.output, null, 2)}
              </pre>
            </div>
            
            {trace.error && (
              <div>
                <label className="block text-xs font-medium text-red-700 mb-1">
                  Error
                </label>
                <div className="text-xs bg-red-50 text-red-700 p-2 rounded border">
                  {trace.error}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}