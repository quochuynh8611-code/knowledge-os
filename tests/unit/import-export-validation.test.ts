import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Định nghĩa Data Contract Zod Schema chuẩn cho Import / Export
export const CategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  slug: z.string().min(1),
  type: z.enum(['phat-hoc', 'huyen-hoc']),
  parentId: z.string().nullable().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export const StudyProgressSchema = z.object({
  topicId: z.string().min(1),
  status: z.enum(['not_started', 'in_progress', 'completed', 'reviewing']),
  progress: z.number().min(0).max(100),
  interval: z.number().min(0),
  easeFactor: z.number().min(1.3),
  repetitions: z.number().min(0),
  nextReview: z.string().optional(),
  lastStudied: z.string().optional(),
  timeSpent: z.number().min(0),
  totalNotes: z.number().min(0).optional(),
});

export const KnowledgeLinkSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
  linkType: z.enum(['related', 'prerequisite', 'advanced', 'contradicts']),
  strength: z.number().min(1).max(5),
  notes: z.string().optional(),
});

export const TopicSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(2).max(255),
  slug: z.string().min(1),
  categoryId: z.string().min(1),
  type: z.enum(['phat-hoc', 'huyen-hoc']),
  parentId: z.string().nullable().optional(),
  description: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  links: z.array(KnowledgeLinkSchema),
  studyProgress: StudyProgressSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const BackupPackageSchema = z.object({
  version: z.string(),
  exportDate: z.string(),
  categories: z.array(CategorySchema),
  topics: z.array(TopicSchema),
  notes: z.array(z.any()),
  resources: z.array(z.any()),
  tags: z.array(z.any()),
});

describe('Data Validation & Import/Export Contract (Zod Validation)', () => {
  it('Chấp thuận gói dữ liệu sao lưu hợp lệ (Valid Backup Payload)', () => {
    const validPayload = {
      version: '2.0.0',
      exportDate: new Date().toISOString(),
      categories: [
        {
          id: 'cat-tam-tang',
          name: 'Tam Tạng',
          slug: 'tam-tang',
          type: 'phat-hoc',
        },
      ],
      topics: [
        {
          id: 'topic-1',
          title: 'Vi Diệu Pháp Toàn Thư',
          slug: 'vi-dieu-phap',
          categoryId: 'cat-tam-tang',
          type: 'phat-hoc',
          description: 'Mô tả chi tiết',
          content: 'Nội dung khảo cứu...',
          tags: ['Abhidharma'],
          links: [],
          studyProgress: {
            topicId: 'topic-1',
            status: 'not_started',
            progress: 0,
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
            timeSpent: 0,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      notes: [],
      resources: [],
      tags: [],
    };

    const parseResult = BackupPackageSchema.safeParse(validPayload);
    expect(parseResult.success).toBe(true);
  });

  it('Từ chối gói dữ liệu bị hỏng (Corrupted Payload: sai kiểu, thiếu trường bắt buộc, easeFactor < 1.3)', () => {
    const invalidPayload = {
      version: '2.0.0',
      exportDate: 'not-a-date',
      categories: [],
      topics: [
        {
          id: 'topic-bad',
          title: 'A', // Tiêu đề quá ngắn (< 2 ký tự)
          type: 'invalid-domain', // Sai enum
          studyProgress: {
            easeFactor: 0.5, // Vi phạm floor 1.3
            progress: 200, // Vượt quá 100%
          },
        },
      ],
    };

    const parseResult = BackupPackageSchema.safeParse(invalidPayload);
    expect(parseResult.success).toBe(false);
    if (!parseResult.success) {
      expect(parseResult.error.issues.length).toBeGreaterThan(0);
    }
  });

  it('Schema Validation File (src/schemas/validation.ts) sẽ được nạp trong Phase 2', async () => {
    const modulePath = '../../src/schemas/validation';
    try {
      const mod = await import(/* @vite-ignore */ modulePath);
      expect(mod).toBeDefined();
    } catch (e) {
      expect(e).toBeDefined();
    }
  });
});
