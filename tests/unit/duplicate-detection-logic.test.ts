import { describe, it, expect, beforeEach } from "vitest";
import type { Flashcard } from "../../src/types/flashcard";
import {
  normalizeCardContent,
  generateCardDuplicateKey,
  detectDuplicateGroups,
  determinePrimaryCard,
  calculateSimilarityScore,
  saveDuplicateAuditLog,
  getDuplicateAuditLogs,
  clearDuplicateAuditLogs,
  type DuplicateAuditLogEntry,
} from "../../src/lib/duplicateDetectionLogic";

describe("Phase F6.9: Duplicate Detection Pure Logic Engine", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Helper factory for mock cards
  function createMockCard(
    id: string,
    front: string,
    back: string,
    opts: {
      topicId?: string;
      type?: "basic" | "cloze";
      lifecycleStatus?: "active" | "suspended" | "archived";
      repetitions?: number;
      createdAt?: string;
    } = {}
  ): Flashcard {
    return {
      id,
      topicId: opts.topicId || "topic-1",
      type: opts.type || "basic",
      front,
      back,
      lifecycleStatus: opts.lifecycleStatus || "active",
      schedule: {
        id: `sch-${id}`,
        flashcardId: id,
        state: (opts.repetitions ?? 0) > 0 ? "review" : "new",
        dueAt: new Date().toISOString(),
        interval: 1,
        easeFactor: 2.5,
        repetitions: opts.repetitions ?? 0,
        lapses: 0,
        updatedAt: new Date().toISOString(),
      },
      createdAt: opts.createdAt || "2026-01-01T00:00:00.000Z",
      updatedAt: new Date().toISOString(),
    };
  }

  describe("1. normalizeCardContent()", () => {
    it("converts to lowercase and trims extra whitespace", () => {
      expect(normalizeCardContent("   Khổ Đế   ")).toBe("kho de");
      expect(normalizeCardContent("Tập    Đế  ")).toBe("tap de");
    });

    it("removes Vietnamese diacritics and converts đ/Đ to d", () => {
      expect(normalizeCardContent("Tứ Diệu Đế")).toBe("tu dieu de");
      expect(normalizeCardContent("Đông Y & Kinh Lạc")).toBe("dong y & kinh lac");
      expect(normalizeCardContent("ĐẠO ĐẾ")).toBe("dao de");
    });

    it("strips markdown syntax (**bold**, _italic_, `code`, # header)", () => {
      expect(normalizeCardContent("**Khổ Đế** là gì?")).toBe("kho de la gi?");
      expect(normalizeCardContent("`Thái Dương` kinh")).toBe("thai duong kinh");
      expect(normalizeCardContent("# Tiêu Đề Bài Học")).toBe("tieu de bai hoc");
      expect(normalizeCardContent("_chân lý_ thứ nhất")).toBe("chan ly thu nhat");
    });

    it("unwraps cloze syntax {{c1::answer}} and {{c1::answer::hint}}", () => {
      expect(normalizeCardContent("Chân lý thứ nhất là {{c1::Khổ Đế}}.")).toBe(
        "chan ly thu nhat la kho de."
      );
      expect(
        normalizeCardContent("Kinh mạch gồm {{c1::12::số lượng}} chính kinh.")
      ).toBe("kinh mach gom 12 chinh kinh.");
    });
  });

  describe("2. generateCardDuplicateKey()", () => {
    it("generates deterministic key format: topicId::type::normalizedFront::normalizedBack", () => {
      const card = createMockCard("c1", "Tứ Diệu Đế", "Bốn chân lý mầu nhiệm");
      const key = generateCardDuplicateKey(card);
      expect(key).toBe("topic-1::basic::tu dieu de::bon chan ly mau nhiem");
    });

    it("produces identical keys for different case, diacritics, and markdown variants", () => {
      const cardA = createMockCard("c1", "Tứ Diệu Đế", "Bốn chân lý");
      const cardB = createMockCard("c2", "**tu dieu de**", "  bon chan ly  ");
      expect(generateCardDuplicateKey(cardA)).toBe(generateCardDuplicateKey(cardB));
    });
  });

  describe("3. detectDuplicateGroups()", () => {
    it("groups duplicate cards sharing the same duplicate key", () => {
      const cardA = createMockCard("c1", "Khổ Đế", "Chân lý về sự khổ", {
        createdAt: "2026-01-01T00:00:00Z",
        repetitions: 3,
      });
      const cardB = createMockCard("c2", "**Kho De**", "Chan ly ve su kho", {
        createdAt: "2026-02-01T00:00:00Z",
        repetitions: 0,
      });
      const cardC = createMockCard("c3", "Tập Đế", "Nguyên nhân đau khổ");

      const groups = detectDuplicateGroups([cardA, cardB, cardC]);
      expect(groups).toHaveLength(1);
      expect(groups[0].primaryCard.id).toBe("c1");
      expect(groups[0].duplicateCards).toHaveLength(1);
      expect(groups[0].duplicateCards[0].id).toBe("c2");
      expect(groups[0].similarityScore).toBe(100);
    });

    it("returns empty array when there are no duplicates", () => {
      const cardA = createMockCard("c1", "Khổ Đế", "Nội dung 1");
      const cardB = createMockCard("c2", "Tập Đế", "Nội dung 2");
      expect(detectDuplicateGroups([cardA, cardB])).toEqual([]);
    });

    it("ignores suspended and archived cards by default", () => {
      const cardA = createMockCard("c1", "Khổ Đế", "Nội dung", {
        lifecycleStatus: "active",
      });
      const cardB = createMockCard("c2", "Khổ Đế", "Nội dung", {
        lifecycleStatus: "suspended",
      });

      const groups = detectDuplicateGroups([cardA, cardB]);
      expect(groups).toHaveLength(0);
    });

    it("scopes duplicate detection by topicId when provided", () => {
      const cardA = createMockCard("c1", "Khổ Đế", "Nội dung", {
        topicId: "topic-a",
      });
      const cardB = createMockCard("c2", "Khổ Đế", "Nội dung", {
        topicId: "topic-b",
      });

      // Different topics are not considered duplicates
      expect(detectDuplicateGroups([cardA, cardB])).toEqual([]);

      // Scoped by topic-a returns 0 duplicates because only 1 card exists in topic-a
      expect(detectDuplicateGroups([cardA, cardB], "topic-a")).toEqual([]);
    });
  });

  describe("4. determinePrimaryCard()", () => {
    it("selects card with repetitions > 0 as primary card over fresh cards", () => {
      const freshCard = createMockCard("c1", "Thẻ 1", "Back 1", {
        repetitions: 0,
        createdAt: "2026-01-01T00:00:00Z",
      });
      const studiedCard = createMockCard("c2", "Thẻ 1", "Back 1", {
        repetitions: 5,
        createdAt: "2026-02-01T00:00:00Z", // Even if created later!
      });

      const result = determinePrimaryCard([freshCard, studiedCard]);
      expect(result.primary.id).toBe("c2");
      expect(result.duplicates.map((c) => c.id)).toEqual(["c1"]);
    });

    it("tie-breaks by earlier createdAt when both have equal repetitions", () => {
      const olderCard = createMockCard("c1", "Thẻ 1", "Back 1", {
        repetitions: 2,
        createdAt: "2026-01-01T00:00:00Z",
      });
      const newerCard = createMockCard("c2", "Thẻ 1", "Back 1", {
        repetitions: 2,
        createdAt: "2026-02-01T00:00:00Z",
      });

      const result = determinePrimaryCard([newerCard, olderCard]);
      expect(result.primary.id).toBe("c1");
      expect(result.duplicates.map((c) => c.id)).toEqual(["c2"]);
    });
  });

  describe("5. calculateSimilarityScore()", () => {
    it("returns 100 for exact match of normalized content", () => {
      const cardA = createMockCard("c1", "Tứ Diệu Đế", "Bốn sự thật");
      const cardB = createMockCard("c2", "tu dieu de", "bon su that");
      expect(calculateSimilarityScore(cardA, cardB)).toBe(100);
    });

    it("returns high similarity score (> 80) for minor typos/variations", () => {
      const cardA = createMockCard("c1", "Tứ Diệu Đế", "Bốn sự thật mầu nhiệm");
      const cardB = createMockCard("c2", "Tứ Diệu Đế", "Bốn sự thật mau nhiem");
      const score = calculateSimilarityScore(cardA, cardB);
      expect(score).toBeGreaterThanOrEqual(80);
    });
  });

  describe("6. Audit Trail Logging (saveDuplicateAuditLog / getDuplicateAuditLogs)", () => {
    it("persists and retrieves duplicate resolution audit logs", () => {
      const logEntry: DuplicateAuditLogEntry = {
        id: "audit-1",
        topicId: "topic-1",
        action: "suspend_duplicate",
        primaryCardId: "c1",
        duplicateCardId: "c2",
        reason: "Exact normalized match",
        resolvedAt: "2026-09-06T12:00:00.000Z",
      };

      saveDuplicateAuditLog(logEntry);
      const logs = getDuplicateAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toEqual(logEntry);
    });

    it("clears audit logs cleanly", () => {
      saveDuplicateAuditLog({
        id: "audit-1",
        topicId: "topic-1",
        action: "skip",
        primaryCardId: "c1",
        duplicateCardId: "c2",
        resolvedAt: "2026-09-06T12:00:00.000Z",
      });
      clearDuplicateAuditLogs();
      expect(getDuplicateAuditLogs()).toHaveLength(0);
    });
  });
});
