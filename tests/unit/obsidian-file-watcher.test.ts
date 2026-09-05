import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import fs from "fs";
import path from "path";
import os from "os";
import { ObsidianFileWatcher } from "../../src/lib/obsidianFileWatcher";
import { createObsidianWatcherRouter } from "../../src/server/routes/obsidianWatcherRoutes";

describe("Phase P4.2E: Obsidian File Watcher & SSE Auto-Refresh", () => {
  let tempVaultDir: string;
  let watcher: ObsidianFileWatcher;

  beforeEach(() => {
    tempVaultDir = fs.mkdtempSync(path.join(os.tmpdir(), "obsidian-watcher-test-"));
    watcher = new ObsidianFileWatcher(100); // 100ms debounce for fast test execution
  });

  afterEach(async () => {
    await watcher.closeAll();
    if (fs.existsSync(tempVaultDir)) {
      fs.rmSync(tempVaultDir, { recursive: true, force: true });
    }
  });

  describe("ObsidianFileWatcher Core", () => {
    it("calls onChange listener when a watched file is modified", async () => {
      const filePath = path.join(tempVaultDir, "Note.md");
      fs.writeFileSync(filePath, "# Bản 1");

      const changeSpy = vi.fn();
      const unsubscribe = watcher.watch(filePath, "Note.md", changeSpy);

      // Wait a bit for watcher ready
      await new Promise((r) => setTimeout(r, 250));

      // Modify the file
      fs.writeFileSync(filePath, "# Bản 2 đã sửa đổi");

      // Wait for debounce & stability
      await new Promise((r) => setTimeout(r, 600));

      expect(changeSpy).toHaveBeenCalled();
      const event = changeSpy.mock.calls[0][0];
      expect(event.type).toBe("file-changed");
      expect(event.filePath).toBe("Note.md");
      expect(event.mtime).toBeDefined();

      unsubscribe();
    });

    it("stops calling listener after unsubscribe/unwatch", async () => {
      const filePath = path.join(tempVaultDir, "Note-2.md");
      fs.writeFileSync(filePath, "Content A");

      const changeSpy = vi.fn();
      const unsubscribe = watcher.watch(filePath, "Note-2.md", changeSpy);

      await new Promise((r) => setTimeout(r, 100));

      // Unsubscribe
      unsubscribe();

      // Modify file
      fs.writeFileSync(filePath, "Content B");
      await new Promise((r) => setTimeout(r, 300));

      expect(changeSpy).not.toHaveBeenCalled();
    });

    it("debounces rapid modifications into a single event", async () => {
      const filePath = path.join(tempVaultDir, "Rapid.md");
      fs.writeFileSync(filePath, "Init");

      const changeSpy = vi.fn();
      const unsubscribe = watcher.watch(filePath, "Rapid.md", changeSpy);
      await new Promise((r) => setTimeout(r, 250));

      // 3 rapid writes
      fs.writeFileSync(filePath, "Edit 1");
      fs.writeFileSync(filePath, "Edit 2");
      fs.writeFileSync(filePath, "Edit 3");

      await new Promise((r) => setTimeout(r, 600));

      expect(changeSpy).toHaveBeenCalledTimes(1);
      unsubscribe();
    });
  });

  describe("GET /api/obsidian/vault/watch Router Contract", () => {
    let app: express.Express;

    beforeEach(() => {
      app = express();
      app.use("/api", createObsidianWatcherRouter(() => tempVaultDir, watcher));
    });

    it("returns 503 when vault root is not configured", async () => {
      const unconfiguredApp = express();
      unconfiguredApp.use("/api", createObsidianWatcherRouter(() => undefined, watcher));

      const res = await request(unconfiguredApp).get("/api/obsidian/vault/watch?path=Note.md");
      expect(res.status).toBe(503);
      expect(res.body.error).toBe("VAULT_NOT_CONFIGURED");
    });

    it("returns 400 when path parameter is missing", async () => {
      const res = await request(app).get("/api/obsidian/vault/watch");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("MISSING_PATH");
    });

    it("returns 404 when file does not exist", async () => {
      const res = await request(app).get("/api/obsidian/vault/watch?path=Ghost.md");
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("FILE_NOT_FOUND");
    });

    it("returns 403 for path traversal attempts", async () => {
      const res = await request(app).get("/api/obsidian/vault/watch?path=../../secret.md");
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("PATH_TRAVERSAL_DETECTED");
    });

    it("establishes SSE text/event-stream connection and sends initial connected event", async () => {
      const filePath = path.join(tempVaultDir, "Stream.md");
      fs.writeFileSync(filePath, "Live stream content");

      const res = await request(app)
        .get("/api/obsidian/vault/watch?path=Stream.md")
        .set("Accept", "text/event-stream")
        .buffer(true)
        .parse((res, cb) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk.toString();
            // Close after receiving first chunk
            if (data.includes("connected")) {
              (res as any).destroy();
              cb(null, data);
            }
          });
        });

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("text/event-stream");
      expect(res.body).toContain("connected");
      expect(res.body).toContain("Stream.md");
    });
  });
});
