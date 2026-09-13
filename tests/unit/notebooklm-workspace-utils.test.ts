import { describe, it, expect } from 'vitest';
import {
  getTopicSourceSummary,
  getHumanReadableJobStatus,
  getHumanReadableArtifactStatus,
  canNavigateToStep,
  WORKSPACE_STEPS,
  isNotebookLMArtifactType,
  toNotebookLMArtifactType,
  isLocalArtifactStatus,
  toLocalArtifactStatus,
  mapLocalArtifactTypeToDTO,
  mapLocalArtifactStatusToDTO,
} from '../../src/components/integrations/notebooklm/utils';
import { Topic, Note, Resource } from '../../src/types';

describe('NotebookLM Workspace Utils Test Suite (Slice 1)', () => {
  const mockTopic: Topic = {
    id: 'topic-1',
    title: 'Kỳ Môn Độn Giáp',
    slug: 'ky-mon-don-giap',
    type: 'huyen-hoc',
    categoryId: 'cat-1',
    categoryName: 'Dịch Học',
    description: 'Khoa thuật số định vị thời không.',
    content: 'Cấu trúc Bát Môn, Cửu Tinh, Bát Thần.',
    tags: ['Kỳ Môn'],
    studyProgress: {
      topicId: 'topic-1',
      status: 'not_started',
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-24T10:00:00Z',
    links: [
      {
        id: 'link-1',
        sourceId: 'topic-1',
        targetId: 'topic-2',
        targetTitle: 'Lục Nhâm Đại Độn',
        linkType: 'related',
        strength: 4,
      },
    ],
  };

  const mockNotes: Note[] = [
    {
      id: 'note-1',
      topicId: 'topic-1',
      topicTitle: 'Kỳ Môn Độn Giáp',
      title: 'Sinh Môn Luận',
      content: 'Luận giải về Sinh Môn',
      type: 'insight',
      isPrivate: false,
      tags: [],
      createdAt: '2026-08-21T10:00:00Z',
      updatedAt: '2026-08-22T10:00:00Z',
    },
    {
      id: 'note-2',
      topicId: 'topic-other',
      topicTitle: 'Khác',
      title: 'Note khác',
      content: 'Nội dung',
      type: 'study',
      isPrivate: false,
      tags: [],
      createdAt: '2026-08-21T10:00:00Z',
      updatedAt: '2026-08-22T10:00:00Z',
    },
  ];

  const mockResources: Resource[] = [
    {
      id: 'res-1',
      topicId: 'topic-1',
      topicTitle: 'Kỳ Môn Độn Giáp',
      title: 'KyMon.pdf',
      type: 'pdf',
      filePath: 'KyMon.pdf',
      createdAt: '2026-08-20T10:00:00Z',
    },
  ];

  it('1. correctly computes TopicSourceSummary for a valid topic with notes and resources', () => {
    const summary = getTopicSourceSummary(mockTopic, mockNotes, mockResources, 'Sample Source Document Text');
    expect(summary.topicTitle).toBe('Kỳ Môn Độn Giáp');
    expect(summary.domainLabel).toBe('Huyền Học');
    expect(summary.notesCount).toBe(1);
    expect(summary.resourcesCount).toBe(1);
    expect(summary.linksCount).toBe(1);
    expect(summary.hasDescription).toBe(true);
    expect(summary.hasContent).toBe(true);
    expect(summary.sourceDocumentLength).toBe(27);
  });

  it('2. returns safe defaults when topic is undefined', () => {
    const summary = getTopicSourceSummary(undefined, [], [], '');
    expect(summary.topicTitle).toBe('Chưa chọn chủ đề');
    expect(summary.domainLabel).toBe('Không xác định');
    expect(summary.notesCount).toBe(0);
    expect(summary.resourcesCount).toBe(0);
    expect(summary.linksCount).toBe(0);
    expect(summary.hasDescription).toBe(false);
    expect(summary.hasContent).toBe(false);
    expect(summary.sourceDocumentLength).toBe(0);
  });

  it('3. maps AntigravityJobStatus to user-friendly Vietnamese labels and badge styling', () => {
    expect(getHumanReadableJobStatus('queued').label).toBe('Đang chờ');
    expect(getHumanReadableJobStatus('processing').label).toBe('Đang xử lý');
    expect(getHumanReadableJobStatus('success').label).toBe('Hoàn tất');
    expect(getHumanReadableJobStatus('failed').label).toBe('Thất bại');
    expect(getHumanReadableJobStatus('unknown_status').label).toBe('Đang chờ');
  });

  it('4. maps GroundedArtifact status to user-friendly labels and styling', () => {
    expect(getHumanReadableArtifactStatus('validated').label).toBe('Đã thẩm định');
    expect(getHumanReadableArtifactStatus('imported').label).toBe('Đã nạp xong');
    expect(getHumanReadableArtifactStatus('partially_imported').label).toBe('Đã nạp 1 phần');
    expect(getHumanReadableArtifactStatus('archived').label).toBe('Đã lưu trữ');
    expect(getHumanReadableArtifactStatus('received').label).toBe('Mới tiếp nhận');
  });

  it('5. enforces navigation prerequisite guards', () => {
    expect(canNavigateToStep('source', false)).toBe(true);
    expect(canNavigateToStep('source', true)).toBe(true);
    expect(canNavigateToStep('results', false)).toBe(true);
    expect(canNavigateToStep('results', true)).toBe(true);
    expect(canNavigateToStep('prompt', false)).toBe(false);
    expect(canNavigateToStep('prompt', true)).toBe(true);
  });

  it('6. contains exactly 3 configured workspace steps in proper sequence', () => {
    expect(WORKSPACE_STEPS).toHaveLength(3);
    expect(WORKSPACE_STEPS.map((s) => s.id)).toEqual(['source', 'prompt', 'results']);
    expect(WORKSPACE_STEPS.map((s) => s.stepNumber)).toEqual([1, 2, 3]);
  });

  it('7. verifies type guards and fallback behavior for NotebookLM artifact types', () => {
    // 5 Valid types
    expect(isNotebookLMArtifactType('study_guide')).toBe(true);
    expect(isNotebookLMArtifactType('audio_overview_summary')).toBe(true);
    expect(isNotebookLMArtifactType('briefing_doc')).toBe(true);
    expect(isNotebookLMArtifactType('faq')).toBe(true);
    expect(isNotebookLMArtifactType('source_pack')).toBe(true);

    // Invalid / unknown types
    expect(isNotebookLMArtifactType('mindmap')).toBe(false);
    expect(isNotebookLMArtifactType('timeline')).toBe(false);
    expect(isNotebookLMArtifactType(null)).toBe(false);
    expect(isNotebookLMArtifactType(undefined)).toBe(false);

    // Fallbacks
    expect(toNotebookLMArtifactType('study_guide')).toBe('study_guide');
    expect(toNotebookLMArtifactType('unknown_type')).toBe('study_guide');
    expect(toNotebookLMArtifactType('unknown_type', 'faq')).toBe('faq');

    // DTO mapping
    expect(mapLocalArtifactTypeToDTO('study_guide')).toBe('study_guide');
    expect(mapLocalArtifactTypeToDTO('audio_overview_summary')).toBe('study_guide');
    expect(mapLocalArtifactTypeToDTO('briefing_doc')).toBe('briefing_doc');
    expect(mapLocalArtifactTypeToDTO('faq')).toBe('qa_pair');
    expect(mapLocalArtifactTypeToDTO('source_pack')).toBe('raw_markdown');
    expect(mapLocalArtifactTypeToDTO('unknown_type')).toBe('study_guide');
  });

  it('8. verifies type guards and fallback behavior for Local artifact status', () => {
    // Valid statuses
    expect(isLocalArtifactStatus('draft')).toBe(true);
    expect(isLocalArtifactStatus('processed')).toBe(true);
    expect(isLocalArtifactStatus('imported')).toBe(true);

    // Invalid statuses
    expect(isLocalArtifactStatus('invalid_status')).toBe(false);
    expect(isLocalArtifactStatus(null)).toBe(false);

    // Fallback
    expect(toLocalArtifactStatus('imported')).toBe('imported');
    expect(toLocalArtifactStatus('unknown_status')).toBe('imported');

    // DTO mapping
    expect(mapLocalArtifactStatusToDTO('imported')).toBe('imported');
    expect(mapLocalArtifactStatusToDTO('processed')).toBe('validated');
    expect(mapLocalArtifactStatusToDTO('draft')).toBe('received');
    expect(mapLocalArtifactStatusToDTO('unknown')).toBe('imported');
  });
});
