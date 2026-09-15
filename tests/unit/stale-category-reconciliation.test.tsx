import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { DataProvider, useData } from '../../src/context/DataContext';
import { safeSetLocalStorageItem, safeGetLocalStorageItem, STORAGE_ROOT_KEY } from '../../src/lib/storage';

function TestConsumer() {
  const { categories, topics, addCategory } = useData();
  return (
    <div>
      <div data-testid="category-count">{categories.length}</div>
      <ul data-testid="category-list">
        {categories.map((c) => (
          <li key={c.id} data-testid={`cat-${c.id}`}>{c.name}</li>
        ))}
      </ul>
      <div data-testid="topic-count">{topics.length}</div>
      <button
        data-testid="btn-add-dynamic-category"
        onClick={() => addCategory({ name: 'Triết Học Đương Đại', slug: 'triet-hoc-duong-dai', parentId: null })}
      >
        Add Category
      </button>
    </div>
  );
}

describe('Stale Category State Reconciliation & SSOT Hydration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('Scenario 1: Legacy cache cannot recreate deleted categories - startup does not post legacy cache to sync/hydrate and reconciles to server', async () => {
    const syncCalls: any[] = [];

    // Simulate stale local storage containing 4 legacy categories
    const staleCategories = [
      { id: 'cat-root-kinh-te', name: 'Kinh Tế', slug: 'kinh-te', type: 'kinh-te', parentId: null },
      { id: 'cat-root-kinh-te-hoc', name: 'Kinh Tế Học', slug: 'kinh-te-hoc', type: 'kinh-te-hoc', parentId: null },
      { id: 'cat-1789397768580', name: 'Khoa Học Tự Nhiên', slug: 'khoa-hoc-tu-nhien', type: 'khoa-hoc-tu-nhien', parentId: null },
      { id: 'cat-root-dong-y', name: 'Đông Y', slug: 'dong-y', type: 'dong-y', parentId: null },
    ];
    safeSetLocalStorageItem(`${STORAGE_ROOT_KEY}_categories`, JSON.stringify(staleCategories));

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/api/topics')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              id: 'topic-dong-y-co-ban',
              title: 'Lý Luận Cơ Bản Đông Y',
              slug: 'ly-luan-co-ban-dong-y',
              categoryId: 'cat-root-dong-y',
              type: 'dong-y',
              parentId: null,
              description: 'Mô tả bài học',
              content: 'Nội dung',
              tags: ['dong-y'],
              links: [],
              studyProgress: {
                topicId: 'topic-dong-y-co-ban',
                status: 'not_started',
                progress: 0,
                repetitions: 0,
                easeFactor: 2.5,
                interval: 0,
                totalNotes: 1,
                timeSpent: 0,
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        } as Response;
      }
      if (url.includes('/api/categories')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              id: 'cat-root-dong-y',
              name: 'Đông Y',
              slug: 'dong-y',
              type: 'dong-y',
              parentId: null,
              description: 'Lĩnh vực nghiên cứu Đông Y',
            },
          ],
        } as Response;
      }
      if (url.includes('/api/notes') || url.includes('/api/resources')) {
        return {
          ok: true,
          status: 200,
          json: async () => [],
        } as Response;
      }
      if (url.includes('/api/sync/hydrate')) {
        if (init?.body) {
          syncCalls.push(JSON.parse(String(init.body)));
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            clientSyncId: 'test-sync',
            serverTimestamp: new Date().toISOString(),
            summary: {
              categoriesUpserted: 1,
              topicsUpserted: 1,
              notesUpserted: 0,
              resourcesUpserted: 0,
              tagsUpserted: 0,
              linksUpserted: 0,
              progressMerged: 0,
            },
          }),
        } as Response;
      }
      return {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      } as Response;
    });

    render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );

    // Wait for server hydration to complete
    await waitFor(() => {
      expect(screen.getByTestId('category-count')).toHaveTextContent('1');
    });

    // Invariant: Server response replaced the local stale state
    expect(screen.getByTestId('cat-cat-root-dong-y')).toHaveTextContent('Đông Y');
    expect(screen.queryByTestId('cat-cat-root-kinh-te')).toBeNull();
    expect(screen.queryByTestId('cat-cat-root-kinh-te-hoc')).toBeNull();
    expect(screen.queryByTestId('cat-cat-1789397768580')).toBeNull();

    // Critical Invariant: No mutating sync request containing legacy categories occurred during startup
    for (const syncCall of syncCalls) {
      if (syncCall.categories) {
        const catIds = syncCall.categories.map((c: any) => c.id);
        expect(catIds).not.toContain('cat-root-kinh-te');
        expect(catIds).not.toContain('cat-root-kinh-te-hoc');
        expect(catIds).not.toContain('cat-1789397768580');
      }
    }
  });

  it('Scenario 2: Reconciliation is idempotent across repeated app reloads', async () => {
    // Initial server state: only Đông Y
    const serverCategories = [
      {
        id: 'cat-root-dong-y',
        name: 'Đông Y',
        slug: 'dong-y',
        type: 'dong-y',
        parentId: null,
        description: 'Lĩnh vực nghiên cứu Đông Y',
      },
    ];

    const mockFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/topics')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              id: 'topic-dong-y-co-ban',
              title: 'Lý Luận Cơ Bản Đông Y',
              slug: 'ly-luan-co-ban-dong-y',
              categoryId: 'cat-root-dong-y',
              type: 'dong-y',
              studyProgress: null,
            },
          ],
        } as Response;
      }
      if (url.includes('/api/categories')) {
        return {
          ok: true,
          status: 200,
          json: async () => serverCategories,
        } as Response;
      }
      if (url.includes('/api/notes') || url.includes('/api/resources')) {
        return { ok: true, status: 200, json: async () => [] } as Response;
      }
      return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
    });

    // First mount
    const { unmount } = render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('category-count')).toHaveTextContent('1');
    });

    unmount();

    // Second mount (simulating reload)
    render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('category-count')).toHaveTextContent('1');
    });

    expect(screen.getByTestId('cat-cat-root-dong-y')).toHaveTextContent('Đông Y');
  });

  it('Scenario 3: Valid user-created dynamic category remains supported', async () => {
    let savedServerCategories: any[] = [
      {
        id: 'cat-root-dong-y',
        name: 'Đông Y',
        slug: 'dong-y',
        type: 'dong-y',
        parentId: null,
      },
    ];

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/api/topics')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              id: 'topic-dong-y-co-ban',
              title: 'Lý Luận Cơ Bản Đông Y',
              slug: 'ly-luan-co-ban-dong-y',
              categoryId: 'cat-root-dong-y',
              type: 'dong-y',
            },
          ],
        } as Response;
      }
      if (url.includes('/api/categories') && (!init || init.method === 'GET')) {
        return {
          ok: true,
          status: 200,
          json: async () => savedServerCategories,
        } as Response;
      }
      if (url.includes('/api/categories') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body));
        const created = { ...body, id: body.id || `cat-${Date.now()}` };
        savedServerCategories.push(created);
        return {
          ok: true,
          status: 201,
          json: async () => created,
        } as Response;
      }
      return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
    });

    render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('category-count')).toHaveTextContent('1');
    });

    // User adds new dynamic category
    act(() => {
      screen.getByTestId('btn-add-dynamic-category').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('category-count')).toHaveTextContent('2');
    });

    expect(screen.getByText('Triết Học Đương Đại')).toBeDefined();
  });
});
