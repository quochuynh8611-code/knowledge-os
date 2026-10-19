import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import express from "express";
import request from "supertest";
import { UnifiedResearchReader } from "../../src/components/reader/UnifiedResearchReader";
import { createArchiveRouter } from "../../src/server/routes/archiveRoutes";
import { globalReadingPositionStore } from "../../src/lib/readingPositionUnified";

// Mock react-reader
vi.mock("react-reader", () => ({
  ReactReader: vi.fn((props: any) => (
    <div data-testid="react-reader-mock" data-location={props.location}>
      ReactReader Mock
    </div>
  )),
}));

// Mock epubXhtmlSanitizer
vi.mock("../../src/lib/epubXhtmlSanitizer", () => ({
  sanitizeEpubArchive: vi.fn(async (buf: ArrayBuffer) => buf),
}));

describe("Slice 2: Ghi nhận tài liệu ngay khi mở (TDD Red Stage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const all = globalReadingPositionStore.getAllPositions();
    for (const key of Object.keys(all)) {
      const parts = key.split(":");
      if (parts.length >= 3) {
        globalReadingPositionStore.clearPosition(parts[1], parts[2]);
      }
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Scenario 1: UnifiedResearchReader records open event immediately on mount ──
  it("Scenario 1: open document creates persisted history immediately on mount without scrolling", async () => {
    const fetchCalls: { url: string; method?: string; body?: any }[] = [];

    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const urlStr = String(url);
      fetchCalls.push({
        url: urlStr,
        method: init?.method || "GET",
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });

      if (urlStr.includes("/api/archive/document/doc-mount-test")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            document: {
              id: "doc-mount-test",
              fileName: "triet_hoc.epub",
              fileFormat: "epub",
              lastPosition: null,
              lastReadAt: null,
            },
          }),
          headers: { get: () => "application/json" },
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
        headers: { get: () => "application/json" },
      });
    });

    render(
      <UnifiedResearchReader
        documentId="doc-mount-test"
        title="Triết Học Nhập Môn"
        format="epub"
        fileUrl="/api/docs/raw?path=triet_hoc.epub"
        onClose={vi.fn()}
      />
    );

    // Assert that an open / touch mutation was sent to persist history immediately on mount
    await waitFor(() => {
      const openMutation = fetchCalls.find(
        (c) =>
          c.url.includes("/api/archive/document/doc-mount-test") &&
          (c.method === "PATCH" || c.method === "POST") &&
          c.body?.lastReadAt
      );
      expect(openMutation).toBeDefined();
    });
  });

  // ── Scenario 2: Close immediately after open still preserves history ──
  it("Scenario 2: close immediately after open still preserves history even when position is empty", async () => {
    const patchCalls: any[] = [];
    const handleClose = vi.fn();

    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const urlStr = String(url);
      if (init?.method === "PATCH") {
        patchCalls.push({
          url: urlStr,
          body: init.body ? JSON.parse(String(init.body)) : undefined,
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({
          document: {
            id: "doc-close-test",
            fileName: "khoa_hoc.pdf",
            fileFormat: "pdf",
            lastPosition: null,
            lastReadAt: null,
          },
        }),
        headers: { get: () => "application/json" },
      });
    });

    render(
      <UnifiedResearchReader
        documentId="doc-close-test"
        title="Khoa Học Vũ Trụ"
        format="pdf"
        fileUrl="/api/docs/raw?path=khoa_hoc.pdf"
        onClose={handleClose}
      />
    );

    // User closes immediately without changing position
    const closeBtn = screen.getByRole("button", { name: /^Đóng$/i });
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalled();

    // Verify that lastReadAt was persisted despite currentPosition being null/empty
    await waitFor(() => {
      const hasPersistedRead = patchCalls.some(
        (c) => c.url.includes("doc-close-test") && c.body?.lastReadAt != null
      );
      expect(hasPersistedRead).toBe(true);
    });
  });

  // ── Scenario 3: POST /api/archive/vault/register sets lastReadAt on initial register and bumps on re-open ──
  it("Scenario 3: vault document registration sets lastReadAt on first register and bumps on re-open", async () => {
    let mockRecord: any = null;

    const mockPrisma = {
      archivedDocument: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          if (mockRecord && where.sourceKey === mockRecord.sourceKey) {
            return mockRecord;
          }
          return null;
        }),
        findFirst: vi.fn().mockImplementation(async ({ where }: any) => {
          if (mockRecord && where.sourceKey === mockRecord.sourceKey) {
            return mockRecord;
          }
          return null;
        }),
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          mockRecord = {
            id: "arch-vault-auto-001",
            createdAt: new Date("2026-10-18T00:00:00.000Z"),
            updatedAt: new Date("2026-10-18T00:00:00.000Z"),
            readCount: data.readCount ?? 0,
            lastPosition: null,
            lastReadAt: data.lastReadAt ?? null,
            ...data,
          };
          return mockRecord;
        }),
        update: vi.fn().mockImplementation(async ({ data }: any) => {
          mockRecord = {
            ...mockRecord,
            ...data,
            readCount:
              data.readCount?.increment != null
                ? (mockRecord.readCount || 0) + data.readCount.increment
                : (data.readCount ?? mockRecord.readCount),
            updatedAt: new Date(),
          };
          return mockRecord;
        }),
      },
    };

    const app = express();
    app.use(express.json());
    app.use("/api", createArchiveRouter({ prisma: mockPrisma as any }));

    // 1. First register: document must have lastReadAt set (not null)
    const res1 = await request(app)
      .post("/api/archive/vault/register")
      .send({
        path: "01_Notes/Bat-Nha.md",
        fileName: "Bat-Nha.md",
        fileFormat: "md",
      });

    expect(res1.status).toBe(200);
    expect(res1.body.document).toBeDefined();
    // In Slice 2, newly registered document must have lastReadAt recorded immediately
    expect(res1.body.document.lastReadAt).not.toBeNull();
    expect(res1.body.document.readCount).toBeGreaterThanOrEqual(1);

    const firstReadAt = res1.body.document.lastReadAt;

    // 2. Second register (user re-opens the document later):
    // Wait a brief delay to ensure timestamp differs
    await new Promise((r) => setTimeout(r, 10));

    const res2 = await request(app)
      .post("/api/archive/vault/register")
      .send({
        path: "01_Notes/Bat-Nha.md",
        fileName: "Bat-Nha.md",
        fileFormat: "md",
      });

    expect(res2.status).toBe(200);
    // On re-open, lastReadAt must be bumped and readCount incremented
    expect(res2.body.document.id).toBe(res1.body.document.id);
    expect(new Date(res2.body.document.lastReadAt).getTime()).toBeGreaterThanOrEqual(
      new Date(firstReadAt).getTime()
    );
    expect(res2.body.document.readCount).toBe(2);
  });

  // ── Scenario 4: No duplicate entries for same sourceKey ──
  it("Scenario 4: multiple registrations do not create duplicate entries for same sourceKey", async () => {
    const documentsStore: Record<string, any> = {};

    const mockPrisma = {
      archivedDocument: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          return documentsStore[where.sourceKey] || null;
        }),
        findFirst: vi.fn().mockImplementation(async ({ where }: any) => {
          return documentsStore[where.sourceKey] || null;
        }),
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const doc = {
            id: `doc-${Object.keys(documentsStore).length + 1}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };
          documentsStore[data.sourceKey] = doc;
          return doc;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          const existing = Object.values(documentsStore).find((d: any) => d.id === where.id);
          if (existing) {
            Object.assign(existing, data);
            return existing;
          }
          return null;
        }),
      },
    };

    const app = express();
    app.use(express.json());
    app.use("/api", createArchiveRouter({ prisma: mockPrisma as any }));

    await request(app).post("/api/archive/vault/register").send({ path: "Books/Zen.epub", fileFormat: "epub" });
    await request(app).post("/api/archive/vault/register").send({ path: "Books/Zen.epub", fileFormat: "epub" });
    await request(app).post("/api/archive/vault/register").send({ path: "Books/Zen.epub", fileFormat: "epub" });

    expect(mockPrisma.archivedDocument.create).toHaveBeenCalledTimes(1);
    const duplicates = Object.values(documentsStore).filter(
      (d: any) => d.sourceKey === "vault:Books/Zen.epub"
    );
    expect(duplicates.length).toBe(1);
  });
});
