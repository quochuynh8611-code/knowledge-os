import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
  description: "Hệ thống 12 chính kinh và kỳ kinh bát mạch",
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

describe("Topic Detail — Flashcard Analytics Integration (Phase F6.8)", () => {
  const mockOpenFlashcardAnalytics = vi.fn();
  const mockOpenFlashcardReview = vi.fn();
  const mockOpenStudyLauncher = vi.fn();
  const mockOpenCardBrowser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

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
      openTopicDetail: vi.fn(),
      openStudyLauncher: mockOpenStudyLauncher,
      openFlashcardReview: mockOpenFlashcardReview,
      openCardBrowser: mockOpenCardBrowser,
      openFlashcardAnalytics: mockOpenFlashcardAnalytics,
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
      subView: null,
      openTopicDetail: vi.fn(),
      openFlashcardReview: mockOpenFlashcardReview,
      openCardBrowser: mockOpenCardBrowser,
      openStudyLauncher: mockOpenStudyLauncher,
      openFlashcardAnalytics: mockOpenFlashcardAnalytics,
      setActiveTab: vi.fn(),
    });

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/flashcards/progress")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            totalCards: 15,
            dueToday: 4,
            newCards: 3,
            learningCards: 2,
            reviewCards: 10,
            retentionRate: 90,
          }),
        });
      }
      if (url.includes("/api/flashcards")) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    }) as any;
  });

  it("1. renders subtab button for Analytics", () => {
    render(<TopicDetail />);

    const analyticsTabBtn = screen.getByTestId("tab-btn-analytics");
    expect(analyticsTabBtn).toBeInTheDocument();
    expect(analyticsTabBtn).toHaveTextContent(/phân tích/i);
  });

  it("2. clicking subtab calls openFlashcardAnalytics and renders dashboard", async () => {
    render(<TopicDetail />);

    const analyticsTabBtn = screen.getByTestId("tab-btn-analytics");
    fireEvent.click(analyticsTabBtn);

    expect(mockOpenFlashcardAnalytics).toHaveBeenCalledWith("topic-dong-y-1");

    await waitFor(() => {
      expect(screen.getByTestId("flashcard-analytics-dashboard")).toBeInTheDocument();
    });
  });

  it("3. syncs with subView=analytics deep-link on mount", async () => {
    (useNavigation as any).mockReturnValue({
      activeTab: "topics",
      selectedTopicId: "topic-dong-y-1",
      subView: "analytics",
      openTopicDetail: vi.fn(),
      openFlashcardAnalytics: mockOpenFlashcardAnalytics,
    });

    render(<TopicDetail />);

    await waitFor(() => {
      expect(screen.getByTestId("flashcard-analytics-dashboard")).toBeInTheDocument();
    });
  });
});
