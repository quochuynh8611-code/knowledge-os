import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AI_RESEARCH_SESSIONS_STORAGE_KEY,
  MAX_RESEARCH_SESSIONS,
  getStoredResearchSessions,
  saveResearchSession,
  getSessionsForTopic,
  getLatestSessionForTopic,
  clearResearchSessions,
  sanitizeExportFilename,
  formatResearchMarkdown,
  isValidResearchMode,
  AIResearchSession,
} from '../../src/lib/aiResearchStorage';
import * as storageModule from '../../src/lib/storage';

describe('Phase P6.0: AI Research Storage Library', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('1. Safe Retrieval & Corrupted JSON Resilience', () => {
    it('1.1. Returns empty array when localStorage is empty', () => {
      const sessions = getStoredResearchSessions();
      expect(sessions).toEqual([]);
    });

    it('1.2. Returns valid sessions when stored correctly', () => {
      const mockSession: AIResearchSession = {
        id: 'airs-1',
        topicId: 'topic-buddhist-1',
        topicTitle: 'Bát Nhã Tâm Kinh',
        mode: 'concept_analysis',
        prompt: 'Phân tích tính Không (Śūnyatā)',
        result: 'Tính Không là cốt tủy của Bát Nhã...',
        timestamp: 1724857000000,
      };
      localStorage.setItem(AI_RESEARCH_SESSIONS_STORAGE_KEY, JSON.stringify([mockSession]));

      const sessions = getStoredResearchSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toEqual(mockSession);
    });

    it('1.3. Handles corrupted malformed JSON gracefully without throwing', () => {
      localStorage.setItem(AI_RESEARCH_SESSIONS_STORAGE_KEY, 'MALFORMED_JSON{{{');

      expect(() => {
        const sessions = getStoredResearchSessions();
        expect(sessions).toEqual([]);
      }).not.toThrow();
    });

    it('1.4. Handles non-array JSON payloads gracefully', () => {
      localStorage.setItem(AI_RESEARCH_SESSIONS_STORAGE_KEY, JSON.stringify({ not: 'an array' }));
      expect(getStoredResearchSessions()).toEqual([]);
    });

    it('1.5. Filters out malformed item entries missing mandatory fields', () => {
      const validSession: AIResearchSession = {
        id: 'airs-valid',
        topicId: 'topic-1',
        topicTitle: 'Title 1',
        mode: 'terminology_exegesis',
        prompt: 'Prompt 1',
        result: 'Result 1',
        timestamp: 1724857000000,
      };
      const invalidEntries = [
        null,
        { id: 'airs-invalid-1' }, // missing topicId, prompt, result
        { id: 'airs-invalid-2', topicId: 'topic-2', prompt: '' }, // empty prompt
        { id: 'airs-invalid-3', topicId: 'topic-3', prompt: 'p', result: '' }, // empty result
        validSession,
      ];
      localStorage.setItem(AI_RESEARCH_SESSIONS_STORAGE_KEY, JSON.stringify(invalidEntries));

      const sessions = getStoredResearchSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe('airs-valid');
    });

    it('1.6. Validates research mode and filters out entries with corrupted or unsupported mode', () => {
      expect(isValidResearchMode('concept_analysis')).toBe(true);
      expect(isValidResearchMode('terminology_exegesis')).toBe(true);
      expect(isValidResearchMode('cross_domain_synthesis')).toBe(true);
      expect(isValidResearchMode('scholar_analysis')).toBe(true);
      expect(isValidResearchMode('pali_sanskrit_exegesis')).toBe(true);
      expect(isValidResearchMode('cross_domain_link')).toBe(true);
      expect(isValidResearchMode('unsupported_mode')).toBe(false);
      expect(isValidResearchMode('')).toBe(false);
      expect(isValidResearchMode(null)).toBe(false);

      const invalidModeSession = {
        id: 'airs-invalid-mode',
        topicId: 'topic-1',
        topicTitle: 'Title 1',
        mode: 'unsupported_mode_random_string',
        prompt: 'Prompt',
        result: 'Result',
        timestamp: 1724857000000,
      };
      localStorage.setItem(AI_RESEARCH_SESSIONS_STORAGE_KEY, JSON.stringify([invalidModeSession]));

      const sessions = getStoredResearchSessions();
      expect(sessions).toEqual([]);
    });
  });

  describe('2. Session Saving & Rolling Buffer (Max 20)', () => {
    it('2.1. Saves a valid successful session and generates id + timestamp if not provided', () => {
      const saved = saveResearchSession({
        topicId: 'topic-economics',
        topicTitle: 'Kinh Tế Học',
        mode: 'cross_domain_synthesis',
        prompt: 'So sánh IS-LM và trường phái Áo',
        result: 'Mô hình IS-LM dựa trên giả định can thiệp...',
      });

      expect(saved).not.toBeNull();
      expect(saved?.id).toMatch(/^airs-/);
      expect(saved?.timestamp).toBeGreaterThan(0);
      expect(saved?.topicId).toBe('topic-economics');

      const stored = getStoredResearchSessions();
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe(saved?.id);
    });

    it('2.2. Rejects saving when result or prompt or topicId is blank', () => {
      const emptyResult = saveResearchSession({
        topicId: 'topic-1',
        topicTitle: 'Title',
        mode: 'concept_analysis',
        prompt: 'Prompt',
        result: '   ',
      });
      expect(emptyResult).toBeNull();

      const emptyPrompt = saveResearchSession({
        topicId: 'topic-1',
        topicTitle: 'Title',
        mode: 'concept_analysis',
        prompt: '',
        result: 'Result',
      });
      expect(emptyPrompt).toBeNull();

      const emptyTopic = saveResearchSession({
        topicId: '  ',
        topicTitle: 'Title',
        mode: 'concept_analysis',
        prompt: 'Prompt',
        result: 'Result',
      });
      expect(emptyTopic).toBeNull();

      expect(getStoredResearchSessions()).toEqual([]);
    });

    it('2.3. Enforces rolling buffer of maximum 20 sessions (newest preserved, oldest dropped)', () => {
      for (let i = 1; i <= 25; i++) {
        saveResearchSession({
          id: `airs-session-${i}`,
          topicId: `topic-${i % 3}`,
          topicTitle: `Topic ${i % 3}`,
          mode: 'concept_analysis',
          prompt: `Prompt number ${i}`,
          result: `Result number ${i}`,
          timestamp: 1000 + i,
        });
      }

      const stored = getStoredResearchSessions();
      expect(stored).toHaveLength(MAX_RESEARCH_SESSIONS);
      expect(stored).toHaveLength(20);

      // Newest should be session-25, oldest should be session-6 (1..5 dropped)
      expect(stored[0].id).toBe('airs-session-25');
      expect(stored[stored.length - 1].id).toBe('airs-session-6');
    });

    it('2.4. Handles storage failure gracefully without crashing', () => {
      vi.spyOn(storageModule, 'safeSetLocalStorageItem').mockReturnValue(false);

      expect(() => {
        const result = saveResearchSession({
          topicId: 'topic-1',
          topicTitle: 'Title',
          mode: 'concept_analysis',
          prompt: 'Prompt',
          result: 'Result',
        });
        expect(result).toBeNull();
      }).not.toThrow();
    });
  });

  describe('3. Topic Isolation & History Retrieval', () => {
    it('3.1. getSessionsForTopic filters only sessions matching topicId in newest-first order', () => {
      saveResearchSession({
        id: 'airs-a1',
        topicId: 'topic-A',
        topicTitle: 'Topic A',
        mode: 'concept_analysis',
        prompt: 'Prompt A1',
        result: 'Result A1',
        timestamp: 1000,
      });
      saveResearchSession({
        id: 'airs-b1',
        topicId: 'topic-B',
        topicTitle: 'Topic B',
        mode: 'terminology_exegesis',
        prompt: 'Prompt B1',
        result: 'Result B1',
        timestamp: 2000,
      });
      saveResearchSession({
        id: 'airs-a2',
        topicId: 'topic-A',
        topicTitle: 'Topic A',
        mode: 'cross_domain_synthesis',
        prompt: 'Prompt A2',
        result: 'Result A2',
        timestamp: 3000,
      });

      const topicASessions = getSessionsForTopic('topic-A');
      expect(topicASessions).toHaveLength(2);
      expect(topicASessions[0].id).toBe('airs-a2'); // newest first
      expect(topicASessions[1].id).toBe('airs-a1');

      const topicBSessions = getSessionsForTopic('topic-B');
      expect(topicBSessions).toHaveLength(1);
      expect(topicBSessions[0].id).toBe('airs-b1');

      const topicCSessions = getSessionsForTopic('topic-C');
      expect(topicCSessions).toEqual([]);
    });

    it('3.2. getLatestSessionForTopic returns the single most recent session for topicId', () => {
      saveResearchSession({
        id: 'airs-x1',
        topicId: 'topic-X',
        topicTitle: 'Topic X',
        mode: 'concept_analysis',
        prompt: 'Prompt X1',
        result: 'Result X1',
        timestamp: 100,
      });
      saveResearchSession({
        id: 'airs-x2',
        topicId: 'topic-X',
        topicTitle: 'Topic X',
        mode: 'scholar_analysis',
        prompt: 'Prompt X2',
        result: 'Result X2',
        timestamp: 500,
      });

      const latest = getLatestSessionForTopic('topic-X');
      expect(latest).not.toBeNull();
      expect(latest?.id).toBe('airs-x2');
      expect(latest?.prompt).toBe('Prompt X2');

      expect(getLatestSessionForTopic('topic-non-existent')).toBeNull();
    });

    it('3.3. clearResearchSessions removes stored session data cleanly', () => {
      saveResearchSession({
        topicId: 'topic-1',
        topicTitle: 'Title',
        mode: 'concept_analysis',
        prompt: 'Prompt',
        result: 'Result',
      });
      expect(getStoredResearchSessions()).toHaveLength(1);

      clearResearchSessions();
      expect(getStoredResearchSessions()).toEqual([]);
    });
  });

  describe('4. Filename Sanitization & Markdown Export Formatting', () => {
    it('4.1. sanitizeExportFilename creates safe names and strips illegal filesystem characters', () => {
      const fixedTimestamp = 1724857200000;

      const safe1 = sanitizeExportFilename('Bát Nhã Tâm Kinh', fixedTimestamp);
      expect(safe1).toBe(`AI-Research-bat-nha-tam-kinh-${fixedTimestamp}.md`);

      const safe2 = sanitizeExportFilename('Topic / with: "illegal" <chars>? *', fixedTimestamp);
      expect(safe2).not.toMatch(/[/:*?"<>|\\]/);
      expect(safe2).toContain(`AI-Research-`);
      expect(safe2.endsWith(`-${fixedTimestamp}.md`)).toBe(true);

      const safeEmpty = sanitizeExportFilename('', fixedTimestamp);
      expect(safeEmpty).toBe(`AI-Research-research-${fixedTimestamp}.md`);
    });

    it('4.2. formatResearchMarkdown produces a structured academic markdown document', () => {
      const session: AIResearchSession = {
        id: 'airs-test-md',
        topicId: 'topic-abhidhamma',
        topicTitle: 'Abhidhamma & Tâm Sở Đồng Sanh',
        mode: 'concept_analysis',
        prompt: 'Khảo cứu 52 tâm sở theo Luận tạng',
        result: 'Có 52 tâm sở chia thành 3 nhóm chính:\n1. Biến hành (7)\n2. Biệt cảnh (6)\n3. Bất thiện (14)',
        timestamp: 1724857200000,
      };

      const md = formatResearchMarkdown(session, { domainOrCategory: 'Phật Học' });

      expect(md).toContain('# Khảo Cứu Antigravity AI: Abhidhamma & Tâm Sở Đồng Sanh');
      expect(md).toContain('- **Chủ đề:** Abhidhamma & Tâm Sở Đồng Sanh');
      expect(md).toContain('- **Lĩnh vực:** Phật Học');
      expect(md).toContain('- **Chế độ khảo cứu:** Phân Tích Khái Niệm');
      expect(md).toContain('## 1. Yêu Cầu Khảo Cứu (Prompt)');
      expect(md).toContain('Khảo cứu 52 tâm sở theo Luận tạng');
      expect(md).toContain('## 2. Kết Quả Khảo Cứu & Tổng Hợp Học Thuật');
      expect(md).toContain('Có 52 tâm sở chia thành 3 nhóm chính:');
      expect(md).toContain('*Tài liệu được xuất tự động từ Antigravity AI Scholar & Research Engine.*');
    });
  });
});
