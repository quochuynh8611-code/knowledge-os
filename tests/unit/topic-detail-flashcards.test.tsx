import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { TopicDetail } from "../../src/components/topics/TopicDetail";
import { useData } from "../../src/context/DataContext";
import { useNavigation } from "../../src/context/NavigationContext";
import type { Topic } from "../../src/types";

vi.mock("../../src/context/DataContext", () => ({
  useData: vi.fn(),
}));

vi.mock("../../src/context/NavigationContext", () => ({
  useNavigation: vi.fn(),
}));

const mockTopic: Topic = {
  id: "topic-dong-y-1",
  title: "Đông Y & Kinh Lạc Học",
  description: "Hệ thống lý luận tạng phủ và kinh lạc",
  slug: "dong-y-kinh-lac-hoc",
  type: "huyen-hoc",
  categoryId: "cat-1",
  links: [],
  studyProgress: {
    topicId: "topic-dong-y-1",
    status: "in_progress",
    progress: 50,
    lastStudied: new Date().toISOString(),
    easeFactor: 2.5,
    interval: 1,
    repetitions: 1,
    totalNotes: 0,
    timeSpent: 60,
  },
  content: "# Nội dung Đông Y",
  tags: ["dong-y", "kinh-lac"],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockFlashcardStats = {
  total: 25,
  dueToday: 12,
  newCards: 5,
  learningCards: 8,
  reviewCards: 12,
  relearningCards: 0,
  averageEase: 2.5,
  retentionRate: 85,
  streakDays: 4,
};

describe("Phase F6.4 — Topic Detail Flashcard Hub", () => {
  const mockOpenFlashcardReview = vi.fn();
  const mockOpenTopicDetail = vi.fn();
  const mockSetActiveTab = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useData as any).mockReturnValue({
      categories: [{ id: "cat-1", name: "Đông Y" }],
      topics: [mockTopic],
      selectedTopicId: "topic-dong-y-1",
      setSelectedTopicId: vi.fn(),
      notes: [],
      resources: [],
      updateTopicProgress: vi.fn(),
      deleteNote: vi.fn(),
      addResource: vi.fn(),
      deleteResource: vi.fn(),
      openTopicDetail: mockOpenTopicDetail,
      addKnowledgeLink: vi.fn(),
      removeKnowledgeLink: vi.fn(),
      activeTimerTopicId: null,
      isTimerRunning: false,
      timerSeconds: 0,
      startStudyTimer: vi.fn(),
      resumeStudyTimer: vi.fn(),
    });

    (useNavigation as any).mockReturnValue({
      activeTab: "topics",
      selectedTopicId: "topic-dong-y-1",
      openFlashcardReview: mockOpenFlashcardReview,
      openTopicDetail: mockOpenTopicDetail,
      setActiveTab: mockSetActiveTab,
    });

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/flashcards/progress")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockFlashcardStats,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  it("1. renders Flashcards Hub tab button with topic cards count", async () => {
    render(<TopicDetail />);

    const flashcardsTabBtn = await screen.findByTestId("tab-btn-flashcards");
    expect(flashcardsTabBtn).toBeInTheDocument();
    expect(flashcardsTabBtn).toHaveTextContent(/Thẻ Nhớ/i);
  });

  it("2. displays topic-scoped flashcard summary (due count, new/learning/review, retention rate)", async () => {
    render(<TopicDetail />);

    // Click on Flashcards tab
    const flashcardsTabBtn = await screen.findByTestId("tab-btn-flashcards");
    fireEvent.click(flashcardsTabBtn);

    // Summary metrics
    const summary = await screen.findByTestId("topic-flashcard-summary");
    expect(summary).toBeInTheDocument();
    expect(within(summary).getByTestId("stat-due-count")).toHaveTextContent("12");
    expect(within(summary).getByTestId("stat-new-count")).toHaveTextContent("5");
    expect(within(summary).getByTestId("stat-learning-count")).toHaveTextContent("8");
    expect(within(summary).getByTestId("stat-review-count")).toHaveTextContent("12");
    expect(within(summary).getAllByTestId("stat-retention-rate")[0]).toHaveTextContent("85%");
  });

  it("3. clicking 'Ôn N thẻ đến hạn' button triggers topic-scoped review session", async () => {
    render(<TopicDetail />);

    const flashcardsTabBtn = await screen.findByTestId("tab-btn-flashcards");
    fireEvent.click(flashcardsTabBtn);

    const reviewBtn = await screen.findByTestId("btn-start-topic-review");
    expect(reviewBtn).toHaveTextContent(/Ôn 12 thẻ đến hạn/i);

    fireEvent.click(reviewBtn);

    expect(mockOpenFlashcardReview).toHaveBeenCalledWith("topic-dong-y-1");
  });

  it("4. header toolbar features quick flashcard due button", async () => {
    render(<TopicDetail />);

    const quickDueBtn = await screen.findByTestId("btn-quick-topic-flashcards");
    expect(quickDueBtn).toBeInTheDocument();
    expect(quickDueBtn).toHaveTextContent(/12/);

    fireEvent.click(quickDueBtn);
    expect(mockOpenFlashcardReview).toHaveBeenCalledWith("topic-dong-y-1");
  });

  it("5. renders 'Tạo thẻ mới' and 'Nhập CSV / TSV' buttons inside Topic Flashcard Hub", async () => {
    render(<TopicDetail />);

    const flashcardsTabBtn = await screen.findByTestId("tab-btn-flashcards");
    fireEvent.click(flashcardsTabBtn);

    expect(await screen.findByTestId("btn-topic-create-card")).toBeInTheDocument();
    expect(screen.getByTestId("btn-topic-import-csv")).toBeInTheDocument();
  });
});
