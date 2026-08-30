import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import path from "path";
import { createDocsRouter } from "../../src/server/routes/docsRoutes";
import { sanitizeDocsPath } from "../../src/lib/docsSanitizer";

describe("Phase P12.3: In-App Docs Backend API & Path Security Contract", () => {
  const docsRoot = path.resolve(process.cwd(), "docs");

  describe("1. Path Sanitization & Security Guardrails", () => {
    it("1.1. accepts safe relative paths to markdown files within docs directory", () => {
      const validPath = "adr/ADR-061-multi-facet-filtering-toolbar.md";
      const sanitized = sanitizeDocsPath(docsRoot, validPath);
      expect(sanitized).toBe(path.resolve(docsRoot, validPath));
    });

    it("1.2. accepts safe feature files within docs/gherkin directory", () => {
      const validPath = "gherkin/phase-p12-2-wave-3-multi-facet-filtering-toolbar.feature";
      const sanitized = sanitizeDocsPath(docsRoot, validPath);
      expect(sanitized).toBe(path.resolve(docsRoot, validPath));
    });

    it("1.3. rejects path traversal attempts with ../", () => {
      expect(sanitizeDocsPath(docsRoot, "../../../etc/passwd")).toBeNull();
      expect(sanitizeDocsPath(docsRoot, "adr/../../server.ts")).toBeNull();
      expect(sanitizeDocsPath(docsRoot, "..%2F..%2F.env")).toBeNull();
    });

    it("1.4. rejects null byte injection attempts", () => {
      expect(sanitizeDocsPath(docsRoot, "adr/ADR-061.md\0.exe")).toBeNull();
    });

    it("1.5. rejects non-markdown/non-feature file extensions", () => {
      expect(sanitizeDocsPath(docsRoot, "package.json")).toBeNull();
      expect(sanitizeDocsPath(docsRoot, "adr/secret.sh")).toBeNull();
      expect(sanitizeDocsPath(docsRoot, "specs/data.exe")).toBeNull();
    });
  });

  describe("2. GET /api/docs - Listing All Architecture Documents", () => {
    it("2.1. returns 200 with structured list of documents and category counts", async () => {
      const app = express();
      app.use("/api", createDocsRouter(docsRoot));

      const res = await request(app).get("/api/docs");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("total");
      expect(res.body.total).toBeGreaterThan(0);
      expect(res.body).toHaveProperty("categories");
      expect(res.body.categories).toHaveProperty("adr");
      expect(res.body.categories.adr).toBeGreaterThan(0);
      expect(res.body).toHaveProperty("documents");
      expect(Array.isArray(res.body.documents)).toBe(true);

      const adr61 = res.body.documents.find(
        (d: any) => d.relativePath === "adr/ADR-061-multi-facet-filtering-toolbar.md"
      );
      expect(adr61).toBeDefined();
      expect(adr61.category).toBe("adr");
      expect(adr61.status).toBe("ACCEPTED");
      expect(adr61.title).toContain("ADR-061");
    });

    it("2.2. filters list by category when query param is provided", async () => {
      const app = express();
      app.use("/api", createDocsRouter(docsRoot));

      const res = await request(app).get("/api/docs?category=adr");
      expect(res.status).toBe(200);
      expect(res.body.documents.every((d: any) => d.category === "adr")).toBe(true);
    });
  });

  describe("3. GET /api/docs/content - Document Markdown Content Retrieval", () => {
    it("3.1. returns full markdown content and metadata for valid document path", async () => {
      const app = express();
      app.use("/api", createDocsRouter(docsRoot));

      const res = await request(app)
        .get("/api/docs/content")
        .query({ path: "adr/ADR-061-multi-facet-filtering-toolbar.md" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("content");
      expect(res.body.content).toContain("# ADR-061: Multi-Facet Filtering Toolbar");
      expect(res.body.relativePath).toBe("adr/ADR-061-multi-facet-filtering-toolbar.md");
      expect(res.body.category).toBe("adr");
      expect(res.body.status).toBe("ACCEPTED");
    });

    it("3.2. returns 400 when path parameter is missing", async () => {
      const app = express();
      app.use("/api", createDocsRouter(docsRoot));

      const res = await request(app).get("/api/docs/content");
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("3.3. returns 403 when malicious path traversal is detected", async () => {
      const app = express();
      app.use("/api", createDocsRouter(docsRoot));

      const res = await request(app)
        .get("/api/docs/content")
        .query({ path: "../../../etc/passwd" });

      expect([400, 403]).toContain(res.status);
      expect(res.body).toHaveProperty("error");
    });

    it("3.4. returns 404 when document does not exist in docs directory", async () => {
      const app = express();
      app.use("/api", createDocsRouter(docsRoot));

      const res = await request(app)
        .get("/api/docs/content")
        .query({ path: "adr/ADR-999-imaginary-non-existent.md" });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
    });
  });
});
