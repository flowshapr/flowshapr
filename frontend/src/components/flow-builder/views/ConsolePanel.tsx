'use client';

import React from 'react';

export type ConsoleEntry = {
  id: string;
  time: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
  details?: any;
};

export function ConsolePanel({ entries, onClear }: { entries: ConsoleEntry[]; onClear?: () => void }) {
  return (
    <div className="bg-base-100 border border rounded-lg h-full flex flex-col">
      <div className="p-3 border-b border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-base-content">Console</h3>
        <button
          className="text-xs text-base-content/70 hover:text-base-content"
          onClick={onClear}
          disabled={!entries.length}
        >
          Clear
        </button>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {entries.length === 0 && (
          <div className="h-full flex items-center justify-center text-base-content/60 text-sm">
            No console messages yet
          </div>
        )}
        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.id} className="border rounded p-2 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span
                  className={
                    e.level === 'error'
                      ? 'text-error font-medium'
                      : e.level === 'warn'
                      ? 'text-amber-700 font-medium'
                      : 'text-base-content font-medium'
                  }
                >
                  {e.level.toUpperCase()}
                </span>
                <span className="text-base-content/60">{e.time.toLocaleString()}</span>
              </div>
              <div className="text-base-content whitespace-pre-wrap break-words">{e.message}</div>
              {e.details != null && (
                <pre className="mt-1 bg-base-200 border rounded p-2 text-[11px] overflow-auto">
                  {typeof e.details === 'string' ? e.details : JSON.stringify(e.details, null, 2)}
                </pre>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

