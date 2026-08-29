# ADR-053: Matrix Citation UI Entry Points and Lightweight Batch Export Surface

**Status**: PROPOSED  
**Date**: 2026-08-29  
**Author**: Staff Software Engineer / Technical Architect  
**Deciders**: Engineering Lead, Technical Architect  
**Context**: Phase P8.2 — Matrix Citation UI & Batch Export Surfaces

---

## 1. Context & Problem Statement

Phase P8.1 hoàn thiện adapter và formatters cho `MatrixRelation`. Tuy nhiên, hai màn hình giao diện chính là `AbhidharmaMatrix` và `DivinationMatrix` chưa có điểm kích hoạt giao diện (Entry Points) để người dùng mở modal trích dẫn cho các node và các quan hệ liên đới.
Ngoài ra, học giả cần tính năng xuất hàng loạt (Batch Export) các quan hệ đang hiển thị thành file `.bib` hoặc `.json` để nhập vào trình quản lý thư mục (Zotero/Mendeley/LaTeX).

---

## 2. Decision

1. **Phân biệt rạch ròi Node Citation và Relation Citation**:
   - Nút "Trích Dẫn Tâm / Quẻ" kích hoạt modal cho `SystemNode`.
   - Nút "Trích Dẫn Quan Hệ" kích hoạt modal cho `MatrixRelation`.

2. **Tái sử dụng `ScholarCitationModal` trực tiếp**:
   - `ScholarCitationModal` đã hỗ trợ cả 3 props (`entry`, `node`, `relation`), không tạo modal mới.

3. **Cơ chế Batch Export thuần túy (Lightweight Pure Function)**:
   - Xây dựng module `src/lib/scholarCitation/batchMatrix.ts` gồm 2 hàm thuần:
     - `exportMatrixRelationsToBibTeX(relations: MatrixRelation[]): string`
     - `exportMatrixRelationsToCSL(relations: MatrixRelation[]): CSLItem[]`
   - Chỉ xuất các quan hệ hợp lệ (`!isBlocked`). Tự động bỏ qua các quan hệ stub không nguồn để đảm bảo tính toàn vẹn học thuật.

4. **Bảo tồn tính toàn vẹn của UI**:
   - Không redesign cấu trúc bảng ma trận hiện tại.
   - Nhúng danh sách quan hệ và các nút trích dẫn trực tiếp vào thẻ chi tiết (`Dense Detail Card`) bên phải.

---

## 3. Alternatives Considered & Rejected

- **Phương án B: Tạo `MatrixBatchCitationModal` riêng biệt**:
  - *Bị từ chối*: Làm tăng số lượng component, trùng lặp logic tab format, tăng blast radius không cần thiết.
- **Phương án C: Tự động điều hướng sang Tab Search / Lexicon khi nhấp trích dẫn**:
  - *Bị từ chối*: Vi phạm nguyên tắc bảo toàn ngữ cảnh làm việc và vi phạm quy chuẩn UX.

---

## 4. Blast Radius Assessment

- **Rất thấp (Low Blast Radius)**:
  - Chỉ bổ sung sub-panel trong `AbhidharmaMatrix.tsx` và `DivinationMatrix.tsx`.
  - Thêm helper pure function trong `src/lib/scholarCitation/batchMatrix.ts`.
  - Không sửa database/schema, không sửa registry, zero regressions trên các test suite trước đó.
