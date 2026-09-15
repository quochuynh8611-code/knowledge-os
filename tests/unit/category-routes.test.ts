import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createCategoryRouter } from "../../src/server/routes/categoryRoutes";

describe("Category Routes - DELETE Contract", () => {
  it("Test 1 — Canonical UUID deletion resolves and deletes category with 200", async () => {
    const canonicalId = "uuid-canonical-1111";
    const mockPrisma: any = {
      category: {
        findUnique: vi.fn().mockImplementation(async ({ where }) => {
          if (where.id === canonicalId) {
            return {
              id: canonicalId,
              slug: "cat-root-khoa-hoc",
              name: "Khoa Học",
            };
          }
          return null;
        }),
        delete: vi.fn().mockResolvedValue({
          id: canonicalId,
        }),
      },
    };

    const app = express();
    app.use(express.json());
    app.use("/api", createCategoryRouter(mockPrisma));

    const res = await request(app).delete(`/api/categories/${canonicalId}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ success: true, id: canonicalId }));
    expect(mockPrisma.category.delete).toHaveBeenCalledWith({
      where: { id: canonicalId },
    });
  });

  it("Test 2 — Legacy slug identifier resolves canonical UUID before deleting with 200", async () => {
    const slugIdentifier = "cat-root-kinh-te";
    const resolvedCanonicalId = "uuid-canonical-2222";

    const mockPrisma: any = {
      category: {
        findUnique: vi.fn().mockImplementation(async ({ where }) => {
          if (where.id === slugIdentifier) {
            return null;
          }
          if (where.slug === slugIdentifier) {
            return {
              id: resolvedCanonicalId,
              slug: slugIdentifier,
              name: "Kinh Tế",
            };
          }
          return null;
        }),
        delete: vi.fn().mockResolvedValue({
          id: resolvedCanonicalId,
        }),
      },
    };

    const app = express();
    app.use(express.json());
    app.use("/api", createCategoryRouter(mockPrisma));

    const res = await request(app).delete(`/api/categories/${slugIdentifier}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ success: true, id: resolvedCanonicalId }));
    // Must be called with the canonical UUID, not the legacy slug
    expect(mockPrisma.category.delete).toHaveBeenCalledWith({
      where: { id: resolvedCanonicalId },
    });
  });

  it("Test 3 — Non-existent category returns HTTP 404 and does not call delete", async () => {
    const nonExistentId = "non-existent-cat-999";
    const mockPrisma: any = {
      category: {
        findUnique: vi.fn().mockResolvedValue(null),
        delete: vi.fn(),
      },
    };

    const app = express();
    app.use(express.json());
    app.use("/api", createCategoryRouter(mockPrisma));

    const res = await request(app).delete(`/api/categories/${nonExistentId}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Category not found" });
    expect(mockPrisma.category.delete).not.toHaveBeenCalled();
  });

  it("Test 4 — Unexpected database failure returns HTTP 500 without leaking internal error details", async () => {
    const targetId = "uuid-canonical-4444";
    const mockPrisma: any = {
      category: {
        findUnique: vi.fn().mockRejectedValue(new Error("database unavailable")),
        delete: vi.fn(),
      },
    };

    const app = express();
    app.use(express.json());
    app.use("/api", createCategoryRouter(mockPrisma));

    const res = await request(app).delete(`/api/categories/${targetId}`);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Failed to delete category" });
    expect(JSON.stringify(res.body)).not.toContain("database unavailable");
  });
});
