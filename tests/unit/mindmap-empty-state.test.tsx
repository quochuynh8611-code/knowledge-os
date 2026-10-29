import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MindMapView } from "../../src/components/mindmap/MindMapView";
import * as mindmapDocumentStorage from "../../src/lib/mindmapDocumentStorage";
import * as mindmapProjection from "../../src/lib/mindmapProjection";
import { Topic } from "../../src/types";

// ==========================================
// Mock Data Context with Stable References
// ==========================================
let mockTopics: Topic[] = [];
let mockNotes: any[] = [];
let mockResources: any[] = [];
let mockSelectedTopicId: string | null = null;
const mockCategories: any[] = [];
const mockTags: any[] = [];
const mockAddTopic = vi.fn();

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: mockTopics,
    notes: mockNotes,
    resources: mockResources,
    selectedTopicId: mockSelectedTopicId,
    categories: mockCategories,
    tags: mockTags,
    addTopic: mockAddTopic,
    updateTopic: vi.fn(),
    deleteTopic: vi.fn(),
  }),
}));

describe("PR 4 (Phase 25): MindMap Empty State, Onboarding & Error Differentiation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTopics = [];
    mockNotes = [];
    mockResources = [];
    mockSelectedTopicId = null;
    mindmapDocumentStorage.clearVolatileStorageForTests();
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
  });

  // =========================================================================
  // 1. Workspace has NO topics (Zero-default clean slate)
  // =========================================================================
  it("Scenario 1: When workspace has 0 topics, displays positive empty state with primary and secondary CTAs and 3 micro-steps", async () => {
    mockTopics = [];
    mockSelectedTopicId = null;

    render(<MindMapView />);

    // 1. Positive title
    expect(screen.getByText("Bắt đầu sơ đồ tư duy đầu tiên")).toBeInTheDocument();

    // 2. Short description
    expect(
      screen.getByText(/Sơ đồ tư duy giúp bạn tổ chức chủ đề và phát triển các ý chính/i)
    ).toBeInTheDocument();

    // 3. Primary CTA: "Tạo chủ đề & sơ đồ đầu tiên"
    const primaryCta = screen.getByRole("button", { name: /Tạo chủ đề & sơ đồ đầu tiên/i });
    expect(primaryCta).toBeInTheDocument();

    // 4. Secondary CTA: "Nhập từ Markdown"
    const secondaryCta = screen.getByTestId("btn-empty-import-markdown");
    expect(secondaryCta).toHaveTextContent(/Nhập từ Markdown/i);

    // 5. 3 Micro-steps onboarding
    expect(screen.getByText(/Chọn một chủ đề để bắt đầu\./i)).toBeInTheDocument();
    expect(screen.getByText(/Tạo sơ đồ từ ghi chú hoặc nhập Markdown\./i)).toBeInTheDocument();
    expect(screen.getByText(/Thêm nhánh chính rồi phát triển ý chi tiết\./i)).toBeInTheDocument();

    // 6. Old dead-end negative message MUST NOT be present
    expect(
      screen.queryByText(/Không thể sinh sơ đồ tư duy — Chủ đề được chọn chưa có dữ liệu/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Chủ đề được chọn chưa có dữ liệu hoặc không tồn tại trong cây tri thức/i)
    ).not.toBeInTheDocument();

    // 7. Clicking Primary CTA opens TopicFormModal
    fireEvent.click(primaryCta);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Tạo Chủ Đề/i })).toBeInTheDocument();
    });

    // Close topic modal
    fireEvent.click(screen.getByRole("button", { name: /Đóng/i }));

    // 8. Clicking Secondary CTA opens MindMapImportPreviewModal
    fireEvent.click(secondaryCta);
    await waitFor(() => {
      expect(screen.getByText(/Xem Trước Dàn Ý Sơ Đồ Tư Duy/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 2. Topics exist, but selected topic has NO MindMap / node
  // =========================================================================
  it("Scenario 2: When topics exist but current topic has no MindMap/nodes, displays topic empty state with 'Tạo sơ đồ tư duy' and 'Nhập từ Markdown'", async () => {
    const topicA: Topic = {
      id: "topic-chua-co-so-do",
      title: "Chủ đề Lý Thuyết Lượng Tử",
      slug: "chu-de-ly-thuyet-luong-tu",
      type: "khoa-hoc",
      description: "Nghiên cứu nguyên lý bất định và hàm sóng",
      content: "Nội dung cơ bản",
      categoryId: "cat-vat-ly",
      categoryName: "Vật Lý",
      tags: ["vat-ly"],
      links: [],
      studyProgress: {
        topicId: "topic-chua-co-so-do",
        status: "not_started",
        progress: 0,
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        totalNotes: 0,
        timeSpent: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockTopics = [topicA];
    mockSelectedTopicId = "topic-chua-co-so-do";
    vi.spyOn(mindmapProjection, "projectToMindMapTree").mockReturnValue(null);

    render(<MindMapView />);

    // 1. Topic empty state title
    expect(screen.getByText("Chưa có sơ đồ tư duy cho chủ đề này")).toBeInTheDocument();

    // 2. Description
    expect(
      screen.getByText(/Chủ đề được chọn chưa có sơ đồ tư duy/i)
    ).toBeInTheDocument();

    // 3. Primary CTA: "Tạo sơ đồ tư duy"
    const primaryCta = screen.getByRole("button", { name: /Tạo sơ đồ tư duy/i });
    expect(primaryCta).toBeInTheDocument();

    // 4. Secondary CTA: "Nhập từ Markdown"
    const secondaryCta = screen.getByTestId("btn-empty-import-markdown");
    expect(secondaryCta).toHaveTextContent(/Nhập từ Markdown/i);

    // 5. Clicking Primary CTA triggers mindmap creation for the topic
    fireEvent.click(primaryCta);

    // After creation, MindMapView transitions into saved-document mode with interactive canvas
    await waitFor(() => {
      expect(screen.queryByText("Chưa có sơ đồ tư duy cho chủ đề này")).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 3. Error state must be distinct from empty state
  // =========================================================================
  it("Scenario 3: When a real error occurs, displays error state with retry button, distinctly from empty state", () => {
    mockTopics = [];
    const mockRetry = vi.fn();

    render(
      <MindMapView
        initialError="Không thể kết nối đến cơ sở dữ liệu đồ thị tri thức."
        onRetry={mockRetry}
      />
    );

    // 1. Error state header
    expect(screen.getByText("Không thể tải sơ đồ tư duy")).toBeInTheDocument();
    expect(
      screen.getByText("Không thể kết nối đến cơ sở dữ liệu đồ thị tri thức.")
    ).toBeInTheDocument();

    // 2. Empty state titles MUST NOT appear
    expect(screen.queryByText("Bắt đầu sơ đồ tư duy đầu tiên")).not.toBeInTheDocument();
    expect(screen.queryByText("Chưa có sơ đồ tư duy cho chủ đề này")).not.toBeInTheDocument();

    // 3. Retry button operates correctly
    const retryBtn = screen.getByTestId("btn-retry-mindmap");
    expect(retryBtn).toHaveTextContent(/Thử lại/i);

    fireEvent.click(retryBtn);
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });
});
