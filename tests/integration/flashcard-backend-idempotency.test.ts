import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../../src/lib/prisma";
import * as flashcardService from "../../src/server/services/flashcardService";
import * as flashcardController from "../../src/server/controllers/flashcardController";

// In-memory mock storage for hermetic integration test
let mockDbCards: any[] = [];
let mockDbSchedules: any[] = [];

describe("Phase 11: Flashcard Idempotency End-to-End Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbCards = [];
    mockDbSchedules = [];

    // Mock prisma.$transaction
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
      const tx = {
        flashcard: {
          findUnique: vi.fn(async ({ where }: { where: { idempotencyKey?: string; id?: string } }) => {
            if (where.idempotencyKey) {
              return mockDbCards.find((c) => c.idempotencyKey === where.idempotencyKey) || null;
            }
            if (where.id) {
              return mockDbCards.find((c) => c.id === where.id) || null;
            }
            return null;
          }),
          findMany: vi.fn(async ({ where }: any = {}) => {
            let res = [...mockDbCards];
            if (where?.topicId) {
              res = res.filter((c) => c.topicId === where.topicId);
            }
            return res.map((c) => ({
              ...c,
              schedule: mockDbSchedules.find((s) => s.flashcardId === c.id) || null,
            }));
          }),
          create: vi.fn(async ({ data }: { data: any }) => {
            // Check unique constraint on idempotencyKey
            if (data.idempotencyKey) {
              const duplicate = mockDbCards.find((c) => c.idempotencyKey === data.idempotencyKey);
              if (duplicate) {
                const err = new Error("Unique constraint failed on the fields: (`idempotencyKey`)");
                (err as any).code = "P2002";
                (err as any).meta = { target: ["idempotencyKey"] };
                throw err;
              }
            }
            const newRecord = {
              id: `fc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              ...data,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            mockDbCards.push(newRecord);
            return newRecord;
          }),
        },
        flashcardSchedule: {
          create: vi.fn(async ({ data }: { data: any }) => {
            const newSched = {
              id: `fcs-${Date.now()}`,
              ...data,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            mockDbSchedules.push(newSched);
            return newSched;
          }),
        },
      };
      return await callback(tx);
    });

    (vi.spyOn(prisma.flashcard, "findUnique") as any).mockImplementation(async ({ where }: any) => {
      if (where.idempotencyKey) {
        const found = mockDbCards.find((c) => c.idempotencyKey === where.idempotencyKey);
        if (!found) return null;
        return {
          ...found,
          schedule: mockDbSchedules.find((s) => s.flashcardId === found.id) || null,
        };
      }
      if (where.id) {
        const found = mockDbCards.find((c) => c.id === where.id);
        if (!found) return null;
        return {
          ...found,
          schedule: mockDbSchedules.find((s) => s.flashcardId === found.id) || null,
        };
      }
      return null;
    });

    (vi.spyOn(prisma.flashcard, "findMany") as any).mockImplementation(async ({ where }: any = {}) => {
      let res = [...mockDbCards];
      if (where?.topicId) {
        res = res.filter((c) => c.topicId === where.topicId);
      }
      return res.map((c) => ({
        ...c,
        schedule: mockDbSchedules.find((s) => s.flashcardId === c.id) || null,
      }));
    });
  });

  // Scenario 1: Tạo flashcard với idempotencyKey
  it("Scenario 1: Given chưa có flashcard với key 'mindmap-flashcard:topic-1:node-1', When tạo flashcard với key đó, Then chỉ tạo 1 flashcard và trả về id riêng cùng idempotencyKey đúng", async () => {
    const key = "mindmap-flashcard:topic-1:node-1";
    const payload = {
      topicId: "topic-1",
      front: "Front note 1",
      back: "Back note 1",
      type: "basic",
      idempotencyKey: key,
    };

    const card = await flashcardService.createFlashcard(payload);

    expect(card).toBeDefined();
    expect(card.id).toMatch(/^fc-/);
    expect(card.id).not.toBe(key);
    expect((card as any).idempotencyKey).toBe(key);
    expect(mockDbCards.length).toBe(1);
    expect(mockDbCards[0].idempotencyKey).toBe(key);
  });

  // Scenario 2: Tạo lại cùng idempotencyKey không tạo trùng
  it("Scenario 2: Given đã có flashcard với key 'mindmap-flashcard:topic-1:node-1', When tạo flashcard lần hai với cùng key, Then hệ thống trả về flashcard hiện có và tổng số flashcard vẫn là 1", async () => {
    const key = "mindmap-flashcard:topic-1:node-1";
    const payload = {
      topicId: "topic-1",
      front: "Front note 1",
      back: "Back note 1",
      type: "basic",
      idempotencyKey: key,
    };

    const card1 = await flashcardService.createFlashcard(payload);
    const card2 = await flashcardService.createFlashcard({
      ...payload,
      front: "Modified front that should be ignored",
    });

    expect(mockDbCards.length).toBe(1);
    expect(card2.id).toBe(card1.id);
    expect((card2 as any).idempotencyKey).toBe(key);
  });

  // Scenario 3: API trả idempotencyKey về client
  it("Scenario 3: Given flashcard đã được tạo với idempotencyKey, When GET /api/flashcards?topicId=..., Then response chứa idempotencyKey và client có thể nhận diện card đã tồn tại", async () => {
    const key = "mindmap-flashcard:topic-1:node-1";
    await flashcardService.createFlashcard({
      topicId: "topic-1",
      front: "Front note 1",
      back: "Back note 1",
      type: "basic",
      idempotencyKey: key,
    });

    let jsonResult: any = null;
    const req: any = { query: { topicId: "topic-1" } };
    const res: any = {
      json: vi.fn((data) => {
        jsonResult = data;
        return res;
      }),
      status: vi.fn(() => res),
    };

    await flashcardController.getFlashcards(req, res);

    expect(jsonResult).toBeDefined();
    expect(jsonResult.length).toBe(1);
    expect(jsonResult[0].idempotencyKey).toBe(key);
    expect(jsonResult[0].id).not.toBe(key);
  });

  // Scenario 4: Hai key khác nhau được phép tạo hai card
  it("Scenario 4: Given hai idempotencyKey khác nhau, When tạo hai flashcard, Then có đúng 2 flashcard", async () => {
    const key1 = "mindmap-flashcard:topic-1:node-1";
    const key2 = "mindmap-flashcard:topic-1:node-2";

    const card1 = await flashcardService.createFlashcard({
      topicId: "topic-1",
      front: "Front 1",
      back: "Back 1",
      type: "basic",
      idempotencyKey: key1,
    });

    const card2 = await flashcardService.createFlashcard({
      topicId: "topic-1",
      front: "Front 2",
      back: "Back 2",
      type: "basic",
      idempotencyKey: key2,
    });

    expect(mockDbCards.length).toBe(2);
    expect(card1.id).not.toBe(card2.id);
    expect((card1 as any).idempotencyKey).toBe(key1);
    expect((card2 as any).idempotencyKey).toBe(key2);
  });

  // Scenario 5: Key trùng ở DB bị chặn (Concurrent race condition resilience)
  it("Scenario 5: Given hai request đồng thời dùng cùng idempotencyKey, When cả hai gọi createFlashcard, Then chỉ một card được tạo và request còn lại trả card hiện có", async () => {
    const key = "mindmap-flashcard:topic-1:node-concurrent";
    const payload = {
      topicId: "topic-1",
      front: "Front concurrent",
      back: "Back concurrent",
      type: "basic",
      idempotencyKey: key,
    };

    // Run both calls in parallel
    const [card1, card2] = await Promise.all([
      flashcardService.createFlashcard(payload),
      flashcardService.createFlashcard(payload),
    ]);

    expect(mockDbCards.length).toBe(1);
    expect(card1.id).toBe(card2.id);
    expect((card1 as any).idempotencyKey).toBe(key);
  });
});