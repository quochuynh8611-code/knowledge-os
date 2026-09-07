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

describe("Topic Detail — Study Launcher Integration (Phase F6.6)", () => {
  const mockOpenStudyLauncher = vi.fn();
  const mockOpenFlashcardReview = vi.fn();
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

  it("1. renders subtab button for Study Launcher", () => {
    render(<TopicDetail />);

    const launcherTabBtn = screen.getByTestId("tab-btn-study-launcher");
    expect(launcherTabBtn).toBeInTheDocument();
    expect(launcherTabBtn).toHaveTextContent(/khởi tạo học/i);
  });

  it("2. renders shortcut button 'btn-open-study-launcher' in flashcard hub", async () => {
    render(<TopicDetail />);

    // Switch to flashcards tab
    const flashcardTabBtn = screen.getByTestId("tab-btn-flashcards");
    fireEvent.click(flashcardTabBtn);

    await waitFor(() => {
      const shortcutBtn = screen.getByTestId("btn-open-study-launcher");
      expect(shortcutBtn).toBeInTheDocument();
    });
  });

  it("3. clicking launcher subtab switches view and renders StudyLauncher", async () => {
    render(<TopicDetail />);

    const launcherTabBtn = screen.getByTestId("tab-btn-study-launcher");
    fireEvent.click(launcherTabBtn);

    await waitFor(() => {
      expect(screen.getByTestId("study-launcher")).toBeInTheDocument();
      expect(mockOpenStudyLauncher).toHaveBeenCalledWith(mockTopic.id);
    });
  });
});
