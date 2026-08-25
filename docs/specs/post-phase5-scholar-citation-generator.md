# 📋 ĐẶC TẢ KỸ THUẬT: POST-PHASE 5 MICRO-INCREMENT
## Scholar Citation & Reference Export Generator (Resource Focus)

> **Trạng thái:** 🟢 **VERIFIED & IMPLEMENTED (100% GREEN)**  
> **Phạm vi:** Post-Phase 5 Micro-Increment (Chuyên biệt cho Thư viện & Nguồn tư liệu `Resource`)  
> **Tài liệu liên quan:** [`docs/architecture-decisions.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/architecture-decisions.md) · [`docs/PROJECT_STATUS.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/PROJECT_STATUS.md)  
> **Mục tiêu:** Cung cấp module tiện ích thuần túy và giao diện trích dẫn học thuật tự động cho các tài liệu tham khảo theo các chuẩn APA 7th, BibTeX và Markdown Footnote.

---

## 🎯 1. BỐI CẢNH & MỤC TIÊU KỸ THUẬT

Trong quá trình khảo cứu Phật học và Huyền học trên Knowledge OS, người dùng lưu trữ nhiều nguồn tư liệu (kinh văn Pāli/Sanskrit, bản dịch Hán tạng, sách nghiên cứu, tài liệu PDF, video bài giảng). Khi cần trích dẫn vào Obsidian, LaTeX/Overleaf, Word, hoặc bài nghiên cứu cá nhân, việc nhập tay thủ công định dạng trích dẫn tốn nhiều thời gian và dễ sai sót.

Micro-increment này tập trung giải quyết:
1. **Module tiện ích thuần túy (`src/lib/citationGenerator.ts`):** Nhận vào đối tượng `Resource` và sinh ra chuỗi trích dẫn chuẩn hóa theo 3 định dạng phổ biến: **APA 7th**, **BibTeX**, và **Markdown Footnote**.
2. **Quy tắc Fallback an toàn (Graceful Metadata Fallback):** Xử lý linh hoạt khi tài liệu khuyết tác giả (`author`), năm (`year`), hoặc đường dẫn (`url`/`filePath`) mà không gây crash hay sinh chuỗi dị dạng.
3. **Điểm chạm giao diện duy nhất (ResourcesManager-First):** Tích hợp nút "Trích dẫn" (Cite) trên thẻ tài liệu trong [`ResourcesManager.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/resources/ResourcesManager.tsx) mở hộp thoại `CitationModal.tsx` với phản hồi sao chép tối giản (inline feedback, không dùng toast system).

---

## 🛡️ 2. PHẠM VI (SCOPE DEFINITION)

### ✅ Trong phạm vi (Scope IN):
- Triển khai pure library `src/lib/citationGenerator.ts`:
  - `generateAPACitation(resource: Resource): string`
  - `generateBibTeXCitation(resource: Resource): string`
  - `generateMarkdownFootnote(resource: Resource, index?: number): string`
  - `generateAllCitations(resource: Resource): { apa: string; bibtex: string; markdown: string }`
- Quy tắc xử lý Fallback cho từng trường hợp thiếu metadata.
- Sinh BibTeX key tất định (Deterministic Citation Key: `${authorSlug}_${year}_${titleSlug}`).
- Modal trích dẫn nhỏ gọn `CitationModal.tsx` mở từ `ResourcesManager.tsx` với 3 tabs định dạng và nút Copy to Clipboard kèm phản hồi tức thì.
- Unit test suite toàn diện (`tests/unit/citation-generator-lib.test.ts` & `tests/unit/citation-modal-ui.test.tsx`).

### ❌ Ngoài phạm vi (Scope OUT):
- KHÔNG gắn vào `ResourceViewerModal.tsx` hay `TopicDetail.tsx` ở increment đầu tiên.
- KHÔNG thêm toast system mới hay các dependency thư viện ngoài.
- KHÔNG thay đổi Prisma Schema, không thêm trường mới vào cơ sở dữ liệu.
- KHÔNG thay đổi `DataContext.tsx` hay API backend.

---

## 📐 3. QUY TẮC ĐỊNH DẠNG & FALLBACK (FORMATTING & FALLBACK MATRIX)

### 3.1. Chuẩn APA 7th Edition
- **Đầy đủ:** `{Author} ({Year}). {Title}. [{TypeLabel}]. {SourceUrl}`
  - *Ví dụ:* `Vasubandhu. (2024). Câu Xá Luận (Abhidharmakośabhāṣya). [Sách/Luận tạng]. https://example.com/abhidharma.pdf`
- **Khuyết Tác giả:** `{Title}. ({Year}). [{TypeLabel}]. {Source}`
  - *Ví dụ:* `Trung A Hàm Kinh. (n.d.). [Tài liệu PDF]. Tệp cục bộ: 02_Resources/trung-a-ham.pdf`
- **Khuyết Năm:** Sử dụng ký hiệu chuẩn `(n.d.)` (*no date*).
- **Khuyết Đường dẫn:** Bỏ qua phần đường dẫn.

### 3.2. Chuẩn BibTeX (LaTeX / Zotero / Overleaf)
```bibtex
@book{vasubandhu_2024_cauxaluan,
  title = {Câu Xá Luận (Abhidharmakośabhāṣya)},
  author = {Vasubandhu},
  year = {2024},
  howpublished = {https://example.com/abhidharma.pdf},
  note = {Chủ đề: Vi Diệu Pháp}
}
```
- Phân loại Entry Type:
  - `book` $\rightarrow$ `@book`
  - `article` $\rightarrow$ `@article`
  - `pdf`, `video`, `audio` $\rightarrow$ `@misc` với trường `howpublished = {[Loại tài liệu] url/filePath}`.

### 3.3. Chuẩn Markdown Footnote (Obsidian / Markdown Note)
- `[^1]: {Author} ({Year}) - *{Title}*. [{TypeLabel}]. [{SourceLink}]({url})`

---

## 🔒 4. INVARIANTS & CHỈ SỐ AN TOÀN

1. **Zero Binary Ingestion:** Chỉ thao tác trên metadata chuỗi của `Resource`.
2. **Deterministic Output:** Cùng một input metadata luôn sinh ra cùng 1 chuỗi trích dẫn.
3. **Blast Radius:** Rất thấp (1 file lib thuần túy + 1 modal UI nhỏ).
4. **100% Backward Compatible:** Không tác động đến dữ liệu hay test cũ.
