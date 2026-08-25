/**
 * Antigravity Pipeline Library Unit Test Suite
 *
 * Spec: docs/specs/post-phase5-automated-antigravity-notebooklm-handoff.md
 * ADR: docs/specs/adr-015-automated-antigravity-notebooklm-handoff.md
 * Gherkin: docs/gherkin/post-phase5-automated-antigravity-notebooklm-handoff.feature
 * Target: src/lib/antigravityPipeline.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createAntigravityHandoffJob,
  buildAntigravityCLICommand,
  serializeAntigravityJobManifest,
  getStoredHandoffJobs,
  saveHandoffJob,
  updateHandoffJobStatus,
  deleteHandoffJob,
  ANTIGRAVITY_HANDOFF_JOBS_STORAGE_KEY,
  AntigravityHandoffJob,
} from '../../src/lib/antigravityPipeline';
import { Topic, Note, Resource } from '../../src/types';

describe('Post-Phase 5: Antigravity Handoff Pipeline Library Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const mockTopic: Topic = {
    id: 'topic-vi-dieu-phap',
    title: 'Vi Diệu Pháp Toàn Tập',
    slug: 'vi-dieu-phap-toan-tap',
    type: 'phat-hoc',
    categoryId: 'cat-abhidharma',
    categoryName: 'Vi Diệu Pháp',
    description: 'Khảo luận chi tiết 89/121 Tâm và 52 Tâm sở.',
    content: 'Tâm là thực tại nhận biết cảnh.',
    tags: ['Abhidharma', 'Tâm Sở'],
    studyProgress: {
      topicId: 'topic-vi-dieu-phap',
      status: 'not_started',
      progress: 0,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 1,
      timeSpent: 0,
    },
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-24T10:00:00Z',
    links: [],
  };

  const mockNotes: Note[] = [
    {
      id: 'note-1',
      topicId: 'topic-vi-dieu-phap',
      title: 'Phân tích 52 Tâm sở',
      content: 'Tâm sở biến hành và biệt cảnh.',
      type: 'study',
      isPrivate: false,
      tags: ['Abhidharma'],
      createdAt: '2026-08-21T10:00:00Z',
      updatedAt: '2026-08-21T10:00:00Z',
    },
  ];

  const mockResources: Resource[] = [
    {
      id: 'res-1',
      topicId: 'topic-vi-dieu-phap',
      title: 'Thắng Pháp Tập Yếu Luận',
      type: 'book',
      author: 'Anuruddha',
      createdAt: '2026-08-20T10:00:00Z',
    },
  ];

  // ---------------------------------------------------------------------------
  // Test 1: createAntigravityHandoffJob generates valid job contract without persisted command
  // ---------------------------------------------------------------------------
  it('1. createAntigravityHandoffJob sinh đúng cấu trúc Job với status queued và không persist chuỗi command', () => {
    const result = createAntigravityHandoffJob(
      mockTopic,
      'study_guide',
      'Tập trung vào 7 tâm sở biến hành',
      mockNotes,
      mockResources
    );

    expect(result.job).toBeDefined();
    expect(result.job.jobId).toMatch(/^job-nlm-\d+-[a-z0-9]+$/);
    expect(result.job.status).toBe('queued');
    expect(result.job.artifactType).toBe('study_guide');
    expect(result.job.topicId).toBe('topic-vi-dieu-phap');
    expect(result.job.topicTitle).toBe('Vi Diệu Pháp Toàn Tập');
    expect(result.job.sourcePath).toBe(`.agents/handoffs/${result.job.jobId}-source.md`);
    expect(result.job.promptPath).toBe(`.agents/handoffs/${result.job.jobId}-prompt.md`);
    expect(result.job.manifestPath).toBe(`.agents/handoffs/${result.job.jobId}-manifest.json`);
    expect(result.job.resultPath).toBe(`.agents/handoffs/${result.job.jobId}-result.md`);
    expect(result.job.createdAt).toBeDefined();
    expect(result.job.updatedAt).toBeDefined();

    // Invariant check: command property is NOT persisted in job object
    expect((result.job as any).command).toBeUndefined();

    // Check payload contents
    expect(result.sourceContent).toContain('TÀI LIỆU NGUỒN KHẢO CỨU');
    expect(result.sourceContent).toContain('VI DIỆU PHÁP TOÀN TẬP');
    expect(result.promptContent).toContain('[Chỉ thị Antigravity 2.0: Sử dụng NotebookLM Skill]');
    expect(result.promptContent).toContain('7 tâm sở biến hành');
    expect(result.manifestContent).toContain(result.job.jobId);
  });

  // ---------------------------------------------------------------------------
  // Test 2: buildAntigravityCLICommand synthesizes deterministic agy -p command
  // ---------------------------------------------------------------------------
  it('2. buildAntigravityCLICommand tổng hợp câu lệnh agy -p chứa prompt, source và output', () => {
    const job: AntigravityHandoffJob = {
      jobId: 'job-nlm-123456-abc',
      status: 'queued',
      artifactType: 'study_guide',
      topicId: 'topic-vi-dieu-phap',
      topicTitle: 'Vi Diệu Pháp Toàn Tập',
      sourcePath: '.agents/handoffs/job-nlm-123456-abc-source.md',
      promptPath: '.agents/handoffs/job-nlm-123456-abc-prompt.md',
      manifestPath: '.agents/handoffs/job-nlm-123456-abc-manifest.json',
      resultPath: '.agents/handoffs/job-nlm-123456-abc-result.md',
      createdAt: '2026-08-25T10:00:00Z',
      updatedAt: '2026-08-25T10:00:00Z',
    };

    const command = buildAntigravityCLICommand(job);

    expect(command).toContain('agy -p');
    expect(command).toContain('Vi Diệu Pháp Toàn Tập');
    expect(command).toContain('.agents/handoffs/job-nlm-123456-abc-prompt.md');
    expect(command).toContain('.agents/handoffs/job-nlm-123456-abc-source.md');
    expect(command).toContain('.agents/handoffs/job-nlm-123456-abc-result.md');
  });

  // ---------------------------------------------------------------------------
  // Test 3: serializeAntigravityJobManifest formats valid JSON inter-process artifact
  // ---------------------------------------------------------------------------
  it('3. serializeAntigravityJobManifest tuần tự hóa manifest JSON hợp lệ', () => {
    const job: AntigravityHandoffJob = {
      jobId: 'job-nlm-999-xyz',
      status: 'queued',
      artifactType: 'faq',
      topicId: 'topic-vi-dieu-phap',
      topicTitle: 'Vi Diệu Pháp Toàn Tập',
      sourcePath: '.agents/handoffs/job-nlm-999-xyz-source.md',
      promptPath: '.agents/handoffs/job-nlm-999-xyz-prompt.md',
      manifestPath: '.agents/handoffs/job-nlm-999-xyz-manifest.json',
      createdAt: '2026-08-25T10:00:00Z',
      updatedAt: '2026-08-25T10:00:00Z',
    };

    const manifestStr = serializeAntigravityJobManifest(job);
    const parsed = JSON.parse(manifestStr);

    expect(parsed.version).toBe('1.0');
    expect(parsed.jobId).toBe('job-nlm-999-xyz');
    expect(parsed.pipeline).toBe('antigravity-notebooklm-mediator');
    expect(parsed.artifactType).toBe('faq');
    expect(parsed.topic.id).toBe('topic-vi-dieu-phap');
    expect(parsed.topic.title).toBe('Vi Diệu Pháp Toàn Tập');
    expect(parsed.files.source).toBe('.agents/handoffs/job-nlm-999-xyz-source.md');
    expect(parsed.files.prompt).toBe('.agents/handoffs/job-nlm-999-xyz-prompt.md');
    expect(parsed.files.manifest).toBe('.agents/handoffs/job-nlm-999-xyz-manifest.json');
  });

  // ---------------------------------------------------------------------------
  // Test 4: LocalStorage tracker CRUD operations
  // ---------------------------------------------------------------------------
  it('4. Quản lý UI Tracker State trong LocalStorage (save, get, update status, delete)', () => {
    expect(getStoredHandoffJobs()).toEqual([]);

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

    saveHandoffJob(job1);
    let jobs = getStoredHandoffJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].jobId).toBe('job-nlm-1');
    expect(jobs[0].status).toBe('queued');

    // Update status to processing
    updateHandoffJobStatus('job-nlm-1', 'processing');
    jobs = getStoredHandoffJobs();
    expect(jobs[0].status).toBe('processing');

    // Update status to failed with error
    updateHandoffJobStatus('job-nlm-1', 'failed', 'Connection timeout');
    jobs = getStoredHandoffJobs();
    expect(jobs[0].status).toBe('failed');
    expect(jobs[0].errorMessage).toBe('Connection timeout');

    // Delete job
    deleteHandoffJob('job-nlm-1');
    expect(getStoredHandoffJobs()).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Test 5: Safe fallback on corrupt LocalStorage
  // ---------------------------------------------------------------------------
  it('5. Tự động fallback về mảng rỗng khi LocalStorage bị hỏng hoặc không hợp lệ', () => {
    localStorage.setItem(ANTIGRAVITY_HANDOFF_JOBS_STORAGE_KEY, 'invalid-json-content{');
    expect(getStoredHandoffJobs()).toEqual([]);

    localStorage.setItem(ANTIGRAVITY_HANDOFF_JOBS_STORAGE_KEY, JSON.stringify({ not: 'an-array' }));
    expect(getStoredHandoffJobs()).toEqual([]);
  });
});
