import { Topic, Note, Resource } from '../types';

/**
 * Đóng gói toàn bộ bối cảnh nghiên cứu của Topic thành tài liệu Handoff Package
 * theo chuẩn Markdown 6 phần cố định dành riêng cho Antigravity AI / Reasoning Agents.
 *
 * Ràng buộc kiến trúc:
 * 1. Chỉ lấy đồ thị 1-hop trực tiếp từ topic.links, không suy diễn thêm link ngoài.
 * 2. Luôn giữ đúng thứ tự 6 sections.
 * 3. Nếu section không có dữ liệu, luôn in "None recorded."
 * 4. Zero Binary Ingestion: Chỉ tham chiếu đường dẫn filePath, không nhúng binary.
 */
export function packageHandoffBundleForAntigravity(
  topic: Topic,
  notes: Note[] = [],
  resources: Resource[] = [],
  allTopics: Topic[] = []
): string {
  const topicNotes = (notes || []).filter((n) => n.topicId === topic.id);
  const topicResources = (resources || []).filter((r) => r.topicId === topic.id);

  // Tạo map tra cứu topic title nếu cần
  const topicMap = new Map<string, string>();
  if (Array.isArray(allTopics)) {
    allTopics.forEach((t) => topicMap.set(t.id, t.title));
  }

  // --- SECTION 1: System Directive & Academic Persona ---
  const sec1 = `## 1. System Directive & Academic Persona
Bạn là **Antigravity AI Scholar** — Học giả Nghiên cứu Cấp cao và Trợ lý Khảo cứu Tri thức uyên bác về hai kho tàng tư tưởng Phương Đông:
1. **Phật Học Học Thuật:** Tam Tạng Pali (Tipiṭaka), Luận Tạng Thắng Pháp (Abhidhamma), Duy Thức Học (Yogācāra), và Thiền Định (Samatha - Vipassanā).
2. **Huyền Học & Dịch Học:** Chu Dịch (64 Quẻ, Thao lược, Tượng số), Kỳ Môn Độn Giáp, Bát Tự Hà Lạc và Phong Thủy Lý Khí.

Nhiệm vụ của bạn là tiếp nhận bối cảnh nghiên cứu có cấu trúc bên dưới, phân tích sâu các mối liên hệ liên ngành, đối chiếu ngữ nguyên kinh điển và giải đáp các câu hỏi học thuật với độ chính xác tuyệt đối.`;

  // --- SECTION 2: Topic Exegesis & Canonical Metadata ---
  const domainLabel = topic.type === 'phat-hoc' ? 'Phật Học' : 'Huyền Học';
  const categoryLabel = topic.categoryName || topic.categoryId;
  const tagsFormatted = topic.tags && topic.tags.length > 0 ? `#${topic.tags.join(' #')}` : 'None recorded.';
  const progressStatus = topic.studyProgress?.status || 'not_started';
  const easeFactor = topic.studyProgress?.easeFactor ?? 2.5;

  const sec2 = `## 2. Topic Exegesis & Canonical Metadata
- **Chủ đề (Title):** ${topic.title}
- **Định danh (Slug):** \`${topic.slug}\`
- **Lĩnh vực (Domain):** ${domainLabel}
- **Danh mục (Category):** ${categoryLabel}
- **Trạng thái học tập (Study Status):** \`${progressStatus}\` (Hệ số dễ nhớ Ease Factor: ${easeFactor})
- **Từ khóa phân loại (Tags):** ${tagsFormatted}

### Định Vị Khái Niệm (Concept Summary)
${topic.description || 'None recorded.'}

### Luận Thuyết Kinh Điển & Khảo Luận (Canonical Exegesis)
${topic.content ? topic.content.trim() : 'None recorded.'}`;

  // --- SECTION 3: Multi-Hop Knowledge Graph Topology (1-hop direct ONLY) ---
  let sec3Body = 'None recorded.';
  if (topic.links && topic.links.length > 0) {
    sec3Body = topic.links
      .map((link) => {
        const resolvedTitle = link.targetTitle || topicMap.get(link.targetId) || link.targetId;
        const linkTypeUpper = (link.linkType || 'related').toUpperCase();
        const strength = link.strength || 3;
        const notesStr = link.notes ? ` - Ghi chú: ${link.notes}` : '';
        return `- [${linkTypeUpper}] **${resolvedTitle}** (Độ mạnh: ${strength}/5)${notesStr}`;
      })
      .join('\n');
  }

  const sec3 = `## 3. Multi-Hop Knowledge Graph Topology
${sec3Body}`;

  // --- SECTION 4: User Notes & Open Inquiries ---
  let sec4Body = 'None recorded.';
  if (topicNotes.length > 0) {
    sec4Body = topicNotes
      .map((note) => {
        const typeUpper = (note.type || 'study').toUpperCase();
        const noteTags = note.tags && note.tags.length > 0 ? `\n*Tags: #${note.tags.join(' #')}*` : '';
        return `### [${typeUpper}] ${note.title}\n${note.content}${noteTags}`;
      })
      .join('\n\n');
  }

  const sec4 = `## 4. User Notes & Open Inquiries
${sec4Body}`;

  // --- SECTION 5: Annotated Bibliography & Local References ---
  let sec5Body = 'None recorded.';
  if (topicResources.length > 0) {
    sec5Body = topicResources
      .map((res) => {
        const typeUpper = (res.type || 'book').toUpperCase();
        const authorStr = res.author ? ` (Tác giả: ${res.author})` : '';
        const notesStr = res.notes ? ` — *Ghi chú: ${res.notes}*` : '';

        if (res.filePath) {
          return `- [${typeUpper}] [Tệp cục bộ: ${res.filePath}] ${res.title}${authorStr}${notesStr}`;
        }
        if (res.url) {
          return `- [${typeUpper}] [${res.title}](${res.url})${authorStr}${notesStr}`;
        }
        return `- [${typeUpper}] ${res.title}${authorStr}${notesStr}`;
      })
      .join('\n');
  }

  const sec5 = `## 5. Annotated Bibliography & Local References
${sec5Body}`;

  // --- SECTION 6: Reasoning Directives & Rigor Invariants ---
  const sec6 = `## 6. Reasoning Directives & Rigor Invariants
Khi phân tích và trả lời câu hỏi dựa trên gói bàn giao này, Antigravity AI bắt buộc tuân thủ 4 nguyên tắc học thuật:
1. **Tuyệt đối không bịa đặt nguồn gốc (Zero Hallucination of Canonical Citations):** Mọi trích dẫn phải xác thực đúng Kinh (Sutta), Luận (Abhidhamma/Vipassanā) hoặc Quẻ/Thoán từ Chu Dịch.
2. **Chuẩn xác về mặt nguyên ngữ (Multi-linguistic Rigor):** Đối chiếu chính xác thuật ngữ Pāli (IAST), Sanskrit (IAST/Devanagari) và Hán tự (Phồn thể/Giản thể kèm Pinyin).
3. **Cấu trúc danh sắc theo Abhidhamma:** Khi phân tích tâm thức, phân định rõ thuộc 89/121 Tâm (Citta) nào và các Tâm sở (Cetasika) đồng sanh nào.
4. **Đối chiếu triết học Dịch lý & Tương quan:** Phân tích quy luật biến dịch (Âm Dương, Ngũ Hành, Quẻ Dịch) trong mối tương hỗ với lý Duyên Khởi (Paṭiccasamuppāda) và Tam Tướng (Anicca, Dukkha, Anattā).`;

  // Ghép toàn bộ 6 phần theo thứ tự bất biến
  return [
    `# 🌌 ANTIGRAVITY RESEARCH SCHOLAR HANDOFF BUNDLE`,
    `> **Đóng gói bối cảnh khảo cứu tri thức: ${topic.title}**`,
    `> **Thời gian tạo:** ${new Date().toISOString()}`,
    ``,
    sec1,
    ``,
    sec2,
    ``,
    sec3,
    ``,
    sec4,
    ``,
    sec5,
    ``,
    sec6,
  ].join('\n');
}

/**
 * Sinh Prompt chuyên sâu định dạng sẵn theo 3 chế độ nghiên cứu của Antigravity AI
 */
export function generateAntigravityPrompt(
  topic: Topic,
  mode: 'scholar_analysis' | 'pali_sanskrit_exegesis' | 'cross_domain_link',
  customQuery?: string
): string {
  const query = customQuery?.trim() || '';

  if (mode === 'scholar_analysis') {
    return `[Học giả Nghiên cứu Phật học & Luận Tạng Abhidhamma]
Chủ đề: "${topic.title}" (${topic.categoryName || topic.type})
${query ? `Câu hỏi trọng tâm: ${query}\n` : ''}
Yêu cầu:
1. Phân tích chi tiết các pháp chân đế (Paramattha Dhammā): Tâm (Citta), Tâm sở (Cetasika), Sắc (Rūpa) và Niết-bàn (Nibbāna) liên quan đến chủ đề.
2. Nêu rõ các chi pháp tâm sở đồng sanh và tiến trình tâm (Citta Vīthi) tương ứng.
3. Ứng dụng cụ thể vào lộ trình thực hành thiền Định (Samatha) và thiền Tuệ (Vipassanā).`;
  }

  if (mode === 'pali_sanskrit_exegesis') {
    return `[Khảo cứu Ngữ nguyên & Chiết tự Thuật ngữ Cổ]
Chủ đề: "${topic.title}" (${topic.categoryName || topic.type})
${query ? `Câu hỏi trọng tâm: ${query}\n` : ''}
Yêu cầu:
1. Truy xuất nguyên ngữ gốc Pali (IAST) và Sanskrit (IAST) của các thuật ngữ trọng tâm trong chủ đề này.
2. Chiết tự căn tố (Dhātu/Root), tiền tố (Upasagga) và hậu tố (Paccaya) ngữ pháp.
3. Đối chiếu dịch nghĩa tương đương trong hệ thống Hán văn cổ (Kinh điển Hán tạng và Dịch học).`;
  }

  return `[Đối chiếu Liên ngành Phật Học & Dịch Học / Huyền Học Đông Phương]
Chủ đề: "${topic.title}" (${topic.categoryName || topic.type})
${query ? `Câu hỏi trọng tâm: ${query}\n` : ''}
Yêu cầu:
1. Khảo cứu mối tương quan triết học giữa chủ đề này với đạo biến dịch của Chu Dịch (64 Quẻ, Âm Dương, Ngũ Hành).
2. Đối chiếu cơ chế vận hành của lý Duyên Khởi (Paṭiccasamuppāda) và quy luật biến dịch của Dịch Học.
3. Rút ra bài học ứng dụng thực tiễn cho tư duy và nhận thức của người nghiên cứu học thuật.`;
}
