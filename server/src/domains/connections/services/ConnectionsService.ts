import { eq, and } from 'drizzle-orm';
import { db } from '../../../infrastructure/database/connection';
import * as schema from '../../../infrastructure/database/schema';

export interface ConnectionInput {
  name: string;
  provider: string;
  apiKey: string;
  isActive?: boolean;
}

export class ConnectionsService {
  async listByFlow(flowId: string) {
    const rows = await (db as any).select({
      id: (schema as any).connection.id,
      name: (schema as any).connection.name,
      provider: (schema as any).connection.provider,
      apiKey: (schema as any).connection.apiKey,
      isActive: (schema as any).connection.isActive,
      createdAt: (schema as any).connection.createdAt,
    }).from((schema as any).connection).where(eq((schema as any).connection.flowId, flowId));
    return rows;
  }

  async createForFlow(flowId: string, userId: string, input: ConnectionInput) {
    const id = `conn_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const inserted = await (db as any).insert((schema as any).connection).values({
      id,
      name: input.name,
      provider: input.provider,
      apiKey: input.apiKey,
      isActive: input.isActive ?? true,
      flowId,
      createdBy: userId,
    }).returning();
    return inserted[0];
  }

  async update(connectionId: string, userId: string, updates: Partial<ConnectionInput>) {
    await (db as any).update((schema as any).connection).set({ ...updates, updatedAt: new Date() }).where(eq((schema as any).connection.id, connectionId));
    const rows = await (db as any).select().from((schema as any).connection).where(eq((schema as any).connection.id, connectionId)).limit(1);
    return rows[0];
  }

  async delete(connectionId: string) {
    await (db as any).delete((schema as any).connection).where(eq((schema as any).connection.id, connectionId));
  }

  async getById(id: string) {
    const rows = await (db as any).select().from((schema as any).connection).where(eq((schema as any).connection.id, id)).limit(1);
    return rows?.[0] || null;
  }
}

export const connectionsService = new ConnectionsService();
