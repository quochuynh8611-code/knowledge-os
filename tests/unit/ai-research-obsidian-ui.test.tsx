import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  saveObsidianTopicSelection,
  loadObsidianTopicSelection,
  clearObsidianTopicSelection,
  OBSIDIAN_RESEARCH_SELECTION_STORAGE_KEY,
} from '../../src/lib/aiResearchStorage';
import { ObsidianSourcePickerModal } from '../../src/components/ai/ObsidianSourcePickerModal';

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    topics: [
      {
        id: 'topic-101',
        title: 'Chủ Đề Dịch Học',
        slug: 'chu-de-dich-hoc',
        type: 'huyen-hoc',
        categoryId: 'cat-1',
        categoryName: 'Huyền Học',
        description: 'Mô tả',
        content: 'Nội dung',
        tags: ['dich'],
        links: [],
        studyProgress: {
          topicId: 'topic-101',
          status: 'not_started',
          progress: 0,
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          totalNotes: 0,
          timeSpent: 0,
        },
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ],
    notes: [],
    resources: [],
    addNote: vi.fn(),
  }),
}));

describe('Lát cắt 4: Obsidian Research Selection Persistence & Picker UI (Test-First)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/obsidian/vaults') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              activeVaultId: 'vault-a',
              vaults: [{ vaultId: 'vault-a', label: 'Vault Alpha', isCurrent: true }],
            }),
        });
      }
      if (url.includes('/api/obsidian/vault/search')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ results: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  describe('LocalStorage Persistence (Topic Isolation & Zero Absolute Path)', () => {
    it('saves and loads topic-scoped Obsidian selection using versioned key', () => {
      saveObsidianTopicSelection({
        topicId: 'topic-1',
        vaultProfileId: 'vault-b',
        selectedRelativePaths: ['note1.md', 'note2.md'],
      });

      const raw = localStorage.getItem(OBSIDIAN_RESEARCH_SELECTION_STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed['topic-1']).toBeDefined();
      expect(parsed['topic-1'].vaultProfileId).toBe('vault-b');
      expect(parsed['topic-1'].selectedRelativePaths).toEqual(['note1.md', 'note2.md']);
      expect(parsed['topic-1'].version).toBe(1);

      // Invariant: No raw content or absolute paths stored
      expect(raw).not.toContain('/Users/');
      expect(raw).not.toContain('C:\\');
      expect(parsed['topic-1'].content).toBeUndefined();
      expect(parsed['topic-1'].rootPath).toBeUndefined();

      const loaded = loadObsidianTopicSelection('topic-1');
      expect(loaded).not.toBeNull();
      expect(loaded?.selectedRelativePaths).toEqual(['note1.md', 'note2.md']);
    });

    it('clears selection for a specific topic while leaving other topics untouched', () => {
      saveObsidianTopicSelection({
        topicId: 'topic-1',
        vaultProfileId: 'vault-b',
        selectedRelativePaths: ['note1.md'],
      });
      saveObsidianTopicSelection({
        topicId: 'topic-2',
        vaultProfileId: 'vault-a',
        selectedRelativePaths: ['docA.md'],
      });

      clearObsidianTopicSelection('topic-1');

      expect(loadObsidianTopicSelection('topic-1')).toBeNull();
      expect(loadObsidianTopicSelection('topic-2')).not.toBeNull();
      expect(loadObsidianTopicSelection('topic-2')?.selectedRelativePaths).toEqual(['docA.md']);
    });
  });

  describe('ObsidianSourcePickerModal Workflow & Selection Limit', () => {
    const mockVaults = [
      { vaultId: 'vault-a', label: 'Vault Alpha', isCurrent: true },
      { vaultId: 'vault-b', label: 'Vault Beta', isCurrent: false },
    ];

    const mockDocs = [
      { relativePath: 'phat-hoc/kinh-trung-bo.md', fileName: 'kinh-trung-bo.md', title: 'Kinh Trung Bộ', tags: ['phat-hoc'], sizeBytes: 3000 },
      { relativePath: 'dich-hoc/chu-dich.md', fileName: 'chu-dich.md', title: 'Chu Dịch Toàn Giải', tags: ['dich-hoc'], sizeBytes: 5000 },
      { relativePath: 'triet-hoc/khai-niem.md', fileName: 'khai-niem.md', title: 'Khái Niệm Luận', tags: ['triet-hoc'], sizeBytes: 2500 },
      { relativePath: 'extra/doc-4.md', fileName: 'doc-4.md', title: 'Tài Liệu Thứ Tư', tags: ['extra'], sizeBytes: 4000 },
    ];

    it('renders modal, displays documents and enforces maximum 3 selections', async () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();

      render(
        <ObsidianSourcePickerModal
          isOpen={true}
          onClose={onClose}
          vaults={mockVaults}
          initialVaultId="vault-a"
          initialSelectedPaths={[]}
          availableDocs={mockDocs}
          onConfirm={onConfirm}
        />
      );

      expect(screen.getByText(/Chọn Tài Liệu Obsidian/i)).toBeInTheDocument();
      expect(screen.getByText('Kinh Trung Bộ')).toBeInTheDocument();
      expect(screen.getByText('Chu Dịch Toàn Giải')).toBeInTheDocument();

      // Select 1st doc
      const cb1 = screen.getByLabelText(/Kinh Trung Bộ/i);
      fireEvent.click(cb1);

      // Select 2nd doc
      const cb2 = screen.getByLabelText(/Chu Dịch Toàn Giải/i);
      fireEvent.click(cb2);

      // Select 3rd doc
      const cb3 = screen.getByLabelText(/Khái Niệm Luận/i);
      fireEvent.click(cb3);

      expect(screen.getByText(/Đã chọn: 3 \/ 3 tài liệu/i)).toBeInTheDocument();

      // 4th checkbox must be disabled to enforce max 3
      const cb4 = screen.getByLabelText(/Tài Liệu Thứ Tư/i);
      expect(cb4).toBeDisabled();

      // Click Confirm button
      const confirmBtn = screen.getByRole('button', { name: /Xác Nhận Nguồn/i });
      fireEvent.click(confirmBtn);

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onConfirm).toHaveBeenCalledWith({
        vaultProfileId: 'vault-a',
        selectedRelativePaths: [
          'phat-hoc/kinh-trung-bo.md',
          'dich-hoc/chu-dich.md',
          'triet-hoc/khai-niem.md',
        ],
      });
    });

    it('filters documents by search query', () => {
      render(
        <ObsidianSourcePickerModal
          isOpen={true}
          onClose={vi.fn()}
          vaults={mockVaults}
          initialVaultId="vault-a"
          initialSelectedPaths={[]}
          availableDocs={mockDocs}
          onConfirm={vi.fn()}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Tìm kiếm tài liệu Obsidian.../i);
      fireEvent.change(searchInput, { target: { value: 'Chu Dịch' } });

      expect(screen.getByText('Chu Dịch Toàn Giải')).toBeInTheDocument();
      expect(screen.queryByText('Kinh Trung Bộ')).toBeNull();
    });

    it('displays missing warning for previously selected files that are no longer available', () => {
      render(
        <ObsidianSourcePickerModal
          isOpen={true}
          onClose={vi.fn()}
          vaults={mockVaults}
          initialVaultId="vault-a"
          initialSelectedPaths={['missing-file.md', 'phat-hoc/kinh-trung-bo.md']}
          availableDocs={mockDocs}
          onConfirm={vi.fn()}
        />
      );

      expect(screen.getByText(/missing-file.md/i)).toBeInTheDocument();
      expect(screen.getByText(/Không tìm thấy trên đĩa/i)).toBeInTheDocument();
    });
  });

  describe('AIResearchStudio with Obsidian Vault Scope', () => {
    it('hydrates saved Obsidian selection and displays selection preview on mount', async () => {
      saveObsidianTopicSelection({
        topicId: 'topic-101',
        vaultProfileId: 'vault-b',
        selectedRelativePaths: ['dich-hoc/chu-dich.md'],
      });

      const { AIResearchStudio } = await import('../../src/components/ai/AIResearchStudio');

      const mockTopic = {
        id: 'topic-101',
        title: 'Chủ Đề Dịch Học',
        slug: 'chu-de-dich-hoc',
        type: 'huyen-hoc' as const,
        categoryId: 'cat-1',
        categoryName: 'Huyền Học',
        description: 'Mô tả',
        content: 'Nội dung',
        tags: ['dich'],
        links: [],
        studyProgress: {
          topicId: 'topic-101',
          status: 'not_started' as const,
          progress: 0,
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          totalNotes: 0,
          timeSpent: 0,
        },
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      render(<AIResearchStudio currentTopic={mockTopic} />);

      await waitFor(() => {
        expect(screen.getByText('dich-hoc/chu-dich.md')).toBeInTheDocument();
      });

      const cb = screen.getByLabelText(/Obsidian Vault/i);
      expect(cb).toBeChecked();
      expect(screen.getByText(/Tài liệu Obsidian đã chọn \(1\/3\):/i)).toBeInTheDocument();
    });
  });

  describe('Dynamic Vault List Fetching, Auto-selection & Scoped Search Integration', () => {
    it('fetches /api/obsidian/vaults and automatically selects active vault when vaults prop is empty or not provided', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url === '/api/obsidian/vaults') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                activeVaultId: 'vault-beta',
                vaults: [
                  { vaultId: 'vault-alpha', label: 'Vault Alpha', isCurrent: false },
                  { vaultId: 'vault-beta', label: 'Vault Beta', isCurrent: true },
                ],
              }),
          });
        }
        if (url.includes('/api/obsidian/vault/search')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                results: [
                  { path: 'doc-beta.md', title: 'Doc in Beta', snippet: '', score: 100 },
                ],
              }),
          });
        }
        return Promise.reject(new Error(`Unknown url: ${url}`));
      });
      global.fetch = mockFetch;

      render(
        <ObsidianSourcePickerModal
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      );

      await waitFor(() => {
        const select = screen.getByLabelText(/Vault Profile/i) as HTMLSelectElement;
        expect(select.value).toBe('vault-beta');
      });

      expect(screen.getByText('Vault Alpha')).toBeInTheDocument();
      expect(screen.getByText(/Vault Beta \(Active\)/i)).toBeInTheDocument();
    });

    it('renders empty state with "Chưa có Obsidian Vault khả dụng" and "Thử lại" when API returns 0 vaults', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url === '/api/obsidian/vaults') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ activeVaultId: null, vaults: [] }),
          });
        }
        return Promise.reject(new Error(`Unknown url: ${url}`));
      });
      global.fetch = mockFetch;

      render(
        <ObsidianSourcePickerModal
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Chưa có Obsidian Vault khả dụng/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Thử lại/i })).toBeInTheDocument();
      // Must NOT display misleading message "Không tìm thấy tài liệu phù hợp trong vault này."
      expect(screen.queryByText(/Không tìm thấy tài liệu phù hợp trong vault này/i)).toBeNull();
    });

    it('renders error state and retries fetching when "Thử lại" is clicked', async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url === '/api/obsidian/vaults') {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              ok: false,
              json: () => Promise.resolve({ message: 'Không thể tải danh sách Vault' }),
            });
          }
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                activeVaultId: 'vault-1',
                vaults: [{ vaultId: 'vault-1', label: 'Vault 1', isCurrent: true }],
              }),
          });
        }
        if (url.includes('/api/obsidian/vault/search')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ results: [] }),
          });
        }
        return Promise.reject(new Error(`Unknown url: ${url}`));
      });
      global.fetch = mockFetch;

      render(
        <ObsidianSourcePickerModal
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Không thể tải danh sách Vault/i)).toBeInTheDocument();
      });

      const retryBtn = screen.getByRole('button', { name: /Thử lại/i });
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByText(/Vault 1/i)).toBeInTheDocument();
      });
      expect(callCount).toBe(2);
    });

    it('queries search endpoint with correct selected vaultId without calling /api/obsidian/vault/switch when changing vault', async () => {
      const mockVaults = [
        { vaultId: 'vault-a', label: 'Vault Alpha', isCurrent: true },
        { vaultId: 'vault-b', label: 'Vault Beta', isCurrent: false },
      ];

      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url === '/api/obsidian/vaults') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                activeVaultId: 'vault-a',
                vaults: mockVaults,
              }),
          });
        }
        if (url.includes('/api/obsidian/vault/search')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                results: [{ path: 'dich-ly.md', title: 'Dịch Lý Toàn Thư', score: 100 }],
              }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });
      global.fetch = mockFetch;

      render(
        <ObsidianSourcePickerModal
          isOpen={true}
          onClose={vi.fn()}
          vaults={mockVaults}
          initialVaultId="vault-a"
          onConfirm={vi.fn()}
        />
      );

      const select = screen.getByLabelText(/Vault Profile/i);
      fireEvent.change(select, { target: { value: 'vault-b' } });

      const searchInput = screen.getByPlaceholderText(/Tìm kiếm tài liệu Obsidian.../i);
      fireEvent.change(searchInput, { target: { value: 'dich' } });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/obsidian/vault/search?vaultId=vault-b'),
          expect.anything()
        );
      });

      // INVARIANT: Changing vault in modal must NEVER call /api/obsidian/vault/switch
      const switchCalls = mockFetch.mock.calls.filter(([url]) =>
        String(url).includes('/api/obsidian/vault/switch')
      );
      expect(switchCalls.length).toBe(0);
    });
  });

  describe('Patch P2B.1: Scoped Vault Search, Stale Response Race & UX Reset (Deterministic Tests)', () => {
    function createDeferred<T>() {
      let resolve!: (val: T) => void;
      let reject!: (err: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    }

    const testVaults = [
      { vaultId: 'vault-a', label: 'Vault Alpha', isCurrent: true },
      { vaultId: 'vault-b', label: 'Vault Beta', isCurrent: false },
    ];

    it('immediately resets docs, selectedPaths, searchQuery, and docsError when changing vault', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/obsidian/vault/search?vaultId=vault-a')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                results: [{ path: 'doc-a.md', title: 'Doc A Title', score: 100 }],
              }),
          });
        }
        if (url.includes('/api/obsidian/vault/search?vaultId=vault-b')) {
          return new Promise(() => {}); // Pending indefinitely to test immediate reset
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });
      global.fetch = mockFetch;

      render(
        <ObsidianSourcePickerModal
          isOpen={true}
          onClose={vi.fn()}
          vaults={testVaults}
          initialVaultId="vault-a"
          initialSelectedPaths={['doc-a.md']}
          onConfirm={vi.fn()}
        />
      );

      // Verify initial render has Doc A
      await waitFor(() => {
        expect(screen.getByText('Doc A Title')).toBeInTheDocument();
      });

      // Type query in search
      const searchInput = screen.getByPlaceholderText(/Tìm kiếm tài liệu Obsidian.../i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'query-a' } });
      expect(searchInput.value).toBe('query-a');

      // Change vault to vault-b
      const select = screen.getByLabelText(/Vault Profile/i);
      fireEvent.change(select, { target: { value: 'vault-b' } });

      // Immediate Invariant: Doc A must be gone immediately, search input reset, selection reset
      expect(screen.queryByText('Doc A Title')).toBeNull();
      expect(searchInput.value).toBe('');
      expect(screen.getByText(/Đã chọn: 0 \/ 3 tài liệu/i)).toBeInTheDocument();
    });

    it('discards late response from Vault A when Vault B response resolves first (Stale Response Race)', async () => {
      const deferredA = createDeferred<{ ok: boolean; json: () => Promise<{ results: Array<{ path: string; title: string; score: number }> }> }>();
      const deferredB = createDeferred<{ ok: boolean; json: () => Promise<{ results: Array<{ path: string; title: string; score: number }> }> }>();

      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('vaultId=vault-a')) {
          return deferredA.promise;
        }
        if (url.includes('vaultId=vault-b')) {
          return deferredB.promise;
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });
      global.fetch = mockFetch;

      render(
        <ObsidianSourcePickerModal
          isOpen={true}
          onClose={vi.fn()}
          vaults={testVaults}
          initialVaultId="vault-a"
          onConfirm={vi.fn()}
        />
      );

      // Switch to vault-b before deferredA resolves
      const select = screen.getByLabelText(/Vault Profile/i);
      fireEvent.change(select, { target: { value: 'vault-b' } });

      // Resolve Vault B response first
      deferredB.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [{ path: 'dong-y-doc.md', title: 'Tài Liệu Đông Y', score: 100 }],
          }),
      });

      await waitFor(() => {
        expect(screen.getByText('Tài Liệu Đông Y')).toBeInTheDocument();
      });

      // Now resolve late Vault A response
      deferredA.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [{ path: 'phat-hoc-doc.md', title: 'Tài Liệu Phật Học', score: 100 }],
          }),
      });

      // Wait a microtask tick
      await new Promise((r) => setTimeout(r, 50));

      // INVARIANT: UI must still show Đông Y, NOT Phật Học
      expect(screen.getByText('Tài Liệu Đông Y')).toBeInTheDocument();
      expect(screen.queryByText('Tài Liệu Phật Học')).toBeNull();
    });

    it('discards late response from older search query on same vault', async () => {
      const deferredQ1 = createDeferred<{ ok: boolean; json: () => Promise<{ results: Array<{ path: string; title: string; score: number }> }> }>();
      const deferredQ2 = createDeferred<{ ok: boolean; json: () => Promise<{ results: Array<{ path: string; title: string; score: number }> }> }>();

      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('q=kinh')) {
          return deferredQ1.promise;
        }
        if (url.includes('q=luat')) {
          return deferredQ2.promise;
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ results: [] }),
        });
      });
      global.fetch = mockFetch;

      render(
        <ObsidianSourcePickerModal
          isOpen={true}
          onClose={vi.fn()}
          vaults={testVaults}
          initialVaultId="vault-a"
          onConfirm={vi.fn()}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Tìm kiếm tài liệu Obsidian.../i);

      // Query 1
      fireEvent.change(searchInput, { target: { value: 'kinh' } });

      // Query 2
      fireEvent.change(searchInput, { target: { value: 'luat' } });

      // Resolve Query 2 response first
      deferredQ2.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [{ path: 'luat-tang.md', title: 'Tạng Luật', score: 100 }],
          }),
      });

      await waitFor(() => {
        expect(screen.getByText('Tạng Luật')).toBeInTheDocument();
      });

      // Resolve Query 1 response later
      deferredQ1.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [{ path: 'kinh-tang.md', title: 'Tạng Kinh', score: 100 }],
          }),
      });

      await new Promise((r) => setTimeout(r, 50));

      // INVARIANT: Query 2 result remains, Query 1 result is discarded
      expect(screen.getByText('Tạng Luật')).toBeInTheDocument();
      expect(screen.queryByText('Tạng Kinh')).toBeNull();
    });

    it('silently ignores AbortError and does not display error banner', async () => {
      const abortErr = new DOMException('The user aborted a request.', 'AbortError');
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('vaultId=')) {
          return Promise.reject(abortErr);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });
      global.fetch = mockFetch;

      render(
        <ObsidianSourcePickerModal
          isOpen={true}
          onClose={vi.fn()}
          vaults={testVaults}
          initialVaultId="vault-a"
          onConfirm={vi.fn()}
        />
      );

      // Wait a microtask
      await new Promise((r) => setTimeout(r, 50));

      // Must NOT display error message when aborted
      expect(screen.queryByText(/Không thể nạp danh sách tài liệu/i)).toBeNull();
      expect(screen.queryByText(/The user aborted a request/i)).toBeNull();
    });

    it('displays real network/HTTP error and provides retry action', async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/obsidian/vault/search')) {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              ok: false,
              json: () => Promise.resolve({ message: 'Lỗi máy chủ tìm kiếm' }),
            });
          }
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                results: [{ path: 'doc-recovered.md', title: 'Doc Recovered', score: 100 }],
              }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });
      global.fetch = mockFetch;

      render(
        <ObsidianSourcePickerModal
          isOpen={true}
          onClose={vi.fn()}
          vaults={testVaults}
          initialVaultId="vault-a"
          onConfirm={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Lỗi máy chủ tìm kiếm/i)).toBeInTheDocument();
      });

      const retryBtn = screen.getByRole('button', { name: /Thử lại/i });
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByText('Doc Recovered')).toBeInTheDocument();
      });
      expect(callCount).toBe(2);
    });

    it('aborts pending request when modal closes and does not leak stale response upon reopening', async () => {
      const deferred1 = createDeferred<{ ok: boolean; json: () => Promise<{ results: Array<{ path: string; title: string; score: number }> }> }>();
      const deferred2 = createDeferred<{ ok: boolean; json: () => Promise<{ results: Array<{ path: string; title: string; score: number }> }> }>();
      let callCount = 0;

      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/obsidian/vault/search')) {
          callCount++;
          if (callCount === 1) return deferred1.promise;
          return deferred2.promise;
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });
      global.fetch = mockFetch;

      const { rerender } = render(
        <ObsidianSourcePickerModal
          isOpen={true}
          onClose={vi.fn()}
          vaults={testVaults}
          initialVaultId="vault-a"
          onConfirm={vi.fn()}
        />
      );

      expect(callCount).toBe(1);

      // Close modal while request 1 is still pending
      rerender(
        <ObsidianSourcePickerModal
          isOpen={false}
          onClose={vi.fn()}
          vaults={testVaults}
          initialVaultId="vault-a"
          onConfirm={vi.fn()}
        />
      );

      // Reopen modal -> triggers request 2
      rerender(
        <ObsidianSourcePickerModal
          isOpen={true}
          onClose={vi.fn()}
          vaults={testVaults}
          initialVaultId="vault-a"
          onConfirm={vi.fn()}
        />
      );

      expect(callCount).toBe(2);

      // Resolve old request 1 from previous session
      deferred1.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [{ path: 'stale-doc.md', title: 'Stale Doc 1', score: 100 }],
          }),
      });

      // Resolve request 2 from current session
      deferred2.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [{ path: 'fresh-doc.md', title: 'Fresh Doc 2', score: 100 }],
          }),
      });

      await waitFor(() => {
        expect(screen.getByText('Fresh Doc 2')).toBeInTheDocument();
      });

      // INVARIANT: Stale Doc 1 must not be rendered
      expect(screen.queryByText('Stale Doc 1')).toBeNull();
    });
  });
});
