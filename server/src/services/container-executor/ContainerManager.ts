import { spawn } from 'child_process';
import { EventEmitter } from 'events';

export interface ContainerInfo {
  id: string;
  name: string;
  status: 'creating' | 'running' | 'stopping' | 'stopped' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  stoppedAt?: Date;
  memoryUsage?: number;
  cpuUsage?: number;
  exitCode?: number;
  error?: string;
}

export interface ContainerStats {
  memoryUsage: number;
  cpuUsage: number;
  networkIO?: {
    rxBytes: number;
    txBytes: number;
  };
}

export class ContainerManager extends EventEmitter {
  private containers = new Map<string, ContainerInfo>();
  private statsInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private readonly maxContainerAge = 5 * 60 * 1000; // 5 minutes
  private readonly statsIntervalMs = 10000; // 10 seconds
  private readonly cleanupIntervalMs = 60000; // 1 minute

  constructor() {
    super();
    this.startMonitoring();
  }

  /**
   * Register a new container
   */
  registerContainer(id: string, name: string): void {
    const container: ContainerInfo = {
      id,
      name,
      status: 'creating',
      createdAt: new Date()
    };

    this.containers.set(id, container);
    this.emit('containerRegistered', container);
  }

  /**
   * Update container status
   */
  updateContainerStatus(id: string, status: ContainerInfo['status'], error?: string): void {
    const container = this.containers.get(id);
    if (!container) return;

    const oldStatus = container.status;
    container.status = status;
    
    if (status === 'running' && !container.startedAt) {
      container.startedAt = new Date();
    } else if (status === 'stopped' && !container.stoppedAt) {
      container.stoppedAt = new Date();
    }

    if (error) {
      container.error = error;
    }

    this.emit('containerStatusChanged', container, oldStatus);
  }

  /**
   * Remove container from tracking
   */
  unregisterContainer(id: string): void {
    const container = this.containers.get(id);
    if (container) {
      this.containers.delete(id);
      this.emit('containerUnregistered', container);
    }
  }

  /**
   * Get container information
   */
  getContainer(id: string): ContainerInfo | undefined {
    return this.containers.get(id);
  }

  /**
   * Get all containers
   */
  getAllContainers(): ContainerInfo[] {
    return Array.from(this.containers.values());
  }

  /**
   * Get containers by status
   */
  getContainersByStatus(status: ContainerInfo['status']): ContainerInfo[] {
    return this.getAllContainers().filter(container => container.status === status);
  }

  /**
   * Get container statistics
   */
  async getContainerStats(id: string): Promise<ContainerStats | null> {
    return new Promise((resolve) => {
      const child = spawn('docker', ['stats', '--no-stream', '--format', 'json', id], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let output = '';
      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0 && output.trim()) {
          try {
            const stats = JSON.parse(output.trim());
            resolve({
              memoryUsage: this.parseMemoryUsage(stats.MemUsage || '0B'),
              cpuUsage: this.parseCpuUsage(stats.CPUPerc || '0.00%'),
              networkIO: stats.NetIO ? this.parseNetworkIO(stats.NetIO) : undefined
            });
          } catch (error) {
            console.error(`Failed to parse container stats for ${id}:`, error);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });

      child.on('error', () => {
        resolve(null);
      });
    });
  }

  /**
   * Force stop a container
   */
  async forceStopContainer(id: string): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn('docker', ['kill', id], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      child.on('close', (code) => {
        const success = code === 0;
        if (success) {
          this.updateContainerStatus(id, 'stopped');
          console.log(`🛑 Force stopped container: ${id}`);
        } else {
          console.error(`❌ Failed to force stop container: ${id}`);
        }
        resolve(success);
      });

      child.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Clean up stopped containers
   */
  async cleanupStoppedContainers(): Promise<void> {
    const stoppedContainers = this.getContainersByStatus('stopped');
    const failedContainers = this.getContainersByStatus('failed');
    
    const containersToCleanup = [...stoppedContainers, ...failedContainers];

    for (const container of containersToCleanup) {
      const age = Date.now() - container.createdAt.getTime();
      if (age > this.maxContainerAge) {
        console.log(`🧹 Cleaning up old container: ${container.id}`);
        this.unregisterContainer(container.id);
      }
    }
  }

  /**
   * Stop all running containers
   */
  async stopAllContainers(): Promise<void> {
    const runningContainers = this.getContainersByStatus('running');
    
    console.log(`🛑 Stopping ${runningContainers.length} running containers...`);
    
    const stopPromises = runningContainers.map(container => 
      this.forceStopContainer(container.id)
    );
    
    await Promise.allSettled(stopPromises);
  }

  /**
   * Get system health metrics
   */
  getHealthMetrics() {
    const all = this.getAllContainers();
    const running = this.getContainersByStatus('running');
    const failed = this.getContainersByStatus('failed');
    const stopped = this.getContainersByStatus('stopped');

    return {
      totalContainers: all.length,
      runningContainers: running.length,
      failedContainers: failed.length,
      stoppedContainers: stopped.length,
      oldestContainer: all.length > 0 ? 
        Math.min(...all.map(c => c.createdAt.getTime())) : null,
      averageLifetime: this.calculateAverageLifetime()
    };
  }

  /**
   * Start monitoring containers
   */
  private startMonitoring(): void {
    // Update container stats periodically
    this.statsInterval = setInterval(async () => {
      const runningContainers = this.getContainersByStatus('running');
      
      for (const container of runningContainers) {
        try {
          const stats = await this.getContainerStats(container.id);
          if (stats) {
            container.memoryUsage = stats.memoryUsage;
            container.cpuUsage = stats.cpuUsage;
            this.emit('containerStatsUpdated', container, stats);
          }
        } catch (error) {
          console.error(`Failed to get stats for container ${container.id}:`, error);
        }
      }
    }, this.statsIntervalMs);

    // Clean up old containers periodically
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupStoppedContainers();
    }, this.cleanupIntervalMs);

    console.log('📊 Container monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = undefined;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    console.log('📊 Container monitoring stopped');
  }

  /**
   * Shutdown the container manager
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down container manager...');
    
    this.stopMonitoring();
    await this.stopAllContainers();
    
    // Wait a bit for containers to stop
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await this.cleanupStoppedContainers();
    
    console.log('✅ Container manager shutdown complete');
  }

  private parseMemoryUsage(memUsage: string): number {
    // Parse formats like "123.4MiB / 256MiB" -> return usage in bytes
    const match = memUsage.match(/^([0-9.]+)([KMGT]?i?B)/);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2];

    const multipliers: { [key: string]: number } = {
      'B': 1,
      'KiB': 1024,
      'MiB': 1024 * 1024,
      'GiB': 1024 * 1024 * 1024,
      'TiB': 1024 * 1024 * 1024 * 1024,
      'KB': 1000,
      'MB': 1000 * 1000,
      'GB': 1000 * 1000 * 1000,
      'TB': 1000 * 1000 * 1000 * 1000
    };

    return value * (multipliers[unit] || 1);
  }

  private parseCpuUsage(cpuPerc: string): number {
    // Parse formats like "12.34%" -> return as decimal
    const match = cpuPerc.match(/^([0-9.]+)%/);
    return match ? parseFloat(match[1]) : 0;
  }

  private parseNetworkIO(netIO: string): { rxBytes: number; txBytes: number } {
    // Parse formats like "1.23kB / 456B"
    const parts = netIO.split(' / ');
    if (parts.length !== 2) return { rxBytes: 0, txBytes: 0 };

    return {
      rxBytes: this.parseMemoryUsage(parts[0].trim()),
      txBytes: this.parseMemoryUsage(parts[1].trim())
    };
  }

  private calculateAverageLifetime(): number {
    const stoppedContainers = this.getContainersByStatus('stopped');
    if (stoppedContainers.length === 0) return 0;

    const totalLifetime = stoppedContainers.reduce((sum, container) => {
      if (container.stoppedAt && container.startedAt) {
        return sum + (container.stoppedAt.getTime() - container.startedAt.getTime());
      }
      return sum;
    }, 0);

    return totalLifetime / stoppedContainers.length;
  }
}