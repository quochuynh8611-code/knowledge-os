import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ValidatedDbHealthResponse } from '../../src/lib/validation';

describe('Phase 2C.1: Health Badge & Resilient Polling Lifecycle Contracts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // Pure Health Poller Hook Simulator
  class HealthPollerController {
    currentStatus: 'healthy' | 'degraded' | 'unhealthy' = 'unhealthy';
    latencyMs = 0;
    connected = false;
    currentIntervalMs = 30000;
    timerId: any = null;
    isPollingActive = false;
    pollCount = 0;

    constructor(private fetchHealthFn: () => Promise<ValidatedDbHealthResponse>) {}

    async start() {
      this.isPollingActive = true;
      await this.poll();
    }

    stop() {
      if (this.timerId) {
        clearTimeout(this.timerId);
        this.timerId = null;
      }
      this.isPollingActive = false;
    }

    async handleVisibilityChange(isHidden: boolean) {
      if (isHidden) {
        this.stop();
      } else {
        this.isPollingActive = true;
        await this.poll();
      }
    }

    private scheduleNext() {
      if (!this.isPollingActive) return;
      this.timerId = setTimeout(async () => {
        await this.poll();
      }, this.currentIntervalMs);
    }

    async poll() {
      if (!this.isPollingActive) return;
      this.pollCount++;
      try {
        const res = await this.fetchHealthFn();
        this.currentStatus = res.status;
        this.latencyMs = res.latencyMs;
        this.connected = res.connected;
        this.currentIntervalMs = 30000; // Reset interval về 30s khi success
      } catch {
        this.currentStatus = 'unhealthy';
        this.connected = false;
        // Exponential backoff: 30s -> 60s -> 120s max
        this.currentIntervalMs = Math.min(this.currentIntervalMs * 2, 120000);
      }

      this.scheduleNext();
    }
  }

  it('1. Healthy response (<100ms) ghi nhận status healthy và latency chính xác', async () => {
    // Given
    const mockHealth: ValidatedDbHealthResponse = {
      status: 'healthy',
      latencyMs: 14,
      database: 'postgresql',
      connected: true,
      timestamp: new Date().toISOString(),
    };
    const poller = new HealthPollerController(async () => mockHealth);

    // When
    await poller.start();

    // Then
    expect(poller.currentStatus).toBe('healthy');
    expect(poller.latencyMs).toBe(14);
    expect(poller.connected).toBe(true);
    expect(poller.currentIntervalMs).toBe(30000);
    poller.stop();
  });

  it('2. Degraded response (100-1000ms) ghi nhận status degraded và độ trễ cao', async () => {
    // Given
    const mockHealth: ValidatedDbHealthResponse = {
      status: 'degraded',
      latencyMs: 320,
      database: 'postgresql',
      connected: true,
      timestamp: new Date().toISOString(),
    };
    const poller = new HealthPollerController(async () => mockHealth);

    // When
    await poller.start();

    // Then
    expect(poller.currentStatus).toBe('degraded');
    expect(poller.latencyMs).toBe(320);
    expect(poller.connected).toBe(true);
    poller.stop();
  });

  it('3. Polling định kỳ kích hoạt mỗi 30 giây khi server phản hồi bình thường', async () => {
    // Given
    const mockHealth: ValidatedDbHealthResponse = {
      status: 'healthy',
      latencyMs: 10,
      database: 'postgresql',
      connected: true,
      timestamp: new Date().toISOString(),
    };
    const poller = new HealthPollerController(async () => mockHealth);

    // When: Khởi động poller
    await poller.start();
    expect(poller.pollCount).toBe(1);

    // Sau 30s
    await vi.advanceTimersByTimeAsync(30000);
    expect(poller.pollCount).toBe(2);

    // Sau tiếp 30s
    await vi.advanceTimersByTimeAsync(30000);
    expect(poller.pollCount).toBe(3);

    poller.stop();
  });

  it('4. Exponential backoff chuyển từ 30s -> 60s -> 120s khi gặp lỗi kết nối máy chủ', async () => {
    // Given
    const poller = new HealthPollerController(async () => {
      throw new Error('Connection refused');
    });

    // When 1: Lần poll đầu gặp lỗi
    await poller.start();
    expect(poller.currentStatus).toBe('unhealthy');
    expect(poller.currentIntervalMs).toBe(60000); // 30s * 2 = 60s

    // When 2: Chờ 60s cho lần poll thứ hai
    await vi.advanceTimersByTimeAsync(60000);
    expect(poller.pollCount).toBe(2);
    expect(poller.currentIntervalMs).toBe(120000); // 60s * 2 = 120s (max)

    poller.stop();
  });

  it('5. Tạm dừng polling khi tab bị ẩn (document.hidden === true) và dọn dẹp timer khi unmount', async () => {
    // Given
    const mockHealth: ValidatedDbHealthResponse = {
      status: 'healthy',
      latencyMs: 10,
      database: 'postgresql',
      connected: true,
      timestamp: new Date().toISOString(),
    };
    const poller = new HealthPollerController(async () => mockHealth);
    await poller.start();
    expect(poller.pollCount).toBe(1);

    // When: Tab bị ẩn
    await poller.handleVisibilityChange(true);
    await vi.advanceTimersByTimeAsync(60000);

    // Then: Không phát sinh thêm request nào
    expect(poller.pollCount).toBe(1);

    // When: Tab hiển thị lại
    await poller.handleVisibilityChange(false);
    expect(poller.pollCount).toBe(2);

    // Dọn dẹp unmount
    poller.stop();
    expect(poller.timerId).toBeNull();
  });
});
