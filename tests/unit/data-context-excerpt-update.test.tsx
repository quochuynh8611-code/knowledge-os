import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { DataProvider, useData } from '../../src/context/DataContext';
import { STORAGE_ROOT_KEY, STORAGE_VERSION_KEY } from '../../src/lib/storage';
import { ResearchExcerpt, ResearchInboxItem } from '../../src/types';

describe('Phase R3b Stage 1: DataContext.updateExcerpt (Test-First)', () => {
  const STORAGE_KEY = STORAGE_ROOT_KEY;

  const initialExcerpt: ResearchExcerpt = {
    id: 'exc-r3b-1',
    archivedDocumentId: 'doc-vdp-1',
    selectedText: 'Tâm là sự nhận biết đối tượng.',
    positionSelector: { headingId: 'chuong-1' },
    highlightColor: '#fef08a',
    citationSnapshot: { title: 'Vi Diệu Pháp Sơ Cấp' },
    userNote: 'Ghi chú ban đầu',
    status: 'active',
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
  };

  const initialInboxItem: ResearchInboxItem = {
    id: 'inbox-r3b-1',
    excerptId: 'exc-r3b-1',
    excerpt: initialExcerpt,
    isProcessed: false,
    priority: 1,
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
  };

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(STORAGE_VERSION_KEY, '4');
    localStorage.setItem(
      `${STORAGE_KEY}_research_excerpts`,
      JSON.stringify([initialExcerpt])
    );
    localStorage.setItem(
      `${STORAGE_KEY}_research_inbox`,
      JSON.stringify([initialInboxItem])
    );
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <DataProvider>{children}</DataProvider>
  );

  it('1. updateExcerpt updates userNote and refreshes updatedAt', async () => {
    const { result } = renderHook(() => useData(), { wrapper });

    expect(result.current.researchExcerpts).toHaveLength(1);
    expect(result.current.researchExcerpts[0].userNote).toBe('Ghi chú ban đầu');

    await act(async () => {
      await result.current.updateExcerpt('exc-r3b-1', {
        userNote: 'Ghi chú đã được cập nhật qua R3b inline editor',
      });
    });

    const updated = result.current.researchExcerpts.find((e) => e.id === 'exc-r3b-1');
    expect(updated).toBeDefined();
    expect(updated?.userNote).toBe('Ghi chú đã được cập nhật qua R3b inline editor');
    expect(updated?.highlightColor).toBe('#fef08a');
    expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date('2026-09-01T08:00:00.000Z').getTime()
    );
  });

  it('2. updateExcerpt updates highlightColor and persists to localStorage', async () => {
    const { result } = renderHook(() => useData(), { wrapper });

    await act(async () => {
      await result.current.updateExcerpt('exc-r3b-1', {
        highlightColor: '#bae6fd',
      });
    });

    const updated = result.current.researchExcerpts.find((e) => e.id === 'exc-r3b-1');
    expect(updated?.highlightColor).toBe('#bae6fd');

    const storedRaw = localStorage.getItem(`${STORAGE_KEY}_research_excerpts`);
    expect(storedRaw).toBeTruthy();
    const stored = JSON.parse(storedRaw!);
    expect(stored[0].highlightColor).toBe('#bae6fd');
    expect(stored[0].userNote).toBe('Ghi chú ban đầu');
  });

  it('3. updateExcerpt syncs embedded excerpt reference in researchInboxItems if present', async () => {
    const { result } = renderHook(() => useData(), { wrapper });

    await act(async () => {
      await result.current.addExcerptToInbox(initialExcerpt);
    });

    await act(async () => {
      await result.current.updateExcerpt('exc-r3b-1', {
        userNote: 'Cập nhật ghi chú đồng bộ inbox',
        highlightColor: '#fbcfe8',
      });
    });

    const inboxItem = result.current.researchInboxItems.find((i) => i.excerptId === 'exc-r3b-1');
    expect(inboxItem).toBeDefined();
    expect(inboxItem?.excerpt?.userNote).toBe('Cập nhật ghi chú đồng bộ inbox');
    expect(inboxItem?.excerpt?.highlightColor).toBe('#fbcfe8');

    const storedInboxRaw = localStorage.getItem(`${STORAGE_KEY}_research_inbox`);
    expect(storedInboxRaw).toBeTruthy();
    const storedInbox = JSON.parse(storedInboxRaw!);
    expect(storedInbox[0].excerpt?.userNote).toBe('Cập nhật ghi chú đồng bộ inbox');
    expect(storedInbox[0].excerpt?.highlightColor).toBe('#fbcfe8');
  });

  it('4. updateExcerpt safely no-ops when excerpt id does not exist', async () => {
    const { result } = renderHook(() => useData(), { wrapper });

    await act(async () => {
      await result.current.updateExcerpt('non-existent-id', {
        userNote: 'Should not do anything',
      });
    });

    expect(result.current.researchExcerpts).toHaveLength(1);
    expect(result.current.researchExcerpts[0].id).toBe('exc-r3b-1');
    expect(result.current.researchExcerpts[0].userNote).toBe('Ghi chú ban đầu');
  });
});
