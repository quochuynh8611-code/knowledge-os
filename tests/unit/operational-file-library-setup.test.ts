import { describe, it, expect } from 'vitest';
import {
  getRecommendedLibraryStructure,
  validateLibraryRootPath,
  normalizeFilePath,
  classifyPathRelativeToRoot,
  auditFileReferences,
} from '../../src/lib/fileLibraryAudit';
import { Resource, Note } from '../../src/types';

describe('Post-Phase 6b: Operational File Library Setup & Helper Contracts', () => {
  describe('1. getRecommendedLibraryStructure', () => {
    it('returns standard recommended folder layout (PDF, Notes, Attachments, Inbox, Exports)', () => {
      const layout = getRecommendedLibraryStructure();
      expect(layout.rootName).toBe('Knowledge-Library');
      expect(layout.subdirectories).toEqual([
        { name: 'PDF', description: 'Sách, giáo trình, bài báo học thuật, luận văn PDF' },
        { name: 'Notes', description: 'Bản dịch thô, trích yếu, tệp Markdown ghi chép ngoài' },
        { name: 'Attachments', description: 'Biểu đồ, hình ảnh minh họa, tệp âm thanh/video bài giảng' },
        { name: 'Inbox', description: 'Tài liệu mới thu thập chờ phân loại và gắn vào topic' },
        { name: 'Exports', description: 'Nơi lưu trữ các tệp Snapshot JSON và File Manifest JSON' },
      ]);
    });
  });

  describe('2. validateLibraryRootPath', () => {
    it('validates non-empty string and rejects invalid/empty inputs', () => {
      expect(validateLibraryRootPath('/Users/researcher/Knowledge-Library').valid).toBe(true);
      expect(validateLibraryRootPath('D:\\Knowledge-Library').valid).toBe(true);
      expect(validateLibraryRootPath('').valid).toBe(false);
      expect(validateLibraryRootPath('   ').valid).toBe(false);
      expect(validateLibraryRootPath(undefined as any).valid).toBe(false);
    });
  });

  describe('3. Browser Mode Audit: Zero False Positives', () => {
    it('never reports "exists" in browser mode without filesystem capability', () => {
      const sampleResources: Resource[] = [
        {
          id: 'res-pdf-1',
          topicId: 'topic-1',
          title: 'Abhidharma Study',
          type: 'pdf',
          filePath: '/Users/researcher/Knowledge-Library/PDF/kosa.pdf',
          createdAt: '2026-08-01T00:00:00Z',
        },
      ];

      // Execute audit without fileExistsChecker (browser mode)
      const audit = auditFileReferences(sampleResources, [], {
        libraryRootPath: '/Users/researcher/Knowledge-Library',
      });

      expect(audit.summary.existingCount).toBe(0);
      expect(audit.summary.unverifiedCount).toBe(1);
      expect(audit.entries[0].status).toBe('unverified');
    });
  });
});
