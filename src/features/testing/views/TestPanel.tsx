'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ExecutionResult, ExecutionTrace } from '@/types/flow';
import { formatTimestamp } from '@/lib/utils';
import { Play, Square, Clock, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronRight, Terminal } from 'lucide-react';

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
          setResults([...results, { success: false, error: 'Invalid JSON input', traces: [] }]);
          return;
        }
      }
      const result = await onExecute(parsedInput);
      setResults([...results, result]);
    } catch (error) {
      setResults([...results, { success: false, error: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`, traces: [] }]);
    }
  };

  const handleClearResults = () => setResults([]);

  const toggleTraceExpansion = (resultIndex: number, traceId: string) => {
    const key = `${resultIndex}-${traceId}`;
    const next = new Set(expandedTraces);
    if (next.has(key)) next.delete(key); else next.add(key);
    setExpandedTraces(next);
  };

  return (
    <div className="bg-base-100 border border rounded-lg h-full flex flex-col">
      <div className="p-4 border-b border-base-300">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-base-content">Test Panel</h3>
          <div className="flex items-center gap-3">
            {results.length > 0 && (
              <span className="text-[11px] px-2 py-1 rounded-full bg-info/10 text-info border-base-300">
                Runtime: {results[results.length - 1].runtime || 'Genkit'}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={handleClearResults} disabled={results.length === 0}>Clear Results</Button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-base-content mb-1">Input Type</label>
            <select value={inputType} onChange={(e) => setInputType(e.target.value as 'text' | 'json')} className="w-full text-xs border rounded px-2 py-1">
              <option value="text">Text</option>
              <option value="json">JSON</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-base-content mb-1">Test Input</label>
            <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={inputType === 'json' ? '{"message": "Hello World"}' : 'Hello World'} className="text-xs font-mono" rows={3} />
          </div>

          <Button onClick={handleExecute} disabled={!canExecute || isExecuting} className="w-full gap-2">
            {isExecuting ? (<><Square className="w-4 h-4" /> Running...</>) : (<><Play className="w-4 h-4" /> Execute</>)}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {results.length === 0 ? (
          <div className="h-full flex items-center justify-center text-base-content/60">
            <div className="text-center">
              <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No results yet</p>
              <p className="text-xs">Run your flow to see output and traces</p>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {results.map((result, index) => (
              <ResultCard key={index} result={result} index={index} onToggleTrace={(i, id) => toggleTraceExpansion(i, id)} expandedTraces={expandedTraces} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCard({ result, index, onToggleTrace, expandedTraces }: { result: ExecutionResult; index: number; onToggleTrace: (resultIndex: number, traceId: string) => void; expandedTraces: Set<string> }) {
  const timestamp = new Date();
  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {result.success ? <CheckCircle className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-error" />}
          <span className="text-sm font-medium">Execution #{index + 1}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-base-content/60"><Clock className="w-3 h-3" />{formatTimestamp(timestamp)}</div>
      </div>

      <div className="p-3">
        {result.success ? (
          <div>
            <label className="block text-xs font-medium text-base-content mb-1">Result</label>
            <pre className="text-xs bg-base-200 p-2 rounded border overflow-x-auto">{JSON.stringify(result.result, null, 2)}</pre>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-error mb-1">Error</label>
            <div className="text-xs bg-error/10 text-error p-2 rounded border-base-300">{result.error}</div>
          </div>
        )}

        {result.traces.length > 0 && (
          <div className="mt-3">
            <label className="block text-xs font-medium text-base-content mb-2">Execution Traces ({result.traces.length})</label>
            <div className="space-y-2">
              {result.traces.map((trace, traceIndex) => (
                <TraceCard key={traceIndex} trace={trace} traceIndex={traceIndex} isExpanded={expandedTraces.has(`${index}-${traceIndex}`)} onToggle={() => onToggleTrace(index, traceIndex.toString())} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TraceCard({ trace, traceIndex, isExpanded, onToggle }: { trace: ExecutionTrace; traceIndex: number; isExpanded: boolean; onToggle: () => void }) {
  return (
    <div className="border border rounded">
      <button onClick={onToggle} className="w-full p-2 flex items-center justify-between hover:bg-base-200 transition-colors">
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          <span className="text-xs font-medium">{trace.nodeTitle || trace.nodeId} ({trace.duration}ms)</span>
          {trace.error && <AlertCircle className="w-3 h-3 text-error" />}
        </div>
        <div className="text-xs text-base-content/60">{formatTimestamp(trace.timestamp)}</div>
      </button>
      {isExpanded && (
        <div className="p-2 border-t border bg-base-200">
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-base-content mb-1">Input</label>
              <pre className="text-xs bg-base-100 p-2 rounded border overflow-x-auto">{JSON.stringify(trace.input, null, 2)}</pre>
            </div>
            <div>
              <label className="block text-xs font-medium text-base-content mb-1">Output</label>
              <pre className="text-xs bg-base-100 p-2 rounded border overflow-x-auto">{JSON.stringify(trace.output, null, 2)}</pre>
            </div>
            {trace.error && (
              <div>
                <label className="block text-xs font-medium text-error mb-1">Error</label>
                <div className="text-xs bg-error/10 text-error p-2 rounded border-base-300">{trace.error}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
