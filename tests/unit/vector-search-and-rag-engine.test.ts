import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeLocalEmbedding,
  cosineSimilarity,
  HybridKnowledgeSearchEngine,
  buildSearchableKnowledgeDocuments,
  retrieveGroundedContextForQuery,
  KnowledgeSearchDocument,
} from '../../src/lib/vectorSearchEngine';
import { Note, Resource, Topic, ResearchExcerpt } from '../../src/types';
import { Flashcard } from '../../src/types/flashcard';

describe('Phase 5A: Vector Search, Hybrid RRF & Grounded RAG Engine', () => {
  describe('computeLocalEmbedding & cosineSimilarity', () => {
    it('generates a 128-dimensional Float32Array with unit Euclidean norm (~1.0)', () => {
      const text = 'Cơ chế củng cố trí nhớ dài hạn và đường cong quên';
      const vector = computeLocalEmbedding(text);

      expect(vector).toBeInstanceOf(Float32Array);
      expect(vector.length).toBe(128);

      // Verify L2 norm = sqrt(sum(v_i^2)) ≈ 1.0
      let sumSq = 0;
      for (let i = 0; i < vector.length; i++) {
        sumSq += vector[i] * vector[i];
      }
      const norm = Math.sqrt(sumSq);
      expect(norm).toBeCloseTo(1.0, 3);
    });

    it('returns cosine similarity 1.0 for identical text and handles zero vector safely', () => {
      const text = 'Thuật toán lặp lại ngắt quãng FSRS v5';
      const v1 = computeLocalEmbedding(text);
      const v2 = computeLocalEmbedding(text);

      const sim = cosineSimilarity(v1, v2);
      expect(sim).toBeCloseTo(1.0, 4);

      // Empty text returns zero vector and similarity 0
      const emptyVec = computeLocalEmbedding('');
      expect(cosineSimilarity(v1, emptyVec)).toBe(0);
    });

    it('exhibits higher semantic similarity for related academic concepts across English and Vietnamese than unrelated topics', () => {
      const vnMemory = computeLocalEmbedding('Cơ chế củng cố trí nhớ dài hạn và đường cong quên trong học tập');
      const enMemory = computeLocalEmbedding('Memory retention and forgetting curve in spaced repetition learning');
      const metallurgy = computeLocalEmbedding('Phản ứng nhiệt nhôm và luyện gang thép trong lò cao luyện kim');

      const simRelated = cosineSimilarity(vnMemory, enMemory);
      const simUnrelated = cosineSimilarity(vnMemory, metallurgy);

      expect(simRelated).toBeGreaterThan(0.35);
      expect(simRelated).toBeGreaterThan(simUnrelated + 0.2);
    });
  });

  describe('HybridKnowledgeSearchEngine with BM25, Semantic & RRF', () => {
    const mockTopics: Topic[] = [
      {
        id: 'top-1',
        title: 'Khoa Học Trí Nhớ & Học Tập',
        slug: 'khoa-hoc-tri-nho',
        description: 'Nghiên cứu về cơ chế ghi nhớ, lặp lại ngắt quãng và đường cong lãng quên.',
        categoryId: 'cat-1',
        type: 'default',
        content: '',
        tags: [],
        links: [],
        studyProgress: {
          topicId: 'top-1',
          status: 'in_progress' as const,
          progress: 50,
          interval: 1,
          easeFactor: 2.5,
          repetitions: 1,
          totalNotes: 2,
          timeSpent: 60,
        },
        visibility: 'active',
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
    ];

    const mockNotes: Note[] = [
      {
        id: 'note-1',
        title: 'Nguyên lý Spaced Repetition',
        content: 'Khoảng cách ôn tập dựa trên độ ổn định (Stability) và độ khó (Difficulty) của ký ức.',
        topicId: 'top-1',
        type: 'study',
        isPrivate: false,
        tags: ['memory', 'fsrs'],
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
      {
        id: 'note-2',
        title: 'Luyện kim công nghiệp',
        content: 'Quy trình khử oxit sắt bằng khí CO ở nhiệt độ cao trong lò luyện kim.',
        topicId: 'top-1',
        type: 'study',
        isPrivate: false,
        tags: ['chemistry'],
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
    ];

    const mockResources: Resource[] = [
      {
        id: 'res-1',
        title: 'Tài liệu Nghiên cứu Thuật toán FSRS v5',
        type: 'pdf',
        topicId: 'top-1',
        author: 'Jarrett Ye',
        notes: 'Mô hình ba thành phần DSR tối ưu hóa khoảng cách ôn tập học thuật.',
        url: '/api/archive/file/fsrs.pdf',
        createdAt: '2026-10-01T00:00:00.000Z',
      },
    ];

    const mockCards: Flashcard[] = [
      {
        id: 'card-1',
        front: 'Đường cong Ebbinghaus mô tả điều gì?',
        back: 'Tốc độ suy giảm trí nhớ theo hàm số mũ thời gian nếu không có ôn tập.',
        topicId: 'top-1',
        type: 'basic',
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
    ];

    const mockExcerpts: ResearchExcerpt[] = [
      {
        id: 'exc-1',
        archivedDocumentId: 'res-1',
        selectedText: 'Retrievability decay adheres to a power-law retention curve over time.',
        highlightColor: '#bbf7d0',
        positionSelector: { pageNumber: 3 },
        status: 'active',
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
    ];

    it('buildSearchableKnowledgeDocuments correctly indexes all 5 knowledge entity types', () => {
      const docs = buildSearchableKnowledgeDocuments({
        topics: mockTopics,
        notes: mockNotes,
        resources: mockResources,
        flashcards: mockCards,
        excerpts: mockExcerpts,
      });

      expect(docs.length).toBe(6); // 1 topic + 2 notes + 1 resource + 1 card + 1 excerpt
      const types = docs.map((d) => d.type);
      expect(types).toContain('topic');
      expect(types).toContain('note');
      expect(types).toContain('resource');
      expect(types).toContain('flashcard');
      expect(types).toContain('excerpt');

      const excerptDoc = docs.find((d) => d.type === 'excerpt');
      expect(excerptDoc?.metadata?.pageNumber).toBe(3);
    });

    it('search in "keyword" mode scores via Okapi BM25 with exact token matches', () => {
      const docs = buildSearchableKnowledgeDocuments({ notes: mockNotes, resources: mockResources });
      const engine = new HybridKnowledgeSearchEngine(docs);

      const results = engine.search('oxit sắt lò luyện kim', { mode: 'keyword' });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].document.entityId).toBe('note-2');
      expect(results[0].bm25Score).toBeGreaterThan(0);
    });

    it('search in "semantic" mode surfaces conceptually related documents without exact vocabulary overlap', () => {
      const docs = buildSearchableKnowledgeDocuments({
        notes: mockNotes,
        resources: mockResources,
        flashcards: mockCards,
        excerpts: mockExcerpts,
      });
      const engine = new HybridKnowledgeSearchEngine(docs);

      // Query in Vietnamese about memory decay / retention
      const results = engine.search('suy giảm trí nhớ và khoảng cách thời gian ôn tập', { mode: 'semantic' });
      expect(results.length).toBeGreaterThan(0);

      // Metallurgy note should not be in top results
      const topEntityIds = results.slice(0, 3).map((r) => r.document.entityId);
      expect(topEntityIds).not.toContain('note-2');
      expect(results[0].semanticScore).toBeGreaterThan(0.3);
    });

    it('search in "hybrid" mode calculates Reciprocal Rank Fusion (RRF) combining BM25 and Semantic rank', () => {
      const docs = buildSearchableKnowledgeDocuments({
        notes: mockNotes,
        resources: mockResources,
        flashcards: mockCards,
        excerpts: mockExcerpts,
      });
      const engine = new HybridKnowledgeSearchEngine(docs);

      const results = engine.search('Spaced Repetition FSRS', { mode: 'hybrid' });
      expect(results.length).toBeGreaterThan(0);

      const topResult = results[0];
      expect(topResult.rrfScore).toBeGreaterThan(0);
      expect(topResult.bm25Score).toBeGreaterThanOrEqual(0);
      expect(topResult.semanticScore).toBeGreaterThanOrEqual(0);

      // Verify descending order of rrfScore
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].rrfScore).toBeGreaterThanOrEqual(results[i].rrfScore);
      }
    });
  });

  describe('retrieveGroundedContextForQuery (RAG Retrieval Pipeline)', () => {
    const data = {
      topics: [
        {
          id: 'top-ai',
          title: 'Trí Tuệ Nhân Tạo & Mô Hình Ngôn Ngữ',
          slug: 'tri-tue-nhan-tao',
          description: 'Khái niệm về Transformer, Attention và kỹ thuật Retrieval-Augmented Generation.',
          categoryId: 'cat-tech',
          type: 'default',
          content: '',
          tags: [],
          links: [],
          studyProgress: {
            topicId: 'top-ai',
            status: 'in_progress' as const,
            progress: 30,
            interval: 1,
            easeFactor: 2.5,
            repetitions: 1,
            totalNotes: 1,
            timeSpent: 20,
          },
          visibility: 'active' as const,
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
        },
      ],
      notes: [
        {
          id: 'note-rag',
          title: 'Kỹ thuật RAG Grounding',
          content: 'RAG giúp giảm thiểu hiện tượng ảo giác (hallucination) bằng cách cấp chứng cứ từ tài liệu cục bộ.',
          topicId: 'top-ai',
          type: 'study' as const,
          isPrivate: false,
          tags: ['rag', 'ai'],
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
        },
      ],
      resources: [
        {
          id: 'res-rag-paper',
          title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
          type: 'pdf' as const,
          topicId: 'top-ai',
          author: 'Patrick Lewis et al.',
          notes: 'Bài báo nền tảng đề xuất mô hình RAG kết hợp parametric và non-parametric memory.',
          url: '/api/archive/file/rag_paper.pdf',
          createdAt: '2026-10-01T00:00:00.000Z',
        },
      ],
      excerpts: [
        {
          id: 'exc-rag-quote',
          archivedDocumentId: 'res-rag-paper',
          selectedText: 'Parametric memory is pre-trained seq2seq while non-parametric memory is dense vector retrieval.',
          highlightColor: '#bae6fd',
          positionSelector: { pageNumber: 2 },
          status: 'active' as const,
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
        },
      ],
    };

    it('retrieves top-K evidence chunks with sequential [^SRC-N] citation markers and XML prompt block', () => {
      const bundle = retrieveGroundedContextForQuery('làm sao giảm hallucination trong mô hình ngôn ngữ bằng RAG', data, {
        topK: 3,
        minSimilarity: 0.1,
      });

      expect(bundle.query).toBe('làm sao giảm hallucination trong mô hình ngôn ngữ bằng RAG');
      expect(bundle.chunks.length).toBeGreaterThan(0);
      expect(bundle.chunks.length).toBeLessThanOrEqual(3);

      // Citation markers must be sequential [^SRC-1], [^SRC-2], ...
      bundle.chunks.forEach((chunk, index) => {
        expect(chunk.citationMarker).toBe(`[^SRC-${index + 1}]`);
        expect(chunk.similarityScore).toBeGreaterThan(0);
        expect(chunk.title).toBeTruthy();
        expect(chunk.snippet).toBeTruthy();
      });

      // Formatted prompt context must wrap chunks cleanly
      expect(bundle.formattedPromptContext).toContain('<grounded_knowledge_context>');
      expect(bundle.formattedPromptContext).toContain('</grounded_knowledge_context>');
      expect(bundle.formattedPromptContext).toContain('[^SRC-1]');
    });

    it('returns empty bundle gracefully when query is blank or no documents match', () => {
      const emptyBundle = retrieveGroundedContextForQuery('', data);
      expect(emptyBundle.chunks).toEqual([]);
      expect(emptyBundle.formattedPromptContext).toBe('');
      expect(emptyBundle.totalSources).toBe(0);
    });
  });
});
