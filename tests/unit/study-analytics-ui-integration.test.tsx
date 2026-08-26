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

let currentTopics: Topic[] = mockTopics;
let currentCategories: Category[] = [];

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: currentTopics,
    categories: currentCategories,
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
    currentTopics = mockTopics;
    currentCategories = [];
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

  it("5. Renders dynamic domain legend in forecast section when 3 or more root domains exist", () => {
    currentCategories = [
      { id: "cat-phat-hoc", name: "Phật Học", slug: "phat-hoc", parentId: null },
      { id: "cat-huyen-hoc", name: "Huyền Học", slug: "huyen-hoc", parentId: null },
      { id: "cat-triet-hoc", name: "Triết Học Tây Phương", slug: "triet-hoc", parentId: null },
    ];

    currentTopics = [
      ...mockTopics,
      {
        id: "topic-4",
        title: "Hiện tượng học Tinh thần",
        slug: "hien-tuong-hoc",
        type: "triet-hoc",
        categoryId: "cat-triet-hoc",
        categoryName: "Triết Học Tây Phương",
        description: "Triết học Hegel",
        content: "",
        tags: ["triet-hoc"],
        studyProgress: {
          topicId: "topic-4",
          status: "in_progress",
          progress: 50,
          repetitions: 2,
          interval: 2,
          easeFactor: 2.5,
          nextReview: new Date().toISOString(),
          totalNotes: 1,
          timeSpent: 40,
        },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        links: [],
      },
    ];

    render(<StudyProgressView />);

    // Legend should contain the 3rd root domain name as well as default domains
    expect(screen.getAllByText("Triết Học Tây Phương").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Phật Học").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Huyền Học").length).toBeGreaterThanOrEqual(1);
  });

  it("6. Renders category balance breakdown dynamically for new root domains without crashing", () => {
    currentCategories = [
      { id: "cat-phat-hoc", name: "Phật Học", slug: "phat-hoc", parentId: null },
      { id: "cat-huyen-hoc", name: "Huyền Học", slug: "huyen-hoc", parentId: null },
      { id: "cat-triet-hoc", name: "Triết Học Tây Phương", slug: "triet-hoc", parentId: null },
    ];

    render(<StudyProgressView />);

    expect(screen.getByText("Cân bằng lĩnh vực")).toBeInTheDocument();
    expect(screen.getAllByText("Triết Học Tây Phương").length).toBeGreaterThanOrEqual(1);
  });

  it("7. Resolves topic badge and progress bar styling with neutral fallback rather than defaulting to Huyền Học", () => {
    currentCategories = [
      { id: "cat-phat-hoc", name: "Phật Học", slug: "phat-hoc", parentId: null },
      { id: "cat-huyen-hoc", name: "Huyền Học", slug: "huyen-hoc", parentId: null },
      { id: "cat-triet-hoc", name: "Triết Học Tây Phương", slug: "triet-hoc", parentId: null },
    ];

    const nonHuyenHocTopic: Topic = {
      id: "topic-99",
      title: "Triết Học Kant Khảo Lược",
      slug: "triet-hoc-kant",
      type: "triet-hoc",
      categoryId: "cat-triet-hoc",
      categoryName: "Triết Học Tây Phương",
      description: "Phê phán lý tính thuần túy",
      content: "",
      tags: ["triet-hoc"],
      studyProgress: {
        topicId: "topic-99",
        status: "in_progress",
        progress: 75,
        repetitions: 2,
        interval: 2,
        easeFactor: 2.5,
        nextReview: new Date().toISOString(),
        totalNotes: 1,
        timeSpent: 40,
      },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      links: [],
    };

    currentTopics = [nonHuyenHocTopic];

    const { container } = render(<StudyProgressView />);

    // Check badge: should NOT have bg-indigo-100 (Huyền Học badge class)
    const badges = screen.getAllByText("Triết Học Tây Phương");
    const badge = badges[badges.length - 1];
    expect(badge.className).not.toContain("bg-indigo-100");
    expect(badge.className).not.toContain("text-indigo-900");

    // Check progress bar: should NOT have bg-indigo-600 (Huyền Học bar color)
    const progressBar = container.querySelector(".h-full.rounded-full");
    expect(progressBar).not.toBeNull();
    expect(progressBar?.className).not.toContain("bg-indigo-600");
    expect(progressBar?.className).not.toContain("bg-amber-600");
  });

  it("8. Weekly study chart and legend dynamically render bars and legends for custom root categories without hardcoded Phật Học / Huyền Học", () => {
    currentCategories = [
      { id: "cat-root-kinh-te", name: "Kinh Tế Học", slug: "kinh-te", parentId: null },
      { id: "cat-root-triet-hoc", name: "Triết Học", slug: "triet-hoc", parentId: null },
    ];

    currentTopics = [
      {
        id: "topic-kt",
        title: "Kinh Tế Vĩ Mô",
        slug: "kinh-te-vi-mo",
        type: "kinh-te",
        categoryId: "cat-root-kinh-te",
        categoryName: "Kinh Tế Học",
        description: "Mô tả",
        content: "Nội dung",
        tags: ["kinh-te"],
        studyProgress: {
          topicId: "topic-kt",
          status: "in_progress",
          progress: 50,
          repetitions: 2,
          interval: 2,
          easeFactor: 2.5,
          nextReview: new Date().toISOString(),
          totalNotes: 0,
          timeSpent: 60,
        },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        links: [],
      },
      {
        id: "topic-th",
        title: "Hiện Tượng Luận",
        slug: "hien-tuong-luan",
        type: "triet-hoc",
        categoryId: "cat-root-triet-hoc",
        categoryName: "Triết Học",
        description: "Mô tả",
        content: "Nội dung",
        tags: ["triet-hoc"],
        studyProgress: {
          topicId: "topic-th",
          status: "in_progress",
          progress: 40,
          repetitions: 1,
          interval: 1,
          easeFactor: 2.5,
          nextReview: new Date().toISOString(),
          totalNotes: 0,
          timeSpent: 40,
        },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        links: [],
      },
    ];

    render(<StudyProgressView />);

    // In the Weekly study section, the legend should render Kinh Tế Học and Triết Học, NOT hardcoded Phật Học and Huyền Học
    const weeklyHeading = screen.getByText("Thời gian nghiên cứu tuần này (Phút)");
    const weeklyCard = weeklyHeading.closest("div")?.parentElement;
    expect(weeklyCard).not.toBeNull();

    expect(weeklyCard!.textContent).toContain("Kinh Tế Học");
    expect(weeklyCard!.textContent).toContain("Triết Học");
    expect(weeklyCard!.textContent).not.toContain("Phật Học");
    expect(weeklyCard!.textContent).not.toContain("Huyền Học");
  });
});
