/**
 * Unit Tests: TopicDashboard Component (Phase F7.0 Task 2)
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TopicDashboard } from "../../src/components/research/TopicDashboard";
import type { Note, Resource } from "../../src/types";
import type { Flashcard, FlashcardReview } from "../../src/types/flashcard";

function createMockReview(partial: Partial<FlashcardReview>): FlashcardReview {
  return {
    id: partial.id || "rev-1",
    clientEventId: partial.clientEventId || "evt-1",
    flashcardId: partial.flashcardId || "c1",
    topicId: partial.topicId || "topic-1",
    rating: partial.rating ?? 3,
    reviewDurationMs: partial.reviewDurationMs ?? 2000,
    reviewedAt: partial.reviewedAt || new Date().toISOString(),
    stateBefore: partial.stateBefore || "review",
    stateAfter: partial.stateAfter || "review",
    intervalBefore: partial.intervalBefore ?? 1,
    intervalAfter: partial.intervalAfter ?? 3,
    easeFactorBefore: partial.easeFactorBefore ?? 2.5,
    easeFactorAfter: partial.easeFactorAfter ?? 2.5,
    dueBeforeAt: partial.dueBeforeAt || new Date().toISOString(),
    dueAfterAt: partial.dueAfterAt || new Date().toISOString(),
  };
}

describe("TopicDashboard Component", () => {
  const mockNotes: Note[] = [
    {
      id: "note-1",
      topicId: "topic-1",
      title: "Ghi chú Thiền Quán",
      content: "Nội dung chi tiết về chánh niệm...",
      type: "study",
      isPrivate: false,
      tags: ["chánh niệm"],
      createdAt: "2026-09-01T08:00:00.000Z",
      updatedAt: "2026-09-02T10:00:00.000Z",
    },
    {
      id: "note-2",
      topicId: "topic-other",
      title: "Ghi chú khác",
      content: "Nội dung khác",
      type: "insight",
      isPrivate: false,
      tags: [],
      createdAt: "2026-09-01T08:00:00.000Z",
      updatedAt: "2026-09-02T10:00:00.000Z",
    },
  ];

  const mockCards: Flashcard[] = [
    {
      id: "card-1",
      topicId: "topic-1",
      front: "Thân hành niệm là gì?",
      back: "Kāyānupassanā",
      type: "basic",
      createdAt: "2026-09-01T08:00:00.000Z",
      updatedAt: "2026-09-01T08:00:00.000Z",
      schedule: {
        id: "s1",
        flashcardId: "card-1",
        state: "review",
        dueAt: "2026-09-01T00:00:00.000Z", // due
        interval: 1,
        easeFactor: 2.5,
        repetitions: 1,
        lapses: 0,
        retentionRate: 1,
        updatedAt: "2026-09-01T08:00:00.000Z",
      },
    },
  ];

  const mockResources: Resource[] = [
    {
      id: "res-1",
      topicId: "topic-1",
      title: "Kinh Đại Niệm Xứ (Dīgha Nikāya 22)",
      type: "pdf",
      filePath: "/docs/dn22.pdf",
      createdAt: "2026-09-01T08:00:00.000Z",
    },
  ];

  const mockReviews: FlashcardReview[] = [
    createMockReview({
      id: "rev-1",
      flashcardId: "card-1",
      topicId: "topic-1",
      rating: 3,
      reviewDurationMs: 4000,
      reviewedAt: "2026-09-05T08:00:00.000Z",
    }),
    createMockReview({
      id: "rev-2",
      flashcardId: "card-1",
      topicId: "topic-1",
      rating: 4,
      reviewDurationMs: 5000,
      reviewedAt: "2026-09-06T08:00:00.000Z",
    }),
  ];

  it("renders 6 KPI cards with aggregated counts and metrics", () => {
    render(
      <TopicDashboard
        topicId="topic-1"
        topicTitle="Tứ Niệm Xứ"
        topicCategory="Phật Học"
        notes={mockNotes}
        flashcards={mockCards}
        resources={mockResources}
        reviews={mockReviews}
      />
    );

    // Title and category badge
    expect(screen.getByText(/Tổng Quan Nghiên Cứu: Tứ Niệm Xứ/i)).toBeInTheDocument();
    expect(screen.getByText("Phật Học")).toBeInTheDocument();

    // 6 KPI cards
    expect(screen.getByTestId("kpi-notes")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-flashcards")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-resources")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-retention")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-streak")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-time")).toBeInTheDocument();

    // Specific values: notes = 1 (filtered to topic-1), cards = 1, resources = 1
    expect(screen.getByTestId("kpi-notes")).toHaveTextContent("1");
    expect(screen.getByTestId("kpi-flashcards")).toHaveTextContent("1");
    expect(screen.getByTestId("kpi-resources")).toHaveTextContent("1");
    expect(screen.getByTestId("kpi-retention")).toHaveTextContent("100%");
  });

  it("handles empty state gracefully when no assets or reviews exist", () => {
    render(
      <TopicDashboard
        topicId="empty-topic"
        topicTitle="Chủ Đề Trống"
        notes={[]}
        flashcards={[]}
        resources={[]}
        reviews={[]}
      />
    );

    expect(screen.getByText(/Chủ Đề Trống/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Chưa có dữ liệu ôn tập trong khoảng thời gian này/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Chưa có hoạt động nào được ghi nhận cho chủ đề này/i)
    ).toBeInTheDocument();
  });

  it("renders SVG retention trend chart and responds to date range filters", () => {
    render(
      <TopicDashboard
        topicId="topic-1"
        notes={mockNotes}
        flashcards={mockCards}
        resources={mockResources}
        reviews={mockReviews}
      />
    );

    // Chart SVG is rendered
    expect(screen.getByTestId("retention-trend-svg")).toBeInTheDocument();
    expect(screen.getByText("Mục tiêu: 80%")).toBeInTheDocument();

    // Click range buttons
    const btn7d = screen.getByText("7 ngày");
    fireEvent.click(btn7d);
    expect(screen.getByTestId("retention-trend-svg")).toBeInTheDocument();

    const btnAll = screen.getByText("Tất cả");
    fireEvent.click(btnAll);
    expect(screen.getByTestId("retention-trend-svg")).toBeInTheDocument();
  });

  it("triggers search and export callbacks when buttons clicked", () => {
    const onOpenSearch = vi.fn();
    const onOpenExport = vi.fn();
    const onNavigateTab = vi.fn();

    render(
      <TopicDashboard
        topicId="topic-1"
        notes={mockNotes}
        flashcards={mockCards}
        onOpenSearch={onOpenSearch}
        onOpenExport={onOpenExport}
        onNavigateTab={onNavigateTab}
      />
    );

    const searchBtn = screen.getByTestId("research-search-btn");
    fireEvent.click(searchBtn);
    expect(onOpenSearch).toHaveBeenCalledTimes(1);

    const exportBtn = screen.getByTestId("research-export-btn");
    fireEvent.click(exportBtn);
    expect(onOpenExport).toHaveBeenCalledTimes(1);

    // Click on KPI card to navigate
    const notesCard = screen.getByTestId("kpi-notes");
    fireEvent.click(notesCard);
    expect(onNavigateTab).toHaveBeenCalledWith("notes");
  });
});
