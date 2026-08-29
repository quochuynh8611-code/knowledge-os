# Phase P8.3 Mini-Spec: Citation Workflow Polish & Export Feedback

**Status**: PROPOSED (Awaiting Human Sign-off)  
**Author**: Staff Software Engineer / Technical Architect  
**Domain**: Scholar Suite / Citation UI & Export Feedback  
**Baseline**: Phase P8.2 Complete (Commit `c9a03c6`)

---

## 1. Executive Summary

Phase P8.3 tập trung hoàn thiện trải nghiệm người dùng (UX/a11y Polish) và tính tường minh học thuật (Scholarly Transparency) cho quy trình trích dẫn học thuật:
1. **Phản hồi tương tác (Interactive Feedback & a11y)**:
   - Thêm `aria-live="polite"` cho phản hồi sao chép / lỗi / tải tệp.
   - Thêm bộ lắng nghe phím `Escape` để đóng modal tức thì.
   - Xử lý kịch bản lỗi khi clipboard API bị từ chối (`copyError`).
2. **Minh bạch hóa Chứng Cứ Học Thuật (Evidence Transparency)**:
   - Tách biệt rõ ràng **Bằng chứng văn bản nguyên bản (`canonicalEvidence`)** và **Chú giải diễn dịch hiện đại (`interpretiveNote`)** khi trích dẫn `MatrixRelation` hoặc `SystemNode`.
   - Hiển thị huy hiệu `evidenceLevel` (`canonical` / `commentary` / `scholarly_conjecture`) với chú thích chống ngụy tạo học thuật.
3. **Thống kê & Chuẩn hóa Batch Export (Batch Reporting & Filename Policy)**:
   - Bổ sung helper thuần `getBatchMatrixExportStats(relations: MatrixRelation[]): BatchMatrixExportStats`.
   - Chuẩn hóa tên file xuất theo quy tắc an toàn ASCII: `matrix_relations_${cleanTopic}_${format}.${ext}`.

---

## 2. Detailed Specifications

### A. Modal Workflow & Accessibility (`ScholarCitationModal.tsx`)
1. **Escape Key Handling**:
   - Khi modal mở (`isOpen === true`), lắng nghe sự kiện bàn phím `keydown`. Nếu `event.key === 'Escape'`, gọi `onClose()`.
2. **Live Feedback (`aria-live="polite"`)**:
   - Vùng thông báo ẩn cho trình đọc màn hình, tự động cập nhật:
     - *"Đã sao chép trích dẫn định dạng BibTeX vào clipboard."*
     - *"Đã tải tệp .bib thành công."*
     - *"Lỗi sao chép trích dẫn vào clipboard."*
3. **Copy Error Fallback**:
   - Bắt ngoại lệ `try/catch` từ `navigator.clipboard.writeText`. Nếu thất bại, hiển thị thông báo lỗi thân thiện thay vì im lặng.

### B. Evidence & Context Presentation
1. **Khi đối tượng trích dẫn là `MatrixRelation`**:
   - Nếu có `canonicalEvidence`: Hiển thị trong thẻ riêng biệt mang nhãn *"Bằng chứng kinh điển nguyên bản"*.
   - Nếu có `interpretiveNote`: Hiển thị trong thẻ riêng biệt mang nhãn *"Chú giải phân tích học thuật hiện đại (Không phải nguồn nguyên bản)"*.
   - Nếu `evidenceLevel === 'scholarly_conjecture'`: Hiển thị cảnh báo *"Giả thuyết đối chiếu học thuật — Đang tiếp tục thẩm định"*.

### C. Batch Export Reporting (`batchMatrix.ts`)
1. **`BatchMatrixExportStats` Interface**:
   ```typescript
   export interface BatchMatrixExportStats {
     total: number;
     exportedCount: number;
     skippedCount: number;
   }
   ```
2. **`getBatchMatrixExportStats(relations: MatrixRelation[]): BatchMatrixExportStats`**:
   - `total = relations.length`
   - `exportedCount = relations.filter(r => normalizeMatrixRelation(r).sufficiency !== 'internal_note_only').length`
   - `skippedCount = total - exportedCount`
3. **Không thay đổi các hàm xuất pure**:
   - Giữ nguyên `exportMatrixRelationsToBibTeX(relations): string`
   - Giữ nguyên `exportMatrixRelationsToCSL(relations): CSLItem[]`
