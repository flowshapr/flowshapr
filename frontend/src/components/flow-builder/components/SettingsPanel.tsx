'use client';

import React, { useState, useEffect } from 'react';
import { SidebarList, SidebarListHeader, SidebarListItem } from '@/components/ui/SidebarList';

interface SettingsPanelProps {
  selectedFlow?: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    organizationId: string;
    memberRole: string;
  };
}

type SettingsTab = 'general' | 'connections' | 'access-tokens';

export function SettingsPanel({ selectedFlow }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  return (
    <div className="flex-1 h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="border-b border">
        <div role="tablist" className="tabs tabs-bordered">
          <button
            role="tab"
            onClick={() => setActiveTab('general')}
            className={`tab text-sm font-medium ${
              activeTab === 'general' ? 'tab-active' : ''
            }`}
          >
            General
          </button>
          <button
            role="tab"
            onClick={() => setActiveTab('connections')}
            className={`tab text-sm font-medium ${
              activeTab === 'connections' ? 'tab-active' : ''
            }`}
          >
            Connections
          </button>
          <button
            role="tab"
            onClick={() => setActiveTab('access-tokens')}
            className={`tab text-sm font-medium ${
              activeTab === 'access-tokens' ? 'tab-active' : ''
            }`}
          >
            Access Tokens
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'general' && (
          <GeneralSettingsTab selectedFlow={selectedFlow} />
        )}
        {activeTab === 'connections' && (
          <ConnectionsTab flowId={selectedFlow?.id || ''} />
        )}
        {activeTab === 'access-tokens' && (
          <AccessTokensTab flowId={selectedFlow?.id || ''} />
        )}
      </div>
    </div>
  );
}

function GeneralSettingsTab({ selectedFlow }: { selectedFlow?: any }) {
  const [form, setForm] = useState({
    name: selectedFlow?.name || '',
    description: selectedFlow?.description || ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedFlow) {
      setForm({
        name: selectedFlow.name || '',
        description: selectedFlow.description || ''
      });
    }
  }, [selectedFlow]);

  const handleSave = async () => {
    if (!selectedFlow?.id) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/flows/${selectedFlow.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim()
        })
      });

      if (response.ok) {
        window.dispatchEvent(new CustomEvent('consoleLog', { 
          detail: { level: 'info', message: 'Flow settings saved successfully' } 
        }));
      } else {
        window.dispatchEvent(new CustomEvent('consoleLog', { 
          detail: { level: 'error', message: 'Failed to save flow settings' } 
        }));
      }
    } catch (error) {
      window.dispatchEvent(new CustomEvent('consoleLog', { 
        detail: { level: 'error', message: 'Error saving flow settings' } 
      }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-2xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-base-content mb-2">General Settings</h2>
          <p className="text-sm text-base-content/70">Configure your flow's basic information and settings.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-base-content/70 mb-2">
              Flow Name
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter flow name..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-base-content/70 mb-2">
              Flow Alias (Auto-Generated)
            </label>
            <input
              type="text"
              className="input input-bordered w-full font-mono bg-base-200"
              value={selectedFlow?.alias || ''}
              readOnly
              placeholder="alias-will-be-generated"
            />
            <div className="text-xs text-base-content/60 mt-1 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-primary rounded-full"></span>
              This alias was automatically generated and cannot be changed. Used in SDK calls: flowshapr.ai/flows/{selectedFlow?.alias || 'your-alias'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-base-content/70 mb-2">
              Description
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe what this flow does..."
            />
          </div>

          <div className="pt-4">
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConnectionsTab({ flowId }: { flowId: string }) {
  const [list, setList] = useState<Array<{ id: string; name: string; provider: string; isActive: boolean }>>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!flowId) return;
    setLoading(true);
    try {
      const resp = await fetch(`/api/flows/${flowId}/connections`, { cache: 'no-store' });
      const json = await resp.json();
      const items = (json?.data || []) as any[];
      setList(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [flowId]);

  const add = async () => {
    const name = (document.getElementById('conn-name') as HTMLInputElement)?.value?.trim();
    const provider = (document.getElementById('conn-provider') as HTMLSelectElement)?.value as any;
    const apiKey = (document.getElementById('conn-key') as HTMLInputElement)?.value?.trim();
    
    if (!flowId || !name || !apiKey) {
      window.dispatchEvent(new CustomEvent('consoleLog', { 
        detail: { level: 'warn', message: 'Name and API key are required to add a connection' } 
      }));
      return;
    }

    try {
      const resp = await fetch(`/api/flows/${flowId}/connections`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ name, provider, apiKey }) 
      });
      
      if (!resp.ok) {
        let detail: any = undefined;
        try { detail = await resp.json(); } catch {}
        window.dispatchEvent(new CustomEvent('consoleLog', { 
          detail: { level: 'error', message: `Failed to add connection (${resp.status})`, details: detail } 
        }));
        return;
      }
      
      (document.getElementById('conn-name') as HTMLInputElement).value = '';
      (document.getElementById('conn-key') as HTMLInputElement).value = '';
      window.dispatchEvent(new CustomEvent('consoleLog', { 
        detail: { level: 'info', message: 'Connection added successfully' } 
      }));
      await load();
    } catch (e: any) {
      window.dispatchEvent(new CustomEvent('consoleLog', { 
        detail: { level: 'error', message: `Add connection error: ${e?.message || e}` } 
      }));
    }
  };

  const del = async (connectionId: string) => {
    if (!flowId || !connectionId) return;
    const resp = await fetch(`/api/flows/${flowId}/connections/${connectionId}`, { method: 'DELETE' });
    if (resp.ok) {
      window.dispatchEvent(new CustomEvent('consoleLog', { 
        detail: { level: 'info', message: 'Connection deleted' } 
      }));
      await load();
    }
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-2xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-base-content mb-2">Connections</h2>
          <p className="text-sm text-base-content/70">Manage provider API keys and external connections for this flow.</p>
        </div>

        <div className="space-y-4">
          <div className="p-4 border border-base-300 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium text-base-content/70 mb-1">Name</label>
                <input 
                  className="input input-bordered input-sm w-full" 
                  id="conn-name" 
                  placeholder="My Connection"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-base-content/70 mb-1">Provider</label>
                <select className="select select-bordered select-sm w-full" id="conn-provider">
                  <option value="googleai">Google AI</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-base-content/70 mb-1">API Key</label>
                <input 
                  className="input input-bordered input-sm w-full" 
                  id="conn-key" 
                  type="password" 
                  placeholder="sk-..."
                />
              </div>
              <div className="flex items-end">
                <button 
                  className="btn btn-primary btn-sm w-full" 
                  onClick={add} 
                  disabled={loading}
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="border border-base-300 rounded-lg divide-y">
            {list.length === 0 && (
              <div className="p-4 text-sm text-base-content/60 text-center">
                {loading ? 'Loading connections...' : 'No connections configured yet.'}
              </div>
            )}
            {list.map((connection) => (
              <div key={connection.id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {connection.name}
                    <span className="ml-2 text-xs text-base-content/60">({connection.provider})</span>
                  </div>
                  <div className="text-xs text-base-content/60 mt-1">
                    {connection.isActive ? (
                      <span className="text-success">● Active</span>
                    ) : (
                      <span className="text-base-content/40">● Inactive</span>
                    )}
                  </div>
                </div>
                <button 
                  className="btn btn-ghost btn-sm text-error hover:bg-error/10" 
                  onClick={() => del(connection.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AccessTokensTab({ flowId }: { flowId: string }) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState('execute_flow');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [limitToFlow, setLimitToFlow] = useState(true);

  const load = async () => {
    if (!flowId) return;
    setLoading(true);
    try {
      const resp = await fetch(`/api/flows/${flowId}/api-keys`, { cache: 'no-store' });
      const json = await resp.json();
      setList(json?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [flowId]);

  const create = async () => {
    if (!flowId || !name.trim()) return;
    
    const scoped = limitToFlow && flowId ? `${scopes},flow:${flowId}` : scopes;
    const resp = await fetch(`/api/flows/${flowId}/api-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: name.trim(), 
        scopes: scoped.split(',').map(s => s.trim()).filter(Boolean) 
      }),
    });
    
    const json = await resp.json();
    if (resp.ok) {
      setCreatedToken(json?.data?.token || null);
      setName('');
      window.dispatchEvent(new CustomEvent('consoleLog', { 
        detail: { level: 'info', message: 'Access token created successfully' } 
      }));
      await load();
    } else {
      window.dispatchEvent(new CustomEvent('consoleLog', { 
        detail: { level: 'error', message: 'Failed to create access token' } 
      }));
    }
  };

  const revoke = async (keyId: string) => {
    if (!flowId) return;
    const resp = await fetch(`/api/flows/${flowId}/api-keys/${keyId}`, { method: 'DELETE' });
    if (resp.ok) {
      window.dispatchEvent(new CustomEvent('consoleLog', { 
        detail: { level: 'info', message: 'Access token revoked' } 
      }));
      await load();
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      window.dispatchEvent(new CustomEvent('consoleLog', { 
        detail: { level: 'info', message: 'Token copied to clipboard' } 
      }));
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-2xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-base-content mb-2">Access Tokens</h2>
          <p className="text-sm text-base-content/70">Create and manage API tokens for SDK and programmatic access to this flow.</p>
        </div>

        <div className="space-y-4">
          <div className="p-4 border border-base-300 rounded-lg">
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input 
                  className="input input-bordered input-sm" 
                  placeholder="Token name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                />
                <input 
                  className="input input-bordered input-sm" 
                  placeholder="Scopes (comma-separated)" 
                  value={scopes} 
                  onChange={(e) => setScopes(e.target.value)} 
                />
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={create} 
                  disabled={!name.trim()}
                >
                  Create Token
                </button>
              </div>
              
              <label className="flex items-center gap-2 text-xs text-base-content/70">
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-sm" 
                  checked={limitToFlow} 
                  onChange={e => setLimitToFlow(e.target.checked)} 
                /> 
                Limit access to this flow only
              </label>
              
              {createdToken && (
                <div className="mt-3 p-3 bg-success/10 border border-success/20 rounded-lg">
                  <div className="text-sm font-medium text-success mb-2">
                    Token created successfully! Copy it now — it won't be shown again.
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-base-200 rounded text-xs break-all font-mono">
                      {createdToken}
                    </code>
                    <button 
                      className="btn btn-sm btn-ghost" 
                      onClick={() => copyToClipboard(createdToken)}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border border-base-300 rounded-lg divide-y">
            {loading && (
              <div className="p-4 text-sm text-base-content/60 text-center">Loading tokens...</div>
            )}
            {!loading && list.filter((k: any) => !limitToFlow || (k.scopes || []).includes(`flow:${flowId}`)).length === 0 && (
              <div className="p-4 text-sm text-base-content/60 text-center">No access tokens created yet.</div>
            )}
            {list.filter((k: any) => !limitToFlow || (k.scopes || []).includes(`flow:${flowId}`)).map((token: any) => (
              <div key={token.id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {token.name} 
                    <span className="ml-2 text-xs text-base-content/60 font-mono">({token.prefix}...)</span>
                  </div>
                  <div className="text-xs text-base-content/60 mt-1">
                    Scopes: {(token.scopes || []).join(', ') || 'no scopes'}
                    {token.expiresAt && (
                      <span> • Expires {new Date(token.expiresAt).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <button 
                  className="btn btn-ghost btn-sm text-error hover:bg-error/10" 
                  onClick={() => revoke(token.id)}
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}