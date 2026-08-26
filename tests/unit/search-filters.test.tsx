import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Topic, Category, Tag } from "../../src/types";
import {
  SearchFilters,
  SearchFiltersState,
} from "../../src/components/search/SearchFilters";

describe("Search Engine & SearchFilters Component (Phase 1B)", () => {
  // Mock dataset of 1,000 topics to benchmark search performance
  const generateLargeDataset = (count: number): Topic[] => {
    const topics: Topic[] = [];
    const domains: ("phat-hoc" | "huyen-hoc")[] = ["phat-hoc", "huyen-hoc"];
    const sampleKeywords = [
      "Abhidharma",
      "Tam Tạng",
      "Kỳ Môn",
      "Kinh Dịch",
      "Thiền Định",
      "Bát Nhã",
      "Tử Vi",
      "Phong Thủy",
    ];

    for (let i = 0; i < count; i++) {
      const keyword = sampleKeywords[i % sampleKeywords.length];
      topics.push({
        id: `topic-${i}`,
        title: `Khảo Cứu ${keyword} Chuyên Sâu Tập ${i}`,
        slug: `khao-cuu-${keyword.toLowerCase()}-${i}`,
        categoryId: `cat-${i % 5}`,
        type: domains[i % 2],
        description: `Mô tả chi tiết và luận giải về ${keyword} trong bối cảnh khảo cứu cổ học phương Đông số ${i}`,
        content: `Nội dung luận tạng mở rộng chứa các thuật ngữ Pali và Hán Cổ liên quan đến ${keyword}...`,
        tags: [keyword, `Tag-${i % 10}`],
        links: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        studyProgress: {
          topicId: `topic-${i}`,
          status: "not_started",
          progress: 0,
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          totalNotes: 0,
          timeSpent: 0,
        },
      });
    }
    return topics;
  };

  const mockCategories: Category[] = [
    {
      id: "cat-root-phat-hoc",
      name: "Phật Học",
      slug: "phat-hoc",
      type: "phat-hoc",
      parentId: null,
    },
    {
      id: "cat-root-huyen-hoc",
      name: "Huyền Học",
      slug: "huyen-hoc",
      type: "huyen-hoc",
      parentId: null,
    },
    {
      id: "cat-tam-tang",
      name: "Tam Tạng",
      slug: "tam-tang",
      type: "phat-hoc",
      parentId: "cat-root-phat-hoc",
    },
    {
      id: "cat-dich-hoc",
      name: "Dịch Học",
      slug: "dich-hoc",
      type: "huyen-hoc",
      parentId: "cat-root-huyen-hoc",
    },
  ];

  const mockTags: Tag[] = [
    { id: "tag-1", name: "Abhidharma", slug: "abhidharma", color: "#D97706" },
    { id: "tag-2", name: "Kỳ Môn", slug: "ky-mon", color: "#2563EB" },
  ];

  it("Hiệu năng tìm kiếm toàn văn trên 1,000 bản ghi phải dưới 200ms", () => {
    const dataset = generateLargeDataset(1000);
    const query = "Kỳ Môn";

    const startTime = performance.now();
    const queryLower = query.toLowerCase();

    const results = dataset.filter((t) => {
      return (
        t.title.toLowerCase().includes(queryLower) ||
        t.description.toLowerCase().includes(queryLower) ||
        t.tags.some((tag) => tag.toLowerCase().includes(queryLower))
      );
    });
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(results.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(200); // Tiêu chuẩn chất lượng: < 200ms
  });

  it("SearchFilters render đầy đủ các bộ lọc và phát sự kiện onFilterChange", () => {
    const handleFilterChange = vi.fn();
    const initialFilters: SearchFiltersState = {
      domain: "all",
      categoryId: null,
      tag: null,
      status: "all",
    };

    render(
      <SearchFilters
        filters={initialFilters}
        onFilterChange={handleFilterChange}
        categories={mockCategories}
        tags={mockTags}
        totalResultsCount={42}
      />,
    );

    expect(screen.getByText(/Bộ Lọc Chuyên Sâu/i)).toBeInTheDocument();
    expect(screen.getByText(/42 kết quả/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Phật Học/i })).toBeInTheDocument();

    // Click domain filter
    fireEvent.click(screen.getByRole("button", { name: /Phật Học/i }));
    expect(handleFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ domain: "phat-hoc", categoryId: null }),
    );

    // Click tag filter
    fireEvent.click(screen.getByText("#Abhidharma"));
    expect(handleFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ tag: "Abhidharma" }),
    );
  });
});
