import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResourceFormModal } from "../../src/components/modals/ResourceFormModal";
import { Resource } from "../../src/types";

const mockAddResource = vi.fn();
const mockUpdateResource = vi.fn();

const mockTopics = [
  {
    id: "topic-test-01",
    title: "Chủ Đề Test",
    type: "phat-hoc" as const,
  },
];

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: mockTopics,
    addResource: mockAddResource,
    updateResource: mockUpdateResource,
  }),
}));

describe("Slice 1 RED-A: ResourceFormModal openTarget Payload Contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Case A: Mở chỉnh sửa Resource có openTarget, xóa trắng input, submit: updateResource phải nhận openTarget: null
  it("Case A: Khi chỉnh sửa tài liệu và xóa trắng ô openTarget, payload updateResource phải nhận openTarget là null", () => {
    const existingResource: Resource = {
      id: "res-edit-01",
      topicId: "topic-test-01",
      title: "Tài liệu đang có đích mở",
      type: "pdf",
      filePath: "02_PDF_Source/existing.pdf",
      openTarget: "archive://doc-existing-uuid",
      createdAt: "2026-08-01T00:00:00.000Z",
    };

    render(
      <ResourceFormModal
        isOpen={true}
        onClose={vi.fn()}
        initialResource={existingResource}
      />
    );

    // Tìm trường openTarget bằng placeholder hoặc label
    const openTargetInput = screen.getByPlaceholderText(
      /drive\.google\.com\/\.\.\. hoặc obsidian:\/\/\.\.\./i
    );
    expect(openTargetInput).toHaveValue("archive://doc-existing-uuid");

    // Người dùng xóa trắng input
    fireEvent.change(openTargetInput, { target: { value: "   " } });

    // Submit form bằng nút Lưu Tài Liệu
    const submitButton = screen.getByRole("button", { name: /lưu tài liệu/i });
    fireEvent.click(submitButton);

    expect(mockUpdateResource).toHaveBeenCalledTimes(1);
    const [callId, updatePayload] = mockUpdateResource.mock.calls[0];
    expect(callId).toBe("res-edit-01");

    // Hợp đồng quy định: Khi chủ động xóa trên form, payload phải gửi null (thay vì undefined)
    expect(updatePayload.openTarget).toBeNull();
  });

  // Case B: Đổi sang chuỗi mới có khoảng trắng: Payload chứa chuỗi đã trim
  it("Case B: Khi đổi sang chuỗi mới có khoảng trắng thừa, payload updateResource chứa chuỗi đã được trim", () => {
    const existingResource: Resource = {
      id: "res-edit-02",
      topicId: "topic-test-01",
      title: "Tài liệu thay đổi đích mở",
      type: "pdf",
      filePath: "02_PDF_Source/existing.pdf",
      openTarget: "archive://doc-old-uuid",
      createdAt: "2026-08-01T00:00:00.000Z",
    };

    render(
      <ResourceFormModal
        isOpen={true}
        onClose={vi.fn()}
        initialResource={existingResource}
      />
    );

    const openTargetInput = screen.getByPlaceholderText(
      /drive\.google\.com\/\.\.\. hoặc obsidian:\/\/\.\.\./i
    );

    fireEvent.change(openTargetInput, {
      target: { value: "   obsidian://open?vault=phat-hoc&file=Notes   " },
    });

    const submitButton = screen.getByRole("button", { name: /lưu tài liệu/i });
    fireEvent.click(submitButton);

    expect(mockUpdateResource).toHaveBeenCalledTimes(1);
    const [callId, updatePayload] = mockUpdateResource.mock.calls[0];
    expect(callId).toBe("res-edit-02");
    expect(updatePayload.openTarget).toBe("obsidian://open?vault=phat-hoc&file=Notes");
  });

  // Case C: Khi chỉ sửa title: Giá trị openTarget đang có không bị mất
  it("Case C: Khi chỉ sửa tiêu đề và không chạm vào openTarget, giá trị openTarget hiện có không bị mất", () => {
    const existingResource: Resource = {
      id: "res-edit-03",
      topicId: "topic-test-01",
      title: "Tiêu đề cũ cần sửa",
      type: "pdf",
      filePath: "02_PDF_Source/existing.pdf",
      openTarget: "archive://doc-persistent-uuid",
      createdAt: "2026-08-01T00:00:00.000Z",
    };

    render(
      <ResourceFormModal
        isOpen={true}
        onClose={vi.fn()}
        initialResource={existingResource}
      />
    );

    // Chỉ thay đổi tiêu đề
    const titleInput = screen.getByDisplayValue("Tiêu đề cũ cần sửa");
    fireEvent.change(titleInput, { target: { value: "Tiêu đề mới đã sửa" } });

    const submitButton = screen.getByRole("button", { name: /lưu tài liệu/i });
    fireEvent.click(submitButton);

    expect(mockUpdateResource).toHaveBeenCalledTimes(1);
    const [callId, updatePayload] = mockUpdateResource.mock.calls[0];
    expect(callId).toBe("res-edit-03");
    expect(updatePayload.title).toBe("Tiêu đề mới đã sửa");
    expect(updatePayload.openTarget).toBe("archive://doc-persistent-uuid");
  });
});
