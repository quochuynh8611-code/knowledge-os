# 📋 ĐẶC TẢ KỸ THUẬT: POST-PHASE 5 MICRO-INCREMENT
## Batch Citation Export for Filtered Resources (Xuất Danh Mục Trích Dẫn Hàng Loạt)

> **Trạng thái:** 🟢 VERIFIED & IMPLEMENTED (100% GREEN)  
> **Phạm vi:** Post-Phase 5 Micro-Increment (Mở rộng tính năng xuất trích dẫn cho tập tài liệu đang lọc `filteredResources`)  
> **Tài liệu liên quan:** [`docs/specs/post-phase5-scholar-citation-generator.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase5-scholar-citation-generator.md) · [`docs/architecture-decisions.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/architecture-decisions.md)  
> **Mục tiêu:** Cung cấp khả năng xuất hàng loạt trích dẫn chuẩn **APA 7th**, **BibTeX** (`.bib`), và **Markdown Footnotes** (`.md`) cho toàn bộ tài liệu đang được lọc trong Thư viện, hỗ trợ sao chép toàn bộ 1-click hoặc tải về tệp tin độc lập.

---

## 🎯 1. BỐI CẢNH & ĐỘNG LỰC THIẾT KẾ

Sau khi tính năng sinh trích dẫn đơn lẻ cho từng thẻ tài liệu (`Resource`) đã hoàn tất, học giả nghiên cứu thường xuyên cần trích xuất **toàn bộ danh mục tài liệu của một chủ đề** (ví dụ: toàn bộ 15 tài liệu thuộc chủ đề *Abhidharma* hoặc các kinh sách *Nikāya*) để:
1. Nhập trọn gói vào **Zotero / Mendeley / LaTeX (Overleaf)** dưới dạng tệp `references.bib`.
2. Dán bảng danh mục tài liệu tham khảo (References List) chuẩn **APA 7th** (đã sắp xếp ABC) vào cuối luận văn, tiểu luận hoặc bài khảo cứu.
3. Chèn toàn bộ chú thích nguồn **Markdown Footnotes** vào ghi chú tổng hợp trong **Obsidian**.

---

## 🛡️ 2. PHẠM VI (SCOPE DEFINITION)

### ✅ Trong phạm vi (Scope IN):
1. **Hàm thuần túy gộp trích dẫn (`src/lib/citationGenerator.ts`):**
   - `generateBatchCitations(resources: Resource[], format: 'apa' | 'bibtex' | 'markdown'): string`
   - `getBatchCitationDownloadFilename(format: 'apa' | 'bibtex' | 'markdown'): string`
2. **Quy tắc gộp và định dạng chuẩn (Aggregation Rules):**
   - **APA 7th:** Sắp xếp tất định theo thứ tự bảng chữ cái ABC (ưu tiên `author`, nếu khuyết thì theo `title`), cách nhau bởi 2 dấu xuống dòng `\n\n`.
   - **BibTeX (`.bib`):** Nối các khối `@book{...}`, `@article{...}`, `@misc{...}`, cách nhau bởi 2 dấu xuống dòng `\n\n`.
   - **Markdown Footnotes:** Đánh số tăng dần từ `[^1]` đến `[^N]`, mỗi trích dẫn trên một dòng cách nhau bởi `\n`.
3. **Quy tắc tải tệp tin độc lập (Download as File):**
   - Định dạng APA $\rightarrow$ `references.txt` (MIME: `text/plain;charset=utf-8`)
   - Định dạng BibTeX $\rightarrow$ `references.bib` (MIME: `application/x-bibtex;charset=utf-8` hoặc `text/plain;charset=utf-8`)
   - Định dạng Markdown $\rightarrow$ `references.md` (MIME: `text/markdown;charset=utf-8`)
4. **Quy tắc trạng thái rỗng (Empty-State Guardrail):**
   - Nếu `filteredResources.length === 0`: Nút "Xuất danh mục" trên Toolbar ở trạng thái `disabled`, không mở modal.
5. **Giao diện Modal chuyên dụng ([`src/components/modals/BatchCitationModal.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/modals/BatchCitationModal.tsx)):**
   - Tách biệt độc lập khỏi `CitationModal.tsx` để không làm phức tạp hóa luồng trích dẫn đơn lẻ.
   - Hiển thị số lượng tài liệu đang xuất, 3 tab định dạng, khung xem trước và 2 nút hành động: "Sao chép toàn bộ" & "Tải tệp ({filename})".
6. **Điểm chạm kích hoạt:**
   - Nút "Xuất danh mục ({count})" trên Toolbar của [`ResourcesManager.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/resources/ResourcesManager.tsx).

### ❌ Ngoài phạm vi (Scope OUT):
- KHÔNG thêm state multi-select checkbox riêng rẽ trên từng card (chỉ xuất theo tập `filteredResources` hiện hành).
- KHÔNG thay đổi schema Prisma, không đổi API backend.
- KHÔNG can thiệp vào `DataContext.tsx` hay `TopicDetail.tsx`.
- KHÔNG thêm dependency bên ngoài (dùng chuẩn HTML5 Blob download).
- KHÔNG lưu trữ format preference vào LocalStorage ở lượt này.

---

## 📐 3. QUY TẮC CHI TIẾT (TECHNICAL SPECIFICATIONS)

### 3.1. Sắp xếp Tất Định trong APA Batch
```typescript
// Sắp xếp theo tác giả (hoặc tiêu đề nếu khuyết tác giả)
const sorted = [...resources].sort((a, b) => {
  const nameA = (a.author || a.title).trim().toLowerCase();
  const nameB = (b.author || b.title).trim().toLowerCase();
  return nameA.localeCompare(nameB, 'vi');
});
```

### 3.2. Mapping Tên Tệp Tải Xuống (Filename Mapping)
| Định Dạng | Tên Tệp Cố Định | Định Dạng Dữ Liệu |
| :--- | :--- | :--- |
| **`apa`** | `references.txt` | Văn bản thuần túy danh mục tài liệu tham khảo ABC |
| **`bibtex`** | `references.bib` | Tệp BibTeX chuẩn cho Zotero, Overleaf, JabRef |
| **`markdown`** | `references.md` | Danh sách Footnotes `[^1]` đến `[^N]` cho Obsidian |

---

## 🔒 4. INVARIANTS & CHỈ SỐ AN TOÀN

1. **Zero Binary Ingestion:** Chỉ thao tác trên metadata chuỗi đã lọc.
2. **Deterministic Output:** Cùng một tập `filteredResources` và format luôn sinh ra cùng 1 chuỗi ký tự và 1 tên tệp tải về.
3. **Blast Radius:** Rất thấp (1 hàm pure lib + 1 component modal độc lập + 1 nút trên Toolbar).
4. **Backward Compatibility:** Không làm thay đổi bất kỳ hành vi nào của `CitationModal` đơn lẻ hay các tính năng quản lý tài liệu khác.
