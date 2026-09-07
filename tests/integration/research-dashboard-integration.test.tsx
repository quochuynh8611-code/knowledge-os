/**
 * Integration Tests: Research Dashboard in TopicDetail (Phase F7.0 Task 6)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TopicDetail } from "../../src/components/topics/TopicDetail";
import { useData } from "../../src/context/DataContext";
import { useNavigation } from "../../src/context/NavigationContext";
import type { Topic, Note, Resource } from "../../src/types";
import type { Flashcard, FlashcardReview } from "../../src/types/flashcard";

vi.mock("../../src/context/DataContext", () => ({
  useData: vi.fn(),
}));

vi.mock("../../src/context/NavigationContext", () => ({
  useNavigation: vi.fn(),
}));

const mockTopic: Topic = {
  id: "topic-phat-hoc-1",
  title: "Thiền Tứ Niệm Xứ",
  description: "Bốn nền tảng chánh niệm quán thân, thọ, tâm, pháp",
  slug: "thien-tu-niem-xu",
  type: "phat-hoc",
  categoryId: "cat-1",
  categoryName: "Phật Học",
  links: [],
  studyProgress: {
    topicId: "topic-phat-hoc-1",
    status: "in_progress",
    progress: 65,
    lastStudied: new Date().toISOString(),
    easeFactor: 2.5,
    interval: 3,
    repetitions: 4,
    totalNotes: 1,
    timeSpent: 120,
  },
  content: "# Luận giải Tứ Niệm Xứ",
  tags: ["thien-quan", "satipatthana"],
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const mockNotes: Note[] = [
  {
    id: "note-1",
    topicId: "topic-phat-hoc-1",
    title: "Ghi chú Quán Thân",
    content: "Chi tiết phương pháp thở chánh niệm trong Mahāsatipaṭṭhāna Sutta.",
    type: "study",
    isPrivate: false,
    tags: ["chánh niệm", "quán thân"],
    createdAt: "2026-09-02T08:00:00.000Z",
    updatedAt: "2026-09-02T08:00:00.000Z",
  },
];

const mockCards: Flashcard[] = [
  {
    id: "card-1",
    topicId: "topic-phat-hoc-1",
    front: "Kāyānupassanā nghĩa là gì?",
    back: "Quán thân trên thân",
    type: "basic",
    createdAt: "2026-09-02T08:00:00.000Z",
    updatedAt: "2026-09-02T08:00:00.000Z",
    schedule: {
      id: "sched-1",
      flashcardId: "card-1",
      state: "review",
      dueAt: "2026-09-05T00:00:00.000Z",
      interval: 4,
      easeFactor: 2.5,
      repetitions: 2,
      lapses: 0,
      retentionRate: 1,
      updatedAt: "2026-09-02T08:00:00.000Z",
    },
  },
];

const mockResources: Resource[] = [
  {
    id: "res-1",
    topicId: "topic-phat-hoc-1",
    title: "Kinh Đại Niệm Xứ (Dīgha Nikāya 22)",
    type: "pdf",
    filePath: "/docs/dn22.pdf",
    notes: "Bản dịch của Hòa thượng Thích Minh Châu",
    createdAt: "2026-09-01T00:00:00.000Z",
  },
];

const mockReviews: FlashcardReview[] = [
  {
    id: "rev-1",
    clientEventId: "evt-1",
    flashcardId: "card-1",
    topicId: "topic-phat-hoc-1",
    rating: 4,
    reviewDurationMs: 2500,
    reviewedAt: "2026-09-05T08:00:00.000Z",
    stateBefore: "review",
    stateAfter: "review",
    intervalBefore: 1,
    intervalAfter: 4,
    easeFactorBefore: 2.5,
    easeFactorAfter: 2.6,
    dueBeforeAt: "2026-09-05T00:00:00.000Z",
    dueAfterAt: "2026-09-09T00:00:00.000Z",
  },
];

describe("TopicDetail — Research Dashboard Integration (Phase F7.0)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useData as any).mockReturnValue({
      categories: [{ id: "cat-1", name: "Phật Học" }],
      topics: [mockTopic],
      selectedTopicId: "topic-phat-hoc-1",
      setSelectedTopicId: vi.fn(),
      notes: mockNotes,
      resources: mockResources,
      updateTopicProgress: vi.fn(),
      deleteNote: vi.fn(),
      addResource: vi.fn(),
      deleteResource: vi.fn(),
      openTopicDetail: vi.fn(),
      activeTimerTopicId: null,
      isTimerRunning: false,
      timerSeconds: 0,
      startStudyTimer: vi.fn(),
      resumeStudyTimer: vi.fn(),
    });

    (useNavigation as any).mockReturnValue({
      subView: null,
      openFlashcardReview: vi.fn(),
      openCardBrowser: vi.fn(),
      openStudyLauncher: vi.fn(),
      openFlashcardAnalytics: vi.fn(),
      openDuplicateDetection: vi.fn(),
    });

    // Mock global fetch for flashcards & reviews
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/flashcards/progress")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              topicId: "topic-phat-hoc-1",
              totalCards: 1,
              dueCards: 0,
              learningCards: 0,
              newCards: 0,
              masteredCards: 1,
              streakDays: 3,
              averageEase: 2.5,
              retentionRate: 100,
            }),
        });
      }
      if (url.includes("/api/flashcards/reviews")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockReviews),
        });
      }
      if (url.includes("/api/flashcards")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCards),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });
  });

  it("renders the 'Nghiên cứu' tab button and switches to Research Dashboard view", async () => {
    render(<TopicDetail />);

    // Tab button should be present
    const researchTabBtn = screen.getByTestId("tab-btn-research");
    expect(researchTabBtn).toBeInTheDocument();

    // Click tab button
    fireEvent.click(researchTabBtn);

    // Research tab content renders
    await waitFor(() => {
      expect(screen.getByTestId("research-tab-content")).toBeInTheDocument();
    });

    // Contains TopicDashboard & ResearchTimeline
    expect(screen.getByTestId("topic-research-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("research-timeline")).toBeInTheDocument();

    // 6 KPI cards rendered
    expect(screen.getByTestId("kpi-notes")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-flashcards")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-resources")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-retention")).toBeInTheDocument();
  });

  it("opens ResearchSearchModal and allows BM25 full-text search", async () => {
    render(<TopicDetail />);

    // Switch to research tab
    fireEvent.click(screen.getByTestId("tab-btn-research"));

    await waitFor(() => {
      expect(screen.getByTestId("research-search-btn")).toBeInTheDocument();
    });

    // Click search button
    fireEvent.click(screen.getByTestId("research-search-btn"));

    // Modal should be open
    expect(screen.getByTestId("research-search-modal")).toBeInTheDocument();

    // Type query "satipatthana"
    const searchInput = screen.getByTestId("bm25-search-input");
    fireEvent.change(searchInput, { target: { value: "satipatthana" } });

    // Results found matching note-1
    await waitFor(() => {
      expect(screen.getByTestId("search-result-item")).toBeInTheDocument();
    });

    // Close modal
    fireEvent.click(screen.getByTestId("close-search-modal"));
    expect(screen.queryByTestId("research-search-modal")).not.toBeInTheDocument();
  });

  it("opens ExportReportModal and renders markdown report preview", async () => {
    render(<TopicDetail />);

    // Switch to research tab
    fireEvent.click(screen.getByTestId("tab-btn-research"));

    await waitFor(() => {
      expect(screen.getByTestId("research-export-btn")).toBeInTheDocument();
    });

    // Click export button
    fireEvent.click(screen.getByTestId("research-export-btn"));

    // Modal should be open
    expect(screen.getByTestId("export-report-modal")).toBeInTheDocument();
    expect(screen.getByTestId("export-preview-panel")).toBeInTheDocument();

    // Check that markdown contains report header
    expect(
      screen.getByText((content) => content.includes("BÁO CÁO NGHIÊN CỨU: THIỀN TỨ NIỆM XỨ"))
    ).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByTestId("close-export-modal"));
    expect(screen.queryByTestId("export-report-modal")).not.toBeInTheDocument();
  });
});
