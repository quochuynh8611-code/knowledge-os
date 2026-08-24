# ADR-012: Bộ Chọn Tệp Cục Bộ (Local File Picker UX) & Cầu Nối Hệ Tri Thức Tam Giác (Obsidian, NotebookLM, Antigravity)

- **Mã ADR:** ADR-012
- **Trạng thái:** PHASE 1, PHASE 2A & PHASE 2B IMPLEMENTED & VERIFIED (Phase 3 PROPOSED)
- **Ngày tạo:** 2026-08-24
- **Ngày hoàn tất Phase 1:** 2026-08-24
- **Ngày hoàn tất Phase 2a:** 2026-08-24
- **Ngày hoàn tất Phase 2b:** 2026-08-24
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi đã hoàn thành:**
  - Phase 1: `src/components/modals/ResourceFormModal.tsx` · `tests/unit/resource-form-modal-file-picker.test.tsx` (6/6 PASS)
  - Phase 2a: `src/lib/obsidian.ts` · `src/components/integrations/ObsidianBridgeModal.tsx` · `tests/unit/obsidian-lib.test.ts` (9/9 PASS) · `tests/unit/obsidian-bridge-integration.test.tsx` (7/7 PASS)
  - Phase 2b: `src/lib/notebooklm.ts` · `src/components/integrations/NotebookLMStudioModal.tsx` · `tests/unit/notebooklm-lib.test.ts` (7/7 PASS) · `tests/unit/notebooklm-studio-integration.test.tsx` (6/6 PASS)

---

## 1. Bối Cảnh (Context)

Sau khi hoàn thành tính năng lưu trữ tham chiếu tệp cục bộ (`filePath`) ở ADR-011, người dùng gặp bất tiện khi phải tự nhập/paste đường dẫn tệp thủ công trong `ResourceFormModal`.

Đồng thời, hệ thống Knowledge OS cần hoàn thiện chu trình khảo cứu kết nối giữa 3 nền tảng tri thức:
1. **Knowledge OS Dashboard (App hiện tại)**: Trung tâm cấu trúc hóa và theo dõi tiến độ học tập 35 chủ đề canonical.
2. **Obsidian Vault (Local Markdown PKM)**: Kho lưu trữ ghi chú dạng Markdown liên kết hai chiều (`[[Wiki Links]]`) trên máy người dùng.
3. **Google NotebookLM (Grounded AI Engine)**: Đóng gói tài liệu nguồn sạch để tạo Audio Overview và Study Guides.
4. **Antigravity Research Scholar (Agent AI)**: Handoff bundle chuyên sâu phục vụ nghiên cứu liên ngành Phật học - Huyền học.

---

## 2. Ranh Giới Môi Trường & Giới Hạn Trình Duyệt (Runtime Boundaries)

### 2.1. Giới hạn bảo mật Web Browser Sandbox đối với File Path
- Trong môi trường trình duyệt tiêu chuẩn (Chrome/Safari/Firefox), đối tượng `File` trả về từ `<input type="file">` **không bao giờ cung cấp đường dẫn tuyệt đối đầy đủ của hệ điều hành** (ví dụ `/Users/mr.chem/...` hoặc `C:\...`) vì lý do bảo mật (chỉ cung cấp `file.name`, `file.size`, `file.type`).
- **Giải pháp UX an toàn & tối ưu**:
  1. Cung cấp nút **"Duyệt tệp trên máy"** để người dùng chọn tệp nhanh qua native file dialog.
  2. Tự động trích xuất `file.name` để điền vào `filePath`.
  3. Tự động nhận diện định dạng tệp (PDF, Audio, Video, Sách) và tự điền tiêu đề nếu ô tiêu đề đang trống.
  4. Hiển thị thông báo minh bạch: *"Trình duyệt giới hạn bảo mật không đọc được đường dẫn tuyệt đối. Đã tự động điền tên tệp; bạn có thể chỉnh sửa hoặc thêm tiền tố thư mục nếu muốn."*
  5. Người dùng vẫn có toàn quyền sửa/bổ sung đường dẫn cụ thể vào ô `filePath`.
  6. **Zero Binary Ingestion**: Tuyệt đối không đọc binary (`FileReader`) để không làm phình dung lượng app/database.

---

## 3. Thiết Kế Các Phase Triển Khai (Phased Roadmap)

### 🔹 Phase 1: Local File Picker UX (Trọng tâm vòng này)
- **Mục tiêu**: Người dùng bấm nút "Duyệt tệp", chọn file, tự động điền `filePath`, `type`, `title`.
- **Invariants**:
  - Không đọc binary vào state/store.
  - Vẫn tuân thủ 100% `ResourceCreateSchema` (có `filePath` hoặc `url`).
  - Web URL mode không bị ảnh hưởng.

### 🔹 Phase 2a: Obsidian Open / Export UX Flow
- **Mục tiêu**: Tận dụng `src/lib/obsidian.ts` và `ObsidianBridgeModal.tsx`:
  - Cấu hình và lưu trữ Vault Name (`getStoredVaultName()`, `setStoredVaultName()`).
  - Điều hướng mở Obsidian qua giao thức `obsidian://open?vault=...&file=...` hoặc tạo note mới `obsidian://new`.
  - Xuất toàn bộ 35 topics + notes + resources ra gói ZIP chuẩn cấu trúc Obsidian Vault (có `00_Map_Of_Content.md` và `[[Wiki Links]]`).
- **Ranh giới**: Không làm đồng bộ 2 chiều (two-way sync) hoặc parse ngược vault vào app.

### 🔹 Phase 2b: NotebookLM Source Packaging & Artifacts Studio
- **Mục tiêu**: Tận dụng `src/lib/notebooklm.ts` và `NotebookLMStudioModal.tsx`:
  - Đóng gói 1-click toàn bộ Topic + Luận thuyết + Notes + Resources thành tài liệu nguồn chuẩn (`packageSourceForNotebookLM()`).
  - Hỗ trợ 1-click Copy Source hoặc Tải tệp `.md` để upload vào Google NotebookLM.
  - Quản lý và lưu trữ các sản phẩm tổng hợp từ NotebookLM (Study Guide, Audio Overview Summary, Briefing Doc).
- **Ranh giới**: Không gọi API ngầm không chính thức của NotebookLM; chỉ hỗ trợ đóng gói và lưu trữ artifact.

### 🔹 Phase 3: Antigravity Research Scholar Handoff Bundle
- **Mục tiêu**: Sinh gói bàn giao prompt & context có cấu trúc (Handoff Package) chuẩn bị cho Antigravity AI:
  - Bối cảnh chủ đề, câu hỏi nghiên cứu mở, các liên kết tri thức kèm trọng số, danh mục thư tịch trích dẫn.
  - Định dạng chuẩn Markdown tối ưu hóa cho reasoning model.

---

## 4. Kế Hoạch Test-First cho Phase 1

Tạo test suite `tests/unit/resource-form-modal-file-picker.test.tsx` kiểm thử:
1. Render nút "Duyệt tệp trên máy" trong local mode.
2. Ẩn input file thực và kích hoạt khi click nút duyệt tệp.
3. Khi chọn file `.pdf`, tự động điền `filePath: "kinh-trung-bo.pdf"`, chọn type `pdf`, và điền title nếu rỗng.
4. Khi chọn file `.mp3`, tự động nhận diện type `audio`.
5. Hiển thị thông báo giải thích giới hạn sandbox trình duyệt.
6. Payload submit không chứa binary/base64, giữ nguyên contract `ResourceCreateSchema`.
