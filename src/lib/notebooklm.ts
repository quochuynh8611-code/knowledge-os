import { Topic, Note, Resource, ResearchExcerpt } from '../types';

export type NotebookLMArtifactType =
  | 'source_pack'
  | 'study_guide'
  | 'briefing_doc'
  | 'audio_overview_summary'
  | 'faq'
  | 'dialectic_matrix'
  | 'socratic_inquiry'
  | 'mindmap_outline';

export type ArtifactSource = 'antigravity-2.0' | 'manual';
export type ArtifactTarget = 'notebooklm' | 'general';
export type ArtifactStatus = 'draft' | 'processed' | 'imported';

export interface NotebookLMArtifact {
  id: string;
  topicId: string;
  type: NotebookLMArtifactType;
  title: string;
  content: string;
  notebookUrl?: string;
  createdAt: string;
  source?: ArtifactSource;
  target?: ArtifactTarget;
  status?: ArtifactStatus;
  idempotencyKey?: string | null;
  contentHash?: string | null;
}

export interface SourceMetrics {
  wordCount: number;
  estimatedTokens: number;
  characterCount: number;
  readingTimeMinutes: number;
  capacityStatus: 'optimal' | 'moderate' | 'heavy';
  isEstimate?: boolean;
}

export interface AnyArtifactLike {
  id?: string;
  idempotencyKey?: string | null;
  contentHash?: string | null;
  topicId?: string;
  type?: string;
  artifactType?: string;
  title?: string;
  content?: string;
  rawContent?: string;
  [key: string]: any;
}

/**
 * Computes a deterministic content hash from topicId, artifactType, title, and content.
 * Does not use Math.random().
 */
export function computeArtifactContentHash(artifact: {
  topicId?: string;
  artifactType?: string;
  type?: string;
  title?: string;
  content?: string;
  rawContent?: string;
}): string {
  const tId = (artifact.topicId || '').trim();
  const aType = (artifact.artifactType || artifact.type || '').trim();
  const title = (artifact.title || '').trim();
  const content = (artifact.rawContent || artifact.content || '').trim();
  const payload = `${tId}:::${aType}:::${title}:::${content}`;

  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `hash-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * Deduplicates and merges artifacts using precedence:
 * 1. id if present
 * 2. idempotencyKey if present
 * 3. contentHash if present (or computed deterministic hash)
 * 
 * Never uses title as identifier. Two artifacts with same title but different
 * id/idempotencyKey/contentHash are both kept and counted as 2.
 * Pure function: does not mutate input arrays.
 */
export function deduplicateArtifacts<
  T extends AnyArtifactLike = AnyArtifactLike,
  U extends AnyArtifactLike = T
>(
  primaryArtifacts: T[] = [],
  secondaryArtifacts: U[] = []
): {
  mergedArtifacts: (T | U)[];
  count: number;
} {
  const merged: (T | U)[] = [];
  const seenIds = new Set<string>();
  const seenIdempotencyKeys = new Set<string>();
  const seenContentHashes = new Set<string>();

  const processItem = (item: T | U) => {
    if (!item) return;

    // Check precedence 1: id
    if (item.id && seenIds.has(item.id)) {
      return;
    }

    // Check precedence 2: idempotencyKey
    if (item.idempotencyKey && seenIdempotencyKeys.has(item.idempotencyKey)) {
      return;
    }

    // Check precedence 3: contentHash
    const hash = item.contentHash || computeArtifactContentHash(item);
    if (hash && seenContentHashes.has(hash)) {
      return;
    }

    // Record keys
    if (item.id) seenIds.add(item.id);
    if (item.idempotencyKey) seenIdempotencyKeys.add(item.idempotencyKey);
    if (hash) seenContentHashes.add(hash);

    merged.push(item);
  };

  for (const item of primaryArtifacts) {
    processItem(item);
  }
  for (const item of secondaryArtifacts) {
    processItem(item);
  }

  return {
    mergedArtifacts: merged,
    count: merged.length,
  };
}

export const NOTEBOOKLM_STORAGE_KEY = 'phat_hoc_notebooklm_artifacts_v1';

export function getStoredArtifacts(): NotebookLMArtifact[] {
  try {
    const saved = localStorage.getItem(NOTEBOOKLM_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      ...item,
      source: item.source || 'antigravity-2.0',
      target: item.target || 'notebooklm',
      status: item.status || 'imported',
    }));
  } catch {
    return [];
  }
}

export function saveArtifact(
  artifact: Omit<NotebookLMArtifact, 'id' | 'createdAt'>
): NotebookLMArtifact {
  const newArtifact: NotebookLMArtifact = {
    ...artifact,
    id: `artifact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    source: artifact.source || 'antigravity-2.0',
    target: artifact.target || 'notebooklm',
    status: artifact.status || 'imported',
  };
  const list = getStoredArtifacts();
  list.unshift(newArtifact);
  try {
    localStorage.setItem(NOTEBOOKLM_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to store NotebookLM artifact', e);
  }
  return newArtifact;
}

export function deleteArtifact(id: string): void {
  const list = getStoredArtifacts().filter((a) => a.id !== id);
  try {
    localStorage.setItem(NOTEBOOKLM_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to delete NotebookLM artifact', e);
  }
}

/**
 * Ước lượng số từ, số token và tình trạng dung lượng tài liệu nguồn cho NotebookLM.
 * Tham số maxTokens mặc định 500,000 (NotebookLM standard capacity).
 */
export function estimateSourceMetrics(
  content: string,
  maxTokens: number = 500000
): SourceMetrics {
  const text = (content || '').trim();
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const characterCount = text.length;
  // Ước tính hệ số token trung bình cho tiếng Việt/Anh học thuật: ~1.35 tokens/từ
  const estimatedTokens = Math.round(words * 1.35);
  const readingTimeMinutes = Math.max(0, Math.round(words / 200));

  // Fail-closed guard: nếu maxTokens không hợp lệ (<= 0, NaN, hoặc non-number), fail-closed về 'heavy'
  if (typeof maxTokens !== 'number' || isNaN(maxTokens) || maxTokens <= 0) {
    return {
      wordCount: words,
      estimatedTokens,
      characterCount,
      readingTimeMinutes,
      capacityStatus: 'heavy',
      isEstimate: true,
    };
  }

  const ratio = estimatedTokens / maxTokens;
  let capacityStatus: 'optimal' | 'moderate' | 'heavy' = 'optimal';
  if (ratio > 0.8) {
    capacityStatus = 'heavy';
  } else if (ratio > 0.5) {
    capacityStatus = 'moderate';
  }

  return {
    wordCount: words,
    estimatedTokens,
    characterCount,
    readingTimeMinutes,
    capacityStatus,
    isEstimate: true,
  };
}

/**
 * Đóng gói chủ đề thành Tài liệu Nguồn khảo cứu chuẩn hóa (Source Document)
 * Hỗ trợ tự động gom 6 phân đoạn: Định vị, Luận thuyết, Đồ thị 1-hop, Ghi chú, Thư tịch, và Trích đoạn sách.
 */
export function packageSourceForNotebookLM(
  topic: Topic,
  notes: Note[] = [],
  resources: Resource[] = [],
  excerpts: ResearchExcerpt[] = []
): string {
  const topicNotes = (notes || []).filter((n) => n.topicId === topic.id);
  const topicResources = (resources || []).filter((r) => r.topicId === topic.id);
  const topicExcerpts = (excerpts || []).filter((e) => e.topicId === topic.id);

  const domainLabel = (topic.categoryName || topic.type || 'KHÁC').toUpperCase();

  let doc = `================================================================================\n`;
  doc += `TÀI LIỆU NGUỒN KHẢO CỨU (NOTEBOOKLM SOURCE DOCUMENT)\n`;
  doc += `CHỦ ĐỀ: ${topic.title.toUpperCase()}\n`;
  doc += `LĨNH VỰC: ${domainLabel}\n`;
  doc += `PHÂN LOẠI: ${topic.categoryName || topic.categoryId}\n`;
  doc += `NGÀY ĐÓNG GÓI: ${new Date().toLocaleDateString('vi-VN')}\n`;
  doc += `================================================================================\n\n`;

  doc += `[PHẦN 1: TÓM TẮT ĐỊNH VỊ KHÁI NIỆM]\n`;
  doc += `${topic.description}\n\n`;

  doc += `[PHẦN 2: NỘI DUNG LUẬN THUYẾT & NGUYÊN BẢN KINH ĐIỂN]\n`;
  doc += `${topic.content}\n\n`;

  if (topic.links && topic.links.length > 0) {
    doc += `[PHẦN 3: CÁC MỐI LIÊN HỆ ĐỐI CHIẾU TRI THỨC]\n`;
    topic.links.forEach((l, idx) => {
      doc += `${idx + 1}. Mối liên hệ "${l.linkType.toUpperCase()}" với chủ đề: ${l.targetTitle || 'Chủ đề khác'}\n`;
      if (l.notes) doc += `   - Luận cứ: ${l.notes}\n`;
    });
    doc += '\n';
  }

  if (topicNotes.length > 0) {
    doc += `[PHẦN 4: TẬP HỢP GHI CHÚ, QUAN SÁT & VẤN ĐỀ NGHIÊN CỨU]\n`;
    topicNotes.forEach((note, idx) => {
      doc += `--- Ghi chú ${idx + 1}: ${note.title} (${note.type}) ---\n`;
      doc += `${note.content}\n\n`;
    });
  }

  if (topicResources.length > 0) {
    doc += `[PHẦN 5: THƯ TỊCH THAM KHẢO & NGUỒN TRÍCH DẪN]\n`;
    topicResources.forEach((res, idx) => {
      const sourceRef = res.url ? `- ${res.url}` : res.filePath ? `- [Tệp: ${res.filePath}]` : '';
      doc += `${idx + 1}. ${res.title} [${res.type.toUpperCase()}] ${res.author ? `(Tác giả: ${res.author})` : ''} ${sourceRef}\n`;
      if (res.notes) doc += `   Ghi chú tài liệu: ${res.notes}\n`;
    });
    doc += '\n';
  }

  if (topicExcerpts.length > 0) {
    doc += `[PHẦN 6: TRÍCH ĐOẠN ĐẶC SẮC TỪ SÁCH & TÀI LIỆU KHẢO CỨU]\n`;
    topicExcerpts.forEach((exc, idx) => {
      const authorText = exc.citationSnapshot?.author ? ` - ${exc.citationSnapshot.author}` : '';
      const sourceTitle = exc.citationSnapshot?.title || 'Tài liệu thư viện';
      doc += `${idx + 1}. Trích dẫn [Nguồn: ${sourceTitle}${authorText}]:\n`;
      doc += `   "${exc.selectedText}"\n`;
      if (exc.userNote) {
        doc += `   *Chiêm nghiệm / Ghi chú đính kèm:* ${exc.userNote}\n`;
      }
      doc += '\n';
    });
  }

  return doc;
}

/**
 * Sinh Task Prompt chuyên dụng chỉ thị cho Antigravity 2.0 sử dụng NotebookLM Skill
 */
export function generateNotebookLMTaskPrompt(
  topic: Topic,
  artifactType: NotebookLMArtifactType = 'study_guide',
  customInstructions?: string
): string {
  const typeDescriptions: Record<NotebookLMArtifactType, string> = {
    study_guide: 'Tạo Study Guide / Giáo trình khảo cứu có cấu trúc',
    audio_overview_summary: 'Tạo Kịch Bản & Tóm Tắt Chuyên Sâu Audio Overview (Podcast 2 Hosts)',
    briefing_doc: 'Tạo Briefing Doc / Báo cáo tổng kết học thuật cô đọng',
    faq: 'Tạo Bộ Câu Hỏi Thường Gặp (FAQ) & Giải Đáp Trọng Tâm',
    source_pack: 'Tạo Gói Nguồn Khảo CỨu Chuẩn Hóa (Source Pack)',
    dialectic_matrix: 'Tạo Ma Trận Phản Biện & Đối Chiếu Luận Điểm Đa Trường Phái',
    socratic_inquiry: 'Khai Phá Lỗ Hổng Tri Thức & 5 Câu Hỏi Đào Sâu (Socratic Inquiry)',
    mindmap_outline: 'Tạo Dàn Ý Sơ Đồ Tư Duy Chuẩn Markdown (Tương thích Mindmap OS)',
  };

  const outputRequirements: Record<NotebookLMArtifactType, string> = {
    study_guide: '1. Khái niệm cốt lõi & Thuật ngữ đối chiếu\n2. Hệ thống luận điểm & Trích dẫn kinh điển\n3. Bảng phân tích chi pháp / tương quan\n4. Câu hỏi ôn tập & Hướng thực hành quán chiếu',
    audio_overview_summary: '1. Định vị 2 Hosts: Host 1 (Chuyên gia hàn lâm, phân tích hệ thống) & Host 2 (Người thực hành truy vấn ứng dụng)\n2. Các luận điểm then chốt và các điểm nghẽn nhận thức được tháo gỡ\n3. Trích đoạn đối thoại đắt giá nhất giữa 2 hosts\n4. Đúc kết thực tiễn và hành động cho người học',
    briefing_doc: '1. Tổng quan vấn đề nghiên cứu\n2. Bối cảnh và nguồn dữ liệu khảo cứu\n3. Đánh giá phát hiện chính\n4. Kết luận học thuật',
    faq: '1. Tối thiểu 5 câu hỏi cốt lõi về bản thể và luận lý\n2. Câu trả lời chính xác dựa trên tài liệu nguồn\n3. Trích dẫn thuật ngữ gốc',
    source_pack: '1. Chuẩn hóa định dạng tài liệu nguồn sạch\n2. Loại bỏ nhiễu và định vị phân đoạn\n3. Sắp xếp mục lục luận chứng',
    dialectic_matrix: '1. Bảng ma trận đối chiếu: Trường phái / Tác giả vs Luận cứ vs Kết luận\n2. Phân tích các điểm đồng thuận cốt lõi và dị biệt mấu chốt\n3. Cơ sở văn bản và trích dẫn kiểm chứng cho từng quan điểm\n4. Câu hỏi phản biện mở cho nghiên cứu tiếp nối',
    socratic_inquiry: '1. Liệt kê các tiền đề và giả định ngầm định trong tài liệu nguồn\n2. Chỉ ra các "điểm mù" (blind spots) hoặc lỗ hổng luận lý cần đào sâu\n3. 5 câu hỏi truy vấn Socratic phân tầng (từ bản chất định nghĩa đến hệ quả thực hành)\n4. Phương pháp tự kiểm chứng (Active Inquiry) cho người học',
    mindmap_outline: '1. Tiêu đề trung tâm định dạng `# Tên Chủ Đề`\n2. Các nhánh chính cấp 1 định dạng `## Nhánh Tri Thức`\n3. Các nút lá cấp 2 và cấp 3 định dạng gạch đầu dòng `- Nhánh con [nhãn quan hệ]`\n4. Mỗi nút ngắn gọn, cô đọng (dưới 15 từ) để tương thích trực tiếp với trình duyệt Mindmap',
  };

  const targetDesc = typeDescriptions[artifactType] || typeDescriptions.study_guide;
  const targetReq = outputRequirements[artifactType] || outputRequirements.study_guide;
  const extra = customInstructions?.trim() ? `\nChỉ dẫn bổ sung: ${customInstructions.trim()}` : '';

  return `[Chỉ thị Antigravity 2.0: Sử dụng NotebookLM Skill]
Target Skill: notebooklm
Chủ đề: "${topic.title}" (${topic.categoryName || topic.type})
Mục tiêu: ${targetDesc}

Yêu cầu cấu trúc đầu ra:
${targetReq}${extra}

Quy trình thực thi:
1. Tiếp nhận tài liệu nguồn (Source Document / Handoff Bundle) đính kèm.
2. Kích hoạt NotebookLM skill để xử lý, đối chiếu và tổng hợp nội dung.
3. Trả về kết quả dưới định dạng Markdown chuẩn (có tiêu đề H1, các đề mục H2/H3 rõ ràng) để người dùng có thể import trực tiếp trở lại Knowledge OS.`;
}

/**
 * Kiểm tra tính hợp lệ của dữ liệu Artifact trước khi lưu hoặc import
 */
export function validateArtifactImportInput(
  input: Partial<NotebookLMArtifact>
): {
  valid: boolean;
  error?: string;
  sanitized?: {
    title: string;
    content: string;
    notebookUrl?: string;
  };
} {
  const title = input.title?.trim() || '';
  const content = input.content?.trim() || '';
  const notebookUrl = input.notebookUrl?.trim() || undefined;

  if (notebookUrl && !/^https?:\/\/.+/i.test(notebookUrl)) {
    return {
      valid: false,
      error: 'URL NotebookLM phải bắt đầu bằng http:// hoặc https://',
    };
  }

  if (!content) {
    return {
      valid: false,
      error: 'Nội dung artifact không được để trống',
    };
  }

  if (!title) {
    return {
      valid: false,
      error: 'Tiêu đề artifact không được để trống',
    };
  }

  return {
    valid: true,
    sanitized: {
      title,
      content,
      notebookUrl,
    },
  };
}

/**
 * Trích xuất thông tin tiêu đề và phân loại tự động từ tệp Markdown.
 * Trả về suggestedType và requiresConfirmation: true để người dùng xác nhận loại kết quả.
 */
export function parseArtifactMarkdownFile(
  rawContent: string,
  defaultTopicId?: string
): {
  title: string;
  content: string;
  suggestedType: NotebookLMArtifactType;
  type: NotebookLMArtifactType;
  requiresConfirmation: boolean;
} {
  const content = rawContent.trim();
  let title = 'Tài liệu tổng hợp từ NotebookLM';
  let suggestedType: NotebookLMArtifactType = 'study_guide';

  // Extract first H1 heading if present (# Title)
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match && h1Match[1]) {
    title = h1Match[1].trim();
  }

  // Infer type from content keywords if available
  const lower = (title + ' ' + content).toLowerCase();
  if (lower.includes('audio overview') || lower.includes('podcast')) {
    suggestedType = 'audio_overview_summary';
  } else if (lower.includes('dialectic') || lower.includes('phản biện') || lower.includes('ma trận đối chiếu')) {
    suggestedType = 'dialectic_matrix';
  } else if (lower.includes('socratic') || lower.includes('lỗ hổng tri thức') || lower.includes('vấn đáp')) {
    suggestedType = 'socratic_inquiry';
  } else if (lower.includes('mindmap') || lower.includes('sơ đồ tư duy') || lower.includes('markmap')) {
    suggestedType = 'mindmap_outline';
  } else if (lower.includes('briefing') || lower.includes('báo cáo tổng kết')) {
    suggestedType = 'briefing_doc';
  } else if (lower.includes('faq') || lower.includes('câu hỏi thường gặp')) {
    suggestedType = 'faq';
  } else if (lower.includes('source pack') || lower.includes('tài liệu nguồn')) {
    suggestedType = 'source_pack';
  }

  return {
    title,
    content,
    suggestedType,
    type: suggestedType,
    requiresConfirmation: true,
  };
}
