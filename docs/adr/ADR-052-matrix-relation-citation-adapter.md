# ADR-052: MatrixRelation Citation Adapter and Composite Relational Normalization

**Status**: PROPOSED  
**Date**: 2026-08-29  
**Author**: Staff Software Engineer / Technical Architect  
**Deciders**: Engineering Lead, Technical Architect  
**Context**: Phase P8.1 — Relational Citation & Matrix Export Engine

---

## 1. Context & Problem Statement

Phase P8.0 xây dựng pipeline trích dẫn học thuật dựa trên mô hình Intermediate Representation `ScholarCitationViewModel`. Pipeline này vận hành xuất sắc cho các thực thể nguyên tử (`LexiconEntry`, `SystemNode`).
Trong Phase P8.1, hệ thống cần hỗ trợ xuất trích dẫn cho `MatrixRelation` (các mối liên kết trục chéo giữa 2 SystemNodes trên ma trận tri thức).

Một `MatrixRelation` không phải là một tài liệu độc lập mà là một mối liên kết có hướng (Row Node $\rightarrow$ Column Node) dựa trên chứng cứ văn bản kinh điển (`canonicalEvidence`), diễn dịch học thuật (`interpretiveNote`) và nguồn xuất xứ (`sources: SourceAttribution[]`).

Vấn đề cần giải quyết:
1. Làm thế nào để trích xuất citation cho `MatrixRelation` mà không làm thay đổi các pure formatters (BibTeX, CSL, APA, Chicago, MLA, Harvard) đã ổn định ở P8.0?
2. Làm thế nào để phân giải tên của 2 nodes liên quan (`rowNodeId`, `colNodeId`) một cách deterministic và độc lập mà không gây circular dependencies?
3. Làm thế nào để ngăn chặn Scholarly False Confidence đối với các quan hệ suy đoán học thuật (`scholarly_conjecture`) hoặc thiếu nguồn?

---

## 2. Decision

1. **Giữ nguyên Schema & Registry**:
   - Không sửa `MatrixRelation` type trong `src/types/scholarSuite.ts`.
   - Không sửa cấu trúc `SourceAttribution`.
   - Không sửa `MATRIX_RELATION_REGISTRY`.

2. **Áp dụng Adapter Pattern qua `normalizeMatrixRelation()`**:
   - Xây dựng hàm pure normalizer `normalizeMatrixRelation(relation: MatrixRelation, rowNode?: SystemNode, colNode?: SystemNode): ScholarCitationViewModel`.
   - Nếu không truyền `rowNode`/`colNode`, hàm tự động tra cứu từ `SYSTEM_NODE_REGISTRY`.
   - Tiêu đề quan hệ được tạo dạng chuẩn: `${rowTitle} (${relationType}) → ${colTitle}`.

3. **Tách biệt Evidence Level & Chú giải diễn dịch**:
   - `canonicalEvidence` được ưu tiên đưa vào nội dung phân đoạn/ghi chú nguồn gốc.
   - `interpretiveNote` được đánh dấu rõ ràng là chú giải hiện đại, không nâng cấp thành factual source.
   - Nếu `evidenceLevel === 'scholarly_conjecture'`, thêm cờ cảnh báo rõ ràng `[Evidence: Scholarly Conjecture]`.

4. **Tái sử dụng 100% Formatters & Escaping của P8.0**:
   - Formatters (`bibtex.ts`, `csl.ts`, `apa.ts`, `chicago.ts`, `mla.ts`, `harvard.ts`) tiếp tục nhận `ScholarCitationViewModel` và không cần biết chi tiết bên trong của `MatrixRelation`.

5. **Mở rộng Type-Safe Generator & Modal**:
   - `generateScholarCitations(item: LexiconEntry | SystemNode | MatrixRelation)`.
   - `ScholarCitationModalProps` nhận thêm `relation?: MatrixRelation | null`.

---

## 3. Alternatives Considered & Rejected

- **Phương án B: Viết bộ Formatter riêng cho MatrixRelation (`formatMatrixBibTeX`, `formatMatrixCSL`)**:
  - *Bị từ chối*: Gây trùng lặp logic escaping, vi phạm nguyên tắc DRY, tăng blast radius và chi phí bảo trì.
- **Phương án C: Trực tiếp mutate schema `MatrixRelation` để nhúng sẵn ViewModel**:
  - *Bị từ chối*: Vi phạm nguyên tắc Separation of Concerns giữa Domain Model và Presentation/Export Layer.

---

## 4. Blast Radius Assessment

- **Rất hẹp**:
  - Thêm hàm vào `src/lib/scholarCitation/normalizer.ts`.
  - Mở rộng type signature trong `src/lib/scholarCitation/generator.ts` và `src/components/modals/ScholarCitationModal.tsx`.
  - Không ảnh hưởng tới bất kỳ bài test nào của P8.0.

---

## 5. Rollback Strategy

Nếu có sự cố, toàn bộ thay đổi gói gọn trong hàm adapter và test suite tương ứng, có thể hoàn tác trong một commit duy nhất mà không ảnh hưởng tới P8.0 baseline.
