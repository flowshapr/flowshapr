// Minimal Genkit exporter plugin that posts telemetry to Flowshapr backend

type AnyRecord = Record<string, any>;

export function flowshaprExporter(opts: { endpoint: string; secret: string }) {
  return function flowshaprPlugin(ai: any) {
    try {
      const onAny = (ai as any)?.telemetry?.onEvent || (ai as any)?.onEvent;
      if (typeof onAny === 'function') {
        onAny(async (event: AnyRecord) => {
          try {
            await fetch(opts.endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${opts.secret}` },
              body: JSON.stringify(event),
            });
          } catch {}
        });
      }
    } catch {}
    return {};
  };
}

