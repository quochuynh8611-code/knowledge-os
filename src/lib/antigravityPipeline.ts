import { Topic, Note, Resource } from '../types';
import {
  NotebookLMArtifactType,
  packageSourceForNotebookLM,
  generateNotebookLMTaskPrompt,
} from './notebooklm';

export type AntigravityJobStatus = 'queued' | 'processing' | 'success' | 'failed';

export interface AntigravityHandoffJob {
  jobId: string;
  status: AntigravityJobStatus;
  artifactType: NotebookLMArtifactType;
  topicId: string;
  topicTitle: string;
  sourcePath: string;
  promptPath: string;
  manifestPath: string;
  resultPath?: string;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}

export const ANTIGRAVITY_HANDOFF_JOBS_STORAGE_KEY = 'phat_hoc_antigravity_handoff_jobs_v1';

/**
 * Tuần tự hóa manifest JSON làm Inter-process Handoff Artifact giữa Knowledge OS và Antigravity 2.0
 */
export function serializeAntigravityJobManifest(job: AntigravityHandoffJob): string {
  const manifestData = {
    version: '1.0',
    jobId: job.jobId,
    pipeline: 'antigravity-notebooklm-mediator',
    topic: {
      id: job.topicId,
      title: job.topicTitle,
    },
    artifactType: job.artifactType,
    files: {
      source: job.sourcePath,
      prompt: job.promptPath,
      manifest: job.manifestPath,
      ...(job.resultPath ? { result: job.resultPath } : {}),
    },
    createdAt: job.createdAt,
  };

  return JSON.stringify(manifestData, null, 2);
}

/**
 * Tổng hợp câu lệnh headless CLI agy -p động từ đối tượng Job (không lưu cứng command vào storage)
 */
export function buildAntigravityCLICommand(job: AntigravityHandoffJob): string {
  const outputFlag = job.resultPath ? ` --output "${job.resultPath}"` : '';
  return `agy -p "Khảo cứu NotebookLM: Xử lý chủ đề '${job.topicTitle}' (dạng ${job.artifactType}) theo prompt '${job.promptPath}' với dữ liệu nguồn '${job.sourcePath}'"${outputFlag}`;
}

/**
 * Tạo đối tượng Handoff Job kèm toàn bộ nội dung Source Document, Task Prompt và Manifest JSON
 */
export function createAntigravityHandoffJob(
  topic: Topic,
  artifactType: NotebookLMArtifactType = 'study_guide',
  customInstructions?: string,
  notes: Note[] = [],
  resources: Resource[] = []
): {
  job: AntigravityHandoffJob;
  sourceContent: string;
  promptContent: string;
  manifestContent: string;
} {
  const now = new Date().toISOString();
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const jobId = `job-nlm-${Date.now()}-${randomSuffix}`;

  const sourcePath = `.agents/handoffs/${jobId}-source.md`;
  const promptPath = `.agents/handoffs/${jobId}-prompt.md`;
  const manifestPath = `.agents/handoffs/${jobId}-manifest.json`;
  const resultPath = `.agents/handoffs/${jobId}-result.md`;

  const job: AntigravityHandoffJob = {
    jobId,
    status: 'queued',
    artifactType,
    topicId: topic.id,
    topicTitle: topic.title,
    sourcePath,
    promptPath,
    manifestPath,
    resultPath,
    createdAt: now,
    updatedAt: now,
  };

  const sourceContent = packageSourceForNotebookLM(topic, notes, resources);
  const promptContent = generateNotebookLMTaskPrompt(topic, artifactType, customInstructions);
  const manifestContent = serializeAntigravityJobManifest(job);

  return {
    job,
    sourceContent,
    promptContent,
    manifestContent,
  };
}

/**
 * Truy xuất danh sách Job trong UI Tracker từ LocalStorage
 */
export function getStoredHandoffJobs(): AntigravityHandoffJob[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const saved = localStorage.getItem(ANTIGRAVITY_HANDOFF_JOBS_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Lưu hoặc cập nhật Job trong UI Tracker LocalStorage
 */
export function saveHandoffJob(job: AntigravityHandoffJob): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const list = getStoredHandoffJobs().filter((item) => item.jobId !== job.jobId);
    list.unshift(job);
    localStorage.setItem(ANTIGRAVITY_HANDOFF_JOBS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Silent fail
  }
}

/**
 * Cập nhật trạng thái Job trong UI Tracker
 */
export function updateHandoffJobStatus(
  jobId: string,
  status: AntigravityJobStatus,
  errorMessage?: string
): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const list = getStoredHandoffJobs();
    const target = list.find((item) => item.jobId === jobId);
    if (target) {
      target.status = status;
      target.updatedAt = new Date().toISOString();
      if (errorMessage !== undefined) {
        target.errorMessage = errorMessage;
      }
      localStorage.setItem(ANTIGRAVITY_HANDOFF_JOBS_STORAGE_KEY, JSON.stringify(list));
    }
  } catch {
    // Silent fail
  }
}

/**
 * Xóa bản ghi Job khỏi UI Tracker
 */
export function deleteHandoffJob(jobId: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const list = getStoredHandoffJobs().filter((item) => item.jobId !== jobId);
    localStorage.setItem(ANTIGRAVITY_HANDOFF_JOBS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Silent fail
  }
}
