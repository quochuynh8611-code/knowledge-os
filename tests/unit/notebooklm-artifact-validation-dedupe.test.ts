import { describe, it, expect } from 'vitest';
import {
  validateArtifactImportInput,
  parseArtifactMarkdownFile,
  estimateSourceMetrics,
  deduplicateArtifacts,
  computeArtifactContentHash,
} from '../../src/lib/notebooklm';

describe('Commit 6: NotebookLM Artifact Deduplication and Validation', () => {
  describe('Scenario: Hai artifact cùng title nhưng khác id phải đếm là 2', () => {
    it('counts 2 when artifacts share same title but have different ids', () => {
      // Given local artifact title "Tổng hợp" id "local-1"
      const localArtifacts = [
        {
          id: 'local-1',
          topicId: 'topic-1',
          title: 'Tổng hợp',
          content: 'Nội dung local',
          type: 'study_guide' as const,
        },
      ];
      // And session artifact title "Tổng hợp" id "server-1"
      const sessionArtifacts = [
        {
          id: 'server-1',
          topicId: 'topic-1',
          title: 'Tổng hợp',
          rawContent: 'Nội dung server khác',
          artifactType: 'study_guide',
        },
      ];

      // When tính artifact count
      const result = deduplicateArtifacts(sessionArtifacts, localArtifacts);

      // Then kết quả là 2
      expect(result.count).toBe(2);
      expect(result.mergedArtifacts.length).toBe(2);
    });
  });

  describe('Scenario: Hai artifact trùng idempotencyKey chỉ đếm 1', () => {
    it('counts 1 when two artifacts share the same idempotencyKey', () => {
      // Given hai artifact có cùng idempotencyKey
      const localArtifact = {
        id: 'local-dup',
        topicId: 'topic-1',
        title: 'Báo cáo A',
        content: 'Nội dung A',
        idempotencyKey: 'idem-key-12345',
        type: 'briefing_doc' as const,
      };
      const sessionArtifact = {
        id: 'server-dup',
        topicId: 'topic-1',
        title: 'Báo cáo A Đã Lưu',
        rawContent: 'Nội dung A',
        idempotencyKey: 'idem-key-12345',
        artifactType: 'briefing_doc',
      };

      // When tính artifact count
      const result = deduplicateArtifacts([sessionArtifact], [localArtifact]);

      // Then kết quả là 1
      expect(result.count).toBe(1);
      expect(result.mergedArtifacts.length).toBe(1);
    });

    it('counts 1 when two artifacts have identical id', () => {
      const art1 = { id: 'art-same-id', topicId: 'topic-1', title: 'Art 1', content: 'Cont 1' };
      const art2 = { id: 'art-same-id', topicId: 'topic-1', title: 'Art 2', rawContent: 'Cont 2' };

      const result = deduplicateArtifacts([art1], [art2]);
      expect(result.count).toBe(1);
    });

    it('computes deterministic contentHash and dedupes identical content without Math.random', () => {
      const hash1 = computeArtifactContentHash({
        topicId: 'topic-1',
        type: 'study_guide',
        title: 'Tiêu đề cố định',
        content: 'Nội dung cố định',
      });
      const hash2 = computeArtifactContentHash({
        topicId: 'topic-1',
        type: 'study_guide',
        title: 'Tiêu đề cố định',
        content: 'Nội dung cố định',
      });
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBeGreaterThan(0);
    });
  });

  describe('Scenario: Title rỗng bị chặn', () => {
    it('blocks import when title is empty string and returns specific error', () => {
      // Given artifact có title ""
      // And content hợp lệ
      // When validateArtifactImportInput
      const res = validateArtifactImportInput({
        title: '',
        content: 'Nội dung hợp lệ của artifact',
      });

      // Then valid là false
      // And error nói tiêu đề không được để trống
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Tiêu đề artifact không được để trống');
    });

    it('blocks import when title contains only whitespace', () => {
      // Given artifact có title "   "
      // And content hợp lệ
      // When validateArtifactImportInput
      const res = validateArtifactImportInput({
        title: '   \t  \n  ',
        content: 'Nội dung hợp lệ của artifact',
      });

      // Then valid là false
      // And error nói tiêu đề không được để trống
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Tiêu đề artifact không được để trống');
    });

    it('preserves URL validation and content validation intact', () => {
      const badUrl = validateArtifactImportInput({
        title: 'Tiêu đề tốt',
        content: 'Nội dung',
        notebookUrl: 'javascript:alert(1)',
      });
      expect(badUrl.valid).toBe(false);
      expect(badUrl.error).toContain('http:// hoặc https://');

      const emptyContent = validateArtifactImportInput({
        title: 'Tiêu đề tốt',
        content: '   ',
      });
      expect(emptyContent.valid).toBe(false);
      expect(emptyContent.error).toContain('Nội dung artifact không được để trống');
    });
  });

  describe('Scenario: Markdown import phải cần xác nhận', () => {
    it('parses markdown and returns suggestedType and requiresConfirmation=true', () => {
      // Given file Markdown chứa từ khóa "sơ đồ tư duy"
      const mdContent = `# Kiến Trúc Đồ Thị Tri Thức
Tài liệu hướng dẫn xây dựng sơ đồ tư duy liên kết các nốt và cạnh trong Knowledge OS.`;

      // When parseArtifactMarkdownFile
      const parsed = parseArtifactMarkdownFile(mdContent);

      // Then suggestedType là "mindmap_outline"
      expect(parsed.suggestedType).toBe('mindmap_outline');
      // And type backward-compatible
      expect(parsed.type).toBe('mindmap_outline');
      // And requiresConfirmation là true
      expect(parsed.requiresConfirmation).toBe(true);
    });
  });

  describe('Scenario: Capacity theo token thay vì words', () => {
    it('returns optimal and isEstimate=true for 5000 words in 500000 maxTokens', () => {
      // Given văn bản 5000 từ
      const text5000Words = Array(5000).fill('từ').join(' ');
      // And maxTokens 500000
      // When estimateSourceMetrics
      const metrics = estimateSourceMetrics(text5000Words, 500000);

      // Then capacityStatus là "optimal"
      expect(metrics.capacityStatus).toBe('optimal');
      // And isEstimate là true
      expect(metrics.isEstimate).toBe(true);
      expect(metrics.estimatedTokens).toBe(Math.round(5000 * 1.35));
    });
  });

  describe('Scenario: Capacity heavy theo token', () => {
    it('returns heavy when estimatedTokens exceeds 80% of maxTokens', () => {
      // Given estimatedTokens vượt 80% maxTokens
      // 1000 words * 1.35 = 1350 tokens. With maxTokens = 1500, ratio = 1350/1500 = 0.9 (> 0.8)
      const text1000Words = Array(1000).fill('từ').join(' ');
      // When estimateSourceMetrics
      const metrics = estimateSourceMetrics(text1000Words, 1500);

      // Then capacityStatus là "heavy"
      expect(metrics.capacityStatus).toBe('heavy');
    });

    it('returns moderate when estimatedTokens is between 50% and 80% of maxTokens', () => {
      // 1000 words * 1.35 = 1350 tokens. With maxTokens = 2000, ratio = 1350/2000 = 0.675 (> 0.5 and <= 0.8)
      const text1000Words = Array(1000).fill('từ').join(' ');
      const metrics = estimateSourceMetrics(text1000Words, 2000);
      expect(metrics.capacityStatus).toBe('moderate');
    });
  });

  describe('Scenario: maxTokens không hợp lệ phải an toàn', () => {
    it('handles maxTokens <= 0, NaN, undefined without division by zero and fails closed to heavy', () => {
      const text = 'Một hai ba bốn năm';

      // Given maxTokens 0
      const zeroMetrics = estimateSourceMetrics(text, 0);
      expect(zeroMetrics.capacityStatus).toBe('heavy');

      // Given maxTokens âm
      const negativeMetrics = estimateSourceMetrics(text, -100);
      expect(negativeMetrics.capacityStatus).toBe('heavy');

      // Given maxTokens NaN
      const nanMetrics = estimateSourceMetrics(text, NaN);
      expect(nanMetrics.capacityStatus).toBe('heavy');

      // Given maxTokens undefined: defaults to 500000
      const defaultMetrics = estimateSourceMetrics(text);
      expect(defaultMetrics.capacityStatus).toBe('optimal');
      expect(defaultMetrics.isEstimate).toBe(true);
    });
  });
});

