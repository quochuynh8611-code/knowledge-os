import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { DataProvider, useData } from '../../src/context/DataContext';
import { STORAGE_ROOT_KEY, STORAGE_VERSION_KEY } from '../../src/lib/storage';
import { Topic } from '../../src/types';

describe('Phase 2C.1: DataContext Rehydration & State Safety Contracts', () => {
  const STORAGE_KEY = STORAGE_ROOT_KEY;

  const mockTopicFixture: Topic = {
    id: 'topic-rehydration-1',
    title: 'Chủ Đề Kiểm Thử Rehydration',
    slug: 'chu-de-kiem-thu-rehydration',
    categoryId: 'cat-test-1',
    type: 'general',
    description: 'Mô tả chủ đề phục vụ test rehydration',
    content: 'Nội dung test',
    tags: ['test'],
    links: [],
    studyProgress: {
      topicId: 'topic-rehydration-1',
      status: 'not_started',
      progress: 0,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    visibility: 'active',
    createdAt: '2026-10-17T00:00:00.000Z',
    updatedAt: '2026-10-17T00:00:00.000Z',
  };

  const mockTopics: Topic[] = [mockTopicFixture];

  let rehydrationUnexpectedRequests: string[] = [];

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(STORAGE_VERSION_KEY, '4');
    rehydrationUnexpectedRequests = [];
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <DataProvider>{children}</DataProvider>
  );

  const mockCategory = {
    id: 'cat-test-1',
    name: 'Danh Mục Test',
    slug: 'danh-muc-test',
    type: 'general',
  };

  const setupRehydrationFetchMock = () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const fullUrl = String(input);
      let pathname = fullUrl;
      try {
        const parsed = new URL(fullUrl, 'http://localhost:3000');
        pathname = parsed.pathname;
      } catch {
        // raw fallback
      }
      const method = (init?.method || 'GET').toUpperCase();
      const routeKey = `${method} ${pathname}`;

      if (routeKey === 'GET /api/topics') {
        return { ok: true, status: 200, json: async () => mockTopics, text: async () => JSON.stringify(mockTopics) } as Response;
      }
      if (routeKey === 'GET /api/categories') {
        return { ok: true, status: 200, json: async () => [mockCategory], text: async () => JSON.stringify([mockCategory]) } as Response;
      }
      if (routeKey === 'GET /api/notes') {
        return { ok: true, status: 200, json: async () => [], text: async () => '[]' } as Response;
      }
      if (routeKey === 'GET /api/resources') {
        return { ok: true, status: 200, json: async () => [], text: async () => '[]' } as Response;
      }

      // Record unexpected requests (including unexpected POST /api/sync/hydrate during reload)
      rehydrationUnexpectedRequests.push(routeKey);
      return {
        ok: false,
        status: 404,
        json: async () => ({ error: `Unexpected request rejected: ${routeKey}` }),
        text: async () => `Unexpected request rejected: ${routeKey}`,
      } as Response;
    });
  };

  it('1. reloadAllData gọi dataRepository.loadInitialData và cập nhật toàn bộ state in-memory khi thành công', async () => {
    // Given: Mock server API phản hồi hợp lệ cho 4 endpoints topics, categories, notes, resources
    setupRehydrationFetchMock();

    const { result } = renderHook(() => useData(), { wrapper });

    // When: Gọi reloadAllData
    let reloadSuccess = false;
    await act(async () => {
      if (typeof result.current.reloadAllData === 'function') {
        reloadSuccess = await result.current.reloadAllData();
      }
    });

    // Then
    expect(typeof result.current.reloadAllData).toBe('function');
    expect(reloadSuccess).toBe(true);
    expect(result.current.topics.length).toBeGreaterThan(0);
    expect(rehydrationUnexpectedRequests).toEqual([]);
  });

  it('2. reloadAllData đồng bộ dữ liệu mới vào LocalStorage chỉ SAU KHI load thành công', async () => {
    // Given: Mock server API phản hồi hợp lệ cho 4 endpoints
    setupRehydrationFetchMock();

    const { result } = renderHook(() => useData(), { wrapper });

    // When
    await act(async () => {
      if (typeof result.current.reloadAllData === 'function') {
        await result.current.reloadAllData();
      }
    });

    // Then
    expect(typeof result.current.reloadAllData).toBe('function');
    expect(localStorage.getItem(`${STORAGE_KEY}_topics`)).not.toBeNull();
    expect(rehydrationUnexpectedRequests).toEqual([]);
  });

  it('3. reloadAllData trả về false, bảo toàn nguyên vẹn state cũ và không xóa dữ liệu khi loadInitialData thất bại', async () => {
    // Given
    const { result } = renderHook(() => useData(), { wrapper });
    const originalTopics = result.current.topics;

    // Giả lập mock fetch ném lỗi mạng
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new Error('Network Connection Lost')
    );

    // When
    let outcome = true;
    await act(async () => {
      if (typeof result.current.reloadAllData === 'function') {
        outcome = await result.current.reloadAllData();
      }
    });

    // Then
    expect(typeof result.current.reloadAllData).toBe('function');
    expect(outcome).toBe(false);
    expect(result.current.topics).toEqual(originalTopics);
    expect(result.current.topics.length).toBe(originalTopics.length);
  });
});
