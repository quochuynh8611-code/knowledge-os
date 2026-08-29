# ADR-054: Citation Workflow Polish, Live Feedback, and Batch Export Reporting

**Status**: PROPOSED  
**Date**: 2026-08-29  
**Author**: Staff Software Engineer / Technical Architect  
**Deciders**: Engineering Lead, Technical Architect  
**Context**: Phase P8.3 — Citation Workflow Polish & Export Feedback

---

## 1. Context & Problem Statement

Hệ thống Citation Subsystem từ P8.0 đến P8.2 đã vận hành đầy đủ chức năng trích dẫn 6 format và xuất ma trận. Tuy nhiên:
1. Modal trích dẫn chưa hỗ trợ phím `Escape` tự nhiên và chưa có live region (`aria-live`) cho assistive technologies.
2. Khi trích dẫn một `MatrixRelation`, người dùng cần nhận thức rõ ranh giới giữa chứng cứ kinh điển nguyên bản (`canonicalEvidence`) và chú giải hiện đại (`interpretiveNote`).
3. Tác vụ Batch Export cần hàm thống kê rõ ràng số lượng quan hệ xuất thành công vs. bị loại trừ (`skippedCount`).

---

## 2. Decision

1. **Thêm `Escape` listener và `aria-live="polite"` vào `ScholarCitationModal`**:
   - Sử dụng `useEffect` để gán và hủy `keydown` listener khi `isOpen` thay đổi.
   - Thêm phần tử `role="status" aria-live="polite"` thông báo tiến trình cho screen readers.

2. **Tách bạch trực quan Bằng chứng và Chú giải trong Modal**:
   - Bố cục 2 khu vực riêng biệt:
     - Khu vực 1: Bằng chứng văn bản kinh điển (Textual Evidence).
     - Khu vực 2: Chú giải diễn dịch học thuật (Analytical Interpretation) — ghi rõ không phải factual source.

3. **Mở rộng `batchMatrix.ts` với hàm thống kê mới**:
   - Thêm `getBatchMatrixExportStats(relations)` trả về `{ total, exportedCount, skippedCount }`.
   - Giữ nguyên các hàm `exportMatrixRelationsToBibTeX` và `exportMatrixRelationsToCSL` không đổi chữ ký hàm.

---

## 3. Alternatives Considered & Rejected

- **Phương án B: Thay đổi chữ ký hàm `exportMatrixRelationsToBibTeX` để trả về Object `{ content, stats }`**:
  - *Bị từ chối*: Vi phạm backward compatibility với P8.2, làm hỏng các bài test hiện có.
- **Phương án C: Trộn `interpretiveNote` vào dòng trích dẫn BibTeX**:
  - *Bị từ chối*: Vi phạm nguyên tắc bảo toàn liêm chính học thuật (Scholarly Integrity).

---

## 4. Blast Radius Assessment

- **Rất thấp (Low Blast Radius)**:
  - Chỉ bổ sung logic trong `ScholarCitationModal.tsx` và thêm hàm mới vào `batchMatrix.ts`.
  - Không sửa đổi bất kỳ component schema hay database registry nào.
