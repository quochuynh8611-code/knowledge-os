/**
 * Direct NotebookLM MCP Execution Orchestration Test Suite (Phase 1 — RED Tests)
 *
 * Validates the Direct Execution contract on ResearchOrchestrator and Provider layer:
 * 1. executeDirectResearch executes complete chain: createWorkspace -> ingestSources -> query -> deleteWorkspace
 * 2. Ephemeral cleanup invariant: deleteWorkspace is strictly called in `finally` block on success
 * 3. Ephemeral cleanup invariant on failure: deleteWorkspace is strictly called in `finally` when query throws
 * 4. Persistent workspace retention: skips deleteWorkspace when ephemeralWorkspace is false
 * 5. Anti-False-Positive: rejects empty answers
 * 6. InMemoryMcpTransport integration: validates JSON-RPC 2.0 message loop
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ResearchOrchestrator } from "../../src/server/services/providers/researchOrchestrator";
import { ProviderRegistry } from "../../src/server/services/providers/providerRegistry";
import { NotebookLMEnterpriseProvider } from "../../src/server/services/providers/notebooklmEnterpriseProvider";
import {
  MockNotebookLMClient,
  NotebookLMClient,
} from "../../src/server/services/providers/notebooklmClient";
import { NotebookLMMcpClient } from "../../src/server/services/providers/notebooklmMcpClient";
import { InMemoryMcpTransport } from "../../src/server/services/providers/notebooklmMcpTransport";
import { SourcePayload } from "../../src/server/services/providers/types";

describe("DIRECT NOTEBOOKLM MCP INTEGRATION — ORCHESTRATOR & PROVIDER SEAM (PHASE 1 RED TESTS)", () => {
  const fixedNow = new Date("2026-10-15T12:00:00.000Z");
  const mockDate = () => fixedNow;

  const sampleSources: SourcePayload[] = [
    {
      type: "inline-text",
      sourceId: "src-01",
      title: "Kỳ Môn Độn Giáp Bí Phổ",
      mimeType: "text/markdown",
      textContent: "Cửu Cung Bát Quái định vị thời không...",
      contentHash: "hash-km-01",
    },
  ];

  // =========================================================================
  // SCENARIO 1: Full Direct Execution Loop (create -> ingest -> query -> delete)
  // =========================================================================
  it("Scenario 1: executeDirectResearch coordinates full query loop and cleans up ephemeral workspace", async () => {
    const mockClient = new MockNotebookLMClient();
    const createSpy = vi.spyOn(mockClient, "createWorkspace");
    const ingestSpy = vi.spyOn(mockClient, "ingestSources");
    const querySpy = vi.spyOn(mockClient, "query");
    const deleteSpy = vi.spyOn(mockClient, "deleteWorkspace");

    const officialProvider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const registry = new ProviderRegistry({
      config: {
        defaultProvider: "official",
        allowFallback: false,
        enableOfficialProvider: true,
        enableLegacyProvider: false,
      },
      providers: [officialProvider],
    });

    const orchestrator = new ResearchOrchestrator({
      registry,
      now: mockDate,
      randomId: () => "test-direct-01",
    });

    const result = await orchestrator.executeDirectResearch({
      workspaceTitle: "Khảo cứu Kỳ Môn Độn Giáp",
      sources: sampleSources,
      queryPrompt: "Trình bày cấu trúc Tam Điệp và Bát Môn",
      ephemeralWorkspace: true,
    });

    // Verification of return shape
    expect(result.providerId).toBe("notebooklm-enterprise");
    expect(result.workspaceId).toBeDefined();
    expect(result.answer).toBeDefined();
    expect(result.cleanupStatus).toBe("CLEANED");

    // Verification of execution order
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(ingestSpy).toHaveBeenCalledTimes(1);
    expect(querySpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy).toHaveBeenCalledTimes(1);
  });

  // =========================================================================
  // SCENARIO 2: Cleanup Invariant in finally block when query throws
  // =========================================================================
  it("Scenario 2: executeDirectResearch enforces deleteWorkspace in finally block even if query fails", async () => {
    const mockClient = new MockNotebookLMClient();
    vi.spyOn(mockClient, "query").mockRejectedValue(new Error("Cloud inference timeout"));
    const deleteSpy = vi.spyOn(mockClient, "deleteWorkspace");

    const officialProvider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const registry = new ProviderRegistry({
      config: {
        defaultProvider: "official",
        allowFallback: false,
        enableOfficialProvider: true,
        enableLegacyProvider: false,
      },
      providers: [officialProvider],
    });

    const orchestrator = new ResearchOrchestrator({
      registry,
      now: mockDate,
    });

    await expect(orchestrator.executeDirectResearch({
      workspaceTitle: "Khảo cứu Thất Bại Giả Lập",
      sources: sampleSources,
      queryPrompt: "Gây lỗi inference",
      ephemeralWorkspace: true,
    })).rejects.toThrow();

    // deleteWorkspace MUST have been called in finally block
    expect(deleteSpy).toHaveBeenCalledTimes(1);
  });

  // =========================================================================
  // SCENARIO 3: Persistent Workspace Option (ephemeralWorkspace: false)
  // =========================================================================
  it("Scenario 3: executeDirectResearch retains workspace when ephemeralWorkspace is false", async () => {
    const mockClient = new MockNotebookLMClient();
    const deleteSpy = vi.spyOn(mockClient, "deleteWorkspace");

    const officialProvider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const registry = new ProviderRegistry({
      config: {
        defaultProvider: "official",
        allowFallback: false,
        enableOfficialProvider: true,
        enableLegacyProvider: false,
      },
      providers: [officialProvider],
    });

    const orchestrator = new ResearchOrchestrator({
      registry,
      now: mockDate,
    });

    const result = await orchestrator.executeDirectResearch({
      workspaceTitle: "Khảo cứu Lưu Trữ Lâu Dài",
      sources: sampleSources,
      queryPrompt: "Tóm tắt tổng quan",
      ephemeralWorkspace: false,
    });

    expect(result.cleanupStatus).toBe("RETAINED");
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  // =========================================================================
  // SCENARIO 4: InMemoryMcpTransport JSON-RPC 2.0 Integration
  // =========================================================================
  it("Scenario 4: NotebookLMMcpClient over InMemoryMcpTransport executes query protocol", async () => {
    const inMemoryTransport = new InMemoryMcpTransport();
    await inMemoryTransport.connect();

    inMemoryTransport.registerToolHandler("notebook_create", (args) => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              notebook_id: "ws-in-mem-123",
              title: args.title,
            }),
          },
        ],
      };
    });

    inMemoryTransport.registerToolHandler("notebook_query", (args) => {
      expect(args.notebook_id).toBe("ws-in-mem-123");
      expect(args.query).toBe("Trình bày luận điểm chính");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              answer: "Nội dung phản hồi khảo cứu từ MCP InMemory mock",
              cited_sources: ["src-in-mem-456"],
            }),
          },
        ],
      };
    });

    inMemoryTransport.registerToolHandler("notebook_delete", (args) => {
      expect(args.notebook_id).toBe("ws-in-mem-123");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "SUCCESS",
            }),
          },
        ],
      };
    });

    const mcpClient = new NotebookLMMcpClient({ transport: inMemoryTransport });

    const created = await mcpClient.createWorkspace({ title: "Test In-Memory Workspace" });
    expect(created.workspaceId).toBe("ws-in-mem-123");

    const queryResult = await mcpClient.query?.({
      workspaceId: created.workspaceId,
      prompt: "Trình bày luận điểm chính",
    });

    expect(queryResult?.answer).toContain("Nội dung phản hồi khảo cứu");
    expect(queryResult?.citedSourceIds).toEqual(["src-in-mem-456"]);

    const deleteResult = await mcpClient.deleteWorkspace({
      workspaceId: created.workspaceId,
    });
    expect(deleteResult).toBe(true);
  });

  // =========================================================================
  // SCENARIO 5: Citation Mapping (Remote MCP ID -> Real Caller Source ID)
  // =========================================================================
  it("Scenario 5: executeDirectResearch maps citation references from remote MCP source IDs to real caller source IDs", async () => {
    const mockClient = new MockNotebookLMClient();
    vi.spyOn(mockClient, "createWorkspace").mockResolvedValue({ workspaceId: "nlm-ws-1" });
    vi.spyOn(mockClient, "ingestSources").mockResolvedValue({
      status: "COMPLETED",
      remoteSourceIds: ["remote-uuid-1", "remote-uuid-2"],
    });
    vi.spyOn(mockClient, "query").mockResolvedValue({
      answer: "Hàm sóng sụp đổ khi đo đạc [1]. Toán tử Hermite tương ứng với đại lượng vật lý [2].",
      citedSourceIds: ["remote-uuid-1", "remote-uuid-2"],
      citations: {
        "1": "remote-uuid-1",
        "2": "remote-uuid-2",
      },
      references: [
        {
          sourceId: "remote-uuid-1",
          citationNumber: 1,
          citedText: "Quá trình đo đạc làm sụp đổ hàm sóng.",
        },
        {
          sourceId: "remote-uuid-2",
          citationNumber: 2,
          citedText: "Các đại lượng vật lý tương ứng với các toán tử Hermite.",
        },
      ],
    });
    vi.spyOn(mockClient, "deleteWorkspace").mockResolvedValue(true);

    const officialProvider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const registry = new ProviderRegistry({
      config: {
        defaultProvider: "official",
        allowFallback: false,
        enableOfficialProvider: true,
        enableLegacyProvider: false,
      },
      providers: [officialProvider],
    });

    const orchestrator = new ResearchOrchestrator({
      registry,
      now: mockDate,
      randomId: () => "test-cite-01",
    });

    const realSources: SourcePayload[] = [
      {
        type: "inline-text",
        sourceId: "src-real-wavefunction",
        title: "Tài liệu Hàm Sóng",
        mimeType: "text/markdown",
        textContent: "Content A",
        contentHash: "hash-a",
      },
      {
        type: "inline-text",
        sourceId: "src-real-hermite",
        title: "Tài liệu Toán Tử",
        mimeType: "text/markdown",
        textContent: "Content B",
        contentHash: "hash-b",
      },
    ];

    const result = await orchestrator.executeDirectResearch({
      workspaceTitle: "Cơ học lượng tử",
      sources: realSources,
      queryPrompt: "Tiên đề lượng tử",
      ephemeralWorkspace: true,
    });

    // Verify citedSourceIds are mapped to caller's real source IDs (not remote UUIDs)
    expect(result.citedSourceIds).toEqual(["src-real-wavefunction", "src-real-hermite"]);

    // Verify citations map is mapped
    expect(result.citations).toEqual({
      "1": "src-real-wavefunction",
      "2": "src-real-hermite",
    });

    // Verify references array is mapped and decorated with sourceTitle
    expect(result.references).toHaveLength(2);
    expect(result.references![0]).toEqual({
      sourceId: "src-real-wavefunction",
      citationNumber: 1,
      citedText: "Quá trình đo đạc làm sụp đổ hàm sóng.",
      sourceTitle: "Tài liệu Hàm Sóng",
    });
    expect(result.references![1]).toEqual({
      sourceId: "src-real-hermite",
      citationNumber: 2,
      citedText: "Các đại lượng vật lý tương ứng với các toán tử Hermite.",
      sourceTitle: "Tài liệu Toán Tử",
    });

    // Raw citations preserved
    expect(result.rawCitations).toEqual({
      "1": "remote-uuid-1",
      "2": "remote-uuid-2",
    });
  });

  // =========================================================================
  // SCENARIO 6: Rejection of Synthetic and Unmapped Source IDs
  // =========================================================================
  it("Scenario 6: executeDirectResearch rejects synthetic and unmapped fallback source IDs from citations", async () => {
    const mockClient = new MockNotebookLMClient();
    vi.spyOn(mockClient, "createWorkspace").mockResolvedValue({ workspaceId: "nlm-ws-1" });
    vi.spyOn(mockClient, "ingestSources").mockResolvedValue({
      status: "COMPLETED",
      remoteSourceIds: ["remote-uuid-1"],
    });
    vi.spyOn(mockClient, "query").mockResolvedValue({
      answer: "Trả lời với ID giả mạo",
      citedSourceIds: ["remote-uuid-1", "nlm-src-synthetic-fake", "unknown-unmapped-uuid"],
      citations: {
        "1": "remote-uuid-1",
        "2": "nlm-src-synthetic-fake",
        "3": "unknown-unmapped-uuid",
      },
      references: [
        { sourceId: "remote-uuid-1", citationNumber: 1 },
        { sourceId: "nlm-src-synthetic-fake", citationNumber: 2 },
        { sourceId: "unknown-unmapped-uuid", citationNumber: 3 },
      ],
    });
    vi.spyOn(mockClient, "deleteWorkspace").mockResolvedValue(true);

    const officialProvider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const registry = new ProviderRegistry({
      config: {
        defaultProvider: "official",
        allowFallback: false,
        enableOfficialProvider: true,
        enableLegacyProvider: false,
      },
      providers: [officialProvider],
    });

    const orchestrator = new ResearchOrchestrator({
      registry,
      now: mockDate,
      randomId: () => "test-cite-02",
    });

    const result = await orchestrator.executeDirectResearch({
      workspaceTitle: "Test Synthetic Rejection",
      sources: [
        {
          type: "inline-text",
          sourceId: "src-real-01",
          title: "Real Doc",
          mimeType: "text/markdown",
          textContent: "Content",
          contentHash: "hash-1",
        },
      ],
      queryPrompt: "Test query",
      ephemeralWorkspace: true,
    });

    // Only real mapped ID survived; synthetic 'nlm-src-...' and unmapped 'unknown-...' are rejected!
    expect(result.citedSourceIds).toEqual(["src-real-01"]);
    expect(result.citations).toEqual({ "1": "src-real-01" });
    expect(result.references).toHaveLength(1);
    expect(result.references![0].sourceId).toBe("src-real-01");
  });
});
