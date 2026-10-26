/**
 * Global Academic Command Palette & Scholarly Workflow Router Engine (Phase 12A — ADR-116).
 *
 * Implements:
 * 1. Prefix-Aware Scholarly Query Intent Parser ('citekey', 'doi', 'command', 'semantic', 'general').
 * 2. Scholarly Studio Workflow Action Registry (Phases 1-12 unified router).
 * 3. High-Performance Multi-Entity Omnibox Search & Ranking Engine (<15ms latency).
 *
 * Strictly adheres to Zero-Default Universal Baseline (ADR-076) and Hermetic Test Guard (ADR-077).
 */

import type React from 'react';
import {
  LayoutDashboard,
  FolderTree,
  FileText,
  Library,
  Share2,
  Brain,
  Download,
  Table,
  Sparkles,
  PenTool,
  Bookmark,
  BookOpen,
  Search,
  Quote,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import type { Topic, Note, Resource, ResearchExcerpt } from '../types';
import type { Flashcard } from '../types/flashcard';
import type { CommandPaletteItem, CommandPaletteDisplayCategory } from '../hooks/useCommandPalette';
import { normalizeDoi } from './doiResolver';
import { buildCitekeyRegistry, searchCitekeySuggestions } from './manuscriptCompiler';
import { normalizeScholarText } from './scholarSearch';
import {
  buildSearchableKnowledgeDocuments,
  HybridKnowledgeSearchEngine,
  KnowledgeEntityType,
} from './vectorSearchEngine';

// -----------------------------------------------------------------------------
// Interfaces & Types
// -----------------------------------------------------------------------------

export type AcademicCommandMode = 'general' | 'citekey' | 'doi' | 'command' | 'semantic';

export interface ParsedAcademicQuery {
  rawQuery: string;
  mode: AcademicCommandMode;
  cleanQuery: string;
  extractedDoi?: string;
}

export interface AcademicPaletteResultItem extends CommandPaletteItem {
  badge?: string;
  entityType?: 'command' | 'topic' | 'note' | 'resource' | 'flashcard' | 'excerpt' | 'doi-action';
  entityId?: string;
  citekey?: string;
  score?: number;
}

export interface ScholarlyWorkflowCallbacks {
  onNavigateTab?: (tab: string) => void;
  onOpenTopic?: (topicId: string) => void;
  onOpenNote?: (noteId: string) => void;
  onSelectResource?: (resource: Resource) => void;
  onCopyCitekey?: (citekey: string) => void;
  onLookupDoi?: (doi: string) => void;
  onOpenLiteratureMatrix?: () => void;
  onOpenManuscriptStudio?: () => void;
  onOpenObsidianBridge?: () => void;
  onTriggerQuickBackup?: () => void;
  onOpenFlashcardReview?: () => void;
}

export interface AcademicPaletteSearchData {
  topics?: Topic[];
  notes?: Note[];
  resources?: Resource[];
  flashcards?: Flashcard[];
  excerpts?: ResearchExcerpt[];
  baseCommands?: CommandPaletteItem[];
}

export interface AcademicPaletteSearchOptions {
  limit?: number;
}

// -----------------------------------------------------------------------------
// 1. Prefix-Aware Scholarly Query Intent Parser
// -----------------------------------------------------------------------------

const DOI_REGEX = /\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)\b/;

/**
 * Parses user input in the Command Palette omnibox and classifies it into
 * deterministic scholarly query modes based on prefixes or patterns.
 */
export function parseAcademicCommandQuery(query: string): ParsedAcademicQuery {
  const rawQuery = query || '';
  const trimmed = rawQuery.trim();

  if (!trimmed) {
    return {
      rawQuery,
      mode: 'general',
      cleanQuery: '',
    };
  }

  // 1. Citekey Mode (@...)
  if (trimmed.startsWith('@')) {
    return {
      rawQuery,
      mode: 'citekey',
      cleanQuery: trimmed.slice(1).trim(),
    };
  }

  // 2. Direct DOI Mode (doi:... or standard 10.xxxx/... pattern)
  if (trimmed.toLowerCase().startsWith('doi:') || DOI_REGEX.test(trimmed)) {
    const rawDoiSource = trimmed.toLowerCase().startsWith('doi:')
      ? trimmed.slice(4).trim()
      : trimmed;
    const extractedDoi = normalizeDoi(rawDoiSource);

    if (extractedDoi) {
      return {
        rawQuery,
        mode: 'doi',
        cleanQuery: extractedDoi,
        extractedDoi,
      };
    }
  }

  // 3. Command Mode (>...)
  if (trimmed.startsWith('>')) {
    return {
      rawQuery,
      mode: 'command',
      cleanQuery: trimmed.slice(1).trim(),
    };
  }

  // 4. Semantic / Hybrid Vector Search Mode (?...)
  if (trimmed.startsWith('?')) {
    return {
      rawQuery,
      mode: 'semantic',
      cleanQuery: trimmed.slice(1).trim(),
    };
  }

  // 5. Default General Mode
  return {
    rawQuery,
    mode: 'general',
    cleanQuery: trimmed,
  };
}

// -----------------------------------------------------------------------------
// 2. Scholarly Studio Workflow Action Registry
// -----------------------------------------------------------------------------

/**
 * Builds the comprehensive list of studio actions and navigation routers
 * representing all 12 Phases of the Horizon 1 & Horizon 2 Master Upgrade.
 */
export function buildScholarlyWorkflowActions(
  callbacks: ScholarlyWorkflowCallbacks = {}
): AcademicPaletteResultItem[] {
  const actions: AcademicPaletteResultItem[] = [
    // Phase 8: Literature Review Matrix
    {
      id: 'act-literature-matrix',
      title: 'Mở Ma Trận Tổng Quan Tài Liệu (Literature Review Matrix)',
      description: 'So sánh luận điểm, phương pháp, hạn chế và trích đoạn nghiên cứu (Phase 8 ADR-112)',
      category: 'Hành động nhanh',
      entityType: 'command',
      badge: 'Phase 8',
      icon: Table,
      keywords: ['ma trận', 'matrix', 'literature', 'tổng quan', 'claim', 'synthesis', 'review', 'so sánh'],
      action: () => callbacks.onOpenLiteratureMatrix?.(),
    },
    // Phase 9: Academic Manuscript & Citekey Engine
    {
      id: 'act-manuscript-studio',
      title: 'Mở Phòng Thu Bản Thảo & Citekey Live Registry',
      description: 'Soạn thảo bài báo học thuật, chèn [@citekey], xuất BibTeX & LaTeX (Phase 9 ADR-113)',
      category: 'Hành động nhanh',
      entityType: 'command',
      badge: 'Phase 9',
      icon: PenTool,
      keywords: ['bản thảo', 'manuscript', 'citekey', 'bibtex', 'latex', 'trích dẫn', 'citation', 'soạn thảo'],
      action: () => callbacks.onOpenManuscriptStudio?.(),
    },
    // Phase 10: Graph Intelligence & Semantic Bridges
    {
      id: 'act-graph-insights',
      title: 'Mở Trí Tuệ Đồ Thị & Cầu Nối Ngữ Nghĩa',
      description: 'Xếp hạng PageRank, phát hiện chủ đề cô lập & gợi ý liên kết tự động (Phase 10 ADR-114)',
      category: 'Hành động nhanh',
      entityType: 'command',
      badge: 'Phase 10',
      icon: Share2,
      keywords: ['đồ thị', 'graph', 'pagerank', 'centrality', 'cầu nối', 'bridge', 'semantic', 'orphan', 'trí tuệ'],
      action: () => callbacks.onNavigateTab?.('mindmap'),
    },
    // Phase 11: Obsidian Dataview & E-Ink Study Pack Bridge
    {
      id: 'act-obsidian-eink-bridge',
      title: 'Mở Cầu Nối Obsidian Dataview & Gói Đọc E-Ink',
      description: 'Đồng bộ hai chiều với Obsidian Vault và xuất Study Pack cho màn hình E-Ink (Phase 11 ADR-115)',
      category: 'Hành động nhanh',
      entityType: 'command',
      badge: 'Phase 11',
      icon: Download,
      keywords: ['obsidian', 'e-ink', 'eink', 'boox', 'dataview', 'study pack', 'vault', 'đồng bộ', 'sync'],
      action: () => callbacks.onOpenObsidianBridge?.(),
    },
    // Phase 6: Guarded Snapshot Backup
    {
      id: 'act-guarded-backup-snapshot',
      title: 'Tạo Snapshot Sao Lưu Tự Động Toàn Cục Ngay',
      description: 'Kích hoạt snapshot có bảo vệ và khóa an toàn 7 ngày (Phase 6 ADR-110)',
      category: 'Hành động nhanh',
      entityType: 'command',
      badge: 'Phase 6',
      icon: ShieldCheck,
      keywords: ['sao lưu', 'backup', 'snapshot', 'an toàn', 'khôi phục', 'restore', 'guarded'],
      action: () => callbacks.onTriggerQuickBackup?.(),
    },
    // Phase 3: FSRS v5 Spaced Repetition Review
    {
      id: 'act-fsrs-review-studio',
      title: 'Khởi Động Phòng Thu Ôn Tập Thẻ Nhớ FSRS v5',
      description: 'Ôn tập kiến thức với thuật toán lặp lại ngắt quãng DSR hiện đại (Phase 3 ADR-107)',
      category: 'Hành động nhanh',
      entityType: 'command',
      badge: 'FSRS v5',
      icon: Brain,
      keywords: ['ôn tập', 'review', 'fsrs', 'flashcard', 'spaced repetition', 'thẻ nhớ', 'lặp lại'],
      action: () => callbacks.onOpenFlashcardReview?.(),
    },
    // Phase 5: Grounded Local RAG Assistant
    {
      id: 'act-ai-grounded-rag',
      title: 'Mở Trợ Lý Tri Thức Cục Bộ Grounded RAG',
      description: 'Hỏi đáp ngữ nghĩa minh bạch với trích dẫn minh chứng [^SRC-N] (Phase 5 ADR-109)',
      category: 'Hành động nhanh',
      entityType: 'command',
      badge: 'Phase 5',
      icon: Sparkles,
      keywords: ['rag', 'ai', 'trợ lý', 'grounded', 'trích dẫn', 'semantic', 'hỏi đáp', 'ngữ nghĩa'],
      action: () => callbacks.onNavigateTab?.('research-assistant'),
    },
    // Standard Workspace Navigation Routers
    {
      id: 'nav-dashboard',
      title: 'Bàn Làm Việc Tổng Quan (Dashboard)',
      description: 'Xem tiến độ học tập, hàng đợi ôn tập và thống kê nghiên cứu',
      category: 'Điều hướng',
      entityType: 'command',
      badge: 'Tab',
      icon: LayoutDashboard,
      keywords: ['bàn làm việc', 'dashboard', 'tổng quan', 'home', 'trang chủ'],
      action: () => callbacks.onNavigateTab?.('dashboard'),
    },
    {
      id: 'nav-topics',
      title: 'Cây Phân Cấp Chủ Đề (Topics Explorer)',
      description: 'Duyệt các lĩnh vực nghiên cứu và chủ đề chuyên sâu',
      category: 'Điều hướng',
      entityType: 'command',
      badge: 'Tab',
      icon: FolderTree,
      keywords: ['chủ đề', 'topics', 'lĩnh vực', 'chuyên mục', 'explorer'],
      action: () => callbacks.onNavigateTab?.('topics'),
    },
    {
      id: 'nav-notes',
      title: 'Sổ Tay Ghi Chú Nghiên Cứu (Notes Manager)',
      description: 'Quản lý toàn bộ ghi chú học thuật, tóm tắt và trích đoạn',
      category: 'Điều hướng',
      entityType: 'command',
      badge: 'Tab',
      icon: FileText,
      keywords: ['ghi chú', 'notes', 'sổ tay', 'bài viết'],
      action: () => callbacks.onNavigateTab?.('notes'),
    },
    {
      id: 'nav-resources',
      title: 'Kho Tài Liệu Nghiên Cứu (Resources Library)',
      description: 'Quản lý tài liệu PDF, EPUB, tra cứu DOI và trích dẫn',
      category: 'Điều hướng',
      entityType: 'command',
      badge: 'Tab',
      icon: Library,
      keywords: ['tài liệu', 'resources', 'pdf', 'epub', 'doi', 'sách', 'bài báo'],
      action: () => callbacks.onNavigateTab?.('resources'),
    },
    {
      id: 'nav-mindmap',
      title: 'Đồ Thị Tri Thức & Sơ Đồ Tư Duy (Mindmap / Graph)',
      description: 'Khảo sát liên kết ngữ nghĩa và cấu trúc mạng lưới tri thức',
      category: 'Điều hướng',
      entityType: 'command',
      badge: 'Tab',
      icon: Share2,
      keywords: ['đồ thị', 'sơ đồ', 'mindmap', 'graph', 'liên kết'],
      action: () => callbacks.onNavigateTab?.('mindmap'),
    },
  ];

  return actions;
}

// -----------------------------------------------------------------------------
// 3. Unified Omnibox Search & Ranking Engine
// -----------------------------------------------------------------------------

function scoreTextMatch(text: string, queryNorm: string): number {
  if (!text || !queryNorm) return 0;
  const norm = normalizeScholarText(text);
  if (norm === queryNorm) return 100;
  if (norm.startsWith(queryNorm)) return 80;
  if (norm.includes(queryNorm)) return 60;
  return 0;
}

/**
 * Searches across the command palette using the parsed query intent mode.
 */
export function searchAcademicCommandPalette(
  query: string,
  data: AcademicPaletteSearchData = {},
  callbacks: ScholarlyWorkflowCallbacks = {},
  options: AcademicPaletteSearchOptions = {}
): AcademicPaletteResultItem[] {
  const { limit = 25 } = options;
  const {
    topics = [],
    notes = [],
    resources = [],
    flashcards = [],
    excerpts = [],
    baseCommands = [],
  } = data;

  const parsed = parseAcademicCommandQuery(query);
  const workflowActions = buildScholarlyWorkflowActions(callbacks);
  const allCommands = [...workflowActions, ...(baseCommands as AcademicPaletteResultItem[])];

  // A. Empty / Whitespace Query -> Return default workflow actions
  if (!parsed.cleanQuery && parsed.mode === 'general') {
    return allCommands.slice(0, limit);
  }

  const cleanNorm = normalizeScholarText(parsed.cleanQuery);

  // B. Citekey Mode (@key)
  if (parsed.mode === 'citekey') {
    const registry = buildCitekeyRegistry(resources);
    const suggestions = searchCitekeySuggestions(registry, parsed.cleanQuery);

    return suggestions.slice(0, limit).map((entry) => ({
      id: `citekey-${entry.citekey}`,
      title: entry.resource.title,
      description: `${entry.authorLastName} (${entry.year}) • Mã trích dẫn: @${entry.citekey}`,
      category: 'Hành động nhanh',
      entityType: 'resource',
      entityId: entry.resource.id,
      citekey: entry.citekey,
      badge: `@${entry.citekey}`,
      icon: Bookmark,
      action: () => {
        callbacks.onSelectResource?.(entry.resource);
        callbacks.onCopyCitekey?.(entry.citekey);
      },
    }));
  }

  // C. DOI Mode (doi:... or 10.xxxx/...)
  if (parsed.mode === 'doi') {
    const results: AcademicPaletteResultItem[] = [];
    const doi = parsed.extractedDoi || parsed.cleanQuery;

    // Primary action: Lookup DOI
    results.push({
      id: `act-doi-lookup-${doi}`,
      title: `Tra cứu & Nạp Siêu Dữ Liệu DOI: ${doi}`,
      description: 'Tự động truy vấn siêu dữ liệu CrossRef để nạp bài báo vào hệ thống (Phase 2 ADR-106)',
      category: 'Hành động nhanh',
      entityType: 'doi-action',
      badge: 'DOI',
      icon: Search,
      action: () => callbacks.onLookupDoi?.(doi),
    });

    // Check if DOI already matches any resource in workspace
    const existing = resources.filter(
      (r) => r.doi && normalizeDoi(r.doi) === normalizeDoi(doi)
    );
    existing.forEach((res) => {
      results.push({
        id: `doi-res-${res.id}`,
        title: res.title,
        description: `Tài liệu đã có trong kho • Tác giả: ${res.author || 'Chưa rõ'} (${res.year || ''})`,
        category: 'Hành động nhanh',
        entityType: 'resource',
        entityId: res.id,
        badge: 'Đã lưu',
        icon: BookOpen,
        action: () => callbacks.onSelectResource?.(res),
      });
    });

    return results.slice(0, limit);
  }

  // D. Command Mode (>command)
  if (parsed.mode === 'command') {
    const matched = allCommands
      .map((cmd) => {
        let score = scoreTextMatch(cmd.title, cleanNorm);
        if (cmd.description) {
          score = Math.max(score, scoreTextMatch(cmd.description, cleanNorm) * 0.7);
        }
        if (cmd.keywords) {
          for (const k of cmd.keywords) {
            score = Math.max(score, scoreTextMatch(k, cleanNorm) * 0.85);
          }
        }
        return { item: cmd, score };
      })
      .filter((x) => x.score > 0 || !cleanNorm)
      .sort((a, b) => b.score - a.score);

    return matched.map((x) => x.item).slice(0, limit);
  }

  // E. Semantic Mode (?semantic)
  if (parsed.mode === 'semantic') {
    const docs = buildSearchableKnowledgeDocuments({
      topics,
      notes,
      resources,
      flashcards,
      excerpts,
    });

    if (docs.length === 0) return [];

    const hybridEngine = new HybridKnowledgeSearchEngine(docs);
    const searchResults = hybridEngine.search(parsed.cleanQuery, {
      mode: 'semantic',
      limit,
    });

    return searchResults.map((res) => {
      const doc = res.document;
      let category: CommandPaletteDisplayCategory = 'Hành động nhanh';
      let icon = Sparkles;
      let action = () => {};

      if (doc.type === 'topic') {
        category = 'Chủ đề';
        icon = FolderTree;
        action = () => callbacks.onOpenTopic?.(doc.entityId);
      } else if (doc.type === 'note') {
        category = 'Ghi chú';
        icon = FileText;
        action = () => callbacks.onOpenNote?.(doc.entityId);
      } else if (doc.type === 'resource') {
        category = 'Hành động nhanh';
        icon = Library;
        const targetRes = resources.find((r) => r.id === doc.entityId);
        action = () => targetRes && callbacks.onSelectResource?.(targetRes);
      } else if (doc.type === 'flashcard') {
        category = 'Hành động nhanh';
        icon = Brain;
        action = () => callbacks.onOpenFlashcardReview?.();
      } else if (doc.type === 'excerpt') {
        category = 'Hành động nhanh';
        icon = Quote;
      }

      const scorePct = Math.round(res.rrfScore * 100);
      const badge = scorePct > 0 ? `RRF ${scorePct}%` : 'Semantic';

      return {
        id: `semantic-${doc.id}`,
        title: doc.title,
        description: doc.content.slice(0, 120),
        category,
        entityType: doc.type,
        entityId: doc.entityId,
        badge,
        icon,
        action,
        score: res.rrfScore,
      };
    });
  }

  // F. General Mode (Hybrid multi-entity keyword ranking)
  const results: AcademicPaletteResultItem[] = [];

  // 1. Check command actions
  allCommands.forEach((cmd) => {
    let score = scoreTextMatch(cmd.title, cleanNorm);
    if (cmd.description) {
      score = Math.max(score, scoreTextMatch(cmd.description, cleanNorm) * 0.7);
    }
    if (cmd.keywords) {
      for (const k of cmd.keywords) {
        score = Math.max(score, scoreTextMatch(k, cleanNorm) * 0.85);
      }
    }
    if (score > 0) {
      results.push({ ...cmd, score: score + 10 }); // slight boost for explicit actions
    }
  });

  // 2. Check Topics
  topics.forEach((t) => {
    let score = scoreTextMatch(t.title, cleanNorm);
    if (t.description) {
      score = Math.max(score, scoreTextMatch(t.description, cleanNorm) * 0.6);
    }
    if (t.tags) {
      for (const tag of t.tags) {
        score = Math.max(score, scoreTextMatch(tag, cleanNorm) * 0.8);
      }
    }
    if (score > 0) {
      results.push({
        id: `topic-${t.id}`,
        title: t.title,
        description: t.description || `Lĩnh vực: ${t.categoryName || t.type}`,
        category: 'Chủ đề',
        entityType: 'topic',
        entityId: t.id,
        badge: t.categoryName || 'Chủ đề',
        icon: FolderTree,
        action: () => callbacks.onOpenTopic?.(t.id),
        score,
      });
    }
  });

  // 3. Check Notes
  notes.forEach((n) => {
    let score = scoreTextMatch(n.title, cleanNorm);
    if (n.content) {
      score = Math.max(score, scoreTextMatch(n.content, cleanNorm) * 0.5);
    }
    if (score > 0) {
      results.push({
        id: `note-${n.id}`,
        title: n.title,
        description: n.content ? n.content.slice(0, 100) : n.topicTitle,
        category: 'Ghi chú',
        entityType: 'note',
        entityId: n.id,
        badge: n.type || 'Ghi chú',
        icon: FileText,
        action: () => callbacks.onOpenNote?.(n.id),
        score,
      });
    }
  });

  // 4. Check Resources (including citekeys)
  const registry = buildCitekeyRegistry(resources);
  for (const entry of registry.values()) {
    const res = entry.resource;
    let score = scoreTextMatch(res.title, cleanNorm);
    if (res.author) {
      score = Math.max(score, scoreTextMatch(res.author, cleanNorm) * 0.8);
    }
    score = Math.max(score, scoreTextMatch(entry.citekey, cleanNorm) * 0.9);

    if (score > 0) {
      results.push({
        id: `res-${res.id}`,
        title: res.title,
        description: `${entry.authorLastName} (${entry.year}) • @${entry.citekey}`,
        category: 'Hành động nhanh',
        entityType: 'resource',
        entityId: res.id,
        citekey: entry.citekey,
        badge: `@${entry.citekey}`,
        icon: BookOpen,
        action: () => {
          callbacks.onSelectResource?.(res);
          callbacks.onCopyCitekey?.(entry.citekey);
        },
        score,
      });
    }
  }

  // 5. Check Flashcards & Excerpts
  flashcards.forEach((fc) => {
    let score = scoreTextMatch(fc.front, cleanNorm);
    if (fc.back) {
      score = Math.max(score, scoreTextMatch(fc.back, cleanNorm) * 0.6);
    }
    if (score > 0) {
      results.push({
        id: `fc-${fc.id}`,
        title: fc.front,
        description: fc.back.slice(0, 80),
        category: 'Hành động nhanh',
        entityType: 'flashcard',
        entityId: fc.id,
        badge: 'FSRS',
        icon: Brain,
        action: () => callbacks.onOpenFlashcardReview?.(),
        score: score * 0.8,
      });
    }
  });

  excerpts.forEach((exc) => {
    let score = scoreTextMatch(exc.selectedText, cleanNorm);
    if (exc.userNote) {
      score = Math.max(score, scoreTextMatch(exc.userNote, cleanNorm) * 0.7);
    }
    if (score > 0) {
      const pageStr = exc.positionSelector?.pageNumber
        ? `Trang ${exc.positionSelector.pageNumber}`
        : 'Trích đoạn';
      results.push({
        id: `exc-${exc.id}`,
        title: `Trích dẫn: ${exc.selectedText.slice(0, 60)}...`,
        description: exc.userNote || exc.selectedText.slice(0, 100),
        category: 'Hành động nhanh',
        entityType: 'excerpt',
        entityId: exc.id,
        badge: pageStr,
        icon: Quote,
        action: () => {},
        score: score * 0.7,
      });
    }
  });

  // Sort by score descending
  results.sort((a, b) => (b.score || 0) - (a.score || 0));

  return results.slice(0, limit);
}
