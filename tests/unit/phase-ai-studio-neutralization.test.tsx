import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataProvider } from '../../src/context/DataContext';
import { AIResearchStudio } from '../../src/components/ai/AIResearchStudio';
import {
  packageHandoffBundleForAntigravity,
  generateAntigravityPrompt,
} from '../../src/lib/antigravity';
import {
  getStoredHandoffJobs,
  ANTIGRAVITY_HANDOFF_JOBS_STORAGE_KEY,
} from '../../src/lib/antigravityPipeline';
import { GeminiResearchInputSchema } from '../../src/lib/validation';
import { Topic, Note, Resource, Category } from '../../src/types';
import { INITIAL_CATEGORIES } from '../../src/data/initialData';

describe('Phase AI-Studio-Neutralization: Universal Multi-Discipline AI Layer', () => {
  const economicsTopic: Topic = {
    id: 'topic-macro-economics',
    title: 'Kinh Tế Học Vĩ Mô và Chính Sách Tiền Tệ',
    slug: 'kinh-te-hoc-vi-mo',
    categoryId: 'cat-kinh-te',
    categoryName: 'Kinh Tế Học',
    type: 'kinh-te' as any,
    description: 'Nghiên cứu lạm phát, lãi suất và chính sách điều hành tiền tệ.',
    content: 'Phân tích mô hình IS-LM và đường cong Phillips...',
    tags: ['KinhTe', 'ChinhSachTienTe', 'LamPhat'],
    studyProgress: {
      topicId: 'topic-macro-economics',
      status: 'in_progress',
      progress: 40,
      interval: 2,
      easeFactor: 2.5,
      repetitions: 1,
      totalNotes: 1,
      timeSpent: 20,
    },
    links: [],
    createdAt: '2026-08-25T00:00:00Z',
    updatedAt: '2026-08-25T00:00:00Z',
  };

  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Presentation Neutrality in AIResearchStudio', () => {
    it('1.1. Subtitle mang định hướng học thuật đa ngành và không khóa cứng vào 2 tôn giáo/huyền học', () => {
      render(
        <DataProvider>
          <AIResearchStudio currentTopic={economicsTopic} />
        </DataProvider>
      );

      // Should not contain hardcoded restrictive subtitle
      expect(screen.queryByText(/phân tích Vi Diệu Pháp, Tam Tạng & Huyền học Đông phương/i)).toBeNull();
    });

    it('1.2. Chế độ nghiên cứu hiển thị các nhãn tác vụ học thuật phổ quát', () => {
      render(
        <DataProvider>
          <AIResearchStudio currentTopic={economicsTopic} />
        </DataProvider>
      );

      // Universal mode labels should be present
      expect(screen.getByRole('button', { name: /^Phân Tích Khái Niệm$/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /^Ngữ Nguyên & Thuật Ngữ$/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /^Tổng Hợp Liên Ngành$/i })).toBeDefined();
    });

    it('1.3. Dropdown danh sách chủ đề không ép buộc nhãn [Phật Học] / [Huyền Học] cho domain khác', () => {
      const customCategories: Category[] = [
        ...INITIAL_CATEGORIES,
        {
          id: 'cat-kinh-te',
          name: 'Kinh Tế Học',
          slug: 'kinh-te-hoc',
          parentId: null,
        },
      ];
      localStorage.setItem('phat_hoc_huyen_hoc_clean_v3_categories', JSON.stringify(customCategories));
      localStorage.setItem('phat_hoc_huyen_hoc_clean_v3_topics', JSON.stringify([economicsTopic]));

      render(
        <DataProvider>
          <AIResearchStudio currentTopic={economicsTopic} />
        </DataProvider>
      );

      const option = screen.getByRole('option', { name: /Kinh Tế Học Vĩ Mô/i });
      expect(option.textContent).not.toContain('[Huyền Học]');
      expect(option.textContent).not.toContain('[Phật Học]');
    });
  });

  describe('2. Prompt System & Universal Handoff Bundle', () => {
    it('2.1. Handoff Bundle Section 1 định vị học giả nghiên cứu đa lĩnh vực cho chủ đề phi tôn giáo', () => {
      const bundle = packageHandoffBundleForAntigravity(economicsTopic, [], [], [economicsTopic]);
      expect(bundle).toContain('## 1. System Directive & Academic Persona');
      expect(bundle).not.toContain('chuyên sâu về hai kho tàng tư tưởng Phương Đông: 1. Phật Học Học Thuật');
    });

    it('2.2. Prompt Generator sinh prompt học thuật tổng quát cho chủ đề thuộc domain mới', () => {
      const prompt = generateAntigravityPrompt(economicsTopic, 'scholar_analysis' as any);
      expect(prompt).not.toContain('Pháp chân đế (Paramattha Dhammā)');
      expect(prompt).toContain(economicsTopic.title);
    });
  });

  describe('3. Schema Validation & Storage Migration Backward Compatibility', () => {
    it('3.1. GeminiResearchInputSchema chấp nhận cả universal modes và legacy modes', () => {
      // Universal modes
      expect(GeminiResearchInputSchema.safeParse({ prompt: 'test', mode: 'concept_analysis' }).success).toBe(true);
      expect(GeminiResearchInputSchema.safeParse({ prompt: 'test', mode: 'terminology_exegesis' }).success).toBe(true);
      expect(GeminiResearchInputSchema.safeParse({ prompt: 'test', mode: 'cross_domain_synthesis' }).success).toBe(true);

      // Legacy modes
      expect(GeminiResearchInputSchema.safeParse({ prompt: 'test', mode: 'scholar_analysis' }).success).toBe(true);
      expect(GeminiResearchInputSchema.safeParse({ prompt: 'test', mode: 'pali_sanskrit_exegesis' }).success).toBe(true);
      expect(GeminiResearchInputSchema.safeParse({ prompt: 'test', mode: 'cross_domain_link' }).success).toBe(true);
    });

    it('3.2. getStoredHandoffJobs tự động khôi phục dữ liệu từ legacy storage key', () => {
      const legacyJob = {
        jobId: 'job-legacy-123',
        status: 'queued',
        artifactType: 'study_guide',
        topicId: 'topic-1',
        topicTitle: 'Chủ đề cũ',
        sourcePath: '.agents/handoffs/job-legacy-123-source.md',
        promptPath: '.agents/handoffs/job-legacy-123-prompt.md',
        manifestPath: '.agents/handoffs/job-legacy-123-manifest.json',
        createdAt: '2026-08-20T00:00:00Z',
        updatedAt: '2026-08-20T00:00:00Z',
      };
      localStorage.setItem('phat_hoc_antigravity_handoff_jobs_v1', JSON.stringify([legacyJob]));

      const loadedJobs = getStoredHandoffJobs();
      expect(loadedJobs.length).toBe(1);
      expect(loadedJobs[0].jobId).toBe('job-legacy-123');
    });
  });
});
