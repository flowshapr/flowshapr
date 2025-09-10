import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);

interface TraceRecord {
  traceId: string;
  displayName?: string;
  startTime?: string;
  endTime?: string;
  status?: { code: number };
  input?: any;
  output?: any;
  spans?: any[];
  attributes?: Record<string, any>;
}

export class LocalFileTraceStore {
  private tracesDir: string;
  private indexDir: string;
  private readonly maxTraces = 1000;

  constructor(projectRoot: string) {
    const genkitDir = path.join(projectRoot, '.genkit');
    this.tracesDir = path.join(genkitDir, 'traces');
    this.indexDir = path.join(genkitDir, 'traces_idx');
  }

  async init(): Promise<void> {
    await this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await mkdir(this.tracesDir, { recursive: true });
      await mkdir(this.indexDir, { recursive: true });
    } catch (error) {
      // Directories may already exist
    }
  }

  async save(traceId: string, trace: TraceRecord): Promise<void> {
    await this.ensureDirectories();
    
    // Save the trace to a file
    const traceFile = path.join(this.tracesDir, `${traceId}.json`);
    await writeFile(traceFile, JSON.stringify(trace, null, 2));
    
    // Update index
    await this.updateIndex(traceId, trace);
    
    // Clean up old traces if we exceed the limit
    await this.cleanup();
  }

  async load(traceId: string): Promise<TraceRecord | null> {
    try {
      const traceFile = path.join(this.tracesDir, `${traceId}.json`);
      const data = await readFile(traceFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  async list(limit?: number, continuationToken?: string): Promise<{ traces: string[]; continuationToken?: string }> {
    try {
      await this.ensureDirectories();
      
      const files = await readdir(this.tracesDir);
      const traceFiles = files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''))
        .sort((a, b) => b.localeCompare(a)); // Sort by newest first

      const startIndex = continuationToken ? parseInt(continuationToken, 10) : 0;
      const endIndex = limit ? Math.min(startIndex + limit, traceFiles.length) : traceFiles.length;
      
      const traces = traceFiles.slice(startIndex, endIndex);
      const nextToken = endIndex < traceFiles.length ? endIndex.toString() : undefined;

      return {
        traces,
        continuationToken: nextToken
      };
    } catch (error) {
      console.error('Error listing traces:', error);
      return { traces: [] };
    }
  }

  private async updateIndex(traceId: string, trace: TraceRecord): Promise<void> {
    try {
      const indexFile = path.join(this.indexDir, 'index.json');
      let index: Record<string, any> = {};
      
      try {
        const indexData = await readFile(indexFile, 'utf8');
        index = JSON.parse(indexData);
      } catch (error) {
        // Index file doesn't exist yet
      }

      // Add trace metadata to index
      index[traceId] = {
        displayName: trace.displayName || traceId,
        startTime: trace.startTime || new Date().toISOString(),
        endTime: trace.endTime,
        status: trace.status,
        attributes: trace.attributes || {}
      };

      await writeFile(indexFile, JSON.stringify(index, null, 2));
    } catch (error) {
      console.error('Error updating index:', error);
    }
  }

  private async cleanup(): Promise<void> {
    try {
      const { traces } = await this.list();
      
      if (traces.length <= this.maxTraces) {
        return;
      }

      // Remove oldest traces
      const tracesToRemove = traces.slice(this.maxTraces);
      
      for (const traceId of tracesToRemove) {
        try {
          const traceFile = path.join(this.tracesDir, `${traceId}.json`);
          await fs.promises.unlink(traceFile);
        } catch (error) {
          console.error(`Error removing trace ${traceId}:`, error);
        }
      }

      // Rebuild index
      await this.rebuildIndex();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  private async rebuildIndex(): Promise<void> {
    try {
      const { traces } = await this.list();
      const indexFile = path.join(this.indexDir, 'index.json');
      const newIndex: Record<string, any> = {};

      for (const traceId of traces) {
        const trace = await this.load(traceId);
        if (trace) {
          newIndex[traceId] = {
            displayName: trace.displayName || traceId,
            startTime: trace.startTime || new Date().toISOString(),
            endTime: trace.endTime,
            status: trace.status,
            attributes: trace.attributes || {}
          };
        }
      }

      await writeFile(indexFile, JSON.stringify(newIndex, null, 2));
    } catch (error) {
      console.error('Error rebuilding index:', error);
    }
  }
}