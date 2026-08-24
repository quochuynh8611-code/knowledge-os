import { describe, it, expect } from "vitest";
import {
  normalizeScholarText,
  calculateScholarRelevance,
  searchScholarCollections,
  ScholarSearchResult,
} from "../../src/lib/scholarSearch";
import { Topic, Note, Resource } from "../../src/types";

describe("Workstream 5D: Scholar Search & Fast Fuzzy Metadata Filter", () => {
  // Mock canonical topics fixture
  const mockTopics: Topic[] = [
    {
      id: "topic-tu-dieu-de",
      title: "Tứ Diệu Đế (Cattāri Ariyasaccāni)",
      slug: "tu-dieu-de",
      type: "phat-hoc",
      description: "Bốn chân lý tối thượng nền tảng của Phật giáo Nguyên Thủy.",
      content: "Khổ đế, Tập đế, Diệt đế, Đạo đế trong Tạng Kinh Tipiṭaka.",
      categoryId: "cat-phat-hoc-co-ban",
      tags: ["phat-hoc", "nguyen-thuy", "tu-dieu-de", "ariya-sacca"],
      links: [
        {
          id: "link-1",
          sourceId: "topic-tu-dieu-de",
          targetId: "topic-duyen-he-patthana",
          linkType: "related",
          strength: 4,
        },
      ],
      studyProgress: {
        topicId: "topic-tu-dieu-de",
        status: "completed",
        progress: 100,
        repetitions: 6,
        interval: 15,
        easeFactor: 2.6,
        totalNotes: 3,
        timeSpent: 120,
        lastStudied: "2026-08-20T00:00:00Z",
        nextReview: "2026-09-04T00:00:00Z",
      },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "topic-duyen-he-patthana",
      title: "Duyên Hệ Paṭṭhāna (24 Duyên)",
      slug: "duyen-he-patthana",
      type: "phat-hoc",
      description: "Bộ thứ 7 trong Tạng Vi Diệu Pháp Abhidhamma Tipiṭaka.",
      content: "Khảo sát 24 Duyên Hệ vận hành giữa Tâm, Tâm Sở và Sắc Pháp.",
      categoryId: "cat-abhidhamma",
      tags: ["abhidhamma", "vi-dieu-phap", "patthana", "24-duyen"],
      links: [],
      studyProgress: {
        topicId: "topic-duyen-he-patthana",
        status: "reviewing",
        progress: 60,
        repetitions: 2,
        interval: 6,
        easeFactor: 2.1,
        totalNotes: 1,
        timeSpent: 45,
        lastStudied: "2026-08-23T00:00:00Z",
        nextReview: "2026-08-29T00:00:00Z",
      },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "topic-ky-mon-don-giap",
      title: "Kỳ Môn Độn Giáp Nhập Môn",
      slug: "ky-mon-don-giap",
      type: "huyen-hoc",
      description: "Học thuyết Huyền học phương Đông kết hợp Thiên - Địa - Nhân - Thần bàn.",
      content: "Khảo sát Bát Môn, Cửu Tinh, Bát Thần và Cửu Cung.",
      categoryId: "cat-huyen-hoc-co-ban",
      tags: ["huyen-hoc", "ky-mon", "bat-mon", "cuu-tinh"],
      links: [],
      studyProgress: {
        topicId: "topic-ky-mon-don-giap",
        status: "in_progress",
        progress: 30,
        repetitions: 1,
        interval: 1,
        easeFactor: 2.5,
        totalNotes: 0,
        timeSpent: 20,
        lastStudied: "2026-08-22T00:00:00Z",
        nextReview: "2026-08-23T00:00:00Z",
      },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ];

  // Mock notes fixture
  const mockNotes: Note[] = [
    {
      id: "note-1",
      topicId: "topic-duyen-he-patthana",
      title: "Ghi chú phân tích Cảnh Duyên (Ārammaṇapaccaya)",
      content: "Khảo sát sự tương tác giữa Tâm sở và Cảnh trong 24 Duyên Hệ Paṭṭhāna.",
      type: "study",
      tags: ["duyen-he", "arammana", "patthana"],
      createdAt: "2026-08-24T00:00:00Z",
      updatedAt: "2026-08-24T00:00:00Z",
      isPrivate: false,
    },
  ];

  // Mock resources fixture with zero binary ingestion (filePath & metadata only)
  const mockResources: Resource[] = [
    {
      id: "res-1",
      topicId: "topic-tu-dieu-de",
      title: "Kinh Trung Bộ - Majjhima Nikāya",
      type: "book",
      url: "",
      filePath: "/Users/mr.chem/Documents/Books/Majjhima-Nikaya.pdf",
      author: "Hòa thượng Thích Minh Châu dịch",
      notes: "Bản dịch kinh văn Pāli sang Việt ngữ.",
      createdAt: "2026-08-24T00:00:00Z",
    },
    {
      id: "res-2",
      topicId: "topic-ky-mon-don-giap",
      title: "Kỳ Môn Độn Giáp Bí Kíp",
      type: "pdf",
      url: "https://example.com/ky-mon.pdf",
      author: "Cổ thư",
      notes: "Tài liệu nghiên cứu Bát Quái Cửu Tinh.",
      createdAt: "2026-08-24T00:00:00Z",
    },
  ];

  describe("1. Normalization Pipeline (Vietnamese Diacritics & Pali/Sanskrit IAST)", () => {
    it("Scenario 1: normalizeScholarText removes Vietnamese accents and handles 'đ/Đ'", () => {
      expect(normalizeScholarText("Tứ Diệu Đế")).toBe("tu dieu de");
      expect(normalizeScholarText("Kỳ Môn Độn Giáp")).toBe("ky mon don giap");
      expect(normalizeScholarText("Đại Trí Độ Luận")).toBe("dai tri do luan");
    });

    it("Scenario 2: normalizeScholarText normalizes Pali and Sanskrit IAST diacritics to ASCII", () => {
      // Long vowels: ā, ī, ū
      expect(normalizeScholarText("Vipassanā")).toBe("vipassana");
      expect(normalizeScholarText("Dīgha Nikāya")).toBe("digha nikaya");
      expect(normalizeScholarText("Sūtra")).toBe("sutra");

      // Retroflex / nasal / guttural: ṭ, ṭh, ḍ, ṅ, ñ, ṃ, ṇ, ṣ, ś
      expect(normalizeScholarText("Paṭṭhāna")).toBe("patthana");
      expect(normalizeScholarText("Tipiṭaka")).toBe("tipitaka");
      expect(normalizeScholarText("Dhammasaṅgaṇī")).toBe("dhammasangani");
      expect(normalizeScholarText("Ñāṇa")).toBe("nana");
      expect(normalizeScholarText("Saṃsāra")).toBe("samsara");
      expect(normalizeScholarText("Abhidharmakośa-bhāṣya")).toBe("abhidharmakosa-bhasya");
    });
  });

  describe("2. Relevance Scoring & Ranking Strategy", () => {
    it("Scenario 4: calculateScholarRelevance prioritizes exact title over prefix and content snippet", () => {
      const exactTitleScore = calculateScholarRelevance({
        query: "tu dieu de",
        title: "Tứ Diệu Đế",
        tags: ["phat-hoc"],
        description: "Bốn chân lý",
        content: "Nội dung",
      });

      const prefixTitleScore = calculateScholarRelevance({
        query: "tu dieu de",
        title: "Tứ Diệu Đế Giảng Giải",
        tags: ["phat-hoc"],
        description: "Bốn chân lý",
        content: "Nội dung",
      });

      const contentOnlyScore = calculateScholarRelevance({
        query: "tu dieu de",
        title: "Kinh Chuyển Pháp Luân",
        tags: ["kinh-dien"],
        description: "Giảng giải về Tứ Diệu Đế",
        content: "Bài kinh đầu tiên của Đức Phật.",
      });

      expect(exactTitleScore).toBeGreaterThan(prefixTitleScore);
      expect(prefixTitleScore).toBeGreaterThan(contentOnlyScore);
    });
  });

  describe("3. Multi-Collection Unified Search Engine", () => {
    it("Scenario 1 & 3: matches topics and related entities with Vietnamese non-diacritic query", () => {
      const result: ScholarSearchResult = searchScholarCollections({
        query: "ky mon",
        topics: mockTopics,
        notes: mockNotes,
        resources: mockResources,
      });

      expect(result.topics.length).toBeGreaterThan(0);
      expect(result.topics[0].item.id).toBe("topic-ky-mon-don-giap");
      expect(result.resources.length).toBeGreaterThan(0);
      expect(result.resources[0].item.id).toBe("res-2");
      expect(result.totalCount).toBe(result.topics.length + result.notes.length + result.resources.length);
    });

    it("Scenario 2: matches topics and notes with ASCII Pali IAST query", () => {
      const result: ScholarSearchResult = searchScholarCollections({
        query: "patthana",
        topics: mockTopics,
        notes: mockNotes,
        resources: mockResources,
      });

      expect(result.topics.length).toBeGreaterThan(0);
      expect(result.topics[0].item.id).toBe("topic-duyen-he-patthana");
      expect(result.notes.length).toBeGreaterThan(0);
      expect(result.notes[0].item.id).toBe("note-1");
    });

    it("Scenario 5: searches resources strictly through metadata (Zero Binary Ingestion invariant)", () => {
      const result: ScholarSearchResult = searchScholarCollections({
        query: "majjhima",
        topics: mockTopics,
        notes: mockNotes,
        resources: mockResources,
      });

      expect(result.resources.length).toBe(1);
      expect(result.resources[0].item.title).toContain("Majjhima Nikāya");
      expect(result.resources[0].item.filePath).toBe("/Users/mr.chem/Documents/Books/Majjhima-Nikaya.pdf");
      // Verify no binary buffer is loaded
      expect((result.resources[0].item as any).binaryContent).toBeUndefined();
    });

    it("Scenario 6: correctly applies combined facet filters with search query", () => {
      // Search 'duyen' with filter status='reviewing'
      const reviewingResult = searchScholarCollections({
        query: "duyen",
        topics: mockTopics,
        notes: mockNotes,
        resources: mockResources,
        filters: {
          status: "reviewing",
        },
      });

      expect(reviewingResult.topics.length).toBe(1);
      expect(reviewingResult.topics[0].item.id).toBe("topic-duyen-he-patthana");

      // Search 'duyen' with filter status='completed' -> Should return 0 topics
      const completedResult = searchScholarCollections({
        query: "duyen",
        topics: mockTopics,
        notes: mockNotes,
        resources: mockResources,
        filters: {
          status: "completed",
        },
      });

      expect(completedResult.topics.length).toBe(0);
    });

    it("Scenario 7: returns all items gracefully when query is empty or only whitespace", () => {
      const emptyResult = searchScholarCollections({
        query: "   ",
        topics: mockTopics,
        notes: mockNotes,
        resources: mockResources,
      });

      expect(emptyResult.topics.length).toBe(mockTopics.length);
      expect(emptyResult.notes.length).toBe(mockNotes.length);
      expect(emptyResult.resources.length).toBe(mockResources.length);
      expect(emptyResult.totalCount).toBe(mockTopics.length + mockNotes.length + mockResources.length);
    });
  });
});
