import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredCitationFormat,
  setStoredCitationFormat,
  resetStoredCitationFormat,
  isValidCitationFormat,
  CITATION_FORMAT_STORAGE_KEY,
  DEFAULT_CITATION_FORMAT,
} from '../../src/lib/citationPreferences';

describe('Scholar Citation Format Preference Pure Library', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ---------------------------------------------------------------------------
  // Test 1: Default fallback when localStorage is empty
  // ---------------------------------------------------------------------------
  it('1. Trả về format mặc định "apa" khi LocalStorage rỗng', () => {
    expect(DEFAULT_CITATION_FORMAT).toBe('apa');
    expect(getStoredCitationFormat()).toBe('apa');
  });

  // ---------------------------------------------------------------------------
  // Test 2: Valid format persistence
  // ---------------------------------------------------------------------------
  it('2. Lưu và đọc chính xác các định dạng hợp lệ (bibtex, markdown, apa)', () => {
    setStoredCitationFormat('bibtex');
    expect(localStorage.getItem(CITATION_FORMAT_STORAGE_KEY)).toBe('bibtex');
    expect(getStoredCitationFormat()).toBe('bibtex');

    setStoredCitationFormat('markdown');
    expect(localStorage.getItem(CITATION_FORMAT_STORAGE_KEY)).toBe('markdown');
    expect(getStoredCitationFormat()).toBe('markdown');

    setStoredCitationFormat('apa');
    expect(localStorage.getItem(CITATION_FORMAT_STORAGE_KEY)).toBe('apa');
    expect(getStoredCitationFormat()).toBe('apa');
  });

  // ---------------------------------------------------------------------------
  // Test 3: Corrupted / Invalid format fallback to APA
  // ---------------------------------------------------------------------------
  it('3. Tự động fallback về "apa" khi giá trị lưu trữ không hợp lệ hoặc bị hỏng', () => {
    localStorage.setItem(CITATION_FORMAT_STORAGE_KEY, 'invalid_format_xyz');
    expect(getStoredCitationFormat()).toBe('apa');

    localStorage.setItem(CITATION_FORMAT_STORAGE_KEY, '');
    expect(getStoredCitationFormat()).toBe('apa');

    localStorage.setItem(CITATION_FORMAT_STORAGE_KEY, '{"bad":"json"}');
    expect(getStoredCitationFormat()).toBe('apa');
  });

  // ---------------------------------------------------------------------------
  // Test 4: Reset stored format
  // ---------------------------------------------------------------------------
  it('4. resetStoredCitationFormat xóa giá trị đã lưu và đưa về mặc định', () => {
    setStoredCitationFormat('bibtex');
    expect(getStoredCitationFormat()).toBe('bibtex');

    resetStoredCitationFormat();
    expect(localStorage.getItem(CITATION_FORMAT_STORAGE_KEY)).toBeNull();
    expect(getStoredCitationFormat()).toBe('apa');
  });

  // ---------------------------------------------------------------------------
  // Test 5: Type guard validator
  // ---------------------------------------------------------------------------
  it('5. isValidCitationFormat kiểm tra chính xác các giá trị hợp lệ vs không hợp lệ', () => {
    expect(isValidCitationFormat('apa')).toBe(true);
    expect(isValidCitationFormat('bibtex')).toBe(true);
    expect(isValidCitationFormat('markdown')).toBe(true);

    expect(isValidCitationFormat('chicago')).toBe(false);
    expect(isValidCitationFormat('')).toBe(false);
    expect(isValidCitationFormat(null)).toBe(false);
    expect(isValidCitationFormat(undefined)).toBe(false);
    expect(isValidCitationFormat(123)).toBe(false);
  });
});
