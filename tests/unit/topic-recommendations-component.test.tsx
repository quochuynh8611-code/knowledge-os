import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TopicRecommendations } from "../../src/components/research/TopicRecommendations";
import type { Flashcard, FlashcardReview } from "../../src/types/flashcard";
import type { Topic } from "../../src/types/index";

describe("TopicRecommendations Component", () => {
  const mockTopics: Topic[] = [
    {
      id: "top-1",
      title: "Chánh Niệm",
      slug: "chanh-niem",
      categoryId: "cat-1",
      type: "study",
      description: "Chánh niệm",
      content: "",
      tags: [],
      links: [],
      studyProgress: {
        topicId: "top-1",
        status: "in_progress",
        progress: 40,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 1,
        totalNotes: 5,
        timeSpent: 30,
        lastStudied: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "top-2",
      title: "Tứ Diệu Đế",
      slug: "tu-dieu-de",
      categoryId: "cat-1",
      type: "study",
      description: "Tứ Diệu Đế",
      content: "",
      tags: [],
      links: [],
      studyProgress: {
        topicId: "top-2",
        status: "completed",
        progress: 100,
        interval: 5,
        easeFactor: 2.5,
        repetitions: 3,
        totalNotes: 5,
        timeSpent: 50,
        lastStudied: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const mockCards: Flashcard[] = [
    {
      id: "c1",
      topicId: "top-1",
      type: "basic",
      front: "F1",
      back: "B1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schedule: {
        id: "s1",
        flashcardId: "c1",
        state: "review",
        dueAt: new Date("2026-09-01").toISOString(), // Due
        interval: 1,
        easeFactor: 2.5,
        repetitions: 1,
        lapses: 1,
        updatedAt: new Date().toISOString(),
      },
    },
  ];

  const mockReviews: FlashcardReview[] = [
    {
      id: "r1",
      clientEventId: "e1",
      flashcardId: "c1",
      topicId: "top-1",
      rating: 2, // Hard -> lower retention
      reviewDurationMs: 4000,
      reviewedAt: new Date().toISOString(),
      stateBefore: "review",
      stateAfter: "review",
      intervalBefore: 1,
      intervalAfter: 1,
      easeFactorBefore: 2.5,
      easeFactorAfter: 2.35,
      dueBeforeAt: new Date().toISOString(),
      dueAfterAt: new Date().toISOString(),
    },
  ];

  it("renders empty state when topics list is empty", () => {
    render(<TopicRecommendations topics={[]} cards={[]} reviews={[]} />);
    expect(
      screen.getByText(/Chưa có chủ đề nào để gợi ý lộ trình học tập/i)
    ).toBeInTheDocument();
  });

  it("renders recommendation header, total due badge, and time budget selector", () => {
    render(
      <TopicRecommendations
        topics={mockTopics}
        cards={mockCards}
        reviews={mockReviews}
      />
    );

    expect(screen.getByTestId("topic-recommendations")).toBeInTheDocument();
    expect(screen.getByTestId("total-due-badge")).toHaveTextContent("1 thẻ đến hạn");
    expect(screen.getByTestId("time-budget-selector")).toBeInTheDocument();
    expect(screen.getByText("15 phút")).toBeInTheDocument();
    expect(screen.getByText("30 phút")).toBeInTheDocument();
    expect(screen.getByText("60 phút")).toBeInTheDocument();
  });

  it("renders Top Recommendation hero with Next Best Topic badge and explainable rationale", () => {
    render(
      <TopicRecommendations
        topics={mockTopics}
        cards={mockCards}
        reviews={mockReviews}
      />
    );

    expect(screen.getByTestId("top-recommendation-hero")).toBeInTheDocument();
    expect(screen.getByTestId("next-best-topic-badge")).toBeInTheDocument();
    expect(screen.getByText("Chánh Niệm")).toBeInTheDocument();
    expect(
      screen.getByTestId("top-recommendation-explanation")
    ).toHaveTextContent(/Lý do đề xuất/i);
  });

  it("allows switching time budget selector", () => {
    render(
      <TopicRecommendations
        topics={mockTopics}
        cards={mockCards}
        reviews={mockReviews}
      />
    );

    const btn15 = screen.getByText("15 phút");
    fireEvent.click(btn15);

    expect(
      screen.getByTestId("top-recommendation-explanation")
    ).toHaveTextContent(/15m/i);
  });

  it("calls onStartReview when clicking the CTA button", () => {
    const handleStartReview = vi.fn();
    render(
      <TopicRecommendations
        topics={mockTopics}
        cards={mockCards}
        reviews={mockReviews}
        onStartReview={handleStartReview}
      />
    );

    const startBtn = screen.getByTestId("start-review-top-btn");
    fireEvent.click(startBtn);

    expect(handleStartReview).toHaveBeenCalledWith("top-1", expect.any(Number));
  });
});
