import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  MindMapNodeDrawer,
  computeMindMapFlashcardIdempotencyKey,
} from "../../src/components/mindmap/MindMapNodeDrawer";
import {
  LocalStorageDataRepository,
  ApiDataRepository,
} from "../../src/services/dataRepository";
import { dataRepository } from "../../src/context/DataContext";

describe("Commit 5: Prevent Duplicate Flashcard Creation", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const validNode: any = {
    id: "node-1",
    title: "Khái niệm Siêu nhận thức",
    type: "topic",
    domain: "general",
    hopDistance: 1,
    parentHopId: "topic-1",
    tags: ["education"],
    children: [
      { id: "sub-1", title: "Nhận thức về tư duy", type: "topic", hopDistance: 2, tags: [], children: [] },
    ],
  };

  describe("Unit: computeMindMapFlashcardIdempotencyKey", () => {
    it("generates standardized idempotencyKey matching mindmap-flashcard:{topicId}:{nodeId}", () => {
      const key = computeMindMapFlashcardIdempotencyKey("topic-1", "node-1");
      expect(key).toBe("mindmap-flashcard:topic-1:node-1");
    });

    it("returns null when topicId or nodeId is missing or empty", () => {
      expect(computeMindMapFlashcardIdempotencyKey("", "node-1")).toBeNull();
      expect(computeMindMapFlashcardIdempotencyKey("topic-1", "")).toBeNull();
      expect(computeMindMapFlashcardIdempotencyKey(undefined, "node-1")).toBeNull();
      expect(computeMindMapFlashcardIdempotencyKey("topic-1", null)).toBeNull();
      expect(computeMindMapFlashcardIdempotencyKey("  ", "  ")).toBeNull();
    });
  });

  describe("Scenario: Nhấp đúp chỉ tạo một flashcard", () => {
    it("prevents double-submit and only creates a single flashcard with same idempotencyKey", async () => {
      let resolveCall: () => void;
      const deferredPromise = new Promise<void>((res) => {
        resolveCall = res;
      });

      const onCreateFlashcard = vi.fn().mockImplementation(() => deferredPromise);

      render(
        <MindMapNodeDrawer
          isOpen={true}
          node={validNode}
          topicId="topic-1"
          onClose={vi.fn()}
          onUpdateTitle={vi.fn()}
          onCreateFlashcard={onCreateFlashcard}
        />
      );

      const btn = screen.getByTestId("btn-create-flashcard-from-branch");

      // When nhấn "Tạo Flashcards từ nhánh này" hai lần liên tiếp
      fireEvent.click(btn);
      fireEvent.click(btn);

      // Then chỉ có đúng một flashcard được tạo (được gọi 1 lần trong khi đang tạo)
      await waitFor(() => {
        expect(onCreateFlashcard).toHaveBeenCalledTimes(1);
      });
      expect(onCreateFlashcard).toHaveBeenCalledWith(
        expect.objectContaining({
          idempotencyKey: "mindmap-flashcard:topic-1:node-1",
        })
      );

      // Nút bị disable khi đang tạo
      expect(btn).toBeDisabled();

      // Resolve pending call
      resolveCall!();

      await waitFor(() => {
        expect(btn).not.toBeDisabled();
      });
    });
  });

  describe("Scenario: Flashcard đã tồn tại không được tạo lại", () => {
    it("detects existing flashcard by idempotencyKey and displays already-exists notice without duplicate create", async () => {
      // Given đã tồn tại flashcard với idempotencyKey "mindmap-flashcard:topic-1:node-1"
      await dataRepository.createFlashcard!({
        topicId: "topic-1",
        type: "basic",
        front: "Khái niệm Siêu nhận thức",
        back: "• Nhận thức về tư duy",
        idempotencyKey: "mindmap-flashcard:topic-1:node-1",
      });

      const onCreateFlashcard = vi.fn();

      render(
        <MindMapNodeDrawer
          isOpen={true}
          node={validNode}
          topicId="topic-1"
          onClose={vi.fn()}
          onUpdateTitle={vi.fn()}
          onCreateFlashcard={onCreateFlashcard}
        />
      );

      const btn = screen.getByTestId("btn-create-flashcard-from-branch");

      // When người dùng tạo flashcard cho node-1
      fireEvent.click(btn);

      await waitFor(() => {
        expect(screen.getByTestId("flashcard-export-feedback")).toHaveTextContent(
          "Flashcard cho nhánh này đã tồn tại"
        );
      });

      // Then hệ thống không tạo flashcard mới
      expect(onCreateFlashcard).not.toHaveBeenCalled();
    });
  });

  describe("Scenario: Flashcard tồn tại sau reload", () => {
    it("persists created flashcard into repository and preserves it across reload without duplicates", async () => {
      // Render drawer
      const { unmount } = render(
        <MindMapNodeDrawer
          isOpen={true}
          node={validNode}
          topicId="topic-1"
          onClose={vi.fn()}
          onUpdateTitle={vi.fn()}
        />
      );

      const btn = screen.getByTestId("btn-create-flashcard-from-branch");
      fireEvent.click(btn);

      await waitFor(() => {
        expect(screen.getByTestId("flashcard-export-feedback")).toHaveTextContent(
          "Đã tạo thẻ ôn tập thành công!"
        );
      });

      unmount();

      // When reload dữ liệu (truy vấn repository sau unmount/reload)
      const cards = await dataRepository.getFlashcards!({ topicId: "topic-1" });

      // Then flashcard vẫn tồn tại
      expect(cards.length).toBe(1);
      expect(cards[0].front).toBe(validNode.title);
      expect((cards[0] as any).idempotencyKey).toBe("mindmap-flashcard:topic-1:node-1");

      // Và không có bản sao trùng
      const duplicates = cards.filter(
        (c) => (c as any).idempotencyKey === "mindmap-flashcard:topic-1:node-1"
      );
      expect(duplicates.length).toBe(1);
    });
  });

  describe("Scenario: Backend lỗi không được báo thành công", () => {
    it("displays error message and retains retry capability when backend fails with 500", async () => {
      const onCreateFlashcard = vi
        .fn()
        .mockRejectedValueOnce(new Error("Lỗi máy chủ nội bộ 500"))
        .mockResolvedValueOnce(undefined);

      render(
        <MindMapNodeDrawer
          isOpen={true}
          node={validNode}
          topicId="topic-1"
          onClose={vi.fn()}
          onUpdateTitle={vi.fn()}
          onCreateFlashcard={onCreateFlashcard}
        />
      );

      const btn = screen.getByTestId("btn-create-flashcard-from-branch");

      // When người dùng bấm tạo flashcard và backend trả 500
      fireEvent.click(btn);

      // Then UI hiển thị lỗi
      await waitFor(() => {
        const feedback = screen.getByTestId("flashcard-export-feedback");
        expect(feedback).toHaveTextContent(/Lỗi.*500/i);
      });

      // And không đánh dấu node đã có flashcard thành công, người dùng có thể thử lại
      expect(btn).not.toBeDisabled();

      // When người dùng thử lại
      fireEvent.click(btn);

      await waitFor(() => {
        expect(onCreateFlashcard).toHaveBeenCalledTimes(2);
        expect(screen.getByTestId("flashcard-export-feedback")).toHaveTextContent(
          "Đã tạo thẻ ôn tập thành công!"
        );
      });
    });
  });

  describe("Scenario: Thiếu topicId hoặc nodeId phải chặn", () => {
    it("blocks flashcard creation and displays invalid data error when topicId or nodeId is missing", async () => {
      const onCreateFlashcard = vi.fn();
      const invalidNode: any = {
        id: "", // Missing nodeId!
        title: "Node không hợp lệ",
        type: "topic",
        domain: "general",
        hopDistance: 1,
        tags: [],
        children: [],
      };

      render(
        <MindMapNodeDrawer
          isOpen={true}
          node={invalidNode}
          topicId="" // Missing topicId!
          onClose={vi.fn()}
          onUpdateTitle={vi.fn()}
          onCreateFlashcard={onCreateFlashcard}
        />
      );

      const btn = screen.getByTestId("btn-create-flashcard-from-branch");
      fireEvent.click(btn);

      // Then không gọi API tạo flashcard
      expect(onCreateFlashcard).not.toHaveBeenCalled();

      // And hiển thị lỗi dữ liệu không hợp lệ
      expect(screen.getByTestId("flashcard-export-feedback")).toHaveTextContent(
        /thiếu topicId hoặc nodeId/i
      );
    });
  });

  describe("Architectural Invariants & Backend Sync Resilience", () => {
    it("Test 1 & 5: id và idempotencyKey phải là hai giá trị khác nhau, id luôn sinh theo chuẩn fc-", async () => {
      const card = await dataRepository.createFlashcard!({
        topicId: "topic-1",
        type: "basic",
        front: "Mặt trước",
        back: "Mặt sau",
        idempotencyKey: "mindmap-flashcard:topic-1:node-distinct",
      });

      expect(card.id).not.toBe(card.idempotencyKey);
      expect(card.id).toMatch(/^fc-\d+-[a-z0-9]+$/);
      expect(card.idempotencyKey).toBe("mindmap-flashcard:topic-1:node-distinct");
    });

    it("Test 4: Hai lần tạo cùng idempotencyKey chỉ có một bản ghi flashcard", async () => {
      const card1 = await dataRepository.createFlashcard!({
        topicId: "topic-1",
        type: "basic",
        front: "Card 1",
        back: "Back 1",
        idempotencyKey: "mindmap-flashcard:topic-1:node-dup-check",
      });
      const card2 = await dataRepository.createFlashcard!({
        topicId: "topic-1",
        type: "basic",
        front: "Card 2 (different content)",
        back: "Back 2",
        idempotencyKey: "mindmap-flashcard:topic-1:node-dup-check",
      });

      expect(card1.id).toBe(card2.id);
      const allCards = await dataRepository.getFlashcards!({ topicId: "topic-1" });
      const matches = allCards.filter(
        (c) => c.idempotencyKey === "mindmap-flashcard:topic-1:node-dup-check"
      );
      expect(matches.length).toBe(1);
    });

    it("Test 1 (API): API thành công thì flashcard trả về phải có id do backend sinh, không phải idempotencyKey", async () => {
      const serverUUID = "server-uuid-12345-67890";
      const apiRepo = new ApiDataRepository("/api");

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: serverUUID,
          topicId: "topic-1",
          type: "basic",
          front: "Front",
          back: "Back",
          idempotencyKey: "mindmap-flashcard:topic-1:node-api-success",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      } as any);

      const card = await apiRepo.createFlashcard({
        topicId: "topic-1",
        type: "basic",
        front: "Front",
        back: "Back",
        idempotencyKey: "mindmap-flashcard:topic-1:node-api-success",
      });

      expect(card.id).toBe(serverUUID);
      expect(card.id).not.toBe("mindmap-flashcard:topic-1:node-api-success");
      expect(card.syncStatus).toBe("synced");

      fetchSpy.mockRestore();
    });

    it("Test 2 (API): API thất bại thì không được báo thành công như một kết quả đồng bộ backend", async () => {
      const apiRepo = new ApiDataRepository("/api");

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (_info: any, init: any) => {
        if (init?.method === "POST") {
          return {
            ok: false,
            status: 500,
            json: async () => ({ error: "Internal Server Error" }),
          } as any;
        }
        return {
          ok: true,
          status: 200,
          json: async () => [],
        } as any;
      });

      render(
        <MindMapNodeDrawer
          isOpen={true}
          node={validNode}
          topicId="topic-1"
          onClose={vi.fn()}
          onUpdateTitle={vi.fn()}
          onCreateFlashcard={async (cardInput) => {
            return await apiRepo.createFlashcard(cardInput);
          }}
        />
      );

      const btn = screen.getByTestId("btn-create-flashcard-from-branch");
      fireEvent.click(btn);

      await waitFor(() => {
        const feedback = screen.getByTestId("flashcard-export-feedback");
        expect(feedback).toHaveTextContent("Đã lưu tạm cục bộ, chưa đồng bộ backend");
        expect(feedback).not.toHaveTextContent("Đã tạo thẻ ôn tập thành công!");
      });

      fetchSpy.mockRestore();
    });

    it("Test 3 (API): Retry sau lỗi phải gọi lại backend, không chỉ trả local fallback", async () => {
      const serverUUID = "server-uuid-after-retry";
      const apiRepo = new ApiDataRepository("/api");
      let postCalls = 0;

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (_info: any, init: any) => {
        if (init?.method === "POST") {
          postCalls++;
          if (postCalls === 1) {
            return {
              ok: false,
              status: 500,
              json: async () => ({ error: "Internal Server Error" }),
            } as any;
          }
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: serverUUID,
              topicId: "topic-1",
              type: "basic",
              front: validNode.title,
              back: "Back",
              idempotencyKey: "mindmap-flashcard:topic-1:node-1",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
          } as any;
        }
        return {
          ok: true,
          status: 200,
          json: async () => [],
        } as any;
      });

      render(
        <MindMapNodeDrawer
          isOpen={true}
          node={validNode}
          topicId="topic-1"
          onClose={vi.fn()}
          onUpdateTitle={vi.fn()}
          onCreateFlashcard={async (cardInput) => {
            return await apiRepo.createFlashcard(cardInput);
          }}
        />
      );

      const btn = screen.getByTestId("btn-create-flashcard-from-branch");

      // 1. Lần đầu click -> thất bại 500
      fireEvent.click(btn);

      await waitFor(() => {
        expect(screen.getByTestId("flashcard-export-feedback")).toHaveTextContent(
          "Đã lưu tạm cục bộ, chưa đồng bộ backend"
        );
      });
      expect(postCalls).toBe(1);

      // 2. Người dùng retry -> phải gọi lại backend
      fireEvent.click(btn);

      await waitFor(() => {
        expect(postCalls).toBe(2);
        expect(screen.getByTestId("flashcard-export-feedback")).toHaveTextContent(
          "Đã tạo thẻ ôn tập thành công!"
        );
      });

      fetchSpy.mockRestore();
    });
  });
});
