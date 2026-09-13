import { Topic, Note, Resource } from '../../../types';
import { AntigravityJobStatus } from '../../../lib/antigravityPipeline';
import { StepItemConfig, TopicSourceSummary, StatusBadgeInfo, NotebookLMWorkspaceStep } from './types';
import { getTopicDomainLabel } from '../../../lib/topicSelector';

export const WORKSPACE_STEPS: StepItemConfig[] = [
  {
    id: 'source',
    stepNumber: 1,
    label: 'Nguồn',
    description: 'Chuẩn bị và xuất tài liệu nguồn',
  },
  {
    id: 'prompt',
    stepNumber: 2,
    label: 'Prompt',
    description: 'Tạo chỉ thị và chuyển giao Antigravity',
  },
  {
    id: 'results',
    stepNumber: 3,
    label: 'Kết quả',
    description: 'Kho lưu trữ và thẩm định artifact',
  },
];

export function getTopicSourceSummary(
  topic: Topic | undefined,
  notes: Note[] = [],
  resources: Resource[] = [],
  sourceDocument: string = ''
): TopicSourceSummary {
  if (!topic) {
    return {
      topicTitle: 'Chưa chọn chủ đề',
      domainLabel: 'Không xác định',
      notesCount: 0,
      resourcesCount: 0,
      linksCount: 0,
      hasDescription: false,
      hasContent: false,
      sourceDocumentLength: 0,
    };
  }

  const topicNotes = notes.filter((n) => n.topicId === topic.id);
  const topicResources = resources.filter((r) => r.topicId === topic.id);
  const linksCount = topic.links?.length || 0;
  const domainLabel = getTopicDomainLabel(topic);

  return {
    topicTitle: topic.title,
    domainLabel,
    notesCount: topicNotes.length,
    resourcesCount: topicResources.length,
    linksCount,
    hasDescription: Boolean(topic.description && topic.description.trim().length > 0),
    hasContent: Boolean(topic.content && topic.content.trim().length > 0),
    sourceDocumentLength: sourceDocument.length,
  };
}

export function getHumanReadableJobStatus(status: AntigravityJobStatus | string): StatusBadgeInfo {
  switch (status) {
    case 'success':
      return {
        label: 'Hoàn tất',
        badgeClass:
          'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800',
        description: 'Đã nạp kết quả vào hệ thống thành công',
      };
    case 'processing':
      return {
        label: 'Đang xử lý',
        badgeClass:
          'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800',
        description: 'Antigravity đang chạy tác vụ phân tích',
      };
    case 'failed':
      return {
        label: 'Thất bại',
        badgeClass:
          'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800',
        description: 'Tác vụ gặp lỗi trong quá trình thực thi',
      };
    case 'queued':
    default:
      return {
        label: 'Đang chờ',
        badgeClass:
          'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800',
        description: 'Tác vụ đang nằm trong hàng đợi chuyển giao',
      };
  }
}

export function getHumanReadableArtifactStatus(status: string): StatusBadgeInfo {
  switch (status) {
    case 'validated':
      return {
        label: 'Đã thẩm định',
        badgeClass:
          'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800',
        description: 'Kết quả đã được xác minh tính chuẩn xác',
      };
    case 'imported':
    case 'partially_imported':
      return {
        label: status === 'partially_imported' ? 'Đã nạp 1 phần' : 'Đã nạp xong',
        badgeClass:
          'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800',
        description: 'Đã tích hợp thành Note hoặc Flashcard',
      };
    case 'archived':
      return {
        label: 'Đã lưu trữ',
        badgeClass:
          'bg-stone-200 text-stone-700 border-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700',
        description: 'Bản ghi được lưu trữ trong kho dữ liệu cũ',
      };
    case 'received':
    default:
      return {
        label: 'Mới tiếp nhận',
        badgeClass:
          'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800',
        description: 'Kết quả vừa nạp từ NotebookLM, chưa thẩm định',
      };
  }
}

import { ArtifactType as DTOArtifactType, ArtifactStatus as DTOArtifactStatus } from '../../../types/researchHub';
import { NotebookLMArtifactType, ArtifactStatus as LocalArtifactStatus } from '../../../lib/notebooklm';

const VALID_NOTEBOOKLM_ARTIFACT_TYPES: ReadonlySet<string> = new Set([
  'study_guide',
  'audio_overview_summary',
  'briefing_doc',
  'faq',
  'source_pack',
]);

const VALID_LOCAL_ARTIFACT_STATUSES: ReadonlySet<string> = new Set([
  'draft',
  'processed',
  'imported',
]);

export function isNotebookLMArtifactType(val: unknown): val is NotebookLMArtifactType {
  return typeof val === 'string' && VALID_NOTEBOOKLM_ARTIFACT_TYPES.has(val);
}

export function toNotebookLMArtifactType(
  val: unknown,
  fallback: NotebookLMArtifactType = 'study_guide'
): NotebookLMArtifactType {
  if (isNotebookLMArtifactType(val)) {
    return val;
  }
  return fallback;
}

export function isLocalArtifactStatus(val: unknown): val is LocalArtifactStatus {
  return typeof val === 'string' && VALID_LOCAL_ARTIFACT_STATUSES.has(val);
}

export function toLocalArtifactStatus(
  val: unknown,
  fallback: LocalArtifactStatus = 'imported'
): LocalArtifactStatus {
  if (isLocalArtifactStatus(val)) {
    return val;
  }
  return fallback;
}

export function mapLocalArtifactTypeToDTO(type: unknown): DTOArtifactType {
  const normalized = toNotebookLMArtifactType(type, 'study_guide');
  switch (normalized) {
    case 'study_guide':
    case 'audio_overview_summary':
      return 'study_guide';
    case 'briefing_doc':
      return 'briefing_doc';
    case 'faq':
      return 'qa_pair';
    case 'source_pack':
      return 'raw_markdown';
  }
}

export function mapLocalArtifactStatusToDTO(status: unknown): DTOArtifactStatus {
  const normalized = toLocalArtifactStatus(status, 'imported');
  switch (normalized) {
    case 'imported':
      return 'imported';
    case 'processed':
      return 'validated';
    case 'draft':
      return 'received';
  }
}

export function canNavigateToStep(
  targetStep: NotebookLMWorkspaceStep,
  hasTopic: boolean
): boolean {
  if (targetStep === 'prompt') {
    return hasTopic;
  }
  return true;
}
