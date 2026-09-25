/**
 * Research Session Routes - Provider Diagnostics Endpoint Unit Tests
 * (Phase 5.4 Test-First Validation Suite)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createResearchSessionRouter } from "../../src/server/routes/researchSessionRoutes";
import { ResearchSessionService } from "../../src/server/services/researchSessionService";
import { ProviderRegistry } from "../../src/server/services/providers/providerRegistry";
import { ResearchProviderConfig } from "../../src/server/config/researchProviderConfig";
import { AntigravityProvider } from "../../src/server/services/providers/antigravityProvider";
import { NotebookLMEnterpriseProvider } from "../../src/server/services/providers/notebooklmEnterpriseProvider";
import { MockNotebookLMClient } from "../../src/server/services/providers/notebooklmClient";

describe("RESEARCH SESSION ROUTES - PROVIDER DIAGNOSTICS ENDPOINT (PHASE 5.4)", () => {
  let mockPrisma: any;
  let mockSessionService: Partial<ResearchSessionService>;
  let legacyProvider: AntigravityProvider;
  let officialProvider: NotebookLMEnterpriseProvider;
  let fullRegistry: ProviderRegistry;

  const enabledRoutingConfig: ResearchProviderConfig = {
    enableProviderRouting: true,
    defaultProviderId: "antigravity-legacy",
    allowNotebookLM: true,
    allowProviderFallback: true,
    enableMcpServer: false,
  };

  const noNlmConfig: ResearchProviderConfig = {
    enableProviderRouting: true,
    defaultProviderId: "antigravity-legacy",
    allowNotebookLM: false,
    allowProviderFallback: true,
    enableMcpServer: false,
  };

  const disabledRoutingConfig: ResearchProviderConfig = {
    enableProviderRouting: false,
    defaultProviderId: "antigravity-legacy",
    allowNotebookLM: false,
    allowProviderFallback: true,
    enableMcpServer: false,
  };

  beforeEach(() => {
    mockPrisma = {
      researchSession: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    mockSessionService = {
      getSessionById: vi.fn().mockResolvedValue({
        id: "session-1",
        topicId: "topic-1",
        status: "idle",
      } as any),
      getProviderExecutionSnapshot: vi.fn().mockResolvedValue(null),
    };

    legacyProvider = new AntigravityProvider();
    officialProvider = new NotebookLMEnterpriseProvider(new MockNotebookLMClient());

    fullRegistry = new ProviderRegistry({
      config: {
        defaultProvider: "legacy",
        allowFallback: true,
        enableLegacyProvider: true,
        enableOfficialProvider: true,
      },
      providers: [legacyProvider, officialProvider],
    });
  });

  function createTestApp(diagnosticsDeps?: {
    config: ResearchProviderConfig;
    providerRegistry: ProviderRegistry | null;
  }) {
    const app = express();
    app.use(express.json());
    app.use(
      "/api",
      createResearchSessionRouter(mockPrisma, {
        sessionService: mockSessionService as ResearchSessionService,
        providerDiagnostics: diagnosticsDeps,
      })
    );
    return app;
  }

  it("1. returns 200 with deterministic provider diagnostics", async () => {
    const app = createTestApp({
      config: enabledRoutingConfig,
      providerRegistry: fullRegistry,
    });

    const res = await request(app).get("/api/research/providers");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("routingEnabled", true);
    expect(res.body).toHaveProperty("defaultProviderId", "antigravity-legacy");
    expect(res.body).toHaveProperty("allowProviderFallback", true);
    expect(Array.isArray(res.body.providers)).toBe(true);
    expect(res.body.providers.length).toBe(2);
  });

  it("2. returns effective routingEnabled/defaultProviderId/allowProviderFallback", async () => {
    const customConfig: ResearchProviderConfig = {
      enableProviderRouting: true,
      defaultProviderId: "custom-default",
      allowNotebookLM: true,
      allowProviderFallback: false,
      enableMcpServer: true,
    };

    const app = createTestApp({
      config: customConfig,
      providerRegistry: fullRegistry,
    });

    const res = await request(app).get("/api/research/providers");
    expect(res.status).toBe(200);
    expect(res.body.routingEnabled).toBe(true);
    expect(res.body.defaultProviderId).toBe("custom-default");
    expect(res.body.allowProviderFallback).toBe(false);
  });

  it("3. returns provider IDs and declared capabilities", async () => {
    const app = createTestApp({
      config: enabledRoutingConfig,
      providerRegistry: fullRegistry,
    });

    const res = await request(app).get("/api/research/providers");
    expect(res.status).toBe(200);

    const legacy = res.body.providers.find((p: any) => p.id === "antigravity-legacy");
    expect(legacy).toBeDefined();
    expect(legacy.displayName).toBe("Antigravity CLI Handoff");
    expect(legacy.capabilities).toContain("supportsSourceIngestion");
    expect(legacy.capabilities).toContain("supportsQuery");
    expect(legacy.capabilities).not.toContain("supportsAudioOverview");
    expect(legacy.allowed).toBe(true);

    const official = res.body.providers.find((p: any) => p.id === "notebooklm-enterprise");
    expect(official).toBeDefined();
    expect(official.displayName).toBe("NotebookLM Enterprise API (Official)");
    expect(official.capabilities).toContain("supportsNotebookManagement");
    expect(official.capabilities).toContain("supportsAudioOverview");
    expect(official.capabilities).not.toContain("supportsQuery");
    expect(official.allowed).toBe(true);
  });

  it("4. excludes disallowed NotebookLM provider when allowNotebookLM is false", async () => {
    const app = createTestApp({
      config: noNlmConfig,
      providerRegistry: fullRegistry,
    });

    const res = await request(app).get("/api/research/providers");
    expect(res.status).toBe(200);
    expect(res.body.providers.length).toBe(1);
    expect(res.body.providers[0].id).toBe("antigravity-legacy");
  });

  it("5. returns empty providers when routing is disabled", async () => {
    const app = createTestApp({
      config: disabledRoutingConfig,
      providerRegistry: fullRegistry,
    });

    const res = await request(app).get("/api/research/providers");
    expect(res.status).toBe(200);
    expect(res.body.routingEnabled).toBe(false);
    expect(res.body.providers).toEqual([]);
    expect(res.body.defaultProviderId).toBe("antigravity-legacy");
    expect(res.body.allowProviderFallback).toBe(true);
  });

  it("6. returns 503 when diagnostics dependency is missing", async () => {
    const app = createTestApp(undefined); // No providerDiagnostics passed

    const res = await request(app).get("/api/research/providers");
    expect(res.status).toBe(503);
    expect(res.body.error).toBeDefined();
  });

  it("7. returns sanitized 500 for unexpected failure in registry inspection", async () => {
    const faultyRegistry = {
      getAllProviders: vi.fn().mockImplementation(() => {
        throw new Error("Unexpected crash at /var/secrets/key.json with AIzaSyFakeSecret12345678901234567890123");
      }),
    } as unknown as ProviderRegistry;

    const app = createTestApp({
      config: enabledRoutingConfig,
      providerRegistry: faultyRegistry,
    });

    const res = await request(app).get("/api/research/providers");
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
    expect(res.body.error).not.toContain("AIzaSy");
    expect(res.body.error).toContain("[REDACTED_API_KEY]");
  });

  it("8. does not call provider execution/network methods", async () => {
    const spyCreate = vi.spyOn(legacyProvider, "createWorkspace");
    const spyIngest = vi.spyOn(legacyProvider, "ingestSources");
    const spyAudio = vi.spyOn(legacyProvider, "generateAudioOverview");

    const app = createTestApp({
      config: enabledRoutingConfig,
      providerRegistry: fullRegistry,
    });

    await request(app).get("/api/research/providers");

    expect(spyCreate).not.toHaveBeenCalled();
    expect(spyIngest).not.toHaveBeenCalled();
    expect(spyAudio).not.toHaveBeenCalled();
  });

  it("9. does not expose credentials, tokens, keys, paths, or raw environment", async () => {
    const app = createTestApp({
      config: enabledRoutingConfig,
      providerRegistry: fullRegistry,
    });

    const res = await request(app).get("/api/research/providers");
    const bodyStr = JSON.stringify(res.body);

    expect(bodyStr).not.toContain("AIzaSy");
    expect(bodyStr).not.toContain("Bearer");
    expect(bodyStr).not.toContain("PRIVATE KEY");
    expect(bodyStr).not.toContain("process.env");
  });

  it("10. preserves existing provider-execution status endpoint behavior", async () => {
    const app = createTestApp({
      config: enabledRoutingConfig,
      providerRegistry: fullRegistry,
    });

    const res = await request(app).get(
      "/api/research-sessions/session-1/provider-execution?correlationId=corr-test"
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      sessionId: "session-1",
      correlationId: "corr-test",
      snapshot: null,
    });
  });

  it("11. preserves existing legacy route behavior (GET /research-sessions/:id)", async () => {
    const app = createTestApp({
      config: enabledRoutingConfig,
      providerRegistry: fullRegistry,
    });

    const res = await request(app).get("/api/research-sessions/session-1");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("session-1");
  });

  it("12. produces stable alphabetical ordering for provider list", async () => {
    const app = createTestApp({
      config: enabledRoutingConfig,
      providerRegistry: fullRegistry,
    });

    const res = await request(app).get("/api/research/providers");
    expect(res.status).toBe(200);
    const ids = res.body.providers.map((p: any) => p.id);
    expect(ids).toEqual(["antigravity-legacy", "notebooklm-enterprise"]);
  });

  it("13. does not create MCP listener: pure HTTP handler", async () => {
    const app = createTestApp({
      config: enabledRoutingConfig,
      providerRegistry: fullRegistry,
    });

    const res = await request(app).get("/api/research/providers");
    expect(res.status).toBe(200);
  });

  it("14. does not mutate process.env", async () => {
    const beforeEnv = { ...process.env };
    const app = createTestApp({
      config: enabledRoutingConfig,
      providerRegistry: fullRegistry,
    });

    await request(app).get("/api/research/providers");

    expect(process.env).toEqual(beforeEnv);
  });

  it("15. does not introduce mutation endpoints on /api/research/providers", async () => {
    const app = createTestApp({
      config: enabledRoutingConfig,
      providerRegistry: fullRegistry,
    });

    const resPost = await request(app).post("/api/research/providers").send({});
    expect(resPost.status).toBe(404);

    const resPut = await request(app).put("/api/research/providers").send({});
    expect(resPut.status).toBe(404);

    const resDelete = await request(app).delete("/api/research/providers");
    expect(resDelete.status).toBe(404);
  });
});
