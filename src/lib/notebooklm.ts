import { Topic, Note, Resource } from '../types';

export type NotebookLMArtifactType =
  | 'source_pack'
  | 'study_guide'
  | 'briefing_doc'
  | 'audio_overview_summary'
  | 'faq';

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
 * Package a topic into a dense, clean Source Document ready for NotebookLM Upload
 */
export function packageSourceForNotebookLM(
  topic: Topic,
  notes: Note[] = [],
  resources: Resource[] = []
): string {
  const topicNotes = (notes || []).filter((n) => n.topicId === topic.id);
  const topicResources = (resources || []).filter((r) => r.topicId === topic.id);

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
    audio_overview_summary: 'Tạo Tóm tắt chuyên sâu từ Audio Overview / Podcast 2 Hosts',
    briefing_doc: 'Tạo Briefing Doc / Báo cáo tổng kết học thuật cô đọng',
    faq: 'Tạo Bộ Câu Hỏi Thường Gặp (FAQ) & Giải Đáp Trọng Tâm',
    source_pack: 'Tạo Gói Nguồn Khảo Cứu Chuẩn Hóa (Source Pack)',
  };

  const outputRequirements: Record<NotebookLMArtifactType, string> = {
    study_guide: '1. Khái niệm cốt lõi & Thuật ngữ đối chiếu\n2. Hệ thống luận điểm & Trích dẫn kinh điển\n3. Bảng phân tích chi pháp / tương quan\n4. Câu hỏi ôn tập & Hướng thực hành quán chiếu',
    audio_overview_summary: '1. Chủ đề đối thoại chính giữa 2 hosts\n2. Các luận điểm then chốt và góc nhìn sâu sắc\n3. Điểm nhấn đối chiếu học thuật\n4. Đúc kết thực tiễn cho người học',
    briefing_doc: '1. Tổng quan vấn đề nghiên cứu\n2. Bối cảnh và nguồn dữ liệu khảo cứu\n3. Đánh giá phát hiện chính\n4. Kết luận học thuật',
    faq: '1. Tối thiểu 5 câu hỏi cốt lõi về bản thể và luận lý\n2. Câu trả lời chính xác dựa trên tài liệu nguồn\n3. Trích dẫn thuật ngữ gốc',
    source_pack: '1. Chuẩn hóa định dạng tài liệu nguồn sạch\n2. Loại bỏ nhiễu và định vị phân đoạn\n3. Sắp xếp mục lục luận chứng',
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
 * Trích xuất thông tin tiêu đề và phân loại tự động từ tệp Markdown
 */
export function parseArtifactMarkdownFile(
  rawContent: string,
  defaultTopicId?: string
): {
  title: string;
  content: string;
  type: NotebookLMArtifactType;
} {
  const content = rawContent.trim();
  let title = 'Tài liệu tổng hợp từ NotebookLM';
  let type: NotebookLMArtifactType = 'study_guide';

  // Extract first H1 heading if present (# Title)
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match && h1Match[1]) {
    title = h1Match[1].trim();
  }

  // Infer type from content keywords if available
  const lower = (title + ' ' + content).toLowerCase();
  if (lower.includes('audio overview') || lower.includes('podcast')) {
    type = 'audio_overview_summary';
  } else if (lower.includes('briefing') || lower.includes('báo cáo tổng kết')) {
    type = 'briefing_doc';
  } else if (lower.includes('faq') || lower.includes('câu hỏi thường gặp')) {
    type = 'faq';
  } else if (lower.includes('source pack') || lower.includes('tài liệu nguồn')) {
    type = 'source_pack';
  }

  return {
    title,
    content,
    type,
  };
}
