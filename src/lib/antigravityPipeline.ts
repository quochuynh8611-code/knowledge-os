import { Topic, Note, Resource } from '../types';
import {
  NotebookLMArtifactType,
  packageSourceForNotebookLM,
  generateNotebookLMTaskPrompt,
} from './notebooklm';
import {
  safeGetLocalStorageItem,
  safeSetLocalStorageItem,
} from './storage';

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

export interface AntigravityJobManifest {
  version: string;
  jobId: string;
  pipeline: string;
  topic: {
    id: string;
    title: string;
  };
  artifactType: NotebookLMArtifactType;
  files: {
    source: string;
    prompt: string;
    manifest: string;
    result?: string;
  };
  createdAt: string;
}

export interface ManifestValidationResult {
  valid: boolean;
  manifest?: AntigravityJobManifest;
  errors?: string[];
}

export const ANTIGRAVITY_HANDOFF_JOBS_STORAGE_KEY = 'phat_hoc_antigravity_handoff_jobs_v1';

/**
 * Validates the schema and completeness of an inter-process Antigravity Job Manifest.
 */
export function validateAntigravityJobManifest(rawManifest: unknown): ManifestValidationResult {
  const errors: string[] = [];
  if (!rawManifest) {
    return { valid: false, errors: ['Manifest payload is empty or null'] };
  }

  let parsed: any = rawManifest;
  if (typeof rawManifest === 'string') {
    try {
      parsed = JSON.parse(rawManifest);
    } catch {
      return { valid: false, errors: ['Invalid JSON format in manifest'] };
    }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { valid: false, errors: ['Manifest must be a JSON object'] };
  }

  if (!parsed.jobId || typeof parsed.jobId !== 'string') {
    errors.push("Missing or invalid 'jobId'");
  }
  if (!parsed.version || typeof parsed.version !== 'string') {
    errors.push("Missing or invalid 'version'");
  }
  if (!parsed.topic || typeof parsed.topic !== 'object' || !parsed.topic.id || !parsed.topic.title) {
    errors.push("Missing or invalid 'topic' metadata (must contain id and title)");
  }
  if (
    !parsed.files ||
    typeof parsed.files !== 'object' ||
    !parsed.files.source ||
    !parsed.files.prompt ||
    !parsed.files.manifest
  ) {
    errors.push("Missing or invalid 'files' mapping (must contain source, prompt, and manifest paths)");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, manifest: parsed as AntigravityJobManifest };
}

/**
 * Tuần tự hóa manifest JSON làm Inter-process Handoff Artifact giữa Knowledge OS và Antigravity 2.0
 */
export function serializeAntigravityJobManifest(job: AntigravityHandoffJob): string {
  const manifestData: AntigravityJobManifest = {
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
 * Truy xuất danh sách Job trong UI Tracker từ LocalStorage an toàn
 */
export function getStoredHandoffJobs(): AntigravityHandoffJob[] {
  const raw = safeGetLocalStorageItem(ANTIGRAVITY_HANDOFF_JOBS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Lưu hoặc cập nhật Job trong UI Tracker LocalStorage (giới hạn rolling buffer 50 bản ghi)
 */
export function saveHandoffJob(job: AntigravityHandoffJob): void {
  try {
    const list = getStoredHandoffJobs().filter((item) => item.jobId !== job.jobId);
    list.unshift(job);
    const boundedList = list.slice(0, 50);
    safeSetLocalStorageItem(
      ANTIGRAVITY_HANDOFF_JOBS_STORAGE_KEY,
      JSON.stringify(boundedList)
    );
  } catch {
    // Graceful silent fail
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
  try {
    const list = getStoredHandoffJobs();
    const target = list.find((item) => item.jobId === jobId);
    if (target) {
      target.status = status;
      target.updatedAt = new Date().toISOString();
      if (errorMessage !== undefined) {
        target.errorMessage = errorMessage;
      }
      safeSetLocalStorageItem(
        ANTIGRAVITY_HANDOFF_JOBS_STORAGE_KEY,
        JSON.stringify(list)
      );
    }
  } catch {
    // Graceful silent fail
  }
}

/**
 * Xóa bản ghi Job khỏi UI Tracker
 */
export function deleteHandoffJob(jobId: string): void {
  try {
    const list = getStoredHandoffJobs().filter((item) => item.jobId !== jobId);
    safeSetLocalStorageItem(
      ANTIGRAVITY_HANDOFF_JOBS_STORAGE_KEY,
      JSON.stringify(list)
    );
  } catch {
    // Graceful silent fail
  }
}

/**
 * Hoàn tất Job trong UI Tracker khi nạp kết quả Artifact trở lại Knowledge OS
 * Quy tắc:
 * 1. Ưu tiên tìm chính xác theo `jobId` nếu được cung cấp và kiểm tra `topicId` trùng khớp.
 * 2. Fallback: Nếu không có `jobId`, tìm Job đang chờ gần nhất (`queued` | `processing`) có cùng `topicId` và `artifactType` (nếu được truyền).
 * 3. Cập nhật `status = 'success'` và `updatedAt = ISO timestamp`.
 * 4. Trả về đối tượng Job đã hoàn tất, hoặc `null` nếu không tìm thấy Job phù hợp.
 */
export function completeMatchingHandoffJob(params: {
  topicId: string;
  artifactType?: NotebookLMArtifactType;
  jobId?: string;
}): AntigravityHandoffJob | null {
  if (!params || !params.topicId) return null;
  try {
    const list = getStoredHandoffJobs();
    if (!list || list.length === 0) return null;

    let targetIndex = -1;

    if (params.jobId) {
      // Ưu tiên 1: Tìm chính xác theo jobId
      targetIndex = list.findIndex(
        (item) => item.jobId === params.jobId && item.topicId === params.topicId
      );
    } else {
      // Ưu tiên 2: Fallback tìm pending job (queued hoặc processing) gần nhất khớp topicId và artifactType
      targetIndex = list.findIndex((item) => {
        if (item.topicId !== params.topicId) return false;
        if (params.artifactType && item.artifactType !== params.artifactType) return false;
        return item.status === 'queued' || item.status === 'processing';
      });
    }

    if (targetIndex === -1) return null;

    const target = list[targetIndex];
    target.status = 'success';
    target.updatedAt = new Date().toISOString();

    safeSetLocalStorageItem(
      ANTIGRAVITY_HANDOFF_JOBS_STORAGE_KEY,
      JSON.stringify(list)
    );
    return target;
  } catch {
    return null;
  }
}
