import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { prisma } from "./src/lib/prisma";
import {
  TopicCreateSchema,
  TopicUpdateSchema,
  NoteCreateSchema,
  NoteUpdateSchema,
  ResourceCreateSchema,
  SM2ReviewInputSchema,
  HydratePayloadSchema,
  BackupSnapshotSchema,
  RestoreRequestSchema,
  DbHealthResponseSchema,
  GeminiResearchInputSchema,
  calculateBackupChecksum,
  ValidatedBackupSnapshot,
  ValidatedDbHealthResponse,
} from "./src/lib/validation";
import {
  isRetryableGeminiError,
  generateContentWithResilience,
  checkDbHealth,
} from "./src/lib/resilience";
import {
  createRateLimiter,
  createRateLimitMiddleware,
  logStructuredEvent,
} from "./src/lib/security";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// ==========================================
// BACKUP & RESTORE DOMAIN HELPERS (PHASE 2B)
// ==========================================

export async function buildBackupSnapshotFromDb(
  db: typeof prisma,
): Promise<ValidatedBackupSnapshot> {
  const [categories, topics, notes, resources, tags] = await Promise.all([
    db.category.findMany({ orderBy: { order: "asc" } }),
    db.topic.findMany({
      include: {
        studyProgress: true,
        sourceLinks: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    db.note.findMany({ orderBy: { createdAt: "asc" } }),
    db.resource.findMany({ orderBy: { createdAt: "asc" } }),
    db.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  const formattedCategories = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    type: c.type as "phat-hoc" | "huyen-hoc",
    description: c.description ?? undefined,
    parentId: c.parentId ?? undefined,
    icon: c.icon ?? undefined,
    color: c.color ?? undefined,
    order: c.order,
  }));

  const formattedTopics = topics.map((t) => ({
    id: t.id,
    title: t.title,
    slug: t.slug,
    categoryId: t.categoryId,
    type: t.type as "phat-hoc" | "huyen-hoc",
    parentId: t.parentId ?? undefined,
    description: t.description,
    content: t.content,
    tags: t.tags,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    links: (t.sourceLinks || []).map((l) => ({
      id: l.id,
      sourceId: l.sourceId,
      targetId: l.targetId,
      linkType: l.linkType as
        "related" | "prerequisite" | "advanced" | "contradicts",
      strength: l.strength,
      notes: l.notes ?? undefined,
    })),
    studyProgress: t.studyProgress
      ? {
          topicId: t.studyProgress.topicId,
          status: t.studyProgress.status as
            "not_started" | "in_progress" | "completed" | "reviewing",
          progress: t.studyProgress.progress,
          interval: t.studyProgress.interval,
          easeFactor: t.studyProgress.easeFactor,
          repetitions: t.studyProgress.repetitions,
          totalNotes: t.studyProgress.totalNotes,
          timeSpent: t.studyProgress.timeSpent,
          startDate: t.studyProgress.startDate?.toISOString() ?? undefined,
          endDate: t.studyProgress.endDate?.toISOString() ?? undefined,
          lastStudied: t.studyProgress.lastStudied?.toISOString() ?? undefined,
          nextReview: t.studyProgress.nextReview?.toISOString() ?? undefined,
        }
      : undefined,
  }));

  const formattedNotes = notes.map((n) => ({
    id: n.id,
    topicId: n.topicId,
    title: n.title,
    content: n.content,
    type: n.type as "study" | "insight" | "question" | "summary",
    isPrivate: n.isPrivate,
    tags: n.tags,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }));

  const formattedResources = resources.map((r) => ({
    id: r.id,
    topicId: r.topicId,
    title: r.title,
    type: r.type as "book" | "article" | "video" | "audio" | "pdf" | "link",
    author: r.author ?? undefined,
    url: r.url ?? undefined,
    filePath: r.filePath ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  }));

  const formattedTags = tags.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    color: t.color ?? undefined,
    count: t.count,
  }));

  const canonicalData = {
    categories: formattedCategories,
    topics: formattedTopics,
    notes: formattedNotes,
    resources: formattedResources,
    tags: formattedTags,
  };

  const checksum = calculateBackupChecksum(canonicalData);

  const snapshot = {
    version: "2.0.0",
    exportedAt: new Date().toISOString(),
    checksum,
    counts: {
      categories: formattedCategories.length,
      topics: formattedTopics.length,
      notes: formattedNotes.length,
      resources: formattedResources.length,
      tags: formattedTags.length,
    },
    data: canonicalData,
  };

  return BackupSnapshotSchema.parse(snapshot);
}

export async function executeReplaceRestore(
  tx: any,
  data: ValidatedBackupSnapshot["data"],
): Promise<void> {
  // 1. Xóa toàn bộ dữ liệu hiện hữu theo thứ tự quan hệ ngược (Reverse FK Order)
  await tx.resource.deleteMany();
  await tx.note.deleteMany();
  await tx.knowledgeLink.deleteMany();
  await tx.studyProgress.deleteMany();
  await tx.topic.deleteMany();
  await tx.tag.deleteMany();
  await tx.category.deleteMany();

  // 2. Nạp Categories
  for (const cat of data.categories) {
    await tx.category.create({
      data: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        type: cat.type,
        description: cat.description,
        parentId: cat.parentId,
        icon: cat.icon,
        color: cat.color,
        order: cat.order ?? 0,
      },
    });
  }

  // 3. Nạp Tags
  for (const tag of data.tags) {
    await tx.tag.create({
      data: {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        color: tag.color ?? "#D97706",
        count: tag.count ?? 0,
      },
    });
  }

  // 4. Nạp Topics & StudyProgress
  for (const topic of data.topics) {
    await tx.topic.create({
      data: {
        id: topic.id,
        title: topic.title,
        slug: topic.slug,
        categoryId: topic.categoryId,
        type: topic.type,
        parentId: topic.parentId,
        description: topic.description,
        content: topic.content,
        tags: topic.tags,
        createdAt: topic.createdAt ? new Date(topic.createdAt) : undefined,
        updatedAt: topic.updatedAt ? new Date(topic.updatedAt) : undefined,
      },
    });

    if (topic.studyProgress) {
      await tx.studyProgress.create({
        data: {
          id: `sp-${topic.id}`,
          topicId: topic.id,
          status: topic.studyProgress.status,
          progress: topic.studyProgress.progress,
          interval: topic.studyProgress.interval,
          easeFactor: topic.studyProgress.easeFactor,
          repetitions: topic.studyProgress.repetitions,
          totalNotes: topic.studyProgress.totalNotes,
          timeSpent: topic.studyProgress.timeSpent,
          startDate: topic.studyProgress.startDate
            ? new Date(topic.studyProgress.startDate)
            : null,
          endDate: topic.studyProgress.endDate
            ? new Date(topic.studyProgress.endDate)
            : null,
          lastStudied: topic.studyProgress.lastStudied
            ? new Date(topic.studyProgress.lastStudied)
            : null,
          nextReview: topic.studyProgress.nextReview
            ? new Date(topic.studyProgress.nextReview)
            : null,
        },
      });
    }
  }

  // 5. Nạp KnowledgeLinks (sau khi toàn bộ Topics đã tồn tại)
  for (const topic of data.topics) {
    if (topic.links && topic.links.length > 0) {
      for (const link of topic.links) {
        await tx.knowledgeLink.create({
          data: {
            id: link.id,
            sourceId: link.sourceId,
            targetId: link.targetId,
            linkType: link.linkType,
            strength: link.strength,
            notes: link.notes,
          },
        });
      }
    }
  }

  // 6. Nạp Notes
  for (const note of data.notes) {
    await tx.note.create({
      data: {
        id: note.id,
        topicId: note.topicId,
        title: note.title,
        content: note.content,
        type: note.type,
        isPrivate: note.isPrivate ?? false,
        tags: note.tags,
        createdAt: note.createdAt ? new Date(note.createdAt) : undefined,
        updatedAt: note.updatedAt ? new Date(note.updatedAt) : undefined,
      },
    });
  }

  // 7. Nạp Resources
  for (const resItem of data.resources) {
    await tx.resource.create({
      data: {
        id: resItem.id,
        topicId: resItem.topicId,
        title: resItem.title,
        type: resItem.type,
        author: resItem.author,
        url: resItem.url,
        filePath: resItem.filePath,
        notes: resItem.notes,
        createdAt: resItem.createdAt ? new Date(resItem.createdAt) : undefined,
      },
    });
  }
}

export async function executeMergeRestore(
  tx: any,
  data: ValidatedBackupSnapshot["data"],
): Promise<void> {
  // 1. Categories
  for (const cat of data.categories) {
    await tx.category.upsert({
      where: { slug: cat.slug },
      create: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        type: cat.type,
        description: cat.description,
        parentId: cat.parentId,
        icon: cat.icon,
        color: cat.color,
        order: cat.order ?? 0,
      },
      update: {
        name: cat.name,
        type: cat.type,
        description: cat.description,
        icon: cat.icon,
        color: cat.color,
        order: cat.order ?? 0,
      },
    });
  }

  // 2. Tags
  for (const tag of data.tags) {
    await tx.tag.upsert({
      where: { slug: tag.slug },
      create: {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        color: tag.color ?? "#D97706",
        count: tag.count ?? 0,
      },
      update: {
        name: tag.name,
        color: tag.color ?? "#D97706",
        count: tag.count ?? 0,
      },
    });
  }

  // 3. Topics with LWW
  for (const topic of data.topics) {
    const existing = await tx.topic.findUnique({
      where: { slug: topic.slug },
      include: { studyProgress: true },
    });

    if (existing) {
      const isNewer =
        !topic.updatedAt ||
        !existing.updatedAt ||
        new Date(topic.updatedAt) >= new Date(existing.updatedAt);

      if (isNewer) {
        await tx.topic.update({
          where: { slug: topic.slug },
          data: {
            title: topic.title,
            categoryId: topic.categoryId,
            type: topic.type,
            description: topic.description,
            content: topic.content,
            tags: topic.tags,
            updatedAt: topic.updatedAt ? new Date(topic.updatedAt) : new Date(),
          },
        });
      }

      // Merge Study Progress keeping highest progress & timeSpent
      if (topic.studyProgress) {
        if (existing.studyProgress) {
          await tx.studyProgress.update({
            where: { topicId: existing.id },
            data: {
              progress: Math.max(
                existing.studyProgress.progress,
                topic.studyProgress.progress,
              ),
              timeSpent: Math.max(
                existing.studyProgress.timeSpent,
                topic.studyProgress.timeSpent,
              ),
              status:
                topic.studyProgress.progress >= existing.studyProgress.progress
                  ? topic.studyProgress.status
                  : existing.studyProgress.status,
            },
          });
        } else {
          await tx.studyProgress.create({
            data: {
              id: `sp-${existing.id}`,
              topicId: existing.id,
              status: topic.studyProgress.status,
              progress: topic.studyProgress.progress,
              interval: topic.studyProgress.interval,
              easeFactor: topic.studyProgress.easeFactor,
              repetitions: topic.studyProgress.repetitions,
              totalNotes: topic.studyProgress.totalNotes,
              timeSpent: topic.studyProgress.timeSpent,
            },
          });
        }
      }
    } else {
      // New topic in merge mode
      await tx.topic.create({
        data: {
          id: topic.id,
          title: topic.title,
          slug: topic.slug,
          categoryId: topic.categoryId,
          type: topic.type,
          parentId: topic.parentId,
          description: topic.description,
          content: topic.content,
          tags: topic.tags,
          createdAt: topic.createdAt ? new Date(topic.createdAt) : undefined,
          updatedAt: topic.updatedAt ? new Date(topic.updatedAt) : undefined,
        },
      });

      if (topic.studyProgress) {
        await tx.studyProgress.create({
          data: {
            id: `sp-${topic.id}`,
            topicId: topic.id,
            status: topic.studyProgress.status,
            progress: topic.studyProgress.progress,
            interval: topic.studyProgress.interval,
            easeFactor: topic.studyProgress.easeFactor,
            repetitions: topic.studyProgress.repetitions,
            totalNotes: topic.studyProgress.totalNotes,
            timeSpent: topic.studyProgress.timeSpent,
          },
        });
      }
    }

    // Knowledge links
    if (topic.links && topic.links.length > 0) {
      for (const link of topic.links) {
        await tx.knowledgeLink.upsert({
          where: { id: link.id },
          create: {
            id: link.id,
            sourceId: link.sourceId,
            targetId: link.targetId,
            linkType: link.linkType,
            strength: link.strength,
            notes: link.notes,
          },
          update: {
            sourceId: link.sourceId,
            targetId: link.targetId,
            linkType: link.linkType,
            strength: link.strength,
            notes: link.notes,
          },
        });
      }
    }
  }

  // 4. Notes with LWW
  for (const note of data.notes) {
    const existingNote = await tx.note.findUnique({
      where: { id: note.id },
    });
    if (existingNote) {
      const isNewer =
        !note.updatedAt ||
        !existingNote.updatedAt ||
        new Date(note.updatedAt) >= new Date(existingNote.updatedAt);
      if (isNewer) {
        await tx.note.update({
          where: { id: note.id },
          data: {
            title: note.title,
            content: note.content,
            type: note.type,
            isPrivate: note.isPrivate ?? false,
            tags: note.tags,
            updatedAt: note.updatedAt ? new Date(note.updatedAt) : new Date(),
          },
        });
      }
    } else {
      await tx.note.create({
        data: {
          id: note.id,
          topicId: note.topicId,
          title: note.title,
          content: note.content,
          type: note.type,
          isPrivate: note.isPrivate ?? false,
          tags: note.tags,
          createdAt: note.createdAt ? new Date(note.createdAt) : undefined,
          updatedAt: note.updatedAt ? new Date(note.updatedAt) : undefined,
        },
      });
    }
  }

  // 5. Resources
  for (const resItem of data.resources) {
    await tx.resource.upsert({
      where: { id: resItem.id },
      create: {
        id: resItem.id,
        topicId: resItem.topicId,
        title: resItem.title,
        type: resItem.type,
        author: resItem.author,
        url: resItem.url,
        filePath: resItem.filePath,
        notes: resItem.notes,
        createdAt: resItem.createdAt ? new Date(resItem.createdAt) : undefined,
      },
      update: {
        title: resItem.title,
        type: resItem.type,
        author: resItem.author,
        url: resItem.url,
        filePath: resItem.filePath,
        notes: resItem.notes,
      },
    });
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // Rate limiters for sensitive endpoints (Phase 4 Security Guardrails)
  const geminiRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
  });

  const restoreRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5,
  });

  // Apply rate limiting to all /api/gemini endpoints
  app.use(
    "/api/gemini",
    createRateLimitMiddleware(
      geminiRateLimiter,
      "Quá nhiều yêu cầu nghiên cứu AI (tối đa 10 req/phút). Vui lòng thử lại sau.",
    ),
  );

  // Health check endpoint (App & Gemini Key status)
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // Database Health check endpoint (Phase 2B / Phase 4)
  app.get("/api/health/db", async (_req, res) => {
    const health = await checkDbHealth(prisma);
    res.json(health);
  });

  // Antigravity & Gemini Research Scholar Endpoint
  app.post("/api/gemini/research", async (req, res) => {
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
      } else if (mode === "cross_domain_synthesis" || mode === "cross_domain_link") {
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

  // Semantic Link Discovery between Topics
  app.post("/api/gemini/semantic-links", async (req, res) => {
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

  // Generate Spaced Repetition Cards (Flashcards & Quiz)
  app.post("/api/gemini/generate-cards", async (req, res) => {
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

  // ==========================================
  // REST CRUD & PERSISTENCE ENDPOINTS (PHASE 2A)
  // ==========================================

  // 1. Topics CRUD
  app.get("/api/topics", async (_req, res) => {
    try {
      const topics = await prisma.topic.findMany({
        include: {
          category: true,
          notes: true,
          resources: true,
          studyProgress: true,
          sourceLinks: true,
          targetLinks: true,
        },
        orderBy: { updatedAt: "desc" },
      });
      res.json(topics);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      res.status(500).json({ error: msg });
    }
  });

  app.post("/api/topics", async (req, res) => {
    const parsed = TopicCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    try {
      const topic = await prisma.topic.create({
        data: {
          id: req.body.id || undefined,
          title: parsed.data.title,
          slug:
            parsed.data.slug ||
            parsed.data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          categoryId: parsed.data.categoryId,
          type: parsed.data.type,
          parentId: parsed.data.parentId,
          description: parsed.data.description,
          content: parsed.data.content,
          tags: parsed.data.tags,
        },
      });
      res.status(201).json(topic);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create topic";
      res.status(500).json({ error: msg });
    }
  });

  app.put("/api/topics/:id", async (req, res) => {
    const parsed = TopicUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    try {
      const topic = await prisma.topic.update({
        where: { id: req.params.id },
        data: parsed.data,
      });
      res.json(topic);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update topic";
      res.status(500).json({ error: msg });
    }
  });

  app.delete("/api/topics/:id", async (req, res) => {
    try {
      await prisma.topic.delete({
        where: { id: req.params.id },
      });
      res.json({ success: true, id: req.params.id });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete topic";
      res.status(500).json({ error: msg });
    }
  });

  // 2. Notes CRUD
  app.get("/api/notes", async (_req, res) => {
    try {
      const notes = await prisma.note.findMany({
        orderBy: { updatedAt: "desc" },
      });
      res.json(notes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      res.status(500).json({ error: msg });
    }
  });

  app.post("/api/notes", async (req, res) => {
    const parsed = NoteCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    try {
      const note = await prisma.note.create({
        data: {
          id: req.body.id || undefined,
          topicId: parsed.data.topicId,
          title: parsed.data.title,
          content: parsed.data.content,
          type: parsed.data.type,
          isPrivate: parsed.data.isPrivate,
          tags: parsed.data.tags,
        },
      });
      res.status(201).json(note);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create note";
      res.status(500).json({ error: msg });
    }
  });

  app.put("/api/notes/:id", async (req, res) => {
    const parsed = NoteUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    try {
      const note = await prisma.note.update({
        where: { id: req.params.id },
        data: parsed.data,
      });
      res.json(note);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update note";
      res.status(500).json({ error: msg });
    }
  });

  app.delete("/api/notes/:id", async (req, res) => {
    try {
      await prisma.note.delete({
        where: { id: req.params.id },
      });
      res.json({ success: true, id: req.params.id });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete note";
      res.status(500).json({ error: msg });
    }
  });

  // 3. Resources CRUD
  app.get("/api/resources", async (_req, res) => {
    try {
      const resources = await prisma.resource.findMany({
        orderBy: { createdAt: "desc" },
      });
      res.json(resources);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      res.status(500).json({ error: msg });
    }
  });

  app.post("/api/resources", async (req, res) => {
    const parsed = ResourceCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    try {
      const resource = await prisma.resource.create({
        data: {
          id: req.body.id || undefined,
          topicId: parsed.data.topicId,
          title: parsed.data.title,
          type: parsed.data.type,
          author: parsed.data.author,
          url: parsed.data.url,
          filePath: parsed.data.filePath,
          notes: parsed.data.notes,
        },
      });
      res.status(201).json(resource);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to create resource";
      res.status(500).json({ error: msg });
    }
  });

  app.delete("/api/resources/:id", async (req, res) => {
    try {
      await prisma.resource.delete({
        where: { id: req.params.id },
      });
      res.json({ success: true, id: req.params.id });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete resource";
      res.status(500).json({ error: msg });
    }
  });

  // 4. Spaced Repetition Review Progress
  app.post("/api/study-progress", async (req, res) => {
    const parsed = SM2ReviewInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    try {
      const existing = await prisma.studyProgress.findUnique({
        where: { topicId: parsed.data.topicId },
      });

      const updated = await prisma.studyProgress.upsert({
        where: { topicId: parsed.data.topicId },
        create: {
          topicId: parsed.data.topicId,
          status: "in_progress",
          progress: 10,
          repetitions: 1,
          timeSpent: 15,
        },
        update: {
          repetitions: (existing?.repetitions ?? 0) + 1,
          timeSpent: (existing?.timeSpent ?? 0) + 15,
        },
      });
      res.json(updated);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update study progress";
      res.status(500).json({ error: msg });
    }
  });

  // 5. Idempotent Hydration Sync Endpoint
  app.post("/api/sync/hydrate", async (req, res) => {
    const parsed = HydratePayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    const payload = parsed.data;
    try {
      // 1. Kiểm tra session đã hoàn thành trước đó (Idempotency check)
      const existing = await prisma.syncSession.findUnique({
        where: { clientSyncId: payload.clientSyncId },
      });
      if (existing && existing.status === "completed") {
        return res.json({
          success: true,
          clientSyncId: existing.clientSyncId,
          serverTimestamp: existing.processedAt.toISOString(),
          summary: existing.summary,
        });
      }

      // 2. Transactional upsert toàn bộ dữ liệu trong 1 giao dịch ACID
      const summary = await prisma.$transaction(async (tx) => {
        let categoriesCount = 0;
        let topicsCount = 0;
        let notesCount = 0;
        let resourcesCount = 0;
        let tagsCount = 0;
        let linksCount = 0;
        let progressCount = 0;

        // Categories
        for (const cat of payload.categories) {
          await tx.category.upsert({
            where: { slug: cat.slug },
            create: {
              id: cat.id,
              name: cat.name,
              slug: cat.slug,
              type: cat.type,
              description: cat.description,
              parentId: cat.parentId,
              icon: cat.icon,
              color: cat.color,
              order: cat.order ?? 0,
            },
            update: {
              name: cat.name,
              type: cat.type,
              description: cat.description,
              icon: cat.icon,
              color: cat.color,
              order: cat.order ?? 0,
            },
          });
          categoriesCount++;
        }

        // Tags
        for (const tag of payload.tags) {
          await tx.tag.upsert({
            where: { slug: tag.slug },
            create: {
              id: tag.id,
              name: tag.name,
              slug: tag.slug,
              color: tag.color ?? "#D97706",
              count: tag.count ?? 0,
            },
            update: {
              name: tag.name,
              color: tag.color ?? "#D97706",
              count: tag.count ?? 0,
            },
          });
          tagsCount++;
        }

        // Topics
        for (const topic of payload.topics) {
          await tx.topic.upsert({
            where: { slug: topic.slug },
            create: {
              id: topic.id,
              title: topic.title,
              slug: topic.slug,
              categoryId: topic.categoryId,
              type: topic.type,
              parentId: topic.parentId,
              description: topic.description,
              content: topic.content,
              tags: topic.tags,
            },
            update: {
              title: topic.title,
              categoryId: topic.categoryId,
              type: topic.type,
              description: topic.description,
              content: topic.content,
              tags: topic.tags,
            },
          });
          topicsCount++;

          // Study Progress
          if (topic.studyProgress) {
            await tx.studyProgress.upsert({
              where: { topicId: topic.id },
              create: {
                topicId: topic.id,
                status: topic.studyProgress.status,
                progress: topic.studyProgress.progress,
                interval: topic.studyProgress.interval,
                easeFactor: topic.studyProgress.easeFactor,
                repetitions: topic.studyProgress.repetitions,
                totalNotes: topic.studyProgress.totalNotes,
                timeSpent: topic.studyProgress.timeSpent,
                nextReview: topic.studyProgress.nextReview
                  ? new Date(topic.studyProgress.nextReview)
                  : null,
                lastStudied: topic.studyProgress.lastStudied
                  ? new Date(topic.studyProgress.lastStudied)
                  : null,
              },
              update: {
                status: topic.studyProgress.status,
                progress: topic.studyProgress.progress,
                interval: topic.studyProgress.interval,
                easeFactor: topic.studyProgress.easeFactor,
                repetitions: topic.studyProgress.repetitions,
                totalNotes: topic.studyProgress.totalNotes,
                timeSpent: topic.studyProgress.timeSpent,
              },
            });
            progressCount++;
          }
        }

        // Notes
        for (const note of payload.notes) {
          await tx.note.upsert({
            where: { id: note.id },
            create: {
              id: note.id,
              topicId: note.topicId,
              title: note.title,
              content: note.content,
              type: note.type,
              isPrivate: note.isPrivate ?? false,
              tags: note.tags,
            },
            update: {
              title: note.title,
              content: note.content,
              type: note.type,
              isPrivate: note.isPrivate ?? false,
              tags: note.tags,
            },
          });
          notesCount++;
        }

        // Resources
        for (const resItem of payload.resources) {
          await tx.resource.upsert({
            where: { id: resItem.id },
            create: {
              id: resItem.id,
              topicId: resItem.topicId,
              title: resItem.title,
              type: resItem.type,
              author: resItem.author,
              url: resItem.url,
              filePath: resItem.filePath,
              notes: resItem.notes,
            },
            update: {
              title: resItem.title,
              type: resItem.type,
              author: resItem.author,
              url: resItem.url,
              filePath: resItem.filePath,
              notes: resItem.notes,
            },
          });
          resourcesCount++;
        }

        // Persistent SyncSession record
        await tx.syncSession.create({
          data: {
            clientSyncId: payload.clientSyncId,
            clientTimestamp: new Date(payload.clientTimestamp),
            status: "completed",
            summary: {
              categoriesUpserted: categoriesCount,
              topicsUpserted: topicsCount,
              notesUpserted: notesCount,
              resourcesUpserted: resourcesCount,
              tagsUpserted: tagsCount,
              linksUpserted: linksCount,
              progressMerged: progressCount,
            },
          },
        });

        return {
          categoriesUpserted: categoriesCount,
          topicsUpserted: topicsCount,
          notesUpserted: notesCount,
          resourcesUpserted: resourcesCount,
          tagsUpserted: tagsCount,
          linksUpserted: linksCount,
          progressMerged: progressCount,
        };
      });

      res.json({
        success: true,
        clientSyncId: payload.clientSyncId,
        serverTimestamp: new Date().toISOString(),
        summary,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Hydration transaction failed";
      res.status(500).json({ error: msg });
    }
  });

  // ==========================================
  // BACKUP SNAPSHOT EXPORT ENDPOINT (PHASE 2B)
  // ==========================================
  app.get("/api/backup/export", async (req, res) => {
    try {
      const snapshot = await buildBackupSnapshotFromDb(prisma);
      res.json(snapshot);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Backup export failed";
      console.error("Backup Export Error:", err);
      res.status(500).json({ error: msg });
    }
  });

  // ==========================================
  // BACKUP SNAPSHOT RESTORE ENDPOINT (PHASE 2B / PHASE 4)
  // ==========================================
  app.post(
    "/api/backup/restore",
    createRateLimitMiddleware(
      restoreRateLimiter,
      "Quá nhiều yêu cầu phục hồi dữ liệu (tối đa 5 req/phút). Vui lòng thử lại sau.",
    ),
    async (req, res) => {
      const parsed = RestoreRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        logStructuredEvent("warn", "BACKUP_RESTORE_VALIDATION_ERROR", {
          errors: parsed.error.issues,
        });
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          details: parsed.error.issues,
        });
      }

      const { snapshot, mode } = parsed.data;

      // 1. Verify SHA-256 Checksum Integrity (Fail-Fast)
      const calculatedChecksum = calculateBackupChecksum(snapshot.data);
      if (snapshot.checksum !== calculatedChecksum) {
        logStructuredEvent("warn", "BACKUP_RESTORE_CHECKSUM_MISMATCH", {
          expectedChecksum: snapshot.checksum,
          calculatedChecksum,
        });
        return res.status(400).json({
          error: "CHECKSUM_MISMATCH",
          message:
            "Checksum verification failed: payload has been modified or corrupted",
        });
      }

      try {
        await prisma.$transaction(async (tx) => {
          if (mode === "replace") {
            await executeReplaceRestore(tx, snapshot.data);
          } else {
            await executeMergeRestore(tx, snapshot.data);
          }
        });

        logStructuredEvent("info", "BACKUP_RESTORE_SUCCESS", {
          mode,
          restoredCounts: snapshot.counts,
        });

        res.json({
          success: true,
          mode,
          restoredAt: new Date().toISOString(),
          restoredCounts: snapshot.counts,
        });
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Restore transaction failed";
        logStructuredEvent("error", "BACKUP_RESTORE_TRANSACTION_FAILED", {
          error: msg,
          mode,
        });
        res.status(500).json({ error: msg });
      }
    },
  );

  // Vite middleware for development or Static Serving in Production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    logStructuredEvent("info", "SERVER_STARTUP", {
      port: PORT,
      nodeEnv: process.env.NODE_ENV || "development",
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      url: `http://localhost:${PORT}`,
    });
    console.log(`Knowledge OS Server running on http://localhost:${PORT}`);
  });
}

startServer();
