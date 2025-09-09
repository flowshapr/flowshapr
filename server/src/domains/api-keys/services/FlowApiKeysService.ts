import { and, eq } from 'drizzle-orm';
import { db } from '../../../infrastructure/database/connection';
import * as schema from '../../../infrastructure/database/schema';
import { flowService } from '../../flows/services/FlowService';
import { NotFoundError } from '../../../shared/utils/errors';
import { generateToken, hashToken } from '../../../shared/utils/crypto';

export class FlowApiKeysService {
  private generateApiKeyId(): string { return `fak_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }

  async list(flowId: string, userId: string) {
    const flow = await flowService.getFlowById(flowId, userId);
    if (!flow) throw new NotFoundError('Flow not found or access denied');
    const rows = await (db as any)
      .select({
        id: (schema as any).flowApiKey.id,
        name: (schema as any).flowApiKey.name,
        prefix: (schema as any).flowApiKey.prefix,
        scopes: (schema as any).flowApiKey.scopes,
        rateLimit: (schema as any).flowApiKey.rateLimit,
        isActive: (schema as any).flowApiKey.isActive,
        lastUsedAt: (schema as any).flowApiKey.lastUsedAt,
        usageCount: (schema as any).flowApiKey.usageCount,
        expiresAt: (schema as any).flowApiKey.expiresAt,
        createdAt: (schema as any).flowApiKey.createdAt,
      })
      .from((schema as any).flowApiKey)
      .where(and(eq((schema as any).flowApiKey.flowId, flowId), eq((schema as any).flowApiKey.isActive, true)));
    return rows;
  }

  async create(flowId: string, userId: string, data: { name: string; scopes?: string[]; rateLimit?: number; expiresAt?: string }) {
    const flow = await flowService.getFlowById(flowId, userId);
    if (!flow) throw new NotFoundError('Flow not found or access denied');
    const rawToken = `fs_${generateToken()}`;
    const tokenHash = hashToken(rawToken);
    const keyId = this.generateApiKeyId();
    const prefix = rawToken.slice(0, 8);
    const inserted = await (db as any).insert((schema as any).flowApiKey).values({
      id: keyId,
      name: data.name,
      key: tokenHash,
      prefix,
      scopes: data.scopes || [],
      rateLimit: data.rateLimit || null,
      isActive: true,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      flowId,
      createdBy: userId,
    }).returning({ id: (schema as any).flowApiKey.id, prefix: (schema as any).flowApiKey.prefix, name: (schema as any).flowApiKey.name });
    return { id: inserted[0].id, name: inserted[0].name, prefix: inserted[0].prefix, token: rawToken };
  }

  async revoke(flowId: string, keyId: string, userId: string) {
    const flow = await flowService.getFlowById(flowId, userId);
    if (!flow) throw new NotFoundError('Flow not found or access denied');
    await (db as any)
      .update((schema as any).flowApiKey)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq((schema as any).flowApiKey.flowId, flowId), eq((schema as any).flowApiKey.id, keyId)));
    return { success: true };
  }
}

export const flowApiKeysService = new FlowApiKeysService();

