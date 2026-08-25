import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportImportModal } from '../../src/components/modals/ExportImportModal';
import { DataProvider } from '../../src/context/DataContext';
import {
  safeGetLocalStorageItem,
  safeSetLocalStorageItem,
  safeRemoveLocalStorageItem,
} from '../../src/lib/storage';

describe('Post-Phase 6k.a: Export / Backup Modal Storage Resilience Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Storage Helper Unit Tests
  // ---------------------------------------------------------------------------
  it('1. safeGetLocalStorageItem returns value when available and null when storage throws', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation((key: string) => {
      if (key === 'throw_key') {
        throw new Error('SecurityError: The operation is insecure.');
      }
      return 'stored_value';
    });

    expect(safeGetLocalStorageItem('valid_key')).toBe('stored_value');
    expect(safeGetLocalStorageItem('throw_key')).toBeNull();
  });

  it('2. safeSetLocalStorageItem sets value when available and returns false when storage throws', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation((key: string) => {
      if (key === 'quota_key') {
        throw new Error('QuotaExceededError: Storage quota exceeded');
      }
    });

    expect(safeSetLocalStorageItem('valid_key', 'hello')).toBe(true);
    expect(safeSetLocalStorageItem('quota_key', 'hello')).toBe(false);
  });

  it('3. safeRemoveLocalStorageItem removes value when available and returns false when storage throws', () => {
    vi.spyOn(window.localStorage, 'removeItem').mockImplementation((key: string) => {
      if (key === 'throw_key') {
        throw new Error('SecurityError: Storage is blocked');
      }
    });

    expect(safeRemoveLocalStorageItem('valid_key')).toBe(true);
    expect(safeRemoveLocalStorageItem('throw_key')).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 2. Modal Mount Resilience: localStorage.getItem throws SecurityError
  // ---------------------------------------------------------------------------
  it('4. Modal mounts gracefully without crashing when localStorage.getItem throws SecurityError', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: Access to localStorage is denied.');
    });

    expect(() => {
      render(
        <DataProvider>
          <ExportImportModal isOpen={true} onClose={vi.fn()} />
        </DataProvider>
      );
    }).not.toThrow();

    // Verify modal header renders and is not white-screen crashed
    expect(screen.getByText(/Quản Lý & Sao Lưu Dữ Liệu/i)).toBeInTheDocument();

    // Switch to manifest tab
    const manifestTab = screen.getByRole('button', { name: /Kiểm toán tệp & Manifest|Thư viện tệp/i });
    fireEvent.click(manifestTab);

    // Verify input renders with empty fallback
    const input = screen.getByPlaceholderText(/\/Users\/username\/Knowledge-Library/i) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('');
  });

  // ---------------------------------------------------------------------------
  // 3. Modal Edit Resilience: localStorage.setItem throws QuotaExceededError
  // ---------------------------------------------------------------------------
  it('5. Updating library root path updates in-memory state without crashing when localStorage.setItem throws', () => {
    vi.spyOn(window.localStorage, 'getItem').mockReturnValue('');
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError: LocalStorage is full');
    });

    render(
      <DataProvider>
        <ExportImportModal isOpen={true} onClose={vi.fn()} />
      </DataProvider>
    );

    const manifestTab = screen.getByRole('button', { name: /Kiểm toán tệp & Manifest|Thư viện tệp/i });
    fireEvent.click(manifestTab);

    const input = screen.getByPlaceholderText(/\/Users\/username\/Knowledge-Library/i) as HTMLInputElement;
    expect(input).toBeInTheDocument();

    // Changing the path should NOT throw or crash the component
    expect(() => {
      fireEvent.change(input, { target: { value: '/Users/test/SafePath' } });
    }).not.toThrow();

    expect(input.value).toBe('/Users/test/SafePath');
  });

  // ---------------------------------------------------------------------------
  // 4. Normal Storage Operation
  // ---------------------------------------------------------------------------
  it('6. Loads previously persisted library root path when localStorage operates normally', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation((key: string) => {
      if (key === 'knowledge_os_library_root_path') {
        return '/Volumes/SSD/MyLibrary';
      }
      return null;
    });

    render(
      <DataProvider>
        <ExportImportModal isOpen={true} onClose={vi.fn()} />
      </DataProvider>
    );

    const manifestTab = screen.getByRole('button', { name: /Kiểm toán tệp & Manifest|Thư viện tệp/i });
    fireEvent.click(manifestTab);

    const input = screen.getByPlaceholderText(/\/Users\/username\/Knowledge-Library/i) as HTMLInputElement;
    expect(input.value).toBe('/Volumes/SSD/MyLibrary');
  });
});
