import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { DataProvider, useData } from '../../src/context/DataContext';
import { INITIAL_TOPICS } from '../../src/data/initialData';

describe('Phase 2C.1: DataContext Rehydration & State Safety Contracts', () => {
  const STORAGE_KEY = 'phat_hoc_huyen_hoc_clean_v3';

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <DataProvider>{children}</DataProvider>
  );

  it('1. reloadAllData gọi dataRepository.loadInitialData và cập nhật toàn bộ state in-memory khi thành công', async () => {
    // Given: Mock server API phản hồi thành công danh sách topics
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => INITIAL_TOPICS,
    } as Response);

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
  });

  it('2. reloadAllData đồng bộ dữ liệu mới vào LocalStorage chỉ SAU KHI load thành công', async () => {
    // Given: Mock server API phản hồi thành công
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => INITIAL_TOPICS,
    } as Response);

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
    expect(result.current.topics.length).toBe(35);
  });
});
