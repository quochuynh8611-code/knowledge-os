import { describe, it, expect } from "vitest";
import { calculateScholarRelevance } from "../../src/lib/scholarSearch";

describe("Phase P7.3a: Lightweight Additive Retrieval Ranking", () => {
  it("1. awards exact title highest score (100)", () => {
    const score = calculateScholarRelevance({
      query: "Tâm Vương",
      title: "Tâm Vương",
    });
    expect(score).toBe(100);
  });

  it("2. awards multi-token title coverage bonus (+15) when all query tokens appear in title", () => {
    // Single substring match without full token coverage
    const baseScore = calculateScholarRelevance({
      query: "tam vuong khao sat",
      title: "Khảo sát Tổng quan Luận Tạng",
    });

    // Multi-token match where "tam", "vuong", "khao", "sat" are all in title
    const multiTokenScore = calculateScholarRelevance({
      query: "tam vuong khao sat",
      title: "Khảo sát Tâm Vương và Tâm Sở trong Vi Diệu Pháp",
    });

    // Title contains all 4 tokens ("khao", "sat", "tam", "vuong") -> 50 (substring/include) + 15 (multi-token bonus) = 65
    expect(multiTokenScore).toBeGreaterThanOrEqual(65);
    expect(multiTokenScore).toBeGreaterThan(baseScore);
  });

  it("3. awards whole-word boundary bonus (+10) in description over fragmented interior characters", () => {
    const wholeWordScore = calculateScholarRelevance({
      query: "bat nha",
      title: "Chủ đề Nghiên Cứu",
      description: "Tài liệu giảng giải Bát Nhã Ba La Mật tâm kinh",
    });

    const interiorScore = calculateScholarRelevance({
      query: "bat nha",
      title: "Chủ đề Nghiên Cứu",
      description: "tieu bangbatnhanhatban", // interior without boundary
    });

    // Whole-word description should receive +10 bonus over raw interior substring
    expect(wholeWordScore).toBeGreaterThan(interiorScore);
  });

  it("4. preserves precedence: exact title > prefix title > substring title > multi-token description", () => {
    const exact = calculateScholarRelevance({ query: "Tứ Diệu Đế", title: "Tứ Diệu Đế" });
    const prefix = calculateScholarRelevance({ query: "Tứ Diệu Đế", title: "Tứ Diệu Đế Giảng Giải" });
    const substring = calculateScholarRelevance({ query: "Tứ Diệu Đế", title: "Khảo sát Tứ Diệu Đế" });
    const descOnly = calculateScholarRelevance({ query: "Tứ Diệu Đế", title: "Khác", description: "Tứ Diệu Đế" });

    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(substring);
    expect(substring).toBeGreaterThan(descOnly);
  });
});
