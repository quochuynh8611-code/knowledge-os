/**
 * Obsidian Library Unit Test Suite (Phase 2a)
 *
 * ADR: ADR-012 (docs/adr/ADR-012-local-file-picker-and-knowledge-bridge.md)
 * Gherkin: docs/gherkin/file-picker-and-knowledge-bridge.feature (Scenario 6)
 * Target: src/lib/obsidian.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStoredVaultName,
  setStoredVaultName,
  formatTopicForObsidian,
  formatNoteForObsidian,
  getObsidianOpenUri,
  getObsidianNewNoteUri,
  generateObsidianVaultZip,
  DEFAULT_OBSIDIAN_VAULT_KEY,
  normalizeExportTags,
} from '../../src/lib/obsidian';
import { Topic, Note, Resource, Category } from '../../src/types';
import JSZip from 'jszip';

describe('ADR-012 Phase 2a: Obsidian Library Contract Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const mockTopicPhatHoc: Topic = {
    id: 'topic-vi-dieu-phap',
    title: 'Vi Diệu Pháp Toàn Tập',
    slug: 'vi-dieu-phap-toan-tap',
    type: 'phat-hoc',
    categoryId: 'cat-abhidharma',
    categoryName: 'Vi Diệu Pháp',
    description: 'Khảo luận chi tiết 89/121 Tâm và 52 Tâm sở.',
    content: 'Tâm là thực tại nhận biết đối tượng.',
    tags: ['Abhidharma', 'Tâm Pháp'],
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-24T10:00:00Z',
    studyProgress: {
      topicId: 'topic-vi-dieu-phap',
      status: 'in_progress',
      progress: 65,
      easeFactor: 2.5,
      interval: 4,
      repetitions: 2,
      totalNotes: 1,
      timeSpent: 45,
    },
    links: [
      {
        id: 'link-vdp-1',
        sourceId: 'topic-vi-dieu-phap',
        targetId: 'topic-tu-niem-xu',
        targetTitle: 'Tứ Niệm Xứ',
        linkType: 'prerequisite',
        strength: 5,
        notes: 'Nền tảng thiền quán',
      },
    ],
  };

  const mockTopicHuyenHoc: Topic = {
    id: 'topic-ky-mon',
    title: 'Kỳ Môn Độn Giáp / Bát Môn Trận',
    slug: 'ky-mon-don-giap',
    type: 'huyen-hoc',
    categoryId: 'cat-dich-hoc',
    categoryName: 'Dịch Học',
    description: 'Phương pháp định vị thời không.',
    content: 'Tam kỳ lục nghi và cửu tinh.',
    tags: ['Kỳ Môn', 'Trận Đồ'],
    studyProgress: {
      topicId: 'topic-ky-mon',
      status: 'not_started',
      progress: 0,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    links: [],
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-24T10:00:00Z',
  };

  const mockNotes: Note[] = [
    {
      id: 'note-1',
      topicId: 'topic-vi-dieu-phap',
      topicTitle: 'Vi Diệu Pháp Toàn Tập',
      title: 'Tâm Sở Bất Thiện',
      content: '14 tâm sở bất thiện gồm si, vô tàm, vô úy...',
      type: 'insight',
      isPrivate: false,
      tags: ['Tâm Sở', 'Khảo Cứu'],
      createdAt: '2026-08-21T10:00:00Z',
      updatedAt: '2026-08-22T10:00:00Z',
    },
  ];

  const mockResources: Resource[] = [
    {
      id: 'res-1',
      topicId: 'topic-vi-dieu-phap',
      topicTitle: 'Vi Diệu Pháp Toàn Tập',
      title: 'Thắng Pháp Tập Yếu Luận',
      type: 'pdf',
      author: 'HT. Thích Minh Châu',
      filePath: 'Thang-Phap.pdf',
      createdAt: '2026-08-20T10:00:00Z',
    },
  ];

  const mockCategories: Category[] = [
    {
      id: 'cat-root-phat-hoc',
      name: 'Phật Học (Buddhism)',
      slug: 'phat-hoc',
      type: 'phat-hoc',
      parentId: null,
    },
    {
      id: 'cat-root-huyen-hoc',
      name: 'Huyền Học & Dịch Học (Esotericism)',
      slug: 'huyen-hoc',
      type: 'huyen-hoc',
      parentId: null,
    },
    {
      id: 'cat-abhidharma',
      name: 'Vi Diệu Pháp',
      slug: 'vi-dieu-phap',
      type: 'phat-hoc',
      parentId: 'cat-root-phat-hoc',
      description: 'Luận tạng Phật giáo',
      icon: 'Book',
    },
    {
      id: 'cat-dich-hoc',
      name: 'Dịch Học',
      slug: 'dich-hoc',
      type: 'huyen-hoc',
      parentId: 'cat-root-huyen-hoc',
      description: 'Dịch lý đông phương',
    },
  ];

  // ---------------------------------------------------------------------------
  // 1. Vault Name Storage & Edge Cases
  // ---------------------------------------------------------------------------
  it('1. getStoredVaultName returns default vault name when localStorage is empty', () => {
    expect(getStoredVaultName()).toBe('Khao-Cuu-Phat-Hoc-Huyen-Hoc');
  });

  it('2. setStoredVaultName saves trimmed name and getStoredVaultName retrieves it', () => {
    setStoredVaultName('  My-Custom-Obsidian-Vault  ');
    expect(getStoredVaultName()).toBe('My-Custom-Obsidian-Vault');
    expect(localStorage.getItem(DEFAULT_OBSIDIAN_VAULT_KEY)).toBe('My-Custom-Obsidian-Vault');
  });

  it('3. getStoredVaultName falls back to default when localStorage has empty or whitespace string', () => {
    localStorage.setItem(DEFAULT_OBSIDIAN_VAULT_KEY, '   ');
    expect(getStoredVaultName()).toBe('Khao-Cuu-Phat-Hoc-Huyen-Hoc');
  });

  // ---------------------------------------------------------------------------
  // 2. Formatting Topic with YAML Frontmatter & [[Wiki Links]]
  // ---------------------------------------------------------------------------
  it('4. formatTopicForObsidian generates valid YAML frontmatter and Wiki Links', () => {
    const md = formatTopicForObsidian(mockTopicPhatHoc, mockNotes);

    // Verify YAML Frontmatter
    expect(md).toContain('---');
    expect(md).toContain('title: "Vi Diệu Pháp Toàn Tập"');
    expect(md).toContain('slug: "vi-dieu-phap-toan-tap"');
    expect(md).toContain('domain: "phat-hoc"');
    expect(md).toContain('category: "Vi Diệu Pháp"');
    expect(md).toContain('tags: ["Abhidharma", "Tâm Pháp"]');
    expect(md).toContain('aliases: ["Vi Diệu Pháp Toàn Tập"]');
    expect(md).toContain('progress: 65');
    expect(md).toContain('status: "in_progress"');

    // Verify Body & Callout
    expect(md).toContain('# Vi Diệu Pháp Toàn Tập');
    expect(md).toContain('> [!abstract] Mô tả & Định vị');
    expect(md).toContain('Khảo luận chi tiết 89/121 Tâm');
    expect(md).toContain('## Nội Dung Khảo Cứu & Luận Thuyết');

    // Verify [[Wiki Links]] for knowledge links
    expect(md).toContain('## 🔗 Liên Kết Tri Thức (Knowledge Links)');
    expect(md).toContain('[[Tứ Niệm Xứ]]');
    expect(md).toContain('Trọng số 5/5');

    // Verify [[Wiki Links]] for associated notes
    expect(md).toContain('## 📝 Ghi Chú Chuyên Sâu Liên Quan');
    expect(md).toContain('[[Ghi-Chu/Tâm Sở Bất Thiện|Tâm Sở Bất Thiện]]');
  });

  // ---------------------------------------------------------------------------
  // 3. Formatting Single Note for Obsidian
  // ---------------------------------------------------------------------------
  it('5. formatNoteForObsidian generates note Markdown with topic backlink', () => {
    const md = formatNoteForObsidian(mockNotes[0]);

    expect(md).toContain('---');
    expect(md).toContain('title: "Tâm Sở Bất Thiện"');
    expect(md).toContain('type: "insight"');
    expect(md).toContain('topic: "Vi Diệu Pháp Toàn Tập"');
    expect(md).toContain('# Tâm Sở Bất Thiện');
    expect(md).toContain('*Thuộc chủ đề: [[Vi Diệu Pháp Toàn Tập]]*');
    expect(md).toContain('14 tâm sở bất thiện');
  });

  // ---------------------------------------------------------------------------
  // 4. Obsidian URI Protocol Generation & Edge Cases
  // ---------------------------------------------------------------------------
  it('6. getObsidianOpenUri creates valid obsidian://open deep link', () => {
    const uri = getObsidianOpenUri('My Vault', 'Phat-Hoc/Vi Diệu Pháp.md');
    expect(uri).toBe('obsidian://open?vault=My%20Vault&file=Phat-Hoc%2FVi%20Di%E1%BB%87u%20Ph%C3%A1p.md');
  });

  it('7. getObsidianOpenUri falls back to default vault when vaultName is empty or whitespace', () => {
    const uri = getObsidianOpenUri('   ', 'Phat-Hoc/Vi Diệu Pháp');
    expect(uri).toContain('vault=Khao-Cuu-Phat-Hoc-Huyen-Hoc');
  });

  it('8. getObsidianNewNoteUri creates valid obsidian://new deep link with encoded content', () => {
    const uri = getObsidianNewNoteUri('My Vault', 'Ghi Chú Mới', '# Nội dung ghi chú');
    expect(uri).toContain('obsidian://new?vault=My%20Vault');
    expect(uri).toContain('name=Ghi%20Ch%C3%BA%20M%E1%BB%9Bi');
    expect(uri).toContain('content=%23%20N%E1%BB%99i%20dung%20ghi%20ch%C3%BA');
  });

  // ---------------------------------------------------------------------------
  // 4b. Strict Obsidian URI Normalization & Semantic Contracts
  // ---------------------------------------------------------------------------
  it('10. getObsidianOpenUri normalizes absolute macOS filesystem path to vault name', () => {
    const absolutePath = '/Users/mr.chem/Documents/Obsidian/Phat-Hoc-Obsidian';
    const uri = getObsidianOpenUri(absolutePath, 'Phat-Hoc/Vi Diệu Pháp');

    const params = new URLSearchParams(uri.replace(/^obsidian:\/\/open\?/, ''));
    expect(params.get('vault')).toBe('Phat-Hoc-Obsidian');
    expect(uri).not.toContain('/Users/');
    expect(uri).not.toContain('%2FUsers%2F');
  });

  it('11. getObsidianOpenUri prevents 01_Inbox child directory from becoming vault identifier', () => {
    const childDirPath = '/Users/mr.chem/Documents/Obsidian/Phat-Hoc-Obsidian/01_Inbox';
    const uri = getObsidianOpenUri(childDirPath, 'Phat-Hoc/Vi Diệu Pháp');

    const params = new URLSearchParams(uri.replace(/^obsidian:\/\/open\?/, ''));
    expect(params.get('vault')).not.toBe('01_Inbox');
    expect(params.get('vault')).not.toContain('01_Inbox');
    expect(params.get('vault')).toBe('Phat-Hoc-Obsidian');
  });

  it('12. getStoredVaultName automatically sanitizes legacy dirty localStorage absolute paths', () => {
    localStorage.setItem(DEFAULT_OBSIDIAN_VAULT_KEY, '/Users/mr.chem/Documents/Obsidian/Phat-Hoc-Obsidian');
    expect(getStoredVaultName()).toBe('Phat-Hoc-Obsidian');
  });

  it('13. getObsidianOpenUri strips leading slashes from file path for relative vault resolution', () => {
    const uri = getObsidianOpenUri('Phat-Hoc-Obsidian', '/Phat-Hoc/Abhidharma - Vi Diệu Pháp Toàn Tập');
    const params = new URLSearchParams(uri.replace(/^obsidian:\/\/open\?/, ''));

    expect(params.get('file')).toBe('Phat-Hoc/Abhidharma - Vi Diệu Pháp Toàn Tập');
    expect(params.get('file')?.startsWith('/')).toBe(false);
  });

  it('14. getObsidianOpenUri and getObsidianNewNoteUri maintain 100% vault normalization consistency', () => {
    const rawInput = '/Users/mr.chem/Documents/Obsidian/Phat-Hoc-Obsidian';
    const openUri = getObsidianOpenUri(rawInput, 'Phat-Hoc/Topic');
    const newUri = getObsidianNewNoteUri(rawInput, 'Topic', '# Content');

    const openParams = new URLSearchParams(openUri.replace(/^obsidian:\/\/open\?/, ''));
    const newParams = new URLSearchParams(newUri.replace(/^obsidian:\/\/new\?/, ''));

    expect(openParams.get('vault')).toBe('Phat-Hoc-Obsidian');
    expect(newParams.get('vault')).toBe('Phat-Hoc-Obsidian');
    expect(openParams.get('vault')).toBe(newParams.get('vault'));
  });

  it('15. getObsidianOpenUri correctly encodes and preserves Vietnamese titles and spaces', () => {
    const title = 'Phat-Hoc/Abhidharma - Vi Diệu Pháp Toàn Tập';
    const uri = getObsidianOpenUri('Phat-Hoc-Obsidian', title);
    const params = new URLSearchParams(uri.replace(/^obsidian:\/\/open\?/, ''));

    expect(params.get('vault')).toBe('Phat-Hoc-Obsidian');
    expect(params.get('file')).toBe(title);
    expect(uri).toContain('Phat-Hoc%2FAbhidharma%20-%20Vi%20Di%E1%BB%87u%20Ph%C3%A1p%20To%C3%A0n%20T%E1%BA%ADp');
  });

  // ---------------------------------------------------------------------------
  // 5. Vault ZIP Generator & Structure Sanitization
  // ---------------------------------------------------------------------------
  it('9. generateObsidianVaultZip produces a valid zip containing 00_Map_Of_Content.md and folder structure', async () => {
    const blob = await generateObsidianVaultZip(
      [mockTopicPhatHoc, mockTopicHuyenHoc],
      mockNotes,
      mockResources,
      mockCategories,
      'Test-Vault'
    );

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(100);

    // Unzip in memory using JSZip to verify contents
    const arrayBuffer = await blob.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Check Map of Content (MOC)
    const mocFile = zip.file('00_Map_Of_Content.md');
    expect(mocFile).not.toBeNull();
    const mocText = await mocFile!.async('string');
    expect(mocText).toContain('BẢN ĐỒ TRI THỨC (MAP OF CONTENT - MOC)');
    expect(mocText).toContain('Test-Vault');
    expect(mocText).toContain('[[Phat-Hoc/Vi Diệu Pháp Toàn Tập|Vi Diệu Pháp Toàn Tập]]');
    expect(mocText).toContain('Thắng Pháp Tập Yếu Luận');

    // Check Phat-Hoc topic file
    const phatHocFile = zip.file('Phat-Hoc/Vi Diệu Pháp Toàn Tập.md');
    expect(phatHocFile).not.toBeNull();
    const phatHocContent = await phatHocFile!.async('string');
    expect(phatHocContent).toContain('title: "Vi Diệu Pháp Toàn Tập"');

    // Check Huyen-Hoc topic file with slash sanitized to hyphen
    const huyenHocFile = zip.file('Huyen-Hoc/Kỳ Môn Độn Giáp - Bát Môn Trận.md');
    expect(huyenHocFile).not.toBeNull();

    // Check Ghi-Chu file
    const noteFile = zip.file('Ghi-Chu/Tâm Sở Bất Thiện.md');
    expect(noteFile).not.toBeNull();
    const noteContent = await noteFile!.async('string');
    expect(noteContent).toContain('Tâm Sở Bất Thiện');
  });

  it('10. generateObsidianVaultZip dynamically creates domain folders and MOC sections for custom root categories', async () => {
    const customCategories: Category[] = [
      { id: 'cat-root-kinh-te', name: 'Kinh Tế Học', slug: 'kinh-te', type: 'kinh-te', parentId: null },
      { id: 'cat-root-triet-hoc', name: 'Triết Học', slug: 'triet-hoc', type: 'triet-hoc', parentId: null },
    ];
    const customTopics: Topic[] = [
      {
        id: 'topic-kt-1',
        title: 'Kinh Tế Lượng',
        slug: 'kinh-te-luong',
        categoryId: 'cat-root-kinh-te',
        categoryName: 'Kinh Tế Học',
        type: 'kinh-te',
        description: 'Mô hình kinh tế lượng',
        content: 'Nội dung kinh tế...',
        tags: ['kinh-te'],
        links: [],
        createdAt: '2026-08-20T10:00:00Z',
        updatedAt: '2026-08-20T10:00:00Z',
        studyProgress: {
          topicId: 'topic-kt-1',
          status: 'in_progress',
          progress: 50,
          interval: 2,
          easeFactor: 2.5,
          repetitions: 2,
          totalNotes: 0,
          timeSpent: 30,
        },
      },
      {
        id: 'topic-th-1',
        title: 'Hiện Tượng Luận',
        slug: 'hien-tuong-luan',
        categoryId: 'cat-root-triet-hoc',
        categoryName: 'Triết Học',
        type: 'triet-hoc',
        description: 'Hiện tượng luận Edmund Husserl',
        content: 'Nội dung triết học...',
        tags: ['triet-hoc'],
        links: [],
        createdAt: '2026-08-20T10:00:00Z',
        updatedAt: '2026-08-20T10:00:00Z',
        studyProgress: {
          topicId: 'topic-th-1',
          status: 'not_started',
          progress: 0,
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          totalNotes: 0,
          timeSpent: 0,
        },
      },
    ];

    const blob = await generateObsidianVaultZip(customTopics, [], [], customCategories, 'Multi-Domain-Vault');
    const arrayBuffer = await blob.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // MOC must contain dynamic sections and topic links
    const mocFile = zip.file('00_Map_Of_Content.md');
    expect(mocFile).not.toBeNull();
    const mocText = await mocFile!.async('string');
    expect(mocText).toContain('Kinh Tế Học');
    expect(mocText).toContain('Triết Học');
    expect(mocText).toContain('Kinh Tế Lượng');
    expect(mocText).toContain('Hiện Tượng Luận');

    // Folders must exist dynamically
    const ktFile = zip.file('Kinh-Te/Kinh Tế Lượng.md') || zip.file('kinh-te/Kinh Tế Lượng.md');
    expect(ktFile).not.toBeNull();
    const thFile = zip.file('Triet-Hoc/Hiện Tượng Luận.md') || zip.file('triet-hoc/Hiện Tượng Luận.md');
    expect(thFile).not.toBeNull();
  });

  it('11. [C4] normalizeExportTags sanitizes tags: strips hash prefixes, trims whitespace, escapes quotes, deduplicates and filters empty values', () => {
    const rawTags = [
      ' #Abhidharma ',
      'Tâm Sở',
      '#Abhidharma',
      'Tag "Quotes"',
      '   ',
      '',
      null as any,
      undefined as any,
      '##Kỳ Môn',
    ];

    const cleaned = normalizeExportTags(rawTags);

    expect(cleaned).toEqual([
      'Abhidharma',
      'Tâm Sở',
      'Tag \\"Quotes\\"',
      'Kỳ Môn',
    ]);
  });

  it('12. [C4] formatTopicForObsidian sanitizes dirty tags and renders valid YAML frontmatter', () => {
    const dirtyTopic: Topic = {
      ...mockTopicPhatHoc,
      tags: [' #Abhidharma ', 'Tâm Sở', '#Abhidharma', 'Tag "Quotes"', '  '],
    };

    const md = formatTopicForObsidian(dirtyTopic);

    // Frontmatter tags array must be sanitized and quotes escaped
    expect(md).toContain('tags: ["Abhidharma", "Tâm Sở", "Tag \\"Quotes\\""]');
  });

  it('13. [C4] generateObsidianVaultZip groups topics deterministically when categories is empty without hardcoded Buddhist/Esoteric injection', async () => {
    const customTypeTopics: Topic[] = [
      {
        id: 'topic-kt-custom',
        title: 'Kinh Tế Vĩ Mô',
        slug: 'kinh-te-vi-mo',
        type: 'kinh-te',
        categoryName: 'Kinh Tế Học',
        description: 'Tổng quan kinh tế',
        content: 'Nội dung...',
        tags: ['kinh-te'],
        links: [],
        createdAt: '2026-08-20T10:00:00Z',
        updatedAt: '2026-08-20T10:00:00Z',
        studyProgress: {
          topicId: 'topic-kt-custom',
          status: 'in_progress',
          progress: 50,
          interval: 2,
          easeFactor: 2.5,
          repetitions: 2,
          totalNotes: 0,
          timeSpent: 30,
        },
      },
      {
        id: 'topic-tl-custom',
        title: 'Tâm Lý Học Đại Cương',
        slug: 'tam-ly-hoc-dai-cuong',
        type: 'tam-ly',
        categoryName: 'Tâm Lý Học',
        description: 'Tổng quan tâm lý',
        content: 'Nội dung...',
        tags: ['tam-ly'],
        links: [],
        createdAt: '2026-08-20T10:00:00Z',
        updatedAt: '2026-08-20T10:00:00Z',
        studyProgress: {
          topicId: 'topic-tl-custom',
          status: 'not_started',
          progress: 0,
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          totalNotes: 0,
          timeSpent: 0,
        },
      },
    ];

    // Passing empty categories array []
    const blob = await generateObsidianVaultZip(customTypeTopics, [], [], [], 'Empty-Cat-Vault');
    const arrayBuffer = await blob.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // MOC must contain sections derived from topic.type
    const mocFile = zip.file('00_Map_Of_Content.md');
    expect(mocFile).not.toBeNull();
    const mocText = await mocFile!.async('string');

    expect(mocText).toContain('Kinh Tế Học');
    expect(mocText).toContain('Tâm Lý Học');
    expect(mocText).toContain('[[Kinh-Te/Kinh Tế Vĩ Mô|Kinh Tế Vĩ Mô]]');
    expect(mocText).toContain('[[Tam-Ly/Tâm Lý Học Đại Cương|Tâm Lý Học Đại Cương]]');

    // Folders must be generated dynamically from types
    expect(zip.file('Kinh-Te/Kinh Tế Vĩ Mô.md')).not.toBeNull();
    expect(zip.file('Tam-Ly/Tâm Lý Học Đại Cương.md')).not.toBeNull();

    // Must NOT contain empty Phat-Hoc or Huyen-Hoc folders
    const fileKeys = Object.keys(zip.files);
    expect(fileKeys.some((k) => k.startsWith('Phat-Hoc/'))).toBe(false);
    expect(fileKeys.some((k) => k.startsWith('Huyen-Hoc/'))).toBe(false);
  });
});
