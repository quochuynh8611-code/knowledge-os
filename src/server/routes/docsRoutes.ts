import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { sanitizeDocsPath } from "../../lib/docsSanitizer";

export interface DocMetadata {
  id: string;
  title: string;
  category: "adr" | "specs" | "gherkin" | "runbooks" | "guides" | "books";
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

function parseDocHeader(content: string, filename: string): { title: string; status?: string } {
  let title = filename.replace(/\.(md|feature|epub)$/i, "");
  let status: string | undefined = undefined;

  if (filename.toLowerCase().endsWith(".epub")) {
    return { title: title.replace(/_/g, " "), status: "EPUB" };
  }

  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!title || title === filename.replace(/\.(md|feature|epub)$/i, "")) {
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

function collectDocsFromDirectory(docsRoot: string): DocMetadata[] {
  const documents: DocMetadata[] = [];
  if (!fs.existsSync(docsRoot)) return documents;

  const subdirs: Array<{ dir: string; category: DocMetadata["category"] }> = [
    { dir: "adr", category: "adr" },
    { dir: "specs", category: "specs" },
    { dir: "gherkin", category: "gherkin" },
    { dir: "runbooks", category: "runbooks" },
    { dir: "books", category: "books" },
    { dir: "", category: "guides" },
  ];

  for (const { dir, category } of subdirs) {
    const targetDir = dir ? path.join(docsRoot, dir) : docsRoot;
    if (!fs.existsSync(targetDir)) continue;

    const entries = fs.readdirSync(targetDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (ext !== ".md" && ext !== ".feature" && ext !== ".epub") continue;

      const filePath = path.join(targetDir, entry.name);
      const relativePath = dir ? `${dir}/${entry.name}` : entry.name;
      const stat = fs.statSync(filePath);

      let content = "";
      if (ext !== ".epub") {
        try {
          content = fs.readFileSync(filePath, "utf8");
        } catch {
          // Fallback on read failure
        }
      }

      const { title, status } = parseDocHeader(content, entry.name);
      const id = entry.name.replace(/\.(md|feature|epub)$/i, "").toLowerCase();

      documents.push({
        id,
        title,
        category,
        relativePath,
        status: status || (category === "specs" ? "SPEC" : category === "gherkin" ? "FEATURE" : category === "books" ? "EPUB" : "GUIDE"),
        sizeBytes: stat.size,
        lastModified: stat.mtime.toISOString(),
      });
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

      const categoriesCount: Record<string, number> = {
        adr: 0,
        specs: 0,
        gherkin: 0,
        runbooks: 0,
        guides: 0,
        books: 0,
      };

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

  // GET /docs/raw?path=... - Stream raw binary document content (e.g. .epub)
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
      const mimeType = ext === ".epub" ? "application/epub+zip" : ext === ".md" ? "text/markdown; charset=utf-8" : "application/octet-stream";

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

      const categoryPart = rawPath.split("/")[0];
      const category: DocMetadata["category"] =
        categoryPart === "adr" || categoryPart === "specs" || categoryPart === "gherkin" || categoryPart === "runbooks" || categoryPart === "books"
          ? categoryPart
          : "guides";

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
