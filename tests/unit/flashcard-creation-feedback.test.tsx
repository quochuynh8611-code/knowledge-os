import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { prisma } from "../../src/lib/prisma";
import * as flashcardController from "../../src/server/controllers/flashcardController";
import * as flashcardService from "../../src/server/services/flashcardService";
import { LocalStorageDataRepository, ApiDataRepository } from "../../src/services/dataRepository";
import { FlashcardFormModal } from "../../src/components/modals/FlashcardFormModal";
import { MindMapNodeDrawer } from "../../src/components/mindmap/MindMapNodeDrawer";
import { Flashcard } from "../../src/types/flashcard";

describe("PR 2 (Phase 25): Flashcard Creation Feedback & Outcome Contract", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ==========================================
  // SUITE 1: Backend Contract (POST /api/flashcards)
  // ==========================================
  describe("Backend Contract: createFlashcard controller & service", () => {
    it("Test 1: Returns HTTP 201 and outcome 'created' when creating a new flashcard", async () => {
      const mockNewCard: any = {
        id: "fc-101",
        topicId: "topic-1",
        front: "Mặt trước câu hỏi",
        back: "Mặt sau câu trả lời",
        type: "basic",
        lifecycleStatus: "active",
        idempotencyKey: "key-unique-101",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schedule: { id: "fcs-101", state: "new", dueAt: new Date().toISOString() },
      };

      vi.spyOn(flashcardService, "createFlashcard").mockResolvedValueOnce({
        ...mockNewCard,
        outcome: "created",
      } as any);

      let statusCode = 0;
      let jsonBody: any = null;
      const headers: Record<string, string> = {};

      const req: any = {
        body: {
          topicId: "topic-1",
          front: "Mặt trước câu hỏi",
          back: "Mặt sau câu trả lời",
          type: "basic",
          idempotencyKey: "key-unique-101",
        },
      };
      const res: any = {
        status: vi.fn((code: number) => {
          statusCode = code;
          return res;
        }),
        json: vi.fn((data: any) => {
          jsonBody = data;
          return res;
        }),
        setHeader: vi.fn((k: string, v: string) => {
          headers[k] = v;
          return res;
        }),
      };

      await flashcardController.createFlashcard(req, res);

      expect(statusCode).toBe(201);
      expect(jsonBody).toBeDefined();
      expect(jsonBody.outcome).toBe("created");
      expect(jsonBody.id).toBe("fc-101");
      expect(jsonBody.front).toBe("Mặt trước câu hỏi");
    });

    it("Test 2: Returns HTTP 200, outcome 'existing', and X-Idempotency-Status: HIT when key already exists", async () => {
      const mockExistingCard: any = {
        id: "fc-existing-999",
        topicId: "topic-1",
        front: "Thẻ đã tồn tại",
        back: "Nội dung cũ",
        type: "basic",
        lifecycleStatus: "active",
        idempotencyKey: "key-duplicate-999",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.spyOn(flashcardService, "createFlashcard").mockResolvedValueOnce({
        ...mockExistingCard,
        outcome: "existing",
      } as any);

      let statusCode = 0;
      let jsonBody: any = null;
      const headers: Record<string, string> = {};

      const req: any = {
        body: {
          topicId: "topic-1",
          front: "Thẻ đã tồn tại",
          back: "Nội dung cũ",
          type: "basic",
          idempotencyKey: "key-duplicate-999",
        },
      };
      const res: any = {
        status: vi.fn((code: number) => {
          statusCode = code;
          return res;
        }),
        json: vi.fn((data: any) => {
          jsonBody = data;
          return res;
        }),
        setHeader: vi.fn((k: string, v: string) => {
          headers[k] = v;
          return res;
        }),
      };

      await flashcardController.createFlashcard(req, res);

      expect(statusCode).toBe(200);
      expect(jsonBody).toBeDefined();
      expect(jsonBody.outcome).toBe("existing");
      expect(jsonBody.id).toBe("fc-existing-999");
      expect(headers["X-Idempotency-Status"]).toBe("HIT");
    });
  });

  // ==========================================
  // SUITE 2: Repository Adapters
  // ==========================================
  describe("Repository Adapters: outcome preservation", () => {
    it("Test 3: LocalStorageDataRepository returns outcome 'created' for new card and 'existing' for duplicate key", async () => {
      const repo = new LocalStorageDataRepository();

      // First create
      const card1 = await repo.createFlashcard({
        topicId: "topic-1",
        front: "Front 1",
        back: "Back 1",
        type: "basic",
        idempotencyKey: "local-repo-test-key",
      });

      expect((card1 as any).outcome).toBe("created");
      expect(card1.front).toBe("Front 1");

      // Duplicate create
      const card2 = await repo.createFlashcard({
        topicId: "topic-1",
        front: "Front 1 duplicate",
        back: "Back 1 duplicate",
        type: "basic",
        idempotencyKey: "local-repo-test-key",
      });

      expect((card2 as any).outcome).toBe("existing");
      expect(card2.id).toBe(card1.id);
    });

    it("Test 4: ApiDataRepository preserves server outcome 'created' and 'existing'", async () => {
      const local = new LocalStorageDataRepository();
      const apiRepo = new ApiDataRepository("/api", local);

      // Spy getUrl to simulate online API
      vi.spyOn(apiRepo as any, "getUrl").mockReturnValue("http://localhost:3000/api/flashcards");

      // Mock fetch response for created (201)
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: "server-fc-1",
          topicId: "topic-1",
          front: "Server Front",
          back: "Server Back",
          type: "basic",
          outcome: "created",
        }),
      } as any);

      const resCreated = await apiRepo.createFlashcard({
        topicId: "topic-1",
        front: "Server Front",
        back: "Server Back",
        type: "basic",
        idempotencyKey: "api-key-1",
      });

      expect((resCreated as any).outcome).toBe("created");

      // Mock fetch response for duplicate (200)
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "server-fc-1",
          topicId: "topic-1",
          front: "Server Front",
          back: "Server Back",
          type: "basic",
          outcome: "existing",
        }),
      } as any);

      const resExisting = await apiRepo.createFlashcard({
        topicId: "topic-1",
        front: "Server Front",
        back: "Server Back",
        type: "basic",
        idempotencyKey: "api-key-1",
      });

      expect((resExisting as any).outcome).toBe("existing");
    });
  });

  // ==========================================
  // SUITE 3: UI Feedback (FlashcardFormModal)
  // ==========================================
  describe("UI Feedback: FlashcardFormModal", () => {
    it("Test 5: FlashcardFormModal displays 'Đã tạo thẻ ôn tập thành công.' when outcome is created", async () => {
      const user = userEvent.setup();
      const mockCreate = vi.fn().mockResolvedValue({
        id: "fc-created-1",
        topicId: "topic-1",
        front: "Câu hỏi test",
        back: "Câu trả lời test",
        type: "basic",
        outcome: "created",
      });

      render(
        <FlashcardFormModal
          isOpen={true}
          onClose={vi.fn()}
          defaultTopicId="topic-1"
          dataRepository={{ createFlashcard: mockCreate }}
        />
      );

      await user.type(screen.getByTestId("input-front"), "Câu hỏi test");
      await user.type(screen.getByTestId("input-back"), "Câu trả lời test");
      await user.click(screen.getByTestId("btn-submit-flashcard"));

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalled();
        expect(screen.getByText("Đã tạo thẻ ôn tập thành công.")).toBeInTheDocument();
      });
    });

    it("Test 6: FlashcardFormModal displays 'Thẻ này đã tồn tại — không tạo trùng.' and NOT created message when outcome is existing", async () => {
      const user = userEvent.setup();
      const mockCreate = vi.fn().mockResolvedValue({
        id: "fc-existing-1",
        topicId: "topic-1",
        front: "Câu hỏi trùng",
        back: "Câu trả lời cũ",
        type: "basic",
        outcome: "existing",
      });

      render(
        <FlashcardFormModal
          isOpen={true}
          onClose={vi.fn()}
          defaultTopicId="topic-1"
          dataRepository={{ createFlashcard: mockCreate }}
        />
      );

      await user.type(screen.getByTestId("input-front"), "Câu hỏi trùng");
      await user.type(screen.getByTestId("input-back"), "Câu trả lời cũ");
      await user.click(screen.getByTestId("btn-submit-flashcard"));

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalled();
        expect(screen.getByText("Thẻ này đã tồn tại — không tạo trùng.")).toBeInTheDocument();
        expect(screen.queryByText("Đã tạo thẻ ôn tập thành công.")).not.toBeInTheDocument();
      });
    });

    it("Test 7: FlashcardFormModal disables submit button during request to prevent double submit", async () => {
      let resolveSubmission: (val: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolveSubmission = resolve;
      });

      const mockCreate = vi.fn().mockReturnValue(pendingPromise);

      render(
        <FlashcardFormModal
          isOpen={true}
          onClose={vi.fn()}
          defaultTopicId="topic-1"
          initialFront="Front in-flight"
          initialBack="Back in-flight"
          dataRepository={{ createFlashcard: mockCreate }}
        />
      );

      const submitBtn = screen.getByTestId("btn-submit-flashcard");
      fireEvent.click(submitBtn);

      // Must be disabled while promise is pending
      expect(submitBtn).toBeDisabled();
      expect(mockCreate).toHaveBeenCalledTimes(1);

      // Attempt second click while disabled
      fireEvent.click(submitBtn);
      expect(mockCreate).toHaveBeenCalledTimes(1);

      // Resolve promise
      resolveSubmission!({
        id: "fc-done",
        topicId: "topic-1",
        front: "Front in-flight",
        back: "Back in-flight",
        type: "basic",
        outcome: "created",
      });

      await waitFor(() => {
        expect(screen.getByText("Đã tạo thẻ ôn tập thành công.")).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // SUITE 4: UI Feedback (MindMapNodeDrawer)
  // ==========================================
  describe("UI Feedback: MindMapNodeDrawer", () => {
    const sampleNode: any = {
      id: "node-demo-1",
      title: "Khái niệm Triết học",
      type: "topic",
      children: [],
    };

    it("Test 8: MindMapNodeDrawer displays 'Đã tạo thẻ ôn tập thành công.' and invokes onShowToast on created outcome", async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        id: "fc-node-created",
        topicId: "topic-1",
        front: "Khái niệm Triết học",
        back: "Ghi chú cho Khái niệm Triết học",
        type: "basic",
        outcome: "created",
      });

      const onShowToast = vi.fn();

      render(
        <MindMapNodeDrawer
          isOpen={true}
          node={sampleNode}
          topicId="topic-1"
          onClose={vi.fn()}
          onUpdateTitle={vi.fn()}
          onCreateFlashcard={mockCreate}
          onShowToast={onShowToast}
        />
      );

      const quickCreateBtn = screen.getByTestId("btn-create-flashcard-from-branch");
      fireEvent.click(quickCreateBtn);

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalled();
        expect(screen.getByText(/Đã tạo thẻ ôn tập thành công/)).toBeInTheDocument();
        expect(onShowToast).toHaveBeenCalledWith("Đã tạo thẻ ôn tập thành công.", "success");
      });
    });

    it("Test 9: MindMapNodeDrawer displays 'Thẻ này đã tồn tại — không tạo trùng.' and does NOT show created message when outcome is existing", async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        id: "fc-node-existing",
        topicId: "topic-1",
        front: "Khái niệm Triết học",
        back: "Ghi chú cho Khái niệm Triết học",
        type: "basic",
        outcome: "existing",
      });

      const onShowToast = vi.fn();

      render(
        <MindMapNodeDrawer
          isOpen={true}
          node={sampleNode}
          topicId="topic-1"
          onClose={vi.fn()}
          onUpdateTitle={vi.fn()}
          onCreateFlashcard={mockCreate}
          onShowToast={onShowToast}
        />
      );

      const quickCreateBtn = screen.getByTestId("btn-create-flashcard-from-branch");
      fireEvent.click(quickCreateBtn);

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalled();
        expect(screen.getByText("Thẻ này đã tồn tại — không tạo trùng.")).toBeInTheDocument();
        expect(screen.queryByText(/Đã tạo thẻ ôn tập thành công/)).not.toBeInTheDocument();
        expect(onShowToast).toHaveBeenCalledWith("Thẻ này đã tồn tại — không tạo trùng.", "info");
      });
    });
  });
});
