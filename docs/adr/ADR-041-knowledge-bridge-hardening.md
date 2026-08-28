# ADR-041: Chuẩn Hóa & Củng Cố Cầu Nối Tri Thức Hệ Thống (Knowledge Bridge Hardening)

- **Mã ADR:** ADR-041
- **Trạng thái:** ACCEPTED
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Staff Software Engineer / Knowledge Architect
- **Phạm vi:** `docs/specs/*`, `docs/runbooks/*`, `docs/gherkin/*`

---

## 1. Bối Cảnh (Context)
Hệ thống Knowledge OS sau khi hoàn thành 9 micro-phases đã sở hữu một pipeline ngoại tuyến phức hợp và hoàn chỉnh. Tuy nhiên, việc thiếu một runbook vận hành tập trung và bản đồ tri thức tổng thể có thể dẫn đến hiện tượng trôi lệch tri thức (Knowledge Drift) khi chuyển đổi giữa các kỹ sư hoặc các phiên làm việc của AI Agent.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Phân Định 3 Tầng Tri Thức (Three Tiers of Truth)**:
   - **Code Truth (Mã nguồn thực tế)**: Là chân lý thực thi (`src/lib/*`, `src/services/*`).
   - **Specification Truth (Hợp đồng đặc tả)**: Quy định hành vi mong đợi (`docs/specs/*`, `docs/adr/*`, `docs/gherkin/*`).
   - **Operational Runbook (Cẩm nang vận hành)**: Dành cho lập trình viên, operator và AI Agent tra cứu nhanh khi bảo trì, vận hành và debug (`docs/runbooks/*`).
2. **Đóng Băng Tạm Thời Mã Nguồn (Code Freeze for Phase P4.0)**:
   - Toàn bộ công việc trong Phase P4.0 tập trung 100% vào việc tài liệu hóa, củng cố tri thức và lập runbook; không thay đổi bất kỳ file mã nguồn thực thi nào nhằm bảo toàn trạng thái regression đã đạt 123/123 PASS.
3. **Thiết Lập Runbook Vận Hành Cho Toàn Bộ Sync Subsystem**:
   - Xuất bản tài liệu `docs/runbooks/offline-sync-subsystem-runbook.md` tổng hợp toàn bộ Invariants, Failure Modes, Recovery Workflows và Glossary.

---

## 3. Đánh Giá Trade-offs (Two-Way Door)

- **Ưu điểm**:
  - Triệt tiêu hoàn toàn nguy cơ hiểu lầm kiến trúc giữa các Agent.
  - Cung cấp cẩm nang tra cứu tức thời cho operator khi có sự cố.
  - Zero blast radius vào mã nguồn sản phẩm.
- **Rủi ro kiểm soát**:
  - Cần cập nhật Runbook định kỳ nếu trong tương lai có thêm các thay đổi lớn ở tầng storage (ví dụ chuyển sang IndexedDB).
