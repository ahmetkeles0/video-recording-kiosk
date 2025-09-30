// Enhanced debug logger with batching and rate limiting
class DebugLogger {
  private static instance: DebugLogger;
  private logQueue: Array<{ type: string; deviceId: string; data: any; timestamp: string }> = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_DELAY = 1000; // 1 second
  private readonly RATE_LIMIT = 100; // Max logs per minute
  private logCount = 0;
  private lastReset = Date.now();

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  private resetRateLimit(): void {
    const now = Date.now();
    if (now - this.lastReset > 60000) { // Reset every minute
      this.logCount = 0;
      this.lastReset = now;
    }
  }

  private async sendBatch(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const batch = this.logQueue.splice(0, this.BATCH_SIZE);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

    try {
      await fetch(`${BACKEND_URL}/api/debug/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: batch })
      });
    } catch (e) {
      // Silently ignore debug logging errors
    }
  }

  async log(type: string, deviceId: string, data: any): Promise<void> {
    this.resetRateLimit();
    
    // Rate limiting
    if (this.logCount >= this.RATE_LIMIT) {
      return; // Drop logs if rate limit exceeded
    }

    this.logCount++;
    this.logQueue.push({
      type,
      deviceId,
      data,
      timestamp: new Date().toISOString()
    });

    // Send batch if queue is full or schedule batch send
    if (this.logQueue.length >= this.BATCH_SIZE) {
      await this.sendBatch();
    } else if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.sendBatch();
        this.batchTimeout = null;
      }, this.BATCH_DELAY);
    }
  }

  // Force flush remaining logs
  async flush(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    await this.sendBatch();
  }
}

export const debugLogger = DebugLogger.getInstance();

// Convenience function for backward compatibility
export const sendDebugInfo = async (type: string, deviceId: string, data: any): Promise<void> => {
  await debugLogger.log(type, deviceId, data);
};