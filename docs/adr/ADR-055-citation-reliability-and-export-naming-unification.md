# ADR-055: Citation Feedback Timer Hardening and Unified Export Filename Policy

**Status**: PROPOSED  
**Date**: 2026-08-29  
**Author**: Staff Software Engineer / Technical Architect  
**Deciders**: Engineering Lead, Technical Architect  
**Context**: Phase P8.4 — Citation Reliability Hardening & Export Naming Unification

---

## 1. Context & Problem Statement

1. **Timer Lifecycle & Stale Feedback**:
   - `ScholarCitationModal` sử dụng `setTimeout` để tự động tắt trạng thái `copied`, `copyError`, và `statusMessage`. Tuy nhiên nếu người dùng bấm nhiều lần hoặc đóng modal nhanh chóng, timer không được hủy, dẫn tới nguy cơ cập nhật state trên unmounted component hoặc ghi đè phản hồi mới bởi timer cũ.
2. **Export Filename Inconsistency**:
   - Tên file xuất hiện tại đang được ghép chuỗi thủ công tại UI components (`matrix_relations_${selectedCitta.namePali}.bib`), tiềm ẩn nguy cơ lỗi khi tên chứa ký tự tiếng Pali có dấu, khoảng trắng hoặc ký tự đặc biệt không an toàn cho filesystem.

---

## 2. Decision

1. **Quản trị Timer qua `useRef` và Cleanup Hook**:
   - Dùng `feedbackTimerRef` để lưu ID timer.
   - Luôn `clearTimeout` trước khi đặt timer mới.
   - Thêm cleanup trong `useEffect` khi modal unmount.

2. **Xây dựng module thuần `src/lib/scholarCitation/filename.ts`**:
   - Chuẩn hóa tên tệp xuất single và batch thành chuỗi ASCII safe (`[a-zA-Z0-9_-]`).
   - Loại bỏ nguy cơ path traversal (`../`) và invalid OS characters.
   - Tái sử dụng helper này xuyên suốt `ScholarCitationModal` và `AbhidharmaMatrix`.

---

## 3. Blast Radius Assessment

- **Rất thấp (Low Blast Radius)**:
  - Chỉ bổ sung `filename.ts` và refactor nhẹ logic đặt tên / quản lý timer.
  - Không thay đổi bất kỳ citation formatter output hay schema dữ liệu nào.
