"use client";

import React, { useState } from 'react';

export default function SdkTestPage() {
  const [alias, setAlias] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [input, setInput] = useState('Hello from SDK test UI!');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      if (!alias) throw new Error('Alias is required');
      if (!apiKey) throw new Error('API key is required');
      const resp = await fetch(`/api/flows/by-alias/${encodeURIComponent(alias)}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ input }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setError(typeof data === 'object' && data?.error ? (data.error.message || JSON.stringify(data.error)) : resp.statusText);
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: 16, fontFamily: 'Inter, system-ui, Arial, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>Flowshapr SDK Test</h1>
      <p style={{ color: '#555', marginBottom: 20 }}>Run a published flow by alias using a flow-scoped API key.</p>

      <form onSubmit={run} style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#444' }}>Flow Alias</span>
          <input
            type="text"
            placeholder="my-flow-alias"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#444' }}>API Key</span>
          <input
            type="password"
            placeholder="flow token"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#444' }}>Input</span>
          <textarea
            rows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, resize: 'vertical' }}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 14px',
            background: '#111827',
            color: '#fff',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Running…' : 'Run Flow'}
        </button>
      </form>

      {(error || result) && (
        <div style={{ marginTop: 20 }}>
          {error && (
            <div style={{ background: '#fef2f2', color: '#991b1b', padding: 12, borderRadius: 8, border: '1px solid #fecaca' }}>
              <strong>Error:</strong> {error}
            </div>
          )}
          {result && (
            <pre style={{ marginTop: 12, background: '#0b1021', color: '#e5e7eb', padding: 12, borderRadius: 8, overflow: 'auto' }}>
{JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}

      <div style={{ marginTop: 24, fontSize: 12, color: '#666' }}>
        <p>
          This posts to <code>/api/flows/by-alias/&lt;alias&gt;/execute</code> via a Next.js API proxy and
          forwards the <code>Authorization: Bearer &lt;token&gt;</code> header.
        </p>
      </div>
    </div>
  );
}

