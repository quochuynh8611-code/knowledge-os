import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createGeminiRouter } from "../../src/server/routes/geminiRoutes";

describe("Gemini Routes Contract", () => {
  describe("POST /gemini/research", () => {
    it("1. Trả về 400 VALIDATION_ERROR khi payload không hợp lệ", async () => {
      const app = express();
      app.use(express.json());
      app.use("/api", createGeminiRouter(() => null));

      const res = await request(app)
        .post("/api/gemini/research")
        .send({ prompt: "" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
      expect(res.body.details).toBeDefined();
    });

    it("2. Trả về 503 fallback khi GEMINI_API_KEY chưa được cấu hình (getGenAI() null)", async () => {
      const app = express();
      app.use(express.json());
      app.use("/api", createGeminiRouter(() => null));

      const res = await request(app)
        .post("/api/gemini/research")
        .send({ prompt: "Khảo cứu Tứ Diệu Đế" });

      expect(res.status).toBe(503);
      expect(res.body.fallback).toBe(true);
      expect(res.body.error).toContain("GEMINI_API_KEY chưa được cấu hình");
    });
  });

  describe("POST /gemini/semantic-links", () => {
    it("3. Trả về 503 khi getGenAI() null", async () => {
      const app = express();
      app.use(express.json());
      app.use("/api", createGeminiRouter(() => null));

      const res = await request(app)
        .post("/api/gemini/semantic-links")
        .send({
          currentTopic: { title: "Chánh Kiến", type: "phat-hoc", description: "" },
          availableTopics: [],
        });

      expect(res.status).toBe(503);
      expect(res.body.error).toBe("GEMINI_API_KEY chưa được cấu hình.");
    });
  });

  describe("POST /gemini/generate-cards", () => {
    it("4. Trả về 503 khi getGenAI() null", async () => {
      const app = express();
      app.use(express.json());
      app.use("/api", createGeminiRouter(() => null));

      const res = await request(app)
        .post("/api/gemini/generate-cards")
        .send({
          topicTitle: "Bát Chánh Đạo",
          content: "Nội dung ôn tập",
        });

      expect(res.status).toBe(503);
      expect(res.body.error).toBe("GEMINI_API_KEY chưa được cấu hình.");
    });
  });
});
