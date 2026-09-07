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

const mockCards = [
  {
    id: "card-topic-1",
    topicId: "topic-dong-y-1",
    type: "basic",
    front: "Thận âm và Thận dương quan hệ thế nào?",
    back: "Hỗ căn hỗ dụng, âm dương bình hành",
    lifecycleStatus: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schedule: {
      id: "s-1",
      flashcardId: "card-topic-1",
      state: "review",
      dueAt: new Date().toISOString(),
      interval: 3,
      easeFactor: 2.5,
      repetitions: 2,
      lapses: 0,
      updatedAt: new Date().toISOString(),
    },
  },
];

describe("Phase F6.5 — Topic Detail Card Browser Integration (TopicDetail.tsx)", () => {
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
      openTopicDetail: vi.fn(),
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
      openTopicDetail: vi.fn(),
      openFlashcardReview: vi.fn(),
      setActiveTab: vi.fn(),
    });

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/flashcards/progress")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            totalCards: 1,
            dueToday: 1,
            newCards: 0,
            learningCards: 0,
            reviewCards: 1,
            retentionRate: 90,
          }),
        });
      }
      if (url.includes("/api/flashcards")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockCards,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  it("1. renders tab 'Danh sách thẻ' in TopicDetail subtab bar", async () => {
    render(<TopicDetail />);

    const browserTabBtn = await screen.findByTestId("tab-btn-card-browser");
    expect(browserTabBtn).toBeInTheDocument();
    expect(browserTabBtn).toHaveTextContent(/Danh sách thẻ/i);
  });

  it("2. clicking 'Danh sách thẻ' tab displays CardBrowser scoped to the topic", async () => {
    render(<TopicDetail />);

    const browserTabBtn = await screen.findByTestId("tab-btn-card-browser");
    fireEvent.click(browserTabBtn);

    // CardBrowser should be mounted
    expect(await screen.findByTestId("input-card-search")).toBeInTheDocument();
    expect(screen.getByTestId("card-row-card-topic-1")).toBeInTheDocument();
  });

  it("3. clicking 'Duyệt danh sách thẻ' button in Flashcard Hub switches to browser tab", async () => {
    render(<TopicDetail />);

    // Go to Flashcards Hub tab
    const flashcardsTabBtn = await screen.findByTestId("tab-btn-flashcards");
    fireEvent.click(flashcardsTabBtn);

    // Find and click the Browse Cards shortcut button
    const openBrowserBtn = await screen.findByTestId("btn-open-card-browser");
    expect(openBrowserBtn).toBeInTheDocument();
    fireEvent.click(openBrowserBtn);

    // Should switch to CardBrowser
    expect(await screen.findByTestId("input-card-search")).toBeInTheDocument();
  });
});
