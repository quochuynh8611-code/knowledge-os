import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { sanitizeDocsPath } from "../../lib/docsSanitizer";

export interface DocMetadata {
  id: string;
  title: string;
  category: "adr" | "specs" | "gherkin" | "runbooks" | "guides" | "books" | string;
  relativePath: string;
  status?: string;
  sizeBytes: number;
  lastModified: string;
}

export interface DocsListResponse {
  total: number;
  categories: Record<string, number>;
  documents: DocMetadata[];
}

const FORBIDDEN_DIRS = new Set([
  ".git",
  ".obsidian",
  ".trash",
  "node_modules",
  ".next",
  "dist",
  "build",
]);

const IMAGE_MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
};

function getDocMimeType(ext: string): string {
  if (ext === ".epub") return "application/epub+zip";
  if (ext === ".md" || ext === ".markdown") return "text/markdown; charset=utf-8";
  if (ext === ".feature") return "text/plain; charset=utf-8";
  if (IMAGE_MIME_TYPES[ext]) return IMAGE_MIME_TYPES[ext];
  return "application/octet-stream";
}

function parseDocHeader(content: string, filename: string): { title: string; status?: string } {
  let title = filename.replace(/\.(md|markdown|feature|epub)$/i, "");
  let status: string | undefined = undefined;

  if (filename.toLowerCase().endsWith(".epub")) {
    return { title: title.replace(/_/g, " "), status: "EPUB" };
  }

  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!title || title === filename.replace(/\.(md|markdown|feature|epub)$/i, "")) {
      if (trimmed.startsWith("# ")) {
        title = trimmed.replace(/^#\s+/, "").trim();
      } else if (trimmed.startsWith("Feature: ")) {
        title = trimmed.replace(/^Feature:\s+/, "").trim();
      }
    }
  }

  const statusMatch = content.match(/##\s*Status\s*\n\s*([A-Z_]+(?:\s+[A-Z_]+)*)/i) ||
                      content.match(/(?:^|\n)\s*(?:Status|STATUS):\s*([A-Z_]+(?:\s+[A-Z_]+)*)/i);
  if (statusMatch) {
    status = statusMatch[1].trim().split(" ")[0]; // Take first word e.g. ACCEPTED, PROPOSED
  }

  return { title, status };
}

function deriveCategory(relativePath: string): string {
  const parts = relativePath.split(/[/\\]/);
  if (parts.length > 1) {
    const topFolder = parts[0].toLowerCase();
    return topFolder;
  }
  return "guides";
}

function collectDocsFromDirectory(docsRoot: string, currentRelDir = "", depth = 0): DocMetadata[] {
  const documents: DocMetadata[] = [];
  if (!fs.existsSync(docsRoot) || depth > 5) return documents;

  const currentDir = currentRelDir ? path.join(docsRoot, currentRelDir) : docsRoot;
  if (!fs.existsSync(currentDir)) return documents;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(currentDir, { withFileTypes: true });
  } catch {
    return documents;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".") || FORBIDDEN_DIRS.has(entry.name.toLowerCase())) {
      continue;
    }

    const relPath = currentRelDir ? `${currentRelDir}/${entry.name}` : entry.name;
    const fullPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      const subDocs = collectDocsFromDirectory(docsRoot, relPath, depth + 1);
      documents.push(...subDocs);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (ext !== ".md" && ext !== ".markdown" && ext !== ".feature" && ext !== ".epub") {
      continue;
    }

    try {
      const stat = fs.statSync(fullPath);
      let content = "";
      if (ext !== ".epub") {
        try {
          content = fs.readFileSync(fullPath, "utf8");
        } catch {
          // Fallback on read failure
        }
      }

      const { title, status } = parseDocHeader(content, entry.name);
      const id = relPath.replace(/\.(md|markdown|feature|epub)$/i, "").toLowerCase();
      const category = deriveCategory(relPath);

      documents.push({
        id,
        title,
        category,
        relativePath: relPath.replace(/\\/g, "/"),
        status: status || (category === "specs" ? "SPEC" : category === "gherkin" ? "FEATURE" : category === "books" ? "EPUB" : "GUIDE"),
        sizeBytes: stat.size,
        lastModified: stat.mtime.toISOString(),
      });
    } catch {
      continue;
    }
  }

  return documents;
}

/**
 * Creates the Docs Explorer Express Router
 */
export function createDocsRouter(docsDir?: string): Router {
  const router = Router();
  const root = path.resolve(docsDir || path.resolve(process.cwd(), "docs"));

  // GET /docs - List all documents
  router.get("/docs", (req: Request, res: Response) => {
    try {
      const allDocs = collectDocsFromDirectory(root);
      const requestedCategory = req.query.category as string | undefined;

      const filteredDocs = requestedCategory && requestedCategory !== "all"
        ? allDocs.filter((d) => d.category === requestedCategory)
        : allDocs;

      const categoriesCount: Record<string, number> = {};
      for (const doc of allDocs) {
        categoriesCount[doc.category] = (categoriesCount[doc.category] || 0) + 1;
      }

      const response: DocsListResponse = {
        total: allDocs.length,
        categories: categoriesCount,
        documents: filteredDocs,
      };

      res.status(200).json(response);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to list documents" });
    }
  });

  // GET /docs/raw?path=... - Stream raw binary document content (e.g. .epub, images)
  router.get("/docs/raw", (req: Request, res: Response) => {
    const rawPath = req.query.path as string | undefined;

    if (!rawPath) {
      res.status(400).json({ error: "Missing required 'path' query parameter" });
      return;
    }

    if (rawPath.includes("..") || rawPath.includes("\0") || rawPath.includes("%2F") || rawPath.includes("%2f")) {
      res.status(403).json({ error: "Access denied: Malicious path traversal detected" });
      return;
    }

    const sanitized = sanitizeDocsPath(root, rawPath);
    if (!sanitized) {
      res.status(403).json({ error: "Access denied: Path must reside strictly inside docs directory" });
      return;
    }

    if (!fs.existsSync(sanitized)) {
      res.status(404).json({ error: `Document '${rawPath}' not found` });
      return;
    }

    try {
      const stat = fs.statSync(sanitized);
      const ext = path.extname(sanitized).toLowerCase();
      const mimeType = getDocMimeType(ext);

      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Length", stat.size);
      res.setHeader("Cache-Control", "public, max-age=3600");

      const fileStream = fs.createReadStream(sanitized);
      fileStream.on("error", () => {
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to stream document" });
        }
      });
      fileStream.pipe(res);
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || "Failed to stream document" });
      }
    }
  });

  // GET /docs/content?path=... - Get specific document content
  router.get("/docs/content", (req: Request, res: Response) => {
    const rawPath = req.query.path as string | undefined;

    if (!rawPath) {
      res.status(400).json({ error: "Missing required 'path' query parameter" });
      return;
    }

    // Check for obvious path traversal characters before sanitize
    if (rawPath.includes("..") || rawPath.includes("\0") || rawPath.includes("%2F") || rawPath.includes("%2f")) {
      res.status(403).json({ error: "Access denied: Malicious path traversal detected" });
      return;
    }

    const sanitized = sanitizeDocsPath(root, rawPath);
    if (!sanitized) {
      res.status(403).json({ error: "Access denied: Path must reside strictly inside docs directory" });
      return;
    }

    if (!fs.existsSync(sanitized)) {
      res.status(404).json({ error: `Document '${rawPath}' not found` });
      return;
    }

    try {
      const stat = fs.statSync(sanitized);
      const ext = path.extname(sanitized).toLowerCase();
      if (ext === ".epub") {
        res.status(400).json({ error: "EPUB documents cannot be returned as text JSON. Use /api/docs/raw endpoint." });
        return;
      }

      const content = fs.readFileSync(sanitized, "utf8");
      const filename = path.basename(sanitized);
      const { title, status } = parseDocHeader(content, filename);

      const category = deriveCategory(rawPath);
      const id = filename.replace(/\.(md|feature|epub)$/i, "").toLowerCase();

      res.status(200).json({
        id,
        title,
        category,
        relativePath: rawPath.replace(/\\/g, "/"),
        status: status || (category === "specs" ? "SPEC" : category === "gherkin" ? "FEATURE" : "GUIDE"),
        content,
        sizeBytes: stat.size,
        lastModified: stat.mtime.toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to read document content" });
    }
  });

  return router;
}
