import { describe, it, expect } from 'vitest';
import {
  packageHandoffBundleForAntigravity,
  generateAntigravityPrompt,
} from '../../src/lib/antigravity';
import { Topic, Note, Resource } from '../../src/types';

describe('Phase 3: Antigravity Library Unit Tests', () => {
  const mockTopic: Topic = {
    id: 'topic-test-abhidharma',
    title: 'Vi Diệu Pháp Thắng Nghĩa Luận',
    slug: 'vi-dieu-phap-thang-nghia-luan',
    categoryId: 'cat-abhidharma',
    categoryName: 'Thắng Pháp Abhidhamma',
    type: 'phat-hoc',
    description: 'Tổng hợp 89/121 Tâm và 52 Tâm sở tương ưng trong Vi Diệu Pháp.',
    content: '## Khảo Luận Abhidhamma\nTâm sở (Cetasika) đồng sanh với Tâm (Citta)...',
    tags: ['Abhidhamma', 'Tâm Sở', 'Citta'],
    studyProgress: {
      topicId: 'topic-test-abhidharma',
      status: 'in_progress',
      progress: 60,
      interval: 4,
      easeFactor: 2.5,
      repetitions: 2,
      totalNotes: 2,
      timeSpent: 45,
    },
    links: [
      {
        id: 'link-1',
        sourceId: 'topic-test-abhidharma',
        targetId: 'topic-test-vipassana',
        targetTitle: 'Thiền Quán Vipassanā',
        linkType: 'prerequisite',
        strength: 5,
        notes: 'Là nền tảng tuệ minh sát',
      },
      {
        id: 'link-2',
        sourceId: 'topic-test-abhidharma',
        targetId: 'topic-test-dich',
        targetTitle: 'Kinh Dịch - Âm Dương Biến Dịch',
        linkType: 'related',
        strength: 3,
      },
    ],
    createdAt: '2026-08-20T00:00:00Z',
    updatedAt: '2026-08-24T00:00:00Z',
  };

  const mockNotes: Note[] = [
    {
      id: 'note-1',
      topicId: 'topic-test-abhidharma',
      topicTitle: 'Vi Diệu Pháp Thắng Nghĩa Luận',
      title: 'Tâm sở biến hành và biệt cảnh',
      content: '7 tâm sở biến hành luôn có mặt trong mọi tâm thức.',
      type: 'insight',
      isPrivate: false,
      tags: ['TâmSở', 'BiếnHành'],
      createdAt: '2026-08-21T00:00:00Z',
      updatedAt: '2026-08-21T00:00:00Z',
    },
    {
      id: 'note-2',
      topicId: 'topic-test-abhidharma',
      topicTitle: 'Vi Diệu Pháp Thắng Nghĩa Luận',
      title: 'Nghi vấn về tiến trình tâm tử tục sinh',
      content: 'Làm thế nào để quán chiếu sát-na tử tâm kết nối tục sinh thức?',
      type: 'question',
      isPrivate: false,
      tags: ['TiếnTrìnhTâm', 'TụcSinh'],
      createdAt: '2026-08-22T00:00:00Z',
      updatedAt: '2026-08-22T00:00:00Z',
    },
  ];

  const mockResources: Resource[] = [
    {
      id: 'res-1',
      topicId: 'topic-test-abhidharma',
      topicTitle: 'Vi Diệu Pháp Thắng Nghĩa Luận',
      title: 'Abhidhammattha Sangaha',
      url: 'https://suttacentral.net/abhidhamma',
      type: 'book',
      author: 'Acariya Anuruddha',
      createdAt: '2026-08-20T00:00:00Z',
    },
    {
      id: 'res-2',
      topicId: 'topic-test-abhidharma',
      topicTitle: 'Vi Diệu Pháp Thắng Nghĩa Luận',
      title: 'Tai-Lieu-Vi-Dieu-Phap.pdf',
      filePath: 'Tai-Lieu-Vi-Dieu-Phap.pdf',
      type: 'pdf',
      createdAt: '2026-08-21T00:00:00Z',
    },
  ];

  it('1. Đóng gói đầy đủ 6 section cố định theo đúng thứ tự tiêu đề', () => {
    const bundle = packageHandoffBundleForAntigravity(mockTopic, mockNotes, mockResources);

    expect(bundle).toContain('## 1. System Directive & Academic Persona');
    expect(bundle).toContain('## 2. Topic Exegesis & Canonical Metadata');
    expect(bundle).toContain('## 3. Multi-Hop Knowledge Graph Topology');
    expect(bundle).toContain('## 4. User Notes & Open Inquiries');
    expect(bundle).toContain('## 5. Annotated Bibliography & Local References');
    expect(bundle).toContain('## 6. Reasoning Directives & Rigor Invariants');

    // Verify order
    const idx1 = bundle.indexOf('## 1. System Directive & Academic Persona');
    const idx2 = bundle.indexOf('## 2. Topic Exegesis & Canonical Metadata');
    const idx3 = bundle.indexOf('## 3. Multi-Hop Knowledge Graph Topology');
    const idx4 = bundle.indexOf('## 4. User Notes & Open Inquiries');
    const idx5 = bundle.indexOf('## 5. Annotated Bibliography & Local References');
    const idx6 = bundle.indexOf('## 6. Reasoning Directives & Rigor Invariants');

    expect(idx1).toBeLessThan(idx2);
    expect(idx2).toBeLessThan(idx3);
    expect(idx3).toBeLessThan(idx4);
    expect(idx4).toBeLessThan(idx5);
    expect(idx5).toBeLessThan(idx6);
  });

  it('2. Section 3 thể hiện đúng đồ thị 1-hop trực tiếp với linkType, strength và notes', () => {
    const bundle = packageHandoffBundleForAntigravity(mockTopic, mockNotes, mockResources);

    expect(bundle).toContain('PREREQUISITE');
    expect(bundle).toContain('Thiền Quán Vipassanā');
    expect(bundle).toContain('Độ mạnh: 5/5');
    expect(bundle).toContain('Ghi chú: Là nền tảng tuệ minh sát');

    expect(bundle).toContain('RELATED');
    expect(bundle).toContain('Kinh Dịch - Âm Dương Biến Dịch');
    expect(bundle).toContain('Độ mạnh: 3/5');
  });

  it('3. Section 4 phân loại và trích xuất đúng ghi chú người dùng', () => {
    const bundle = packageHandoffBundleForAntigravity(mockTopic, mockNotes, mockResources);

    expect(bundle).toContain('[INSIGHT]');
    expect(bundle).toContain('Tâm sở biến hành và biệt cảnh');
    expect(bundle).toContain('7 tâm sở biến hành luôn có mặt trong mọi tâm thức.');

    expect(bundle).toContain('[QUESTION]');
    expect(bundle).toContain('Nghi vấn về tiến trình tâm tử tục sinh');
  });

  it('4. Section 5 trích dẫn cả nguồn Web và Local filePath (Zero Binary)', () => {
    const bundle = packageHandoffBundleForAntigravity(mockTopic, mockNotes, mockResources);

    expect(bundle).toContain('https://suttacentral.net/abhidhamma');
    expect(bundle).toContain('Acariya Anuruddha');
    expect(bundle).toContain('[Tệp cục bộ: Tai-Lieu-Vi-Dieu-Phap.pdf]');
  });

  it('5. Render "None recorded." cho các section rỗng khi topic không có links, notes, resources', () => {
    const emptyTopic: Topic = {
      id: 'topic-empty',
      title: 'Chủ đề trống',
      slug: 'chu-de-trong',
      categoryId: 'cat-tam-tang',
      type: 'phat-hoc',
      description: 'Chưa có mô tả',
      content: '',
      tags: [],
      studyProgress: {
        topicId: 'topic-empty',
        status: 'not_started',
        progress: 0,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        totalNotes: 0,
        timeSpent: 0,
      },
      links: [],
      createdAt: '2026-08-24T00:00:00Z',
      updatedAt: '2026-08-24T00:00:00Z',
    };

    const bundle = packageHandoffBundleForAntigravity(emptyTopic, [], []);

    expect(bundle).toContain('## 3. Multi-Hop Knowledge Graph Topology');
    expect(bundle).toContain('## 4. User Notes & Open Inquiries');
    expect(bundle).toContain('## 5. Annotated Bibliography & Local References');

    // Section 3, 4, 5 should have "None recorded."
    const sec3To4 = bundle.substring(
      bundle.indexOf('## 3. Multi-Hop Knowledge Graph Topology'),
      bundle.indexOf('## 4. User Notes & Open Inquiries')
    );
    expect(sec3To4).toContain('None recorded.');

    const sec4To5 = bundle.substring(
      bundle.indexOf('## 4. User Notes & Open Inquiries'),
      bundle.indexOf('## 5. Annotated Bibliography & Local References')
    );
    expect(sec4To5).toContain('None recorded.');

    const sec5To6 = bundle.substring(
      bundle.indexOf('## 5. Annotated Bibliography & Local References'),
      bundle.indexOf('## 6. Reasoning Directives & Rigor Invariants')
    );
    expect(sec5To6).toContain('None recorded.');
  });

  it('6. generateAntigravityPrompt sinh prompt chuẩn theo 3 chế độ nghiên cứu', () => {
    const p1 = generateAntigravityPrompt(mockTopic, 'scholar_analysis');
    expect(p1).toContain('Học giả Nghiên cứu Phật học & Luận Tạng');
    expect(p1).toContain('Vi Diệu Pháp Thắng Nghĩa Luận');

    const p2 = generateAntigravityPrompt(mockTopic, 'pali_sanskrit_exegesis');
    expect(p2).toContain('Ngữ nguyên & Chiết tự');
    expect(p2).toContain('Pali (IAST)');

    const p3 = generateAntigravityPrompt(mockTopic, 'cross_domain_link');
    expect(p3).toContain('Đối chiếu Liên ngành');
    expect(p3).toContain('Dịch Học');
  });
});
