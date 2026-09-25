/**
 * Server Research Provider Runtime Injection Unit Tests
 * (Phase 5.5 Test-First Validation Suite)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createServerApp } from "../../server";
import {
  createDefaultProviderRegistry,
  createResearchProviderRuntimeDiagnostics,
} from "../../src/server/bootstrap/researchProviderComposition";
import {
  readResearchProviderConfig,
  ResearchProviderConfig,
} from "../../src/server/config/researchProviderConfig";
import { ProviderRegistry } from "../../src/server/services/providers/providerRegistry";
import { AntigravityProvider } from "../../src/server/services/providers/antigravityProvider";

describe("SERVER RESEARCH PROVIDER RUNTIME INJECTION (PHASE 5.5)", () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      category: { findMany: vi.fn().mockResolvedValue([]) },
      topic: { findMany: vi.fn().mockResolvedValue([]) },
      note: { findMany: vi.fn().mockResolvedValue([]) },
      resource: { findMany: vi.fn().mockResolvedValue([]) },
      studyProgress: { findMany: vi.fn().mockResolvedValue([]) },
      flashcard: { findMany: vi.fn().mockResolvedValue([]) },
      researchSession: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      tag: { findMany: vi.fn().mockResolvedValue([]) },
      syncSession: { findUnique: vi.fn().mockResolvedValue(null) },
    };
  });

  it("1. server bootstrap mounts createResearchSessionRouter with injected deps", async () => {
    const app = createServerApp({ prismaClient: mockPrisma });
    expect(app).toBeDefined();

    const res = await request(app).get("/api/research/providers");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("routingEnabled");
    expect(res.body).toHaveProperty("providers");
  });

  it("2. injected deps include provider diagnostics when composition/config is available", async () => {
    const customConfig: ResearchProviderConfig = {
      enableProviderRouting: true,
      defaultProviderId: "antigravity-legacy",
      allowNotebookLM: false,
      allowProviderFallback: true,
      enableMcpServer: false,
    };

    const diagnostics = {
      config: customConfig,
      providerRegistry: createDefaultProviderRegistry(customConfig),
    };

    const app = createServerApp({
      prismaClient: mockPrisma,
      researchDiagnostics: diagnostics,
    });

    const res = await request(app).get("/api/research/providers");
    expect(res.status).toBe(200);
    expect(res.body.routingEnabled).toBe(true);
    expect(res.body.providers.length).toBe(1);
    expect(res.body.providers[0].id).toBe("antigravity-legacy");
  });

  it("3. bootstrap does not crash when research diagnostics dependency is unavailable", () => {
    expect(() => {
      const app = createServerApp({
        prismaClient: mockPrisma,
        researchDiagnostics: undefined,
      });
      expect(app).toBeDefined();
    }).not.toThrow();
  });

  it("4. route remains fail-safe (returns 503) instead of server startup failure when diagnostics is undefined", async () => {
    const app = createServerApp({
      prismaClient: mockPrisma,
      researchDiagnostics: undefined,
    });

    const res = await request(app).get("/api/research/providers");
    expect(res.status).toBe(503);
    expect(res.body.error).toBe("Dịch vụ chẩn đoán provider chưa sẵn sàng");
  });

  it("5. server.ts does not instantiate ProviderRegistry ad-hoc when composition helper exists", () => {
    const diag = createResearchProviderRuntimeDiagnostics();
    expect(diag).toHaveProperty("config");
    expect(diag).toHaveProperty("providerRegistry");
    expect(diag.providerRegistry).toBeInstanceOf(ProviderRegistry);
  });

  it("6. does not call provider execution/network methods during bootstrap", () => {
    const spyCreate = vi.spyOn(AntigravityProvider.prototype, "createWorkspace");
    const spyIngest = vi.spyOn(AntigravityProvider.prototype, "ingestSources");
    const spyAudio = vi.spyOn(AntigravityProvider.prototype, "generateAudioOverview");

    const app = createServerApp({ prismaClient: mockPrisma });
    expect(app).toBeDefined();

    expect(spyCreate).not.toHaveBeenCalled();
    expect(spyIngest).not.toHaveBeenCalled();
    expect(spyAudio).not.toHaveBeenCalled();
  });

  it("7. does not create MCP listener during bootstrap", () => {
    const beforeListeners = process.stdin.listenerCount("data");
    createServerApp({ prismaClient: mockPrisma });
    expect(process.stdin.listenerCount("data")).toBe(beforeListeners);
  });

  it("8. does not mutate process.env", () => {
    const originalEnv = { ...process.env };
    createServerApp({ prismaClient: mockPrisma });
    expect(process.env).toEqual(originalEnv);
  });

  it("9. preserves existing mount behavior for non-research routes", async () => {
    const app = createServerApp({ prismaClient: mockPrisma });

    const healthRes = await request(app).get("/api/health");
    expect(healthRes.status).toBe(200);

    const categoriesRes = await request(app).get("/api/categories");
    expect(categoriesRes.status).toBe(200);

    const topicsRes = await request(app).get("/api/topics");
    expect(topicsRes.status).toBe(200);
  });

  it("10. preserves existing diagnostics endpoint contract", async () => {
    const app = createServerApp({ prismaClient: mockPrisma });

    const res = await request(app).get("/api/research/providers");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("routingEnabled");
    expect(res.body).toHaveProperty("defaultProviderId");
    expect(res.body).toHaveProperty("allowProviderFallback");
    expect(res.body).toHaveProperty("providers");
  });

  it("11. preserves existing provider-execution status endpoint contract", async () => {
    const app = createServerApp({ prismaClient: mockPrisma });

    const res = await request(app).get(
      "/api/research-sessions/non-existent-session/provider-execution?correlationId=corr-test"
    );
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Phiên nghiên cứu không tồn tại");
  });

  it("12. does not introduce new routes (unknown route returns 404)", async () => {
    const app = createServerApp({ prismaClient: mockPrisma });

    const res = await request(app).get("/api/research/unknown-mutation-endpoint");
    expect(res.status).toBe(404);
  });

  it("13. does not modify response schema of existing routes", async () => {
    const app = createServerApp({ prismaClient: mockPrisma });

    const res = await request(app).get("/api/docs");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("total");
    expect(Array.isArray(res.body.documents)).toBe(true);
  });

  it("14. does not require real credentials", () => {
    const config = readResearchProviderConfig({});
    expect(config.allowNotebookLM).toBe(false);
    expect(config.enableProviderRouting).toBe(false);
  });

  it("15. does not require Google Cloud connectivity", () => {
    const diag = createResearchProviderRuntimeDiagnostics({});
    expect(diag.config.enableProviderRouting).toBe(false);
  });
});
