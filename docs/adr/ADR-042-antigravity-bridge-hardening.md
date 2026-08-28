# ADR-042: Củng Cố Cầu Nối Antigravity & NotebookLM (Bridge Hardening & Safe Handoff)

- **Mã ADR:** ADR-042
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Staff Software Engineer / AI Integration Architect
- **Phạm vi:** `src/lib/antigravityPipeline.ts`, `docs/runbooks/*`

---

## 1. Bối Cảnh (Context)
Cơ chế Handoff giữa Knowledge OS và Antigravity 2.0 / NotebookLM đang hoạt động ổn định ở tầng giao diện, nhưng tầng lưu trữ UI Tracker và manifest serialization còn tồn tại các rủi ro:
- Dùng `localStorage` thô không bọc try-catch an toàn.
- Không có giới hạn độ dài danh sách jobs (unbounded array), có nguy cơ làm phình storage.
- Thiếu schema validation cho file manifest JSON liên tiến trình.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Chuẩn Hóa Safe Storage Helpers**:
   - Sử dụng `safeGetLocalStorageItem` và `safeSetLocalStorageItem` từ `src/lib/storage.ts` cho toàn bộ các hàm đọc/ghi trong `antigravityPipeline.ts`.
2. **Áp Dụng Rolling Buffer 50 Items cho Job Tracker**:
   - `saveHandoffJob` tự động cắt gọt và chỉ lưu tối đa 50 bản ghi gần nhất (`list.slice(0, 50)`).
3. **Bổ Sung Pure Manifest Validator (`validateAntigravityJobManifest`)**:
   - Cung cấp hàm kiểm tra tính hợp lệ của manifest JSON (`version`, `jobId`, `topic`, `files: { source, prompt, manifest }`) trước khi parse hoặc thực thi.
4. **Thiết Lập Runbook Headless Cho Antigravity Agent**:
   - Xuất bản tài liệu `docs/runbooks/antigravity-notebooklm-bridge-runbook.md` quy định rõ ràng giao thức đọc input và ghi output cho Agent.

---

## 3. Đánh Giá Trade-offs (Two-Way Door)

- **Ưu điểm**:
  - Bảo vệ dung lượng `localStorage`, triệt tiêu lỗi QuotaExceeded từ Job Tracker.
  - Tăng độ tin cậy khi các script tự động hoặc agent đọc manifest.
  - Hoàn toàn độc lập với Offline Sync Subsystem.
- **Rủi ro kiểm soát**:
  - Các job quá cũ (> 50 bản ghi trước) sẽ bị tự động dọn dẹp khỏi UI Tracker, tuy nhiên các file artifact trong `.agents/handoffs/` trên ổ đĩa vẫn được giữ nguyên.
