import { describe, it, expect } from "vitest";
import {
  filterCards,
  sortCards,
  paginateCards,
  normalizeSearchText,
  type CardBrowserFilterOptions,
  type CardBrowserSortOption,
} from "../../src/lib/cardBrowserLogic";
import type { Flashcard } from "../../src/types/flashcard";

const now = new Date("2026-09-06T12:00:00.000Z");

const mockCards: Flashcard[] = [
  {
    id: "card-1",
    topicId: "topic-dong-y",
    type: "basic",
    front: "Tạng Thận chủ về cái gì?",
    back: "Thận chủ tàng tinh, chủ cốt tủy, chủ nạp khí.",
    lifecycleStatus: "active",
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-01T08:00:00.000Z",
    schedule: {
      id: "sch-1",
      flashcardId: "card-1",
      state: "review",
      dueAt: "2026-09-05T08:00:00.000Z", // overdue
      interval: 4,
      easeFactor: 2.3,
      repetitions: 3,
      lapses: 1,
      updatedAt: "2026-09-01T08:00:00.000Z",
    },
  },
  {
    id: "card-2",
    topicId: "topic-dong-y",
    type: "cloze",
    front: "Tâm chủ về {{c1::huyết mạch}}, phế chủ về {{c2::khí}}.",
    back: "huyết mạch / khí",
    lifecycleStatus: "active",
    createdAt: "2026-09-02T08:00:00.000Z",
    updatedAt: "2026-09-02T08:00:00.000Z",
    schedule: {
      id: "sch-2",
      flashcardId: "card-2",
      state: "learning",
      dueAt: "2026-09-06T10:00:00.000Z", // due today (<= now)
      interval: 1,
      easeFactor: 1.8, // weak ease
      repetitions: 1,
      lapses: 3, // weak lapses
      updatedAt: "2026-09-02T08:00:00.000Z",
    },
  },
  {
    id: "card-3",
    topicId: "topic-phat-hoc",
    type: "basic",
    front: "Bát Chánh Đạo gồm những chi phần nào?",
    back: "Chánh kiến, Chánh tư duy, Chánh ngữ, Chánh nghiệp, Chánh mạng, Chánh tinh tấn, Chánh niệm, Chánh định.",
    lifecycleStatus: "active",
    createdAt: "2026-09-03T08:00:00.000Z",
    updatedAt: "2026-09-03T08:00:00.000Z",
    schedule: {
      id: "sch-3",
      flashcardId: "card-3",
      state: "new",
      dueAt: "2026-09-07T08:00:00.000Z", // not due
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      lapses: 0,
      updatedAt: "2026-09-03T08:00:00.000Z",
    },
  },
  {
    id: "card-4",
    topicId: "topic-phat-hoc",
    type: "basic",
    front: "Định nghĩa Tánh Biết trong đạo Phật là gì?",
    back: "Là tính giác nguyên sơ, không sinh không diệt, soi tỏ vạn pháp mà không dính mắc.",
    lifecycleStatus: "suspended",
    createdAt: "2026-09-04T08:00:00.000Z",
    updatedAt: "2026-09-04T08:00:00.000Z",
    schedule: {
      id: "sch-4",
      flashcardId: "card-4",
      state: "review",
      dueAt: "2026-09-06T09:00:00.000Z",
      interval: 10,
      easeFactor: 2.6,
      repetitions: 5,
      lapses: 0,
      updatedAt: "2026-09-04T08:00:00.000Z",
    },
  },
  {
    id: "card-5",
    topicId: "topic-dong-y",
    type: "basic",
    front: "Khái niệm Can mộc khắc Tỳ thổ",
    back: "Can khí uất kết làm tổn thương vận hóa của Tỳ vị.",
    lifecycleStatus: "archived",
    createdAt: "2026-08-20T08:00:00.000Z",
    updatedAt: "2026-08-20T08:00:00.000Z",
    schedule: {
      id: "sch-5",
      flashcardId: "card-5",
      state: "relearning",
      dueAt: "2026-08-21T08:00:00.000Z",
      interval: 0,
      easeFactor: 1.5,
      repetitions: 0,
      lapses: 4,
      updatedAt: "2026-08-20T08:00:00.000Z",
    },
  },
];

describe("Phase F6.5 — Card Browser Pure Logic (cardBrowserLogic.ts)", () => {
  describe("normalizeSearchText", () => {
    it("1. removes diacritics and converts to lowercase", () => {
      expect(normalizeSearchText("Bát Chánh Đạo")).toBe("bat chanh dao");
      expect(normalizeSearchText("Tạng Thận chủ cốt tủy")).toBe("tang than chu cot tuy");
    });

    it("2. strips markdown and cloze syntax for clean indexing", () => {
      expect(normalizeSearchText("Tâm chủ {{c1::huyết mạch}}")).toBe("tam chu huyet mach");
      expect(normalizeSearchText("**Chánh kiến** & _Chánh tư duy_")).toBe("chanh kien & chanh tu duy");
    });
  });

  describe("filterCards", () => {
    it("3. searches full-text across both front and back fields", () => {
      // Matches front
      const resFront = filterCards(mockCards, { query: "Tạng Thận" }, now);
      expect(resFront.map((c) => c.id)).toEqual(["card-1"]);

      // Matches back
      const resBack = filterCards(mockCards, { query: "soi tỏ vạn pháp" }, now);
      expect(resBack.map((c) => c.id)).toEqual(["card-4"]);

      // Accent-insensitive search
      const resAccent = filterCards(mockCards, { query: "huyet mach" }, now);
      expect(resAccent.map((c) => c.id)).toEqual(["card-2"]);
    });

    it("4. filters by topicId (scoped vs global)", () => {
      const dongYCards = filterCards(mockCards, { topicId: "topic-dong-y" }, now);
      expect(dongYCards.map((c) => c.id)).toEqual(["card-1", "card-2", "card-5"]);

      const allCards = filterCards(mockCards, {}, now);
      expect(allCards.length).toBe(5);
    });

    it("5. filters by SRS state (new, learning, review, relearning)", () => {
      const reviewCards = filterCards(mockCards, { state: "review" }, now);
      expect(reviewCards.map((c) => c.id)).toEqual(["card-1", "card-4"]);

      const newCards = filterCards(mockCards, { state: "new" }, now);
      expect(newCards.map((c) => c.id)).toEqual(["card-3"]);

      const learningCards = filterCards(mockCards, { state: "learning" }, now);
      expect(learningCards.map((c) => c.id)).toEqual(["card-2"]);
    });

    it("6. filters by lifecycleStatus (active, suspended, archived)", () => {
      const activeCards = filterCards(mockCards, { lifecycleStatus: "active" }, now);
      expect(activeCards.map((c) => c.id)).toEqual(["card-1", "card-2", "card-3"]);

      const suspendedCards = filterCards(mockCards, { lifecycleStatus: "suspended" }, now);
      expect(suspendedCards.map((c) => c.id)).toEqual(["card-4"]);

      const archivedCards = filterCards(mockCards, { lifecycleStatus: "archived" }, now);
      expect(archivedCards.map((c) => c.id)).toEqual(["card-5"]);
    });

    it("7. filters by dueStatus (due, overdue, notDue)", () => {
      // Overdue: dueAt < beginning of today
      const overdueCards = filterCards(mockCards, { dueStatus: "overdue" }, now);
      expect(overdueCards.map((c) => c.id)).toEqual(["card-1", "card-5"]);

      // Due: dueAt <= now
      const dueCards = filterCards(mockCards, { dueStatus: "due" }, now);
      expect(dueCards.map((c) => c.id)).toEqual(["card-1", "card-2", "card-4", "card-5"]);

      // Not due: dueAt > now
      const notDueCards = filterCards(mockCards, { dueStatus: "notDue" }, now);
      expect(notDueCards.map((c) => c.id)).toEqual(["card-3"]);
    });

    it("8. filters weak cards (lapses >= 3 or easeFactor <= 2.0)", () => {
      const weakCards = filterCards(mockCards, { weakOnly: true }, now);
      // card-2: ease 1.8, lapses 3
      // card-5: ease 1.5, lapses 4
      expect(weakCards.map((c) => c.id)).toEqual(["card-2", "card-5"]);
    });

    it("9. combines multiple filters simultaneously", () => {
      const options: CardBrowserFilterOptions = {
        topicId: "topic-dong-y",
        lifecycleStatus: "active",
        dueStatus: "due",
      };
      const result = filterCards(mockCards, options, now);
      expect(result.map((c) => c.id)).toEqual(["card-1", "card-2"]);
    });
  });

  describe("sortCards", () => {
    it("10. sorts by dueAt ascending and descending", () => {
      const sortedAsc = sortCards(mockCards, "dueAt_asc");
      expect(sortedAsc[0].id).toBe("card-5"); // 2026-08-21
      expect(sortedAsc[sortedAsc.length - 1].id).toBe("card-3"); // 2026-09-07

      const sortedDesc = sortCards(mockCards, "dueAt_desc");
      expect(sortedDesc[0].id).toBe("card-3");
      expect(sortedDesc[sortedDesc.length - 1].id).toBe("card-5");
    });

    it("11. sorts by lapses descending (hardest cards first)", () => {
      const sortedLapses = sortCards(mockCards, "lapses_desc");
      expect(sortedLapses[0].id).toBe("card-5"); // lapses 4
      expect(sortedLapses[1].id).toBe("card-2"); // lapses 3
    });

    it("12. sorts by easeFactor ascending (lowest ease first)", () => {
      const sortedEase = sortCards(mockCards, "easeFactor_asc");
      expect(sortedEase[0].id).toBe("card-5"); // 1.5
      expect(sortedEase[1].id).toBe("card-2"); // 1.8
    });

    it("13. sorts alphabetically by front text", () => {
      const sortedAlpha = sortCards(mockCards, "front_asc");
      expect(sortedAlpha[0].id).toBe("card-3"); // Bát Chánh Đạo
      expect(sortedAlpha[sortedAlpha.length - 1].id).toBe("card-2"); // Tâm chủ...
    });
  });

  describe("paginateCards", () => {
    it("14. paginates list with total, totalPages, and slice items", () => {
      const page1 = paginateCards(mockCards, 1, 2);
      expect(page1.currentPage).toBe(1);
      expect(page1.pageSize).toBe(2);
      expect(page1.total).toBe(5);
      expect(page1.totalPages).toBe(3);
      expect(page1.items.map((c) => c.id)).toEqual(["card-1", "card-2"]);

      const page3 = paginateCards(mockCards, 3, 2);
      expect(page3.items.map((c) => c.id)).toEqual(["card-5"]);
    });

    it("15. clamps invalid or out-of-bounds page numbers", () => {
      const outOfBounds = paginateCards(mockCards, 99, 2);
      expect(outOfBounds.currentPage).toBe(3);
      expect(outOfBounds.items.map((c) => c.id)).toEqual(["card-5"]);

      const negativePage = paginateCards(mockCards, -1, 2);
      expect(negativePage.currentPage).toBe(1);
    });
  });
});
