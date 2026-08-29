import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdvancedSearch } from "../../src/components/search/AdvancedSearch";
import {
  createSavedSearchView,
  getSavedSearchViews,
  clearSavedSearchViews,
} from "../../src/lib/savedViewStorage";
import type { Topic, Note, Resource, Category, Tag } from "../../src/types";

const mockCategories: Category[] = [
  {
    id: "cat-1",
    name: "Vi Diệu Pháp",
    description: "Abhidhamma",
    type: "phat-hoc",
    slug: "vi-dieu-phap",
  },
];

const mockTags: Tag[] = [
  {
    id: "tag-1",
    name: "Abhidharma",
    color: "#d97706",
    slug: "abhidharma",
  },
];

const mockTopics: Topic[] = [
  {
    id: "topic-1",
    title: "Hiểu Sâu Về Tâm Vương Và Tâm Sở",
    slug: "hieu-sau-ve-tam-vuong-va-tam-so",
    description: "Khảo sát 89/121 Tâm Vương và 52 Tâm Sở trong Abhidhamma",
    categoryId: "cat-1",
    categoryName: "Vi Diệu Pháp",
    type: "phat-hoc",
    tags: ["Abhidharma"],
    content: "Nội dung khảo sát Tâm và Tâm Sở",
    links: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    studyProgress: {
      topicId: "topic-1",
      progress: 60,
      totalNotes: 3,
      timeSpent: 120,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 1,
      status: "in_progress",
    },
  },
];

let mockSearchQuery = "";
const mockSetSearchQuery = vi.fn((q: string) => {
  mockSearchQuery = q;
});
const mockOpenTopicDetail = vi.fn();

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    searchQuery: mockSearchQuery,
    setSearchQuery: mockSetSearchQuery,
    topics: mockTopics,
    notes: [] as Note[],
    resources: [] as Resource[],
    categories: mockCategories,
    tags: mockTags,
    openTopicDetail: mockOpenTopicDetail,
  }),
}));

describe("Phase P7.3b: AdvancedSearch Saved Views UI Integration", () => {
  beforeEach(() => {
    localStorage.clear();
    mockSetSearchQuery.mockClear();
    mockOpenTopicDetail.mockClear();
    mockSearchQuery = "";
  });

  it("1.1. renders saved view chips and allows 1-click replay of query and filters", () => {
    createSavedSearchView({
      name: "Khảo sát Tâm Vương",
      query: "Tâm Vương",
      filters: {
        domain: "phat-hoc",
        status: "in_progress",
      },
    });

    render(<AdvancedSearch />);

    // Chip should be visible
    expect(screen.getByText("Góc nhìn đã lưu:")).toBeInTheDocument();
    expect(screen.getByText("Khảo sát Tâm Vương")).toBeInTheDocument();

    // Click chip to replay
    fireEvent.click(screen.getByText("Khảo sát Tâm Vương"));

    expect(mockSetSearchQuery).toHaveBeenCalledWith("Tâm Vương");
  });

  it("1.2. toggles inline save panel and creates a new saved view with optional pin", () => {
    mockSearchQuery = "Bát Nhã";

    render(<AdvancedSearch />);

    // Click button to open inline save panel
    const openSavePanelBtn = screen.getByRole("button", { name: /Lưu góc nhìn/i });
    expect(openSavePanelBtn).toBeInTheDocument();
    fireEvent.click(openSavePanelBtn);

    // Inline form appears
    const nameInput = screen.getByPlaceholderText(/Tên góc nhìn/i);
    fireEvent.change(nameInput, { target: { value: "Chuyên Đề Bát Nhã" } });

    const pinCheckbox = screen.getByLabelText(/Ghim lên đầu/i);
    fireEvent.click(pinCheckbox);

    const submitBtn = screen.getByRole("button", { name: /Xác nhận lưu/i });
    fireEvent.click(submitBtn);

    // Verify view is saved in storage and rendered as chip
    const saved = getSavedSearchViews();
    expect(saved.length).toBe(1);
    expect(saved[0].name).toBe("Chuyên Đề Bát Nhã");
    expect(saved[0].query).toBe("Bát Nhã");
    expect(saved[0].pinned).toBe(true);

    expect(screen.getByText("Chuyên Đề Bát Nhã")).toBeInTheDocument();
  });

  it("1.3. pin button toggles pin state without triggering view replay", () => {
    createSavedSearchView({
      name: "Góc nhìn Duyên Hệ",
      query: "Duyên Hệ",
      pinned: false,
    });

    render(<AdvancedSearch />);

    const pinBtn = screen.getByTitle(/Ghim góc nhìn 'Góc nhìn Duyên Hệ'/i);
    fireEvent.click(pinBtn);

    // Pin state must toggle to true
    const saved = getSavedSearchViews();
    expect(saved[0].pinned).toBe(true);

    // Replay should NOT have been triggered on pin click
    expect(mockSetSearchQuery).not.toHaveBeenCalled();
  });

  it("1.4. delete button removes view from list and storage without triggering replay", () => {
    createSavedSearchView({
      name: "Góc nhìn tạm",
      query: "Tạm",
    });

    render(<AdvancedSearch />);

    const deleteBtn = screen.getByTitle(/Xóa góc nhìn 'Góc nhìn tạm'/i);
    fireEvent.click(deleteBtn);

    expect(getSavedSearchViews()).toHaveLength(0);
    expect(screen.queryByText("Góc nhìn tạm")).not.toBeInTheDocument();
    expect(mockSetSearchQuery).not.toHaveBeenCalled();
  });
});
