import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StudyProgressView } from "../../src/components/progress/StudyProgressView";
import { Topic, Note, Resource, Category, Tag } from "../../src/types";

// Mock fixtures
const mockTopics: Topic[] = [
  {
    id: "topic-1",
    title: "Tứ Diệu Đế",
    slug: "tu-dieu-de",
    type: "phat-hoc",
    categoryId: "cat-phat-hoc",
    categoryName: "Căn Bản Phật Học",
    description: "Bốn chân lý tối thượng.",
    content: "Khổ, Tập, Diệt, Đạo.",
    tags: ["co-ban"],
    studyProgress: {
      topicId: "topic-1",
      status: "completed",
      progress: 100,
      repetitions: 6, // Mastered
      interval: 15,
      easeFactor: 2.6,
      lastStudied: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      nextReview: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString(),
      totalNotes: 2,
      timeSpent: 120,
    },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    links: [],
  },
  {
    id: "topic-2",
    title: "Bát Chánh Đạo",
    slug: "bat-chanh-dao",
    type: "phat-hoc",
    categoryId: "cat-phat-hoc",
    categoryName: "Căn Bản Phật Học",
    description: "Con đường tám nhánh.",
    content: "Chánh kiến...",
    tags: ["dao-de"],
    studyProgress: {
      topicId: "topic-2",
      status: "in_progress",
      progress: 60,
      repetitions: 3, // Consolidating
      interval: 4,
      easeFactor: 2.4,
      lastStudied: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      nextReview: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      totalNotes: 1,
      timeSpent: 45,
    },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    links: [],
  },
  {
    id: "topic-3",
    title: "Kỳ Môn Độn Giáp",
    slug: "ky-mon-don-giap",
    type: "huyen-hoc",
    categoryId: "cat-huyen-hoc",
    categoryName: "Tam Thức",
    description: "Căn bản Kỳ Môn",
    content: "",
    tags: ["ky-mon"],
    studyProgress: {
      topicId: "topic-3",
      status: "in_progress",
      progress: 30,
      repetitions: 1, // Learning
      interval: 1,
      easeFactor: 2.2,
      lastStudied: new Date().toISOString(),
      nextReview: new Date().toISOString(), // Due today
      totalNotes: 0,
      timeSpent: 30,
    },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    links: [],
  },
];

const mockStats = {
  totalTopics: 3,
  phatHocTopics: 2,
  huyenHocTopics: 1,
  totalNotesCount: 3,
  totalResourcesCount: 2,
  totalTimeSpentMinutes: 195,
  completedTopicsCount: 1,
  dueReviewsCount: 1,
};

const mockOpenTopicDetail = vi.fn();
const mockUpdateTopicProgress = vi.fn();
const mockReviewTopicSM2 = vi.fn();

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: mockTopics,
    stats: mockStats,
    reviewQueue: [mockTopics[2]], // topic-3 due today
    openTopicDetail: mockOpenTopicDetail,
    updateTopicProgress: mockUpdateTopicProgress,
    reviewTopicSM2: mockReviewTopicSM2,
  }),
}));

describe("Workstream 5B Gate B: StudyProgress Analytics Dashboard UI Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Renders projected retention KPI cards with accurate wording", () => {
    render(<StudyProgressView />);

    // Title
    expect(
      screen.getByText(/Tiến Độ Học Tập & Spaced Repetition/i)
    ).toBeInTheDocument();

    // Projected Retention KPI card
    expect(screen.getByText(/Tỷ lệ ghi nhớ dự phóng/i)).toBeInTheDocument();

    // Mastery distribution card
    expect(screen.getByText(/Mức độ thuần thục/i)).toBeInTheDocument();
    expect(screen.getByText(/đang củng cố/i)).toBeInTheDocument();

    // Due queue today KPI card
    expect(screen.getByText(/Hàng đợi hôm nay/i)).toBeInTheDocument();
  });

  it("2. Renders 7-day review queue forecast section with day labels", () => {
    render(<StudyProgressView />);

    // Forecast header
    expect(
      screen.getByText(/Dự báo hàng đợi ôn tập 7 ngày/i)
    ).toBeInTheDocument();

    // Day labels
    expect(screen.getByText("Hôm nay")).toBeInTheDocument();
    expect(screen.getByText("Ngày mai")).toBeInTheDocument();
  });

  it("3. Progress filter buttons filter topic list smoothly", () => {
    render(<StudyProgressView />);

    // Filter by completed
    const completedButton = screen.getByRole("button", { name: /Đã hoàn thành/i });
    fireEvent.click(completedButton);

    // Only topic-1 is completed
    expect(screen.getByText("Tứ Diệu Đế")).toBeInTheDocument();
    expect(screen.queryByText("Kỳ Môn Độn Giáp")).not.toBeInTheDocument();
  });

  it("4. Review button triggers SpacedReviewModal", async () => {
    render(<StudyProgressView />);

    // Click "Bắt đầu ôn tập" button
    const reviewButton = screen.getByRole("button", { name: /Bắt đầu ôn tập/i });
    fireEvent.click(reviewButton);

    // SpacedReviewModal should be opened
    await waitFor(() => {
      expect(screen.getByText(/Ôn Tập Thông Minh/i)).toBeInTheDocument();
    });
  });
});
