import crypto from "crypto";
import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { LocalArchiveStorage } from "../../lib/localArchiveStorage";
import {
  ArchiveUploadQuerySchema,
  ArchivedDocumentCreateSchema,
  ArchivedDocumentUpdateSchema,
  VaultDocumentRegisterSchema,
  MAX_ARCHIVE_FILE_SIZE,
} from "../../lib/validation";

export interface ArchiveRouterOptions {
  prisma: PrismaClient;
  storage?: LocalArchiveStorage;
}

export function createArchiveRouter(options: ArchiveRouterOptions): Router {
  const router = Router();
  const prisma = options.prisma;
  const storage = options.storage || new LocalArchiveStorage();

  const getMimeType = (format: string): string => {
    switch (format.toLowerCase()) {
      case "pdf":
        return "application/pdf";
      case "epub":
        return "application/epub+zip";
      case "md":
        return "text/markdown; charset=utf-8";
      default:
        return "application/octet-stream";
    }
  };

  // POST /archive/upload?originalName=...&fileFormat=...&resourceId=...
  router.post("/archive/upload", async (req: Request, res: Response) => {
    try {
      // 1. Validate query parameters
      const queryParsed = ArchiveUploadQuerySchema.safeParse(req.query);
      if (!queryParsed.success) {
        const firstIssue = queryParsed.error.issues[0];
        const isFilenameError = firstIssue.path.includes("originalName");
        const errorCode = isFilenameError ? "INVALID_FILENAME" : "INVALID_FORMAT";
        res.status(400).json({
          error: errorCode,
          message: firstIssue.message,
        });
        return;
      }

      const { originalName, fileFormat, resourceId } = queryParsed.data;

      // 2. Validate body payload (Buffer)
      let buffer: Buffer;
      if (Buffer.isBuffer(req.body)) {
        buffer = req.body;
      } else if (typeof req.body === "string") {
        buffer = Buffer.from(req.body, "utf8");
      } else if (req.body && typeof req.body === "object" && Object.keys(req.body).length === 0) {
        buffer = Buffer.alloc(0);
      } else {
        buffer = Buffer.from(JSON.stringify(req.body || ""));
      }

      if (buffer.length === 0) {
        res.status(400).json({
          error: "EMPTY_FILE",
          message: "Dữ liệu tệp tin không được để trống.",
        });
        return;
      }

      if (buffer.length > MAX_ARCHIVE_FILE_SIZE) {
        res.status(400).json({
          error: "FILE_TOO_LARGE",
          message: "Dung lượng tệp vượt quá giới hạn 50MB.",
        });
        return;
      }

      // 3. Save to content-addressable storage
      const saveResult = await storage.saveFile({
        buffer,
        originalName,
        fileFormat,
      });

      const mimeType = getMimeType(fileFormat);

      // 4. Validate create payload
      const createPayload = {
        resourceId: resourceId || undefined,
        fileName: originalName,
        fileSize: saveResult.fileSize,
        mimeType,
        fileFormat,
        contentHash: saveResult.contentHash,
        storageRelPath: saveResult.storageRelPath,
      };

      const payloadValidated = ArchivedDocumentCreateSchema.safeParse(createPayload);
      if (!payloadValidated.success) {
        res.status(400).json({
          error: "VALIDATION_FAILED",
          details: payloadValidated.error.format(),
        });
        return;
      }

      // 5. Check if document record already exists for this contentHash (Deduplication)
      let doc = await prisma.archivedDocument.findFirst({
        where: { contentHash: saveResult.contentHash },
      });

      if (!doc) {
        doc = await prisma.archivedDocument.create({
          data: payloadValidated.data as any,
        });
      }

      res.status(201).json({
        success: true,
        document: doc,
      });
    } catch (err: any) {
      res.status(500).json({
        error: "INTERNAL_ERROR",
        message: err.message || "Lỗi khi lưu trữ tệp vào Local Archive.",
      });
    }
  });

  // GET /archive/file/:id - Stream binary document
  // Supports two lookup modes (backward-compatible):
  //   1. Primary:  findUnique({ where: { id } })     — UUID record id (legacy / archive:// URIs)
  //   2. Fallback: findFirst({ where: { contentHash: id } }) — SHA-256 hash (hashed archive paths
  //               produced by resolveResourceReaderDescriptor for filePaths like epub/<2ch>/<hash>.epub)
  router.get("/archive/file/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // 1. Primary lookup by UUID id
      let doc = await prisma.archivedDocument.findUnique({
        where: { id },
      });

      // 2. Fallback: lookup by contentHash (client may send SHA-256 hash as :id)
      if (!doc) {
        doc = await prisma.archivedDocument.findFirst({
          where: { contentHash: id },
        });
      }

      if (!doc) {
        res.status(404).json({
          error: "DOCUMENT_NOT_FOUND",
          message: `Không tìm thấy tài liệu với ID '${id}'.`,
        });
        return;
      }

      if (doc.sourceType === "vault" || doc.storageRelPath?.startsWith("vault://")) {
        res.status(400).json({
          error: "VAULT_FILE_STREAMING_NOT_SUPPORTED",
          message: "Tài liệu Obsidian Vault phải được truy xuất qua endpoint /api/obsidian/vault.",
        });
        return;
      }

      const stat = await storage.statFile(doc.storageRelPath);

      res.setHeader("Content-Type", doc.mimeType || "application/octet-stream");
      res.setHeader("Content-Length", stat.size);
      res.setHeader("Cache-Control", "public, max-age=3600");

      const fileStream = storage.createReadStream(doc.storageRelPath);
      fileStream.on("error", () => {
        if (!res.headersSent) {
          res.status(500).json({ error: "STREAM_FAILED", message: "Lỗi khi đọc luồng tệp tin." });
        }
      });
      fileStream.pipe(res);
    } catch (err: any) {
      if (!res.headersSent) {
        const isNotFound = err.message && err.message.includes("FILE_NOT_FOUND");
        res.status(isNotFound ? 404 : 500).json({
          error: isNotFound ? "FILE_NOT_FOUND" : "INTERNAL_ERROR",
          message: err.message || "Lỗi khi tải tệp tin.",
        });
      }
    }
  });

  // GET /archive/list - List archived documents
  router.get("/archive/list", async (_req: Request, res: Response) => {
    try {
      const documents = await prisma.archivedDocument.findMany({
        orderBy: { createdAt: "desc" } as any,
      });

      res.status(200).json({
        total: documents.length,
        documents,
      });
    } catch (err: any) {
      res.status(500).json({
        error: "INTERNAL_ERROR",
        message: err.message || "Lỗi khi lấy danh sách tài liệu lưu trữ.",
      });
    }
  });

  // GET /archive/document/:id - Get archived document metadata
  router.get("/archive/document/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      let doc = await prisma.archivedDocument.findUnique({
        where: { id },
      });

      if (!doc) {
        doc = await prisma.archivedDocument.findFirst({
          where: { contentHash: id },
        });
      }

      if (!doc) {
        doc = await prisma.archivedDocument.findFirst({
          where: { sourceKey: id },
        });
      }

      if (!doc) {
        res.status(404).json({
          error: "DOCUMENT_NOT_FOUND",
          message: `Không tìm thấy tài liệu với ID '${id}'.`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        document: doc,
      });
    } catch (err: any) {
      res.status(500).json({
        error: "INTERNAL_ERROR",
        message: err.message || "Lỗi khi lấy thông tin tài liệu lưu trữ.",
      });
    }
  });

  // PATCH /archive/document/:id/position - Update lastPosition & lastReadAt
  router.patch("/archive/document/:id/position", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // 1. Validate payload
      const parsed = ArchivedDocumentUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "VALIDATION_FAILED",
          details: parsed.error.format(),
        });
        return;
      }

      // 2. Find document by id, contentHash, or sourceKey
      let existingDoc = await prisma.archivedDocument.findUnique({
        where: { id },
      });

      if (!existingDoc) {
        existingDoc = await prisma.archivedDocument.findFirst({
          where: { contentHash: id },
        });
      }

      if (!existingDoc) {
        existingDoc = await prisma.archivedDocument.findFirst({
          where: { sourceKey: id },
        });
      }

      if (!existingDoc) {
        res.status(404).json({
          error: "DOCUMENT_NOT_FOUND",
          message: `Không tìm thấy tài liệu với ID '${id}'.`,
        });
        return;
      }

      // 3. Prepare update data
      const updateData: any = {};
      let mergedLastPosition: any = existingDoc.lastPosition || {};
      if (typeof mergedLastPosition !== "object" || mergedLastPosition === null) {
        mergedLastPosition = {};
      }

      if (parsed.data.lastPosition !== undefined) {
        mergedLastPosition = {
          ...mergedLastPosition,
          ...parsed.data.lastPosition,
        };
      }

      const rawBody = req.body || {};
      const completed = parsed.data.completed !== undefined ? parsed.data.completed : rawBody.completed;
      const completedAt = parsed.data.completedAt !== undefined ? parsed.data.completedAt : rawBody.completedAt;

      if (completed !== undefined) {
        mergedLastPosition.isCompleted = Boolean(completed);
        mergedLastPosition.completedAt = completed ? (completedAt || new Date().toISOString()) : null;
      }

      const activeReadingSeconds = parsed.data.activeReadingSeconds !== undefined ? parsed.data.activeReadingSeconds : rawBody.activeReadingSeconds;
      if (typeof activeReadingSeconds === "number" && !isNaN(activeReadingSeconds) && activeReadingSeconds >= 0) {
        const roundedSecs = Math.round(activeReadingSeconds);
        const prevTotal = typeof mergedLastPosition.totalReadingSeconds === "number" ? mergedLastPosition.totalReadingSeconds : 0;
        mergedLastPosition.totalReadingSeconds = prevTotal + roundedSecs;
        if (roundedSecs > 0 || mergedLastPosition.lastSessionSeconds === undefined) {
          mergedLastPosition.lastSessionSeconds = roundedSecs;
        }
      }

      if (parsed.data.lastPosition !== undefined || completed !== undefined || typeof activeReadingSeconds === "number") {
        updateData.lastPosition = mergedLastPosition;
      }

      if (parsed.data.fileName !== undefined) {
        updateData.fileName = parsed.data.fileName;
      }
      if (parsed.data.lastReadAt !== undefined) {
        updateData.lastReadAt = new Date(parsed.data.lastReadAt);
      } else {
        updateData.lastReadAt = new Date();
      }
      updateData.readCount = { increment: 1 };

      const updated = await prisma.archivedDocument.update({
        where: { id: existingDoc.id },
        data: updateData,
      });

      res.status(200).json({
        success: true,
        document: updated,
      });
    } catch (err: any) {
      res.status(500).json({
        error: "INTERNAL_ERROR",
        message: err.message || "Lỗi khi cập nhật trạng thái đọc tài liệu lưu trữ.",
      });
    }
  });

  // POST /archive/vault/register - Register or get existing ArchivedDocument for Obsidian Vault file
  router.post("/archive/vault/register", async (req: Request, res: Response) => {
    try {
      const parsed = VaultDocumentRegisterSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "VALIDATION_FAILED",
          details: parsed.error.format(),
        });
        return;
      }

      const { path: rawPath, fileName: rawFileName, fileFormat, fileSize } = parsed.data;
      const cleanPath = rawPath.replace(/^\/+/, "");
      const fileName = rawFileName || cleanPath.split("/").pop() || cleanPath;
      const sourceKey = `vault:${cleanPath}`;

      // 1. Idempotent lookup by sourceKey
      let doc = await prisma.archivedDocument.findUnique({
        where: { sourceKey },
      });

      if (!doc) {
        doc = await prisma.archivedDocument.findFirst({
          where: { sourceKey },
        });
      }

      if (doc) {
        const updatedDoc = await prisma.archivedDocument.update({
          where: { id: doc.id },
          data: {
            lastReadAt: new Date(),
            readCount: { increment: 1 },
          },
        });
        res.status(200).json({
          success: true,
          document: updatedDoc,
        });
        return;
      }

      // 2. Determine mimeType, synthetic hash, and virtual storage reference
      const mimeType = getMimeType(fileFormat);
      const contentHash = crypto.createHash("sha256").update(sourceKey).digest("hex");
      const storageRelPath = `vault://${cleanPath}`;

      // 3. Create new ArchivedDocument with initial open state
      const newDoc = await prisma.archivedDocument.create({
        data: {
          fileName,
          fileSize: fileSize || 0,
          mimeType,
          fileFormat,
          contentHash,
          storageRelPath,
          sourceType: "vault",
          sourcePath: cleanPath,
          sourceKey,
          lastReadAt: new Date(),
          readCount: 1,
        },
      });

      res.status(200).json({
        success: true,
        document: newDoc,
      });
    } catch (err: any) {
      res.status(500).json({
        error: "INTERNAL_ERROR",
        message: err.message || "Lỗi khi đăng ký tài liệu Obsidian Vault.",
      });
    }
  });

  // DELETE /archive/document/:id/history - Clear reading history for a document
  router.delete("/archive/document/:id/history", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      let existingDoc = await prisma.archivedDocument.findUnique({
        where: { id },
      });

      if (!existingDoc) {
        existingDoc = await prisma.archivedDocument.findFirst({
          where: { contentHash: id },
        });
      }

      if (!existingDoc) {
        existingDoc = await prisma.archivedDocument.findFirst({
          where: { sourceKey: id },
        });
      }

      if (!existingDoc) {
        res.status(200).json({
          success: true,
          message: `Tài liệu '${id}' không tồn tại hoặc lịch sử đọc đã được xóa trước đó.`,
        });
        return;
      }

      const clearPosition =
        req.query.clearPosition === "true" ||
        req.query.clearPosition === "1" ||
        req.body?.clearPosition === true;

      const updateData: Record<string, any> = {
        lastReadAt: null,
        readCount: 0,
      };
      if (clearPosition) {
        updateData.lastPosition = null;
      }

      const updated = await prisma.archivedDocument.update({
        where: { id: existingDoc.id },
        data: updateData,
      });

      res.status(200).json({
        success: true,
        message: "Đã xóa lịch sử đọc thành công.",
        document: updated,
      });
    } catch (err: any) {
      res.status(500).json({
        error: "INTERNAL_ERROR",
        message: err.message || "Lỗi khi xóa lịch sử đọc tài liệu.",
      });
    }
  });

  // DELETE /archive/history - Clear all reading history
  router.delete("/archive/history", async (_req: Request, res: Response) => {
    try {
      const result = await prisma.archivedDocument.updateMany({
        where: {
          lastReadAt: { not: null },
        },
        data: {
          lastReadAt: null,
          readCount: 0,
        },
      });

      res.status(200).json({
        success: true,
        message: "Đã xóa toàn bộ lịch sử đọc thành công.",
        count: result.count,
      });
    } catch (err: any) {
      res.status(500).json({
        error: "INTERNAL_ERROR",
        message: err.message || "Lỗi khi xóa toàn bộ lịch sử đọc.",
      });
    }
  });

  return router;
}
