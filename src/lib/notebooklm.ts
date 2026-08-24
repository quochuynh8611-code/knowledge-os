import { Topic, Note, Resource } from '../types';

export interface NotebookLMArtifact {
  id: string;
  topicId: string;
  type: 'study_guide' | 'audio_overview_summary' | 'briefing_doc' | 'faq';
  title: string;
  content: string;
  notebookUrl?: string;
  createdAt: string;
}

export const NOTEBOOKLM_STORAGE_KEY = 'phat_hoc_notebooklm_artifacts_v1';

export function getStoredArtifacts(): NotebookLMArtifact[] {
  try {
    const saved = localStorage.getItem(NOTEBOOKLM_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function saveArtifact(artifact: Omit<NotebookLMArtifact, 'id' | 'createdAt'>): NotebookLMArtifact {
  const newArtifact: NotebookLMArtifact = {
    ...artifact,
    id: `artifact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
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

  let doc = `================================================================================\n`;
  doc += `TÀI LIỆU NGUỒN KHẢO CỨU (NOTEBOOKLM SOURCE DOCUMENT)\n`;
  doc += `CHỦ ĐỀ: ${topic.title.toUpperCase()}\n`;
  doc += `LĨNH VỰC: ${topic.type === 'phat-hoc' ? 'PHẬT HỌC HỌC THUẬT' : 'HUYỀN HỌC & DỊCH LÝ ĐÔNG PHƯƠNG'}\n`;
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
