import React from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';
import { BaseNode, InsertVarButton } from './common/BaseNode';
import { FlowNodeData, AgentNodeConfig, AVAILABLE_MODELS, DEFAULT_MODEL_PARAMS, ProviderStatus } from '@/types/flow';

export default function AgentBlock({ data, selected, id }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const config = nodeData.config as AgentNodeConfig;
  const [providerStatus, setProviderStatus] = React.useState<ProviderStatus[]>([
    { provider: 'googleai', isActive: true, hasApiKey: false },
    { provider: 'openai', isActive: true, hasApiKey: false },
    { provider: 'anthropic', isActive: true, hasApiKey: false },
  ]);
  const [connections, setConnections] = React.useState<Array<{ id: string; name: string; provider: string }>>([]);
  const [prompts, setPrompts] = React.useState<Array<{ id: string; name: string; template?: string }>>([]);

  React.useEffect(() => {
    const conns = ((window as any).__connections || []) as Array<{ id: string; name: string; provider: string }>;
    setConnections(conns.map(c => ({ id: c.id, name: c.name, provider: c.provider })));
    const status: ProviderStatus[] = [
      { provider: 'googleai', isActive: true, hasApiKey: conns.some(c => c.provider === 'googleai') },
      { provider: 'openai', isActive: true, hasApiKey: conns.some(c => c.provider === 'openai') },
      { provider: 'anthropic', isActive: true, hasApiKey: conns.some(c => c.provider === 'anthropic') },
    ];
    setProviderStatus(status);
    const handler = (e: any) => {
      const list = e?.detail || (window as any).__connections || [];
      setConnections(list.map((c: any) => ({ id: c.id, name: c.name, provider: c.provider })));
      setProviderStatus([
        { provider: 'googleai', isActive: true, hasApiKey: list.some((c: any) => c.provider === 'googleai') },
        { provider: 'openai', isActive: true, hasApiKey: list.some((c: any) => c.provider === 'openai') },
        { provider: 'anthropic', isActive: true, hasApiKey: list.some((c: any) => c.provider === 'anthropic') },
      ]);
    };
    window.addEventListener('connectionsChange', handler as EventListener);
    const ph = (ev: any) => {
      const arr = ev?.detail || (window as any).__prompts || [];
      setPrompts(arr.map((p: any) => ({ id: p.id, name: p.name, template: p.template })));
    };
    try {
      const arr = (window as any).__prompts || [];
      setPrompts(arr.map((p: any) => ({ id: p.id, name: p.name, template: p.template })));
    } catch {}
    window.addEventListener('promptsChange', ph as EventListener);
    return () => {
      window.removeEventListener('connectionsChange', handler as EventListener);
      window.removeEventListener('promptsChange', ph as EventListener);
    };
  }, []);

  const handleConfigChange = (field: string, value: any) => {
    const newConfig = { ...config, [field]: value } as AgentNodeConfig;
    // Apply provider defaults when provider changes
    if (field === 'provider') {
      const defaults = DEFAULT_MODEL_PARAMS[value as keyof typeof DEFAULT_MODEL_PARAMS];
      Object.assign(newConfig, defaults);
      // Set default model for provider
      newConfig.model = AVAILABLE_MODELS[value as keyof typeof AVAILABLE_MODELS][0];
    }
    nodeData.config = newConfig;
    window.dispatchEvent(new CustomEvent('nodeConfigChange', {
      detail: { nodeId: id as unknown as string, field, value, config: newConfig }
    }));
  };

  // determine allowed providers based on connections (hasApiKey)
  const allowedProviders = React.useMemo(() => providerStatus.filter(p => p.hasApiKey).map(p => p.provider), [providerStatus]);

  // if current provider is not allowed, auto-switch to first allowed
  React.useEffect(() => {
    if (allowedProviders.length === 0) return; // nothing to switch to
    if (!config.provider || !allowedProviders.includes(config.provider)) {
      const next = allowedProviders[0];
      handleConfigChange('provider', next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedProviders.map(String).join('|')]);

  const selectedProvider = (config.provider && allowedProviders.includes(config.provider)) ? config.provider : (allowedProviders[0] || config.provider || 'googleai');
  const availableModels = AVAILABLE_MODELS[selectedProvider] || [];
  const selectedHasKey = !!providerStatus.find(p => p.provider === selectedProvider)?.hasApiKey;
  const promptType = config.promptType || 'static';

  return (
    <BaseNode id={id as unknown as string} data={nodeData} selected={selected}>
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-base-content/70 mb-1">Provider</label>
          <div className="relative">
            <select
              value={selectedProvider}
              onChange={(e) => handleConfigChange('provider', e.target.value)}
              className="select select-bordered select-xs w-full"
            >
              {(['googleai','openai','anthropic'] as const).map((prov) => {
                const status = providerStatus.find(p => p.provider === prov);
                const disabled = !status?.hasApiKey;
                const label = prov === 'googleai' ? 'Google AI' : prov === 'openai' ? 'OpenAI' : 'Anthropic';
                return (
                  <option key={prov} value={prov} disabled={disabled}>
                    {label}{disabled ? ' (no API key)' : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-base-content/70 mb-1">Model</label>
          <select
            value={config.model || availableModels[0]}
            onChange={(e) => handleConfigChange('model', e.target.value)}
            className="select select-bordered select-xs w-full"
            disabled={!selectedHasKey || availableModels.length === 0}
          >
            {availableModels.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {!selectedHasKey && (
            <div className="mt-1 text-[11px] text-error">
              No API key for {selectedProvider}. Add one in Connections.
              <button
                type="button"
                className="ml-1 text-primary underline"
                onClick={() => {
                  try {
                    window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'connections' } }));
                  } catch {}
                }}
              >
                Open Connections
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-base-content/70 mb-1">Prompt Type</label>
          <select
            value={promptType}
            onChange={(e) => handleConfigChange('promptType', e.target.value)}
            className="select select-bordered select-xs w-full"
          >
            <option value="static">Static</option>
            <option value="library">From Library</option>
          </select>
        </div>

        {promptType === 'static' ? (
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-base-content/70 mb-1">System Prompt</label>
              <textarea
                value={config.systemPrompt || ''}
                onChange={(e) => handleConfigChange('systemPrompt', e.target.value)}
                className="textarea textarea-bordered textarea-xs w-full text-xs resize-none"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-base-content/70 mb-1 flex items-center justify-between">
                <span>User Prompt</span>
                <InsertVarButton
                  variant="prompt"
                  onInsert={(token) => handleConfigChange('userPrompt', `${config.userPrompt || ''}${token}`)}
                />
              </label>
              <textarea
                value={config.userPrompt || ''}
                onChange={(e) => handleConfigChange('userPrompt', e.target.value)}
                className="textarea textarea-bordered textarea-xs w-full text-xs resize-none"
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-base-content/70 mb-1">Select Prompt</label>
            <select
              value={config.promptLibraryId || ''}
              onChange={(e) => handleConfigChange('promptLibraryId', e.target.value)}
              className="select select-bordered select-xs w-full"
            >
              <option value="">Select a prompt</option>
              {prompts.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* AI Parameters Section */}
        <div className="pt-2 border-t border space-y-2">
          <div className="text-xs font-medium text-base-content/70 mb-2">AI Parameters</div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-base-content/70 mb-1">Temperature</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={config.temperature ?? 0.7}
                onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value) || 0.7)}
                className="input input-bordered input-xs w-full text-xs"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-base-content/70 mb-1">Max Tokens</label>
              <input
                type="number"
                min="1"
                max="4096"
                value={config.maxTokens ?? 1000}
                onChange={(e) => handleConfigChange('maxTokens', parseInt(e.target.value) || 1000)}
                className="input input-bordered input-xs w-full text-xs"
              />
            </div>
          </div>

          {/* Provider-specific parameters */}
          {(selectedProvider === 'openai' || selectedProvider === 'anthropic') && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-base-content/70 mb-1">Top P</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={config.topP ?? 1}
                  onChange={(e) => handleConfigChange('topP', parseFloat(e.target.value) || 1)}
                  className="input input-bordered input-xs w-full text-xs"
                />
              </div>
              
              {selectedProvider === 'openai' && (
                <div>
                  <label className="block text-xs font-medium text-base-content/70 mb-1">Frequency Penalty</label>
                  <input
                    type="number"
                    step="0.1"
                    min="-2"
                    max="2"
                    value={config.frequencyPenalty ?? 0}
                    onChange={(e) => handleConfigChange('frequencyPenalty', parseFloat(e.target.value) || 0)}
                    className="input input-bordered input-xs w-full text-xs"
                  />
                </div>
              )}
            </div>
          )}

          {selectedProvider === 'googleai' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-base-content/70 mb-1">Top K</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={config.topK ?? 40}
                  onChange={(e) => handleConfigChange('topK', parseInt(e.target.value) || 40)}
                  className="input input-bordered input-xs w-full text-xs"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-base-content/70 mb-1">Candidate Count</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={config.candidateCount ?? 1}
                  onChange={(e) => handleConfigChange('candidateCount', parseInt(e.target.value) || 1)}
                  className="input input-bordered input-xs w-full text-xs"
                />
              </div>
            </div>
          )}

          {selectedProvider === 'openai' && (
            <div>
              <label className="block text-xs font-medium text-base-content/70 mb-1">Presence Penalty</label>
              <input
                type="number"
                step="0.1"
                min="-2"
                max="2"
                value={config.presencePenalty ?? 0}
                onChange={(e) => handleConfigChange('presencePenalty', parseFloat(e.target.value) || 0)}
                className="input input-bordered input-xs w-full text-xs"
              />
            </div>
          )}
        </div>
      </div>
      {/* Tool connection handle (dedicated target at bottom) */}
      <div className="mt-2 flex items-center gap-2 text-[11px] text-base-content/70">
        <span
          className="px-1 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-700"
          style={{ marginLeft: 'calc(50% - 12px)' }}
          title="Connect Tool nodes here to enable tools for this Agent"
        >
          Tools
        </span>
      </div>
      <Handle
        type="target"
        id="tool"
        position={Position.Bottom}
        className="w-5 h-5 !bg-teal-500 !border-2 !border-white rounded-full !z-10"
        style={{ left: '50%', transform: 'translateX(-50%)' }}
      />
    </BaseNode>
  );
}
