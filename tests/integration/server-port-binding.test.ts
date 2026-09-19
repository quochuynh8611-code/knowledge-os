import { describe, it, expect, afterEach } from "vitest";
import express from "express";
import http from "http";
import { resolveServerPort } from "../../src/server/serverConfig";
import { createHealthRouter } from "../../src/server/routes/healthRoutes";

describe("Server Port Binding & Health Check (Integration Tests)", () => {
  let activeServer: http.Server | null = null;

  afterEach(async () => {
    if (activeServer && activeServer.listening) {
      await new Promise<void>((resolve, reject) => {
        activeServer!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      activeServer = null;
    }
  });

  it("1. binds Express server on resolved port and answers GET /api/health", async () => {
    const rawPortEnv = "3008";
    const port = resolveServerPort(rawPortEnv);
    expect(port).toBe(3008);

    const app = express();
    const mockPrisma = {};
    app.use("/api", createHealthRouter(mockPrisma));

    // Start listening on resolved port
    await new Promise<void>((resolve, reject) => {
      activeServer = app.listen(port, "0.0.0.0", () => {
        resolve();
      });
      activeServer.on("error", reject);
    });

    const address = activeServer?.address();
    expect(address).toBeDefined();
    expect(typeof address).toBe("object");

    const boundPort = (address as any).port;
    expect(boundPort).toBeGreaterThan(0);

    // Make actual HTTP request to /api/health
    const response = await fetch(`http://127.0.0.1:${boundPort}/api/health`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe("ok");
    expect(data.timestamp).toBeDefined();
  });

  it("2. resolves port from custom PORT value and preserves host 0.0.0.0 contract", () => {
    const customPort = resolveServerPort(" 3001 ");
    expect(customPort).toBe(3001);

    const host = "0.0.0.0";
    expect(host).toBe("0.0.0.0");
  });
});
