#!/usr/bin/env node

/**
 * scripts/health-probe.mjs
 * 
 * Standalone health probe script for Knowledge OS.
 * Queries GET /api/health with timeout; fires webhook alert on failure if configured.
 */

import { pathToFileURL } from 'url';

export async function executeHealthProbe(options = {}) {
  const healthUrl = options.healthUrl || process.env.HEALTH_URL || 'http://localhost:3000/api/health';
  const webhookUrl = options.webhookUrl || process.env.ALERT_WEBHOOK_URL;
  const environment = options.environment || process.env.ALERT_ENVIRONMENT || 'production';
  const timeoutMs = parseInt(options.timeoutMs || process.env.HEALTH_TIMEOUT_MS || '5000', 10);
  const fetchFn = options.fetch || globalThis.fetch;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchFn(healthUrl, {
      signal: controller.signal,
      headers: { Accept: 'application/json', Connection: 'close' },
    });
    clearTimeout(timer);

    if (res.ok) {
      const output = JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        event: 'HEALTH_CHECK_OK',
        metadata: {
          url: healthUrl,
          status: res.status,
          environment,
        },
      });
      console.log(output);
      return { success: true, status: res.status, output };
    } else {
      throw new Error(`Health check returned HTTP ${res.status} (${res.statusText || 'Error'})`);
    }
  } catch (err) {
    clearTimeout(timer);
    const errorMessage = err?.name === 'AbortError' ? `Request timeout sau ${timeoutMs}ms` : err?.message;

    const errorOutput = JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      event: 'HEALTH_CHECK_FAILED',
      metadata: {
        url: healthUrl,
        environment,
        error: errorMessage,
      },
    });
    console.error(errorOutput);

    // If webhook URL is configured, send notification
    let webhookDelivered = false;
    if (webhookUrl) {
      try {
        await fetchFn(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'HEALTH_CHECK_FAILED',
            environment,
            targetUrl: healthUrl,
            error: errorMessage,
            timestamp: new Date().toISOString(),
          }),
        });
        webhookDelivered = true;
      } catch (webhookErr) {
        console.error(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'warn',
            event: 'ALERT_WEBHOOK_DELIVERY_FAILED',
            metadata: { error: webhookErr?.message },
          })
        );
      }
    }

    return { success: false, error: errorMessage, errorOutput, webhookDelivered };
  }
}

// CLI runner
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  executeHealthProbe().then((result) => {
    process.exit(result.success ? 0 : 1);
  });
}
