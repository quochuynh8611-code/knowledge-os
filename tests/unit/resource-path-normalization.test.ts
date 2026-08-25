import { describe, it, expect } from 'vitest';
import { normalizeFilePath, classifyPathRelativeToRoot } from '../../src/lib/fileLibraryAudit';

describe('Post-Phase 6c: Resource Path Normalization Contracts', () => {
  it('normalizes Windows backslashes and redundant slashes into consistent POSIX format', () => {
    expect(normalizeFilePath('D:\\Books\\Abhidharma\\\\kosa.pdf ')).toBe('D:/Books/Abhidharma/kosa.pdf');
    expect(normalizeFilePath('  /Users/researcher//Library/PDF/study.pdf  ')).toBe('/Users/researcher/Library/PDF/study.pdf');
    expect(normalizeFilePath('C:\\Users\\admin\\Documents\\notes\\')).toBe('C:/Users/admin/Documents/notes');
  });

  it('preserves meaningful filename characters including UTF-8 Vietnamese and spaces in names', () => {
    const raw = ' /Knowledge-Library/PDF/Luận Câu Xá - Thích Tịnh Hạnh (2020).pdf ';
    expect(normalizeFilePath(raw)).toBe('/Knowledge-Library/PDF/Luận Câu Xá - Thích Tịnh Hạnh (2020).pdf');
  });

  it('correctly detects outside path relative to canonical root', () => {
    const root = '/Users/researcher/Knowledge-Library';
    expect(classifyPathRelativeToRoot('/Users/researcher/Knowledge-Library/PDF/book.pdf', root)).toBe('inside');
    expect(classifyPathRelativeToRoot('/Users/researcher/Downloads/book.pdf', root)).toBe('outside');
    expect(classifyPathRelativeToRoot('/Users/researcher/Knowledge-Library-Old/book.pdf', root)).toBe('outside');
  });
});
