import { Router } from "express";
import type { GoogleGenAI } from "@google/genai";
import { GeminiResearchInputSchema } from "../../lib/validation";
import {
  isRetryableGeminiError,
  generateContentWithResilience,
} from "../../lib/resilience";
import { logStructuredEvent } from "../../lib/security";

export function createGeminiRouter(
  getGenAI: () => GoogleGenAI | null,
): Router {
  const router = Router();

  // ==========================================
  // 1. Antigravity & Gemini Research Scholar Endpoint
  // ==========================================
  router.post("/gemini/research", async (req, res) => {
    const parsedInput = GeminiResearchInputSchema.safeParse(req.body);
    if (!parsedInput.success) {
      logStructuredEvent("warn", "GEMINI_RESEARCH_VALIDATION_ERROR", {
        errors: parsedInput.error.issues,
      });
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: parsedInput.error.issues,
      });
    }

    try {
      const {
        prompt,
        topicTitle,
        category,
        contextNotes,
        mode = "scholar_analysis",
      } = parsedInput.data;

      const ai = getGenAI();
      if (!ai) {
        return res.status(503).json({
          error:
            "GEMINI_API_KEY chưa được cấu hình. Vui lòng cấu hình API Key trong Settings > Secrets để kích hoạt Trợ lý Khảo cứu Antigravity AI.",
          fallback: true,
        });
      }

      const categoryStr = (category || "").toLowerCase();
      const isBuddhistOrMystic =
        categoryStr.includes("phật") ||
        categoryStr.includes("buddhis") ||
        categoryStr.includes("huyền") ||
        categoryStr.includes("dịch") ||
        categoryStr.includes("abhidhamma");

      let systemInstruction = `Bạn là một Học Giả Trí Tuệ Nhân Tạo Cấp Cao (Antigravity Universal Research Scholar & Engine) chuyên sâu về khảo cứu học thuật đa lĩnh vực, phân tích cấu trúc luận thuyết và tổng hợp tri thức liên ngành.

Phong cách phản hồi & Tiêu chuẩn học thuật:
- Chuẩn mực học thuật quốc tế, tư duy phản biện sắc bén, lập luận chặt chẽ và trích dẫn chuẩn xác.
- Làm rõ cấu trúc khái niệm, tiên đề nền tảng, cơ chế vận hành và phương pháp luận của chủ đề.
- Tra cứu và làm rõ thuật ngữ chuyên ngành (kèm nguyên ngữ gốc hoặc chuyển tự IAST / Hán ngữ nếu là văn bản cổ).
- Trình bày định dạng Markdown rõ ràng, có phân cấp đề mục, bảng so sánh hoặc đối chiếu luận cứ khoa học.`;

      if (isBuddhistOrMystic) {
        systemInstruction += `\n\n[Bối cảnh Chuyên sâu - Tri thức Phương Đông]: Khi khảo cứu Phật học hoặc Dịch học/Huyền học, đối chiếu chuẩn xác Tam Tạng Pali (Tipiṭaka), Luận Tạng Abhidhamma, Duy Thức Học hoặc Chu Dịch 64 Quẻ, Âm Dương Ngũ Hành và Tượng Số Lý Khí.`;
      }

      if (mode === "terminology_exegesis" || mode === "pali_sanskrit_exegesis") {
        systemInstruction += `\n\nNhiệm vụ trọng tâm hiện tại: Khảo cứu ngữ nguyên, chiết tự căn tố, tra cứu định nghĩa thuật ngữ chuyên ngành và các dị bản dịch thuật học thuật đối chiếu.`;
      } else if (
        mode === "cross_domain_synthesis" ||
        mode === "cross_domain_link"
      ) {
        systemInstruction += `\n\nNhiệm vụ trọng tâm hiện tại: Khảo cứu và thiết lập mối liên hệ liên ngành, đối chiếu các mô hình tri thức tương đương và rút ra luận điểm tổng hợp sâu sắc.`;
      } else {
        systemInstruction += `\n\nNhiệm vụ trọng tâm hiện tại: Phân tích cấu trúc khái niệm, các thành tố nội tại, tiên đề nền tảng và khung lý thuyết cốt lõi của chủ đề.`;
      }

      const promptContext =
        `Chủ đề khảo cứu: "${topicTitle || "Nghiên cứu Tổng Quát"}" (Lĩnh vực: ${category || "Khảo cứu Đa Ngành"})\n` +
        (contextNotes ? `Ghi chú ngữ cảnh: ${contextNotes}\n\n` : "") +
        `Yêu cầu nghiên cứu: ${prompt}`;

      const { text, modelUsed } = await generateContentWithResilience(ai, {
        primaryModel: "gemini-3.6-flash",
        contents: promptContext,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({
        result: text || "Không có phản hồi từ mô hình AI.",
        model: modelUsed,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logStructuredEvent("error", "GEMINI_RESEARCH_API_ERROR", {
        error: error?.message || String(error),
      });
      const isOverloaded = isRetryableGeminiError(error);
      const friendlyMsg = isOverloaded
        ? "Hệ thống AI hiện đang tiếp nhận lượng truy cập cao (503/429). Vui lòng thử lại sau 5–10 giây."
        : error.message || "Lỗi xử lý yêu cầu nghiên cứu từ Gemini API.";
      res.status(500).json({
        error: friendlyMsg,
      });
    }
  });

  // ==========================================
  // 2. Semantic Link Discovery between Topics
  // ==========================================
  router.post("/gemini/semantic-links", async (req, res) => {
    try {
      const { currentTopic, availableTopics } = req.body;
      const ai = getGenAI();

      if (!ai) {
        return res.status(503).json({
          error: "GEMINI_API_KEY chưa được cấu hình.",
        });
      }

      const prompt = `Phân tích chủ đề hiện tại:
- Tiêu đề: ${currentTopic.title}
- Thể loại: ${currentTopic.type}
- Mô tả: ${currentTopic.description}

Dưới đây là danh sách các chủ đề khác trong hệ thống:
${JSON.stringify(
  availableTopics.map((t: any) => ({
    id: t.id,
    title: t.title,
    type: t.type,
    category: t.categoryName,
  })),
)}

Hãy phát hiện từ 2 đến 5 liên kết tri thức sâu sắc và có căn cứ nhất giữa chủ đề hiện tại và các chủ đề trong danh sách (đặc biệt ưu tiên các mối liên hệ giao thoa giữa Phật Học và Huyền Học).
Trả về kết quả ở dạng JSON thuần túy theo cấu trúc:
[
  {
    "targetId": "string",
    "targetTitle": "string",
    "linkType": "related" | "prerequisite" | "advanced" | "contradicts",
    "strength": number (1-5),
    "explanation": "string giải thích ngắn gọn 1-2 câu về mối tương quan học thuật"
  }
]`;

      const { text } = await generateContentWithResilience(ai, {
        primaryModel: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          systemInstruction:
            "Bạn là chuyên gia khai phá biểu đồ tri thức (Knowledge Graph AI) cho Phật học và Huyền học Đông phương.",
        },
      });

      let parsedLinks = [];
      try {
        parsedLinks = JSON.parse(text || "[]");
      } catch (e) {
        console.error("Error parsing links JSON:", e);
      }

      res.json({ links: parsedLinks });
    } catch (error: any) {
      console.error("Semantic Link Error:", error);
      const isOverloaded = isRetryableGeminiError(error);
      const friendlyMsg = isOverloaded
        ? "Hệ thống AI hiện đang tiếp nhận lượng truy cập cao (503/429). Vui lòng thử lại sau 5–10 giây."
        : error.message || "Lỗi phân tích liên kết tri thức.";
      res.status(500).json({ error: friendlyMsg });
    }
  });

  // ==========================================
  // 3. Generate Spaced Repetition Cards (Flashcards & Quiz)
  // ==========================================
  router.post("/gemini/generate-cards", async (req, res) => {
    try {
      const { topicTitle, content, noteContent } = req.body;
      const ai = getGenAI();

      if (!ai) {
        return res
          .status(503)
          .json({ error: "GEMINI_API_KEY chưa được cấu hình." });
      }

      const prompt = `Tạo 3 câu hỏi ôn tập chuyên sâu theo phương pháp Spaced Repetition (SM-2) cho chủ đề: "${topicTitle}".
Nội dung tài liệu:
${content}
${noteContent ? `Ghi chú đi kèm: ${noteContent}` : ""}

Yêu cầu định dạng JSON:
[
  {
    "question": "Câu hỏi khảo cứu hoặc phân định khái niệm",
    "answer": "Câu trả lời cô đọng, chính xác, có thuật ngữ gốc",
    "difficulty": "easy" | "medium" | "hard",
    "tags": ["tag1", "tag2"]
  }
]`;

      const { text } = await generateContentWithResilience(ai, {
        primaryModel: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          systemInstruction:
            "Bạn là giảng sư Phật học và dịch học tạo giáo trình ôn tập trí nhớ cao cấp.",
        },
      });

      let cards = [];
      try {
        cards = JSON.parse(text || "[]");
      } catch (e) {
        console.error("Error parsing cards JSON:", e);
      }

      res.json({ cards });
    } catch (error: any) {
      console.error("Generate Cards Error:", error);
      const isOverloaded = isRetryableGeminiError(error);
      const friendlyMsg = isOverloaded
        ? "Hệ thống AI hiện đang tiếp nhận lượng truy cập cao (503/429). Vui lòng thử lại sau 5–10 giây."
        : error.message || "Lỗi sinh thẻ ôn tập.";
      res.status(500).json({ error: friendlyMsg });
    }
  });

  return router;
}
