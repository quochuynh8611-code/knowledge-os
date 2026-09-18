import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { LocalArchiveStorage } from "../../lib/localArchiveStorage";
import {
  ArchiveUploadQuerySchema,
  ArchivedDocumentCreateSchema,
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

      // 5. Check if document record already exists for this contentHash
      let doc = await prisma.archivedDocument.findUnique({
        where: { contentHash: saveResult.contentHash } as any,
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
  router.get("/archive/file/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const doc = await prisma.archivedDocument.findUnique({
        where: { id },
      });

      if (!doc) {
        res.status(404).json({
          error: "DOCUMENT_NOT_FOUND",
          message: `Không tìm thấy tài liệu với ID '${id}'.`,
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

  return router;
}
