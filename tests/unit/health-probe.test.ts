import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeHealthProbe } from '../../scripts/health-probe.mjs';

describe('Phase 22: Health Probe & Alerting', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('Scenario 1: Given /api/health trả 200, When chạy health probe, Then exit code 0 và log HEALTH_CHECK_OK', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok' }),
    });

    const result = await executeHealthProbe({
      healthUrl: 'http://localhost:3000/api/health',
      fetch: mockFetch,
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe(200);

    const logged = consoleLogSpy.mock.calls.map((c) => c[0]).join(' ');
    expect(logged).toContain('HEALTH_CHECK_OK');
  });

  it('Scenario 2: Given /api/health trả 500 hoặc timeout, When chạy health probe, Then exit code khác 0 và log HEALTH_CHECK_FAILED và kích hoạt webhook nếu có', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let webhookPayload: any = null;

    const mockFetch = vi.fn(async (url: string, init?: any) => {
      if (url.includes('/webhook')) {
        webhookPayload = JSON.parse(init.body);
        return { ok: true, status: 200 };
      }
      return {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };
    });

    const result = await executeHealthProbe({
      healthUrl: 'http://localhost:3000/api/health',
      webhookUrl: 'https://alerts.example.com/webhook',
      environment: 'production',
      fetch: mockFetch,
    });

    expect(result.success).toBe(false);
    expect(result.webhookDelivered).toBe(true);
    expect(webhookPayload.event).toBe('HEALTH_CHECK_FAILED');
    expect(webhookPayload.environment).toBe('production');

    const loggedErrors = consoleErrorSpy.mock.calls.map((c) => c[0]).join(' ');
    expect(loggedErrors).toContain('HEALTH_CHECK_FAILED');
  });
});
