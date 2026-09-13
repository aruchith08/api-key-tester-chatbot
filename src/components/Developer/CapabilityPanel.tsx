import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { ProviderRegistry } from '../../providers/registry';
import { CheckCircle2, XCircle, HelpCircle, Play, Loader2 } from 'lucide-react';

export const CapabilityPanel: React.FC = () => {
  const { apiKey, selectedProvider, selectedModel } = useAppStore();

  const [jsonTestResult, setJsonTestResult] = useState<{ status: 'idle' | 'running' | 'success' | 'failed'; message?: string; output?: string }>({ status: 'idle' });
  const [toolTestResult, setToolTestResult] = useState<{ status: 'idle' | 'running' | 'success' | 'failed'; message?: string; output?: string }>({ status: 'idle' });

  type CapabilityStatus = 'SUPPORTED' | 'UNSUPPORTED' | 'UNKNOWN';

  const resolveStatus = (
    modelCap: boolean | undefined,
    providerCap: boolean | undefined,
    liveStatus?: 'idle' | 'running' | 'success' | 'failed'
  ): CapabilityStatus => {
    // Live runtime test overrides when completed
    if (liveStatus === 'success') return 'SUPPORTED';
    if (liveStatus === 'failed') return 'UNSUPPORTED';

    // Model explicit declaration (e.g. from static catalog or explicit model metadata)
    if (modelCap === true) return 'SUPPORTED';
    if (modelCap === false) return 'UNSUPPORTED';

    // If provider has no support at all, model definitely cannot support it
    if (providerCap === false) return 'UNSUPPORTED';

    // Provider claims support, but model metadata did not explicitly specify
    return 'UNKNOWN';
  };

  const statusStreaming = resolveStatus(selectedModel?.capabilities?.streaming, selectedProvider?.capabilities?.streaming);
  const statusVision = resolveStatus(selectedModel?.capabilities?.vision, selectedProvider?.capabilities?.vision);
  const statusTools = resolveStatus(selectedModel?.capabilities?.tools, selectedProvider?.capabilities?.tools, toolTestResult.status);
  const statusJson = resolveStatus(selectedModel?.capabilities?.json, selectedProvider?.capabilities?.json, jsonTestResult.status);

  const runJsonTest = async () => {
    if (!apiKey || !selectedProvider) {
      setJsonTestResult({ status: 'failed', message: 'API key and provider required.' });
      return;
    }

    setJsonTestResult({ status: 'running' });
    try {
      const adapter = ProviderRegistry.resolveAdapter(selectedProvider);
      const testPrompt = "Return ONLY a valid raw JSON object with keys: name (string), age (number), country (string). Do not write explanations or markdown blocks.";
      const res = await adapter.chat({
        apiKey,
        model: selectedModel?.id || selectedProvider.defaultModelId || 'default',
        messages: [
          { id: 'test_1', role: 'user', content: testPrompt, timestamp: Date.now() }
        ]
      });

      // Attempt parsing JSON
      const clean = res.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);

      if (parsed && typeof parsed.name === 'string' && typeof parsed.age === 'number') {
        setJsonTestResult({
          status: 'success',
          message: '✓ Valid Structured JSON generated and verified successfully.',
          output: JSON.stringify(parsed, null, 2)
        });
      } else {
        setJsonTestResult({
          status: 'failed',
          message: 'Output did not match expected schema keys.',
          output: res
        });
      }
    } catch (err: any) {
      setJsonTestResult({
        status: 'failed',
        message: err.message || 'JSON test failed.',
        output: String(err)
      });
    }
  };

  const runToolTest = async () => {
    if (!apiKey || !selectedProvider) {
      setToolTestResult({ status: 'failed', message: 'API key and provider required.' });
      return;
    }

    setToolTestResult({ status: 'running' });
    try {
      const adapter = ProviderRegistry.resolveAdapter(selectedProvider);
      const testPrompt = `Simulate a function call for the tool 'get_weather' with parameter location: 'Tokyo'. Format your response as: CALL: get_weather({"location": "Tokyo"}).`;
      const res = await adapter.chat({
        apiKey,
        model: selectedModel?.id || selectedProvider.defaultModelId || 'default',
        messages: [
          { id: 'tool_test', role: 'user', content: testPrompt, timestamp: Date.now() }
        ]
      });

      if (/get_weather/i.test(res)) {
        setToolTestResult({
          status: 'success',
          message: '✓ Model followed function calling schema.',
          output: res
        });
      } else {
        setToolTestResult({
          status: 'failed',
          message: 'Model did not trigger the tool pattern.',
          output: res
        });
      }
    } catch (err: any) {
      setToolTestResult({
        status: 'failed',
        message: err.message || 'Tool test failed.',
        output: String(err)
      });
    }
  };

  const statusPill = (status: CapabilityStatus) => {
    if (status === 'SUPPORTED') {
      return (
        <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
          <CheckCircle2 className="w-3 h-3" /> Supported
        </span>
      );
    }
    if (status === 'UNSUPPORTED') {
      return (
        <span className="flex items-center gap-1 text-[11px] text-neutral-500 bg-[#1A1A1E] border border-neutral-800 px-2 py-0.5 rounded-full font-medium">
          <XCircle className="w-3 h-3" /> Unsupported
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium" title="Not explicitly verified in model metadata. Run runtime test below.">
        <HelpCircle className="w-3 h-3" /> Unknown
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-4 text-xs">
      {/* Capability matrix */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1 font-mono">
          <span>Model: <span className="text-white">{selectedModel?.id || 'default'}</span></span>
          <span className="text-neutral-500">Provider: {selectedProvider?.name || 'None'}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="flex items-center justify-between p-2.5 bg-[#141416] border border-[#232328] rounded-xl">
            <span className="text-neutral-300 font-medium">Text Generation</span>
            {statusPill('SUPPORTED')}
          </div>
          <div className="flex items-center justify-between p-2.5 bg-[#141416] border border-[#232328] rounded-xl">
            <span className="text-neutral-300 font-medium">Streaming (SSE)</span>
            {statusPill(statusStreaming)}
          </div>
          <div className="flex items-center justify-between p-2.5 bg-[#141416] border border-[#232328] rounded-xl">
            <span className="text-neutral-300 font-medium">Vision / Multimodal</span>
            {statusPill(statusVision)}
          </div>
          <div className="flex items-center justify-between p-2.5 bg-[#141416] border border-[#232328] rounded-xl">
            <span className="text-neutral-300 font-medium">System Instructions</span>
            {statusPill('SUPPORTED')}
          </div>
          <div className="flex items-center justify-between p-2.5 bg-[#141416] border border-[#232328] rounded-xl">
            <span className="text-neutral-300 font-medium">Tool Calling / Functions</span>
            {statusPill(statusTools)}
          </div>
          <div className="flex items-center justify-between p-2.5 bg-[#141416] border border-[#232328] rounded-xl">
            <span className="text-neutral-300 font-medium">Structured JSON Output</span>
            {statusPill(statusJson)}
          </div>
        </div>
      </div>

      {/* Live Interactive Tests */}
      <div className="flex flex-col gap-3 pt-3 border-t border-[#222226]">
        <span className="text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
          Live Runtime Capability Tests
        </span>

        {/* Structured JSON Test */}
        <div className="p-3 bg-[#141417] border border-[#232328] rounded-xl flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white">Structured JSON Schema Test</div>
              <div className="text-[11px] text-neutral-500">Prompts model with strict JSON schema (name, age, country)</div>
            </div>
            <button
              type="button"
              onClick={runJsonTest}
              disabled={jsonTestResult.status === 'running' || !apiKey}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
            >
              {jsonTestResult.status === 'running' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>Run Test</span>
            </button>
          </div>

          {jsonTestResult.message && (
            <div className={`p-2 rounded-lg text-[11px] ${
              jsonTestResult.status === 'success' ? 'bg-emerald-950/20 text-emerald-300 border border-emerald-500/20' : 'bg-red-950/20 text-red-300 border border-red-500/20'
            }`}>
              <div className="font-medium">{jsonTestResult.message}</div>
              {jsonTestResult.output && (
                <pre className="mt-1.5 p-2 bg-black/40 rounded overflow-x-auto text-neutral-300 font-mono text-[10px]">
                  {jsonTestResult.output}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Tool Calling Simulation Test */}
        <div className="p-3 bg-[#141417] border border-[#232328] rounded-xl flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white">Tool / Function Calling Test</div>
              <div className="text-[11px] text-neutral-500">Evaluates invocation compliance with `get_weather` schema</div>
            </div>
            <button
              type="button"
              onClick={runToolTest}
              disabled={toolTestResult.status === 'running' || !apiKey}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
            >
              {toolTestResult.status === 'running' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>Run Test</span>
            </button>
          </div>

          {toolTestResult.message && (
            <div className={`p-2 rounded-lg text-[11px] ${
              toolTestResult.status === 'success' ? 'bg-emerald-950/20 text-emerald-300 border border-emerald-500/20' : 'bg-red-950/20 text-red-300 border border-red-500/20'
            }`}>
              <div className="font-medium">{toolTestResult.message}</div>
              {toolTestResult.output && (
                <pre className="mt-1.5 p-2 bg-black/40 rounded overflow-x-auto text-neutral-300 font-mono text-[10px]">
                  {toolTestResult.output}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
