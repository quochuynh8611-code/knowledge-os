import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  saveHandoffJob,
  getStoredHandoffJobs,
  updateHandoffJobStatus,
  deleteHandoffJob,
  completeMatchingHandoffJob,
  validateAntigravityJobManifest,
  type AntigravityHandoffJob,
  ANTIGRAVITY_HANDOFF_JOBS_STORAGE_KEY,
} from "../../src/lib/antigravityPipeline";
import * as storageModule from "../../src/lib/storage";

describe("Phase P4.1 — Antigravity & NotebookLM Bridge Hardening", () => {
  const sampleJob: AntigravityHandoffJob = {
    jobId: "job-nlm-test-1",
    status: "queued",
    artifactType: "study_guide",
    topicId: "top-1",
    topicTitle: "Tứ Diệu Đế",
    sourcePath: ".agents/handoffs/job-nlm-test-1-source.md",
    promptPath: ".agents/handoffs/job-nlm-test-1-prompt.md",
    manifestPath: ".agents/handoffs/job-nlm-test-1-manifest.json",
    resultPath: ".agents/handoffs/job-nlm-test-1-result.md",
    createdAt: "2026-08-28T12:00:00.000Z",
    updatedAt: "2026-08-28T12:00:00.000Z",
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ─── 1. Manifest Validation ───────────────────────────────────────────────

  describe("1. validateAntigravityJobManifest", () => {
    it("1.1. accepts a fully valid manifest JSON string or object", () => {
      const validManifest = {
        version: "1.0",
        jobId: "job-nlm-123",
        pipeline: "antigravity-notebooklm-mediator",
        topic: {
          id: "top-1",
          title: "Bát Chánh Đạo",
        },
        artifactType: "faq",
        files: {
          source: ".agents/handoffs/job-nlm-123-source.md",
          prompt: ".agents/handoffs/job-nlm-123-prompt.md",
          manifest: ".agents/handoffs/job-nlm-123-manifest.json",
          result: ".agents/handoffs/job-nlm-123-result.md",
        },
        createdAt: "2026-08-28T12:00:00.000Z",
      };

      const result = validateAntigravityJobManifest(JSON.stringify(validManifest));
      expect(result.valid).toBe(true);
      expect(result.manifest).toBeDefined();
      expect(result.manifest?.jobId).toBe("job-nlm-123");
    });

    it("1.2. rejects invalid or corrupted manifest JSON", () => {
      const invalidJson = "{ invalid-json-payload";
      const result = validateAntigravityJobManifest(invalidJson);
      expect(result.valid).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it("1.3. rejects manifest missing mandatory fields (jobId, topic, files)", () => {
      const incompleteManifest = {
        version: "1.0",
        // missing jobId and files
        topic: { id: "top-1", title: "Test" },
      };

      const result = validateAntigravityJobManifest(incompleteManifest);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  // ─── 2. Rolling Buffer Limit (Max 50 Jobs) ────────────────────────────────

  describe("2. Rolling Buffer Limit (Max 50 Jobs)", () => {
    it("2.1. caps stored handoff jobs to 50 latest entries, evicting the oldest", () => {
      // Pre-fill tracker with 50 jobs
      for (let i = 1; i <= 50; i++) {
        saveHandoffJob({
          ...sampleJob,
          jobId: `job-nlm-init-${i}`,
          topicTitle: `Topic ${i}`,
        });
      }

      expect(getStoredHandoffJobs()).toHaveLength(50);
      expect(getStoredHandoffJobs()[0].jobId).toBe("job-nlm-init-50");

      // Add the 51st job
      const job51: AntigravityHandoffJob = {
        ...sampleJob,
        jobId: "job-nlm-51",
        topicTitle: "Topic 51 (Newest)",
      };
      saveHandoffJob(job51);

      const updatedList = getStoredHandoffJobs();
      expect(updatedList).toHaveLength(50);
      expect(updatedList[0].jobId).toBe("job-nlm-51");
      // The oldest job (job-nlm-init-1) should have been evicted
      expect(updatedList.find((j) => j.jobId === "job-nlm-init-1")).toBeUndefined();
    });
  });

  // ─── 3. Safe Storage & Graceful Fallback ───────────────────────────────────

  describe("3. Safe Storage & Graceful Fallback", () => {
    it("3.1. returns empty array without throwing when persisted data is malformed", () => {
      localStorage.setItem(
        ANTIGRAVITY_HANDOFF_JOBS_STORAGE_KEY,
        "### corrupted non-json string ###"
      );

      const jobs = getStoredHandoffJobs();
      expect(jobs).toEqual([]);
    });

    it("3.2. does not throw when safeSetLocalStorageItem fails / storage quota is exceeded", () => {
      vi.spyOn(storageModule, "safeSetLocalStorageItem").mockReturnValue(false);

      expect(() => {
        saveHandoffJob(sampleJob);
        updateHandoffJobStatus("job-nlm-test-1", "processing");
        deleteHandoffJob("job-nlm-test-1");
        completeMatchingHandoffJob({ topicId: "top-1" });
      }).not.toThrow();
    });
  });
});
