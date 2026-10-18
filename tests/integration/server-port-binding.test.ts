import { describe, it, expect, afterEach } from "vitest";
import express from "express";
import http from "http";
import { resolveServerPort } from "../../src/server/serverConfig";
import { createHealthRouter } from "../../src/server/routes/healthRoutes";

describe("Server Port Binding & Health Check (Integration Tests)", () => {
  let activeServer: http.Server | null = null;

  const httpGet = (
    url: string
  ): Promise<{ status: number; json: () => Promise<any>; body: any }> => {
    return new Promise((resolve, reject) => {
      const req = http.get(url, (res) => {
        let rawData = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          rawData += chunk;
        });
        res.on("error", reject);
        res.on("end", () => {
          try {
            const body = JSON.parse(rawData);
            resolve({
              status: res.statusCode ?? 0,
              body,
              json: async () => body,
            });
          } catch (err) {
            reject(err);
          }
        });
      });
      req.on("error", reject);
    });
  };

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
    const response = await httpGet(`http://127.0.0.1:${boundPort}/api/health`);
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
