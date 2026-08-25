/**
 * Antigravity Result Ingestion & Tracker Completion Library Unit Tests
 *
 * Spec: docs/specs/post-phase5-antigravity-result-ingestion-tracker-completion.md
 * ADR: docs/specs/adr-015-automated-antigravity-notebooklm-handoff.md
 * Gherkin: docs/gherkin/post-phase5-antigravity-result-ingestion-tracker-completion.feature
 * Target: src/lib/antigravityPipeline.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  completeMatchingHandoffJob,
  getStoredHandoffJobs,
  saveHandoffJob,
  AntigravityHandoffJob,
} from '../../src/lib/antigravityPipeline';

describe('Post-Phase 5: Antigravity Result Ingestion & Completion Library Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const job1: AntigravityHandoffJob = {
    jobId: 'job-nlm-1',
    status: 'queued',
    artifactType: 'study_guide',
    topicId: 'topic-vi-dieu-phap',
    topicTitle: 'Vi Diệu Pháp Toàn Tập',
    sourcePath: '.agents/handoffs/job-nlm-1-source.md',
    promptPath: '.agents/handoffs/job-nlm-1-prompt.md',
    manifestPath: '.agents/handoffs/job-nlm-1-manifest.json',
    createdAt: '2026-08-25T10:00:00Z',
    updatedAt: '2026-08-25T10:00:00Z',
  };

  const job2: AntigravityHandoffJob = {
    jobId: 'job-nlm-2',
    status: 'queued',
    artifactType: 'faq',
    topicId: 'topic-ky-mon',
    topicTitle: 'Kỳ Môn Độn Giáp Toàn Thư',
    sourcePath: '.agents/handoffs/job-nlm-2-source.md',
    promptPath: '.agents/handoffs/job-nlm-2-prompt.md',
    manifestPath: '.agents/handoffs/job-nlm-2-manifest.json',
    createdAt: '2026-08-25T10:05:00Z',
    updatedAt: '2026-08-25T10:05:00Z',
  };

  // ---------------------------------------------------------------------------
  // Test 1: Matching topicId and artifactType completes the pending job
  // ---------------------------------------------------------------------------
  it('1. completeMatchingHandoffJob chuyển trạng thái job sang success khi khớp topicId và artifactType', () => {
    saveHandoffJob(job1);

    const completed = completeMatchingHandoffJob({
      topicId: 'topic-vi-dieu-phap',
      artifactType: 'study_guide',
    });

    expect(completed).not.toBeNull();
    expect(completed?.jobId).toBe('job-nlm-1');
    expect(completed?.status).toBe('success');
    expect(completed?.updatedAt).not.toBe(job1.updatedAt);

    const stored = getStoredHandoffJobs();
    expect(stored[0].status).toBe('success');
  });

  // ---------------------------------------------------------------------------
  // Test 2: Matching by explicit jobId
  // ---------------------------------------------------------------------------
  it('2. completeMatchingHandoffJob hoàn tất chính xác job khi truyền jobId tường minh', () => {
    saveHandoffJob(job1);
    saveHandoffJob(job2);

    const completed = completeMatchingHandoffJob({
      topicId: 'topic-ky-mon',
      jobId: 'job-nlm-2',
    });

    expect(completed?.jobId).toBe('job-nlm-2');
    expect(completed?.status).toBe('success');

    const stored = getStoredHandoffJobs();
    const j1 = stored.find((j) => j.jobId === 'job-nlm-1');
    const j2 = stored.find((j) => j.jobId === 'job-nlm-2');

    expect(j1?.status).toBe('queued'); // Job 1 remains queued
    expect(j2?.status).toBe('success');
  });

  // ---------------------------------------------------------------------------
  // Test 3: Mismatched topicId or artifactType does not complete unrelated jobs
  // ---------------------------------------------------------------------------
  it('3. completeMatchingHandoffJob trả về null và không đổi trạng thái khi sai topicId hoặc artifactType', () => {
    saveHandoffJob(job1);

    // Mismatched topicId
    const result1 = completeMatchingHandoffJob({
      topicId: 'topic-khac',
      artifactType: 'study_guide',
    });
    expect(result1).toBeNull();

    // Mismatched artifactType
    const result2 = completeMatchingHandoffJob({
      topicId: 'topic-vi-dieu-phap',
      artifactType: 'audio_overview_summary',
    });
    expect(result2).toBeNull();

    const stored = getStoredHandoffJobs();
    expect(stored[0].status).toBe('queued');
  });

  // ---------------------------------------------------------------------------
  // Test 4: Completes the newest pending job when multiple exist for same topic
  // ---------------------------------------------------------------------------
  it('4. completeMatchingHandoffJob ưu tiên hoàn tất job đang chờ mới nhất', () => {
    const olderJob: AntigravityHandoffJob = {
      ...job1,
      jobId: 'job-nlm-old',
      createdAt: '2026-08-25T08:00:00Z',
      updatedAt: '2026-08-25T08:00:00Z',
    };
    const newerJob: AntigravityHandoffJob = {
      ...job1,
      jobId: 'job-nlm-new',
      createdAt: '2026-08-25T11:00:00Z',
      updatedAt: '2026-08-25T11:00:00Z',
    };

    saveHandoffJob(olderJob);
    saveHandoffJob(newerJob); // prepended, so newerJob is first in array

    const completed = completeMatchingHandoffJob({
      topicId: 'topic-vi-dieu-phap',
      artifactType: 'study_guide',
    });

    expect(completed?.jobId).toBe('job-nlm-new');
    expect(completed?.status).toBe('success');

    const stored = getStoredHandoffJobs();
    const jNew = stored.find((j) => j.jobId === 'job-nlm-new');
    const jOld = stored.find((j) => j.jobId === 'job-nlm-old');

    expect(jNew?.status).toBe('success');
    expect(jOld?.status).toBe('queued'); // Older job remains queued
  });

  // ---------------------------------------------------------------------------
  // Test 5: Safe handling when storage is empty
  // ---------------------------------------------------------------------------
  it('5. completeMatchingHandoffJob xử lý an toàn và trả về null khi tracker rỗng', () => {
    const result = completeMatchingHandoffJob({
      topicId: 'topic-vi-dieu-phap',
      artifactType: 'study_guide',
    });
    expect(result).toBeNull();
  });
});
