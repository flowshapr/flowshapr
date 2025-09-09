import { z } from 'zod';

export type ValidationIssue = {
  nodeId: string;
  nodeType: string;
  message: string;
  path?: (string | number)[];
};

export class FlowValidator {
  async validate(def: { nodes: any[]; edges: any[]; metadata?: any }): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    const nodes = def?.nodes || [];
    const edges = def?.edges || [];

    if (!Array.isArray(nodes) || nodes.length === 0) {
      issues.push({ nodeId: 'flow', nodeType: 'flow', message: 'Flow must contain at least one node' });
      return issues;
    }

    const idSet = new Set<string>();
    for (const n of nodes) {
      if (!n?.id || typeof n.id !== 'string') {
        issues.push({ nodeId: n?.id || 'unknown', nodeType: (n?.data?.type || 'unknown').toString().toLowerCase(), message: 'Node id is required' });
        continue;
      }
      if (idSet.has(n.id)) {
        issues.push({ nodeId: n.id, nodeType: (n?.data?.type || 'unknown').toString().toLowerCase(), message: 'Duplicate node id' });
      }
      idSet.add(n.id);
      const type = (n?.data?.type || '').toString().toLowerCase();
      if (!type) {
        issues.push({ nodeId: n.id, nodeType: 'unknown', message: 'Node type is required' });
        continue;
      }
      // Minimal schema checks for known types
      if (type === 'agent') {
        const schema = z.object({ provider: z.string().min(1), model: z.string().min(1) });
        const res = schema.safeParse(n?.data?.config || {});
        if (!res.success) {
          for (const e of res.error.issues) {
            issues.push({ nodeId: n.id, nodeType: type, message: e.message, path: e.path });
          }
        }
      }
    }

    // Validate edges reference valid node ids
    for (const e of edges) {
      if (!idSet.has(e?.source)) {
        issues.push({ nodeId: e?.id || 'edge', nodeType: 'edge', message: `Edge source not found: ${e?.source}` });
      }
      if (!idSet.has(e?.target)) {
        issues.push({ nodeId: e?.id || 'edge', nodeType: 'edge', message: `Edge target not found: ${e?.target}` });
      }
    }

    return issues;
  }
}

export const flowValidator = new FlowValidator();

