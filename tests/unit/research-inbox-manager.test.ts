import { describe, it, expect, beforeEach } from 'vitest';
import {
  filterUnprocessedInboxItems,
  dismissResearchInboxItem,
  markInboxItemAsProcessed,
  sortInboxItemsByPriority,
  createInboxItemFromExcerpt,
} from '../../src/components/research/ResearchInboxDrawer';
import { ResearchExcerpt, ResearchInboxItem } from '../../src/types';

describe('Phase 18A Wave 4: Research Inbox Manager', () => {
  const sampleExcerpt1: ResearchExcerpt = {
    id: 'excerpt-1',
    archivedDocumentId: 'doc-1',
    selectedText: 'Phát hiện quan trọng trong tài liệu A.',
    positionSelector: { pageNumber: 5 },
    highlightColor: 'yellow',
    citationSnapshot: {
      title: 'Tài liệu A',
      apa: 'Tác giả A (2024). Tài liệu A.',
    },
    status: 'inbox',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
  };

  const sampleExcerpt2: ResearchExcerpt = {
    id: 'excerpt-2',
    archivedDocumentId: 'doc-2',
    selectedText: 'Bằng chứng lâm sàng trong tài liệu B.',
    positionSelector: { pageNumber: 15 },
    highlightColor: 'green',
    citationSnapshot: {
      title: 'Tài liệu B',
      apa: 'Tác giả B (2024). Tài liệu B.',
    },
    status: 'inbox',
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
  };

  let items: ResearchInboxItem[];

  beforeEach(() => {
    items = [
      {
        id: 'inbox-1',
        excerptId: 'excerpt-1',
        excerpt: sampleExcerpt1,
        isProcessed: false,
        priority: 1,
        createdAt: '2026-01-01T10:00:00.000Z',
        updatedAt: '2026-01-01T10:00:00.000Z',
      },
      {
        id: 'inbox-2',
        excerptId: 'excerpt-2',
        excerpt: sampleExcerpt2,
        isProcessed: true,
        priority: 2,
        createdAt: '2026-01-02T10:00:00.000Z',
        updatedAt: '2026-01-02T10:00:00.000Z',
      },
    ];
  });

  it('filters only unprocessed items from inbox list', () => {
    const unprocessed = filterUnprocessedInboxItems(items);
    expect(unprocessed).toHaveLength(1);
    expect(unprocessed[0].id).toBe('inbox-1');
  });

  it('dismisses an inbox item by setting isProcessed to true', () => {
    const updated = dismissResearchInboxItem(items, 'inbox-1');
    const target = updated.find((i) => i.id === 'inbox-1');
    expect(target?.isProcessed).toBe(true);
    expect(filterUnprocessedInboxItems(updated)).toHaveLength(0);
  });

  it('marks an inbox item as processed after sending to note', () => {
    const updated = markInboxItemAsProcessed(items, 'inbox-1');
    const target = updated.find((i) => i.id === 'inbox-1');
    expect(target?.isProcessed).toBe(true);
  });

  it('sorts inbox items by priority descending and createdAt descending', () => {
    const itemLow: ResearchInboxItem = {
      id: 'inbox-low',
      excerptId: 'excerpt-1',
      isProcessed: false,
      priority: 0,
      createdAt: '2026-01-03T10:00:00.000Z',
      updatedAt: '2026-01-03T10:00:00.000Z',
    };
    const itemHigh: ResearchInboxItem = {
      id: 'inbox-high',
      excerptId: 'excerpt-2',
      isProcessed: false,
      priority: 3,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    };

    const sorted = sortInboxItemsByPriority([itemLow, itemHigh]);
    expect(sorted[0].id).toBe('inbox-high');
    expect(sorted[1].id).toBe('inbox-low');
  });

  it('creates an inbox item wrapper from excerpt with default priority 0', () => {
    const newItem = createInboxItemFromExcerpt(sampleExcerpt1);
    expect(newItem.excerptId).toBe('excerpt-1');
    expect(newItem.isProcessed).toBe(false);
    expect(newItem.priority).toBe(0);
    expect(newItem.excerpt).toEqual(sampleExcerpt1);
  });
});
