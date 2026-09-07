import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { TopicDashboard } from "../../src/components/research/TopicDashboard";
import type { Topic, Note } from "../../src/types";
import type { Flashcard, FlashcardReview } from "../../src/types/flashcard";

describe("Phase F7.1: AI-Powered Insights Integration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mockTopics: Topic[] = [
    {
      id: "topic-pali",
      title: "Pāli Tri Thức Luận",
      slug: "pali-tri-thuc-luan",
      categoryId: "cat-buddhist",
      type: "study",
      description: "Nghiên cứu văn bản Pāli",
      content: "",
      tags: ["pali", "philosophy"],
      links: [],
      studyProgress: {
        topicId: "topic-pali",
        status: "in_progress",
        progress: 60,
        interval: 3,
        easeFactor: 2.5,
        repetitions: 2,
        totalNotes: 6,
        timeSpent: 90,
      },
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-01T00:00:00Z",
    },
    {
      id: "topic-meditation",
      title: "Thiền Minh Sát",
      slug: "thien-minh-sat",
      categoryId: "cat-buddhist",
      type: "study",
      description: "Thực hành thiền Vipassanā",
      content: "",
      tags: ["vipassana"],
      links: [],
      studyProgress: {
        topicId: "topic-meditation",
        status: "in_progress",
        progress: 80,
        interval: 7,
        easeFactor: 2.6,
        repetitions: 4,
        totalNotes: 10,
        timeSpent: 150,
      },
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-01T00:00:00Z",
    },
  ];

  const mockNotes: Note[] = [
    {
      id: "note-1",
      topicId: "topic-pali",
      title: "Ghi chú Pāli ngữ pháp",
      content: "Nội dung bài viết",
      type: "study",
      isPrivate: false,
      tags: ["pali"],
      createdAt: "2026-09-01T08:00:00Z",
      updatedAt: "2026-09-02T10:00:00Z",
    },
  ];

  const mockCards: Flashcard[] = [
    {
      id: "card-1",
      topicId: "topic-pali",
      type: "basic",
      front: "Sabbe sankhara anicca",
      back: "Tất cả các hành là vô thường",
      createdAt: "2026-08-15T00:00:00Z",
      updatedAt: "2026-08-15T00:00:00Z",
      schedule: {
        id: "s1",
        flashcardId: "card-1",
        state: "review",
        dueAt: "2026-09-06T00:00:00Z", // Due yesterday
        interval: 3,
        easeFactor: 2.3,
        repetitions: 2,
        lapses: 1,
        lastReviewedAt: "2026-09-03T00:00:00Z",
        updatedAt: "2026-09-03T00:00:00Z",
      },
    },
    {
      id: "card-2",
      topicId: "topic-pali",
      type: "basic",
      front: "Sabbe dhamma anatta",
      back: "Tất cả các pháp là vô ngã",
      createdAt: "2026-08-15T00:00:00Z",
      updatedAt: "2026-08-15T00:00:00Z",
      schedule: {
        id: "s2",
        flashcardId: "card-2",
        state: "review",
        dueAt: "2026-09-07T00:00:00Z", // Due today
        interval: 4,
        easeFactor: 2.5,
        repetitions: 3,
        lapses: 0,
        lastReviewedAt: "2026-09-03T00:00:00Z",
        updatedAt: "2026-09-03T00:00:00Z",
      },
    },
  ];

  const mockReviews: FlashcardReview[] = [
    {
      id: "r1",
      clientEventId: "e1",
      flashcardId: "card-1",
      topicId: "topic-pali",
      rating: 2,
      reviewDurationMs: 4500,
      reviewedAt: "2026-09-03T09:00:00Z",
      stateBefore: "review",
      stateAfter: "review",
      intervalBefore: 2,
      intervalAfter: 3,
      easeFactorBefore: 2.5,
      easeFactorAfter: 2.3,
      dueBeforeAt: "2026-09-03T00:00:00Z",
      dueAfterAt: "2026-09-06T00:00:00Z",
    },
    {
      id: "r2",
      clientEventId: "e2",
      flashcardId: "card-2",
      topicId: "topic-pali",
      rating: 4,
      reviewDurationMs: 3000,
      reviewedAt: "2026-09-03T09:10:00Z",
      stateBefore: "review",
      stateAfter: "review",
      intervalBefore: 2,
      intervalAfter: 4,
      easeFactorBefore: 2.5,
      easeFactorAfter: 2.6,
      dueBeforeAt: "2026-09-03T00:00:00Z",
      dueAfterAt: "2026-09-07T00:00:00Z",
    },
  ];

  it("renders full TopicDashboard with AI-Powered Insights section", () => {
    render(
      <TopicDashboard
        topicId="topic-pali"
        topicTitle="Pāli Tri Thức Luận"
        notes={mockNotes}
        flashcards={mockCards}
        reviews={mockReviews}
        allTopics={mockTopics}
        allFlashcards={mockCards}
      />
    );

    // 1. Check AI-Powered Insights Section is rendered
    expect(screen.getByTestId("ai-powered-insights-section")).toBeInTheDocument();
    expect(
      screen.getByText("Phân Tích Thông Minh & Dự Báo (AI-Powered Insights)")
    ).toBeInTheDocument();

    // 2. Check TopicRecommendations is embedded
    expect(screen.getByTestId("topic-recommendations")).toBeInTheDocument();
    expect(screen.getByTestId("next-best-topic-badge")).toBeInTheDocument();

    // 3. Check RetentionPredictionChart is embedded
    expect(screen.getByTestId("retention-prediction-chart")).toBeInTheDocument();
    expect(screen.getByTestId("main-curve-path")).toBeInTheDocument();

    // 4. Check StudyPatternsHeatmap is embedded
    expect(screen.getByTestId("study-patterns-heatmap")).toBeInTheDocument();
  });

  it("allows switching prediction card in dropdown to update forgetting curve", () => {
    render(
      <TopicDashboard
        topicId="topic-pali"
        topicTitle="Pāli Tri Thức Luận"
        notes={mockNotes}
        flashcards={mockCards}
        reviews={mockReviews}
        allTopics={mockTopics}
        allFlashcards={mockCards}
      />
    );

    const cardSelect = screen.getByTestId("prediction-card-select") as HTMLSelectElement;
    expect(cardSelect).toBeInTheDocument();
    expect(cardSelect.value).toBe("card-1");

    // Change to card-2
    fireEvent.change(cardSelect, { target: { value: "card-2" } });
    expect(cardSelect.value).toBe("card-2");
  });

  it("interacts with Smart Notifications modal from dashboard header", () => {
    render(
      <TopicDashboard
        topicId="topic-pali"
        topicTitle="Pāli Tri Thức Luận"
        notes={mockNotes}
        flashcards={mockCards}
        reviews={mockReviews}
        allTopics={mockTopics}
        allFlashcards={mockCards}
      />
    );

    // Open notification modal
    const notifBtn = screen.getByTestId("research-notifications-btn");
    expect(notifBtn).toBeInTheDocument();

    fireEvent.click(notifBtn);

    // Modal should now be open
    expect(screen.getByTestId("notification-settings-modal")).toBeInTheDocument();
    expect(screen.getByText("Cài Đặt Thông Báo Thông Minh")).toBeInTheDocument();

    // Test snooze action
    const snooze1d = screen.getByTestId("snooze-1d-btn");
    fireEvent.click(snooze1d);

    expect(screen.getByTestId("notification-feedback-message")).toHaveTextContent(
      /Đã tạm hoãn thông báo/i
    );

    // Close modal
    const closeBtn = screen.getByTestId("close-notification-modal-btn");
    fireEvent.click(closeBtn);

    expect(screen.queryByTestId("notification-settings-modal")).not.toBeInTheDocument();
  });

  it("propagates onStartReview callback when user clicks start review in recommendations", () => {
    const handleStartReview = vi.fn();
    render(
      <TopicDashboard
        topicId="topic-pali"
        topicTitle="Pāli Tri Thức Luận"
        notes={mockNotes}
        flashcards={mockCards}
        reviews={mockReviews}
        allTopics={mockTopics}
        allFlashcards={mockCards}
        onStartReview={handleStartReview}
      />
    );

    const startBtn = screen.getByTestId("start-review-top-btn");
    fireEvent.click(startBtn);

    expect(handleStartReview).toHaveBeenCalledWith("topic-pali", expect.any(Number));
  });
});
