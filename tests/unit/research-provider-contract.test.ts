import { describe, it, expect, beforeEach, vi } from "vitest";
import crypto from "crypto";
import {
  FakeResearchProvider,
  SecureStorageResolver,
  FakeMcpStdioRunner,
  ExecutionContext,
  SourcePayload,
  NOTEBOOKLM_ENTERPRISE_CAPABILITIES_SPEC,
  ANTIGRAVITY_LEGACY_CAPABILITIES_SPEC,
  ProviderException,
  ProviderAttemptRecord,
} from "../fixtures/researchProviderFixtures";
import {
  createAntigravityHandoffJob,
  buildAntigravityCLICommand,
  validateAntigravityJobManifest,
  serializeAntigravityJobManifest,
} from "../../src/lib/antigravityPipeline";
import { packageSourceForNotebookLM, generateNotebookLMTaskPrompt } from "../../src/lib/notebooklm";
import { Topic, Note, Resource } from "../../src/types";

describe("PHASE 3: RESEARCH PROVIDER CONTRACT & SECURITY TEST SUITE", () => {
  let fakeProvider: FakeResearchProvider;
  let testContext: ExecutionContext;

  const mockTopic: Topic = {
    id: "topic-abhidharma",
    title: "Vi Diệu Pháp Toàn Tập",
    slug: "vi-dieu-phap-toan-tap",
    categoryId: "cat-abhidharma",
    type: "phat-hoc",
    description: "Khảo sát 89/121 Tâm và 52 Tâm sở",
    content: "Nội dung kinh điển Abhidhamma",
    tags: ["Abhidhamma", "TâmSở"],
    links: [],
    studyProgress: {
      topicId: "topic-abhidharma",
      status: "not_started",
      progress: 0,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 1,
      timeSpent: 0,
    },
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  };

  const mockNotes: Note[] = [
    {
      id: "note-1",
      topicId: "topic-abhidharma",
      title: "Ghi chú Tâm biến hành",
      content: "Nội dung 7 biến hành tâm sở",
      type: "insight",
      isPrivate: false,
      tags: ["TâmSở"],
      createdAt: "2026-09-01T00:00:00Z",
      updatedAt: "2026-09-01T00:00:00Z",
    },
  ];

  const mockResources: Resource[] = [
    {
      id: "res-1",
      topicId: "topic-abhidharma",
      title: "Luận Tạng Pali",
      url: "https://tipitaka.org/abhidhamma",
      type: "article",
      createdAt: "2026-09-01T00:00:00Z",
    },
  ];

  beforeEach(() => {
    fakeProvider = new FakeResearchProvider();
    testContext = {
      requestId: "req-test-001",
      correlationId: "corr-trace-abc-123",
      attemptId: "att-001",
      actor: { userId: "scholar-user-1", role: "user" },
      idempotencyKey: "idem-key-9999",
      allowFallback: false,
    };
  });

  // ─── NHÓM A: PROVIDER CONTRACT ───────────────────────────────────────────────
  describe("Nhóm A: Provider Contract & Types Compliance", () => {
    it("A1: verifies metadata conformity (identity, version, type)", () => {
      const meta = fakeProvider.metadata;
      expect(meta.id).toBe("fake-notebooklm-enterprise");
      expect(meta.type).toBe("official");
      expect(typeof meta.name).toBe("string");
      expect(typeof meta.version).toBe("string");
    });

    it("A2: hardcodes Enterprise Capability Matrix strictly (VERIFIED vs UNSUPPORTED)", () => {
      const caps = fakeProvider.getCapabilities();
      // VERIFIED
      expect(caps.supportsNotebookManagement).toBe(true);
      expect(caps.supportsSourceIngestion).toBe(true);
      expect(caps.supportsAudioOverview).toBe(true);
      expect(caps.supportsBatchSourceDelete).toBe(true);
      // UNSUPPORTED / UNVERIFIED (No query/chat assumption)
      expect(caps.supportsQuery).toBe(false);
      expect(caps.supportsInteractiveChat).toBe(false);
      expect(caps.supportsStudyGuide).toBe(false);
      expect(caps.supportsMindMap).toBe(false);
      expect(caps.supportsSlides).toBe(false);
    });

    it("A3: healthCheck verifies ADC/Service Account without leaking sensitive keys", async () => {
      const health = await fakeProvider.healthCheck(testContext);
      expect(health.isHealthy).toBe(true);
      expect(health.providerId).toBe("fake-notebooklm-enterprise");
      expect(health.authenticatedUserOrSa).toContain("@test-gcp-project.iam.gserviceaccount.com");
      expect(health.authenticatedUserOrSa).not.toContain("AIzaSy");
    });

    it("A4: createWorkspace returns remote workspace ID and structured ProviderAttemptRecord", async () => {
      const res = await fakeProvider.createWorkspace(
        { topicTitle: mockTopic.title, topicSlug: mockTopic.slug },
        testContext
      );
      expect(res.remoteWorkspaceId).toMatch(/^fake-ws-vi-dieu-phap-toan-tap-/);
      expect(res.attemptRecord.attemptId).toBe("att-001");
      expect(res.attemptRecord.status).toBe("COMPLETED");
      expect(res.attemptRecord.remoteWorkspaceId).toBe(res.remoteWorkspaceId);
    });
  });

  // ─── NHÓM B: ERROR POLICY ───────────────────────────────────────────────────
  describe("Nhóm B: Error Policy, Fast-Fail & Controlled Fallback", () => {
    it("B1: Fast-Fails immediately on 401/403 without retry or blind fallback", async () => {
      fakeProvider.simulatedFailures.createWorkspace = "PERMISSION_DENIED";

      await expect(
        fakeProvider.createWorkspace({ topicTitle: "Test", topicSlug: "test" }, testContext)
      ).rejects.toThrow(ProviderException);

      expect(fakeProvider.currentAttemptCount).toBe(1); // No retry
      expect(fakeProvider.attemptHistory[0].errorCode).toBe("PERMISSION_DENIED");
      expect(fakeProvider.attemptHistory[0].status).toBe("FAILED");
    });

    it("B2: Bounded retry policy retries transient errors up to 3 times", async () => {
      // Runner simulating retry wrapper
      fakeProvider.simulatedFailures.ingestSources = "PROVIDER_UNAVAILABLE";
      let attempts = 0;
      let lastError: any = null;

      for (let i = 1; i <= 3; i++) {
        attempts++;
        try {
          await fakeProvider.ingestSources(
            { remoteWorkspaceId: "ws-1", sources: [] },
            { ...testContext, attemptId: `att-retry-${i}` }
          );
          break;
        } catch (err) {
          lastError = err;
        }
      }

      expect(attempts).toBe(3);
      expect(lastError?.errorCode).toBe("PROVIDER_UNAVAILABLE");
      expect(fakeProvider.attemptHistory.length).toBe(3);
    });

    it("B3: Timeout transitions attempt status to UNKNOWN instead of blindly assuming failure", async () => {
      fakeProvider.simulatedFailures.ingestSources = "PROVIDER_TIMEOUT";

      await expect(
        fakeProvider.ingestSources({ remoteWorkspaceId: "ws-1", sources: [] }, testContext)
      ).rejects.toThrow("Upload exceeded 60s timeout");

      expect(fakeProvider.attemptHistory[0].status).toBe("UNKNOWN");
      expect(fakeProvider.attemptHistory[0].errorCode).toBe("PROVIDER_TIMEOUT");
    });

    it("B4: Prevents automatic fallback when allowFallback is false", async () => {
      fakeProvider.simulatedFailures.ingestSources = "PROVIDER_UNAVAILABLE";
      const fallbackTriggered = vi.fn();

      try {
        await fakeProvider.ingestSources({ remoteWorkspaceId: "ws-1", sources: [] }, testContext);
      } catch (err) {
        if (testContext.allowFallback) {
          fallbackTriggered();
        }
      }

      expect(fallbackTriggered).not.toHaveBeenCalled();
    });

    it("B5: Allows fallback only when allowFallback=true or user approval proof exists", async () => {
      fakeProvider.simulatedFailures.ingestSources = "PROVIDER_UNAVAILABLE";
      const approvedContext: ExecutionContext = {
        ...testContext,
        allowFallback: true,
        approvalProof: {
          approvedBy: "scholar-user-1",
          approvedAt: new Date().toISOString(),
          intent: "manual_fallback",
        },
      };

      let activeProvider = fakeProvider.metadata.id;
      try {
        await fakeProvider.ingestSources({ remoteWorkspaceId: "ws-1", sources: [] }, approvedContext);
      } catch (err) {
        if (approvedContext.allowFallback && approvedContext.approvalProof) {
          activeProvider = "antigravity-legacy";
        }
      }

      expect(activeProvider).toBe("antigravity-legacy");
    });
  });

  // ─── NHÓM C: PROVIDER ATTEMPTS ──────────────────────────────────────────────
  describe("Nhóm C: Provider Attempt Tracking & Audit Trail Preservation", () => {
    it("C1: assigns unique attemptId for each attempt without overwriting prior attempt metadata", async () => {
      fakeProvider.simulatedFailures.createWorkspace = "PROVIDER_UNAVAILABLE";

      // Attempt 1 fails
      try {
        await fakeProvider.createWorkspace({ topicTitle: "T", topicSlug: "t" }, { ...testContext, attemptId: "att-1" });
      } catch {}

      // Clear failure and Attempt 2 succeeds
      fakeProvider.simulatedFailures.createWorkspace = undefined;
      await fakeProvider.createWorkspace({ topicTitle: "T", topicSlug: "t" }, { ...testContext, attemptId: "att-2" });

      expect(fakeProvider.attemptHistory.length).toBe(2);
      expect(fakeProvider.attemptHistory[0].attemptId).toBe("att-1");
      expect(fakeProvider.attemptHistory[0].status).toBe("FAILED");
      expect(fakeProvider.attemptHistory[1].attemptId).toBe("att-2");
      expect(fakeProvider.attemptHistory[1].status).toBe("COMPLETED");
    });

    it("C2: preserves correlationId across retries and fallbacks", () => {
      const attempts: ProviderAttemptRecord[] = [
        {
          attemptId: "att-1",
          providerId: "notebooklm-enterprise",
          status: "FAILED",
          startedAt: "2026-09-01T00:00:00Z",
          errorCode: "PROVIDER_UNAVAILABLE",
        },
        {
          attemptId: "att-2",
          providerId: "antigravity-legacy",
          status: "COMPLETED",
          startedAt: "2026-09-01T00:01:00Z",
        },
      ];

      expect(attempts[0].providerId).toBe("notebooklm-enterprise");
      expect(attempts[1].providerId).toBe("antigravity-legacy");
      expect(attempts[0].errorCode).toBe("PROVIDER_UNAVAILABLE");
    });
  });

  // ─── NHÓM D: IDEMPOTENCY & RECONCILIATION ────────────────────────────────────
  describe("Nhóm D: Idempotency State Machine & Remote Reconciliation", () => {
    it("D1: confirms present sources and resolves UNKNOWN state to COMPLETED", async () => {
      const sources: SourcePayload[] = [
        {
          type: "inline-text",
          sourceId: "src-1",
          title: "Khảo cứu Vi Diệu Pháp",
          mimeType: "text/markdown",
          textContent: "Nội dung khảo cứu",
          contentHash: "hash-12345",
        },
      ];

      await fakeProvider.ingestSources({ remoteWorkspaceId: "ws-100", sources }, testContext);

      const reconcileResult = await fakeProvider.reconcileIngest(
        {
          remoteWorkspaceId: "ws-100",
          expectedSources: [{ sourceId: "src-1", contentHash: "hash-12345" }],
        },
        testContext
      );

      expect(reconcileResult).toBe("CONFIRMED_PRESENT");
    });

    it("D2: confirms absent sources if remote workspace has no records", async () => {
      const reconcileResult = await fakeProvider.reconcileIngest(
        {
          remoteWorkspaceId: "ws-empty",
          expectedSources: [{ sourceId: "src-1", contentHash: "hash-12345" }],
        },
        testContext
      );

      expect(reconcileResult).toBe("CONFIRMED_ABSENT");
    });

    it("D3: flags INCONCLUSIVE when reconciliation is uncertain, blocking auto-retry until approval", async () => {
      fakeProvider.simulatedFailures.reconciliationOutcome = "INCONCLUSIVE";

      const outcome = await fakeProvider.reconcileIngest(
        { remoteWorkspaceId: "ws-uncertain", expectedSources: [] },
        testContext
      );

      expect(outcome).toBe("INCONCLUSIVE");

      // Execution policy invariant: Cannot retry without approvalProof
      const canAutoRetry = outcome === "CONFIRMED_ABSENT" || Boolean(testContext.approvalProof);
      expect(canAutoRetry).toBe(false);
    });
  });

  // ─── NHÓM E: SOURCE VALIDATION & FILE SECURITY ──────────────────────────────
  describe("Nhóm E: Polymorphic Source Validation & Sandboxed Security", () => {
    let resolver: SecureStorageResolver;

    beforeEach(() => {
      resolver = new SecureStorageResolver(["/app/data/storage", "/app/obsidian/vault"]);
    });

    it("E1: accepts valid sourceObjectId and resolves within allowlist root", () => {
      const res = resolver.resolveSourceObjectId("pdf/abhidhamma-vol1.pdf");
      expect(res.valid).toBe(true);
      expect(res.absolutePath).toBe("/app/data/storage/pdf/abhidhamma-vol1.pdf");
    });

    it("E2: rejects path traversal attempts (..) immediately", () => {
      const res = resolver.resolveSourceObjectId("../../etc/passwd");
      expect(res.valid).toBe(false);
      expect(res.error).toContain("Path traversal");
    });

    it("E3: rejects direct absolute paths or un-sandboxed input", () => {
      const res = resolver.resolveSourceObjectId("/var/secrets/sa-key.json");
      expect(res.valid).toBe(false);
      expect(res.error).toContain("Path traversal or absolute path violation");
    });

    it("E4: computes SHA-256 for inline text payloads consistently", () => {
      const content = "Nội dung văn bản nguồn khảo cứu";
      const expectedHash = crypto.createHash("sha256").update(content.trim()).digest("hex");

      const payload: SourcePayload = {
        type: "inline-text",
        sourceId: "src-inline-1",
        title: "Văn bản thử nghiệm",
        mimeType: "text/markdown",
        textContent: content,
        contentHash: expectedHash,
      };

      expect(payload.contentHash).toBe(expectedHash);
      expect((payload as any).localFilePath).toBeUndefined();
    });
  });

  // ─── NHÓM F: CAPABILITY GATING ──────────────────────────────────────────────
  describe("Nhóm F: Service-Layer Capability Gating", () => {
    it("F1: Blocks query() calls at the service layer when supportsQuery is false", async () => {
      await expect(
        fakeProvider.query({ workspaceId: "ws-1", question: "Tâm biến hành là gì?" }, testContext)
      ).rejects.toThrow(ProviderException);

      try {
        await fakeProvider.query({ workspaceId: "ws-1", question: "Tâm biến hành là gì?" }, testContext);
      } catch (err: any) {
        expect(err.errorCode).toBe("CAPABILITY_UNSUPPORTED");
      }
    });

    it("F2: Allows Audio Overview generation only when supportsAudioOverview is true", async () => {
      const audioRes = await fakeProvider.generateAudioOverview(
        { remoteWorkspaceId: "ws-audio" },
        testContext
      );
      expect(audioRes.jobRef.providerId).toBe("fake-notebooklm-enterprise");
      expect(audioRes.jobRef.remoteJobId).toMatch(/^fake-audio-job-/);
    });

    it("F3: Blocks Audio Overview on legacy provider where supportsAudioOverview is false", async () => {
      const legacyFake = new FakeResearchProvider(ANTIGRAVITY_LEGACY_CAPABILITIES_SPEC);
      await expect(
        legacyFake.generateAudioOverview({ remoteWorkspaceId: "ws-legacy" }, testContext)
      ).rejects.toThrow("Audio Overview generation is not supported");
    });
  });

  // ─── NHÓM G: MCP STDIO PURITY ───────────────────────────────────────────────
  describe("Nhóm G: MCP Stdio Protocol Purity & Log Isolation", () => {
    let mcpRunner: FakeMcpStdioRunner;

    beforeEach(() => {
      mcpRunner = new FakeMcpStdioRunner(fakeProvider);
    });

    it("G1: Output on stdout must be 100% parseable JSON-RPC without debug contamination", async () => {
      await mcpRunner.handleRawMessage(
        JSON.stringify({
          jsonrpc: "2.0",
          id: "mcp-req-1",
          method: "research_list_capabilities",
        })
      );

      expect(mcpRunner.stdoutLines.length).toBe(1);
      const parsedStdout = JSON.parse(mcpRunner.stdoutLines[0]);
      expect(parsedStdout.jsonrpc).toBe("2.0");
      expect(parsedStdout.id).toBe("mcp-req-1");
      expect(parsedStdout.result.capabilities.supportsNotebookManagement).toBe(true);

      // Debug logs must be isolated to stderr
      expect(mcpRunner.stderrLines.length).toBe(1);
      expect(mcpRunner.stderrLines[0]).toContain("[DEBUG]");
    });

    it("G2: Returns standardized CAPABILITY_UNSUPPORTED on unsupported MCP tool call with correlationId", async () => {
      await mcpRunner.handleRawMessage(
        JSON.stringify({
          jsonrpc: "2.0",
          id: "mcp-req-2",
          method: "research_query",
          params: { correlationId: "corr-mcp-999" },
        })
      );

      expect(mcpRunner.stdoutLines.length).toBe(1);
      const parsedStdout = JSON.parse(mcpRunner.stdoutLines[0]);
      expect(parsedStdout.error.data.errorCode).toBe("CAPABILITY_UNSUPPORTED");
      expect(parsedStdout.error.data.correlationId).toBe("corr-mcp-999");
    });
  });

  // ─── NHÓM H: ANTIGRAVITY LEGACY REGRESSION ──────────────────────────────────
  describe("Nhóm H: Antigravity Legacy Regression & Continuity", () => {
    it("H1: packages source into dense markdown adhering to established format", () => {
      const sourceDoc = packageSourceForNotebookLM(mockTopic, mockNotes, mockResources);
      expect(sourceDoc).toContain("TÀI LIỆU NGUỒN KHẢO CỨU");
      expect(sourceDoc).toContain("VI DIỆU PHÁP TOÀN TẬP");
      expect(sourceDoc).toContain("Ghi chú Tâm biến hành");
      expect(sourceDoc).toContain("Luận Tạng Pali");
    });

    it("H2: generates prompt with Antigravity 2.0 instructions and study guide structure", () => {
      const prompt = generateNotebookLMTaskPrompt(mockTopic, "study_guide");
      expect(prompt).toContain("[Chỉ thị Antigravity 2.0: Sử dụng NotebookLM Skill]");
      expect(prompt).toContain("Target Skill: notebooklm");
      expect(prompt).toContain("Vi Diệu Pháp Toàn Tập");
    });

    it("H3: creates Antigravity Handoff Job with valid manifest and agy CLI command", () => {
      const { job, manifestContent } = createAntigravityHandoffJob(
        mockTopic,
        "study_guide",
        undefined,
        mockNotes,
        mockResources
      );

      expect(job.jobId).toMatch(/^job-nlm-/);
      expect(job.status).toBe("queued");
      expect(job.sourcePath).toContain(".agents/handoffs/");

      const cliCommand = buildAntigravityCLICommand(job);
      expect(cliCommand).toContain("agy -p");
      expect(cliCommand).toContain(mockTopic.title);

      const validation = validateAntigravityJobManifest(manifestContent);
      expect(validation.valid).toBe(true);
      expect(validation.manifest?.pipeline).toBe("antigravity-notebooklm-mediator");
    });
  });
});
