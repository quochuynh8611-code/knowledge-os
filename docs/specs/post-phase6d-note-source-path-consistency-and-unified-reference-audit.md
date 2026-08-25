# Đặc Tả Kỹ Thuật: Đồng Bộ Đường Dẫn Nguồn Ghi Chú & Kiểm Toán Tham Chiếu Hợp Nhất (Post-Phase 6d)

> **Tài liệu tham chiếu:** [`ADR-017`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/adr-017-file-library-backup-architecture.md) · [`docs/specs/post-phase6b-operational-file-library-setup.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase6b-operational-file-library-setup.md) · [`docs/specs/post-phase6c-resource-path-normalization-and-guided-backup-ux.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase6c-resource-path-normalization-and-guided-backup-ux.md)  
> **Người thực hiện:** Staff Software Engineer / Technical Architect  
> **Trạng thái:** Active / Approved  

---

## 1. Bối Cảnh (Context) & Vấn Đề (Pain Points)

1. **Thiếu trường tham chiếu tệp nguồn cho Ghi chú:** Interface `Note` trước đây chỉ lưu `content` dạng text Markdown trong database/state mà chưa khai báo chính thức trường `sourcePath?: string` để liên kết tới tệp `.md` vật lý trên máy tính hoặc trong Obsidian Vault.
2. **Kiểm toán tham chiếu phân mảnh:** Bảng kê `File Library Manifest` tuy đã hỗ trợ duyệt note nhưng người dùng chưa thể khai báo hay quản lý `sourcePath` trực tiếp trên biểu mẫu ghi chú (`NoteFormModal`).
3. **Thiếu nút tương tác nhanh với Obsidian:** Người dùng chưa thể 1-click copy đường dẫn tệp ghi chú hoặc mở trực tiếp qua giao thức `obsidian://open`.
4. **Mơ hồ về phạm vi sao lưu Note:** Người dùng không phân biệt rõ: Nội dung text `Note.content` đã được lưu trong `App Snapshot JSON`, còn các tệp `.md` nằm trong thư mục Obsidian Vault / `Knowledge-Library/Notes/` cần được sao chép cùng với thư mục tệp vật lý.

---

## 2. Mục Tiêu (Goals) & Non-Goals

### Mục Tiêu:
- **Mở rộng mô hình `Note` an toàn:** Thêm thuộc tính tùy chọn `sourcePath?: string` vào interface `Note` đảm bảo tương thích ngược 100%.
- **Chuẩn hóa đường dẫn ghi chú:** Tự động chuẩn hóa `sourcePath` qua `normalizeFilePath` khi lưu ghi chú trong `NoteFormModal`.
- **Cảnh báo tệp ngoài thư viện gốc:** Hiển thị cảnh báo màu hổ phách khi `sourcePath` của ghi chú nằm ngoài `canonicalLibraryRoot`.
- **Hợp nhất bảng kê Manifest:** Bảng kê `file-library-manifest.json` ghi nhận đầy đủ cả tài liệu (`resource`) và ghi chú (`note`) theo cùng định dạng đường dẫn chuẩn hóa.
- **Tiện ích sao chép & Mở Obsidian:** Bổ sung nút sao chép đường dẫn (1-click copy) và nút mở Obsidian trên thẻ ghi chú khi có `sourcePath`.
- **Minh bạch hóa hướng dẫn sao lưu:** Giải thích rõ trong tài liệu và giao diện rằng App Snapshot JSON đã bảo toàn nội dung ghi chú trong ứng dụng, còn sao lưu thư mục vật lý là để bảo toàn các tệp Markdown trên ổ đĩa.

### Non-Goals (Ngoài Phạm Vi):
- Không biến ứng dụng thành một engine sync 2 chiều tự động đọc/ghi ngầm vào Obsidian Vault.
- Không tự ý di chuyển, tạo, hoặc sửa đổi file `.md` trên ổ đĩa vật lý của người dùng.
- Không thay đổi Prisma schema hoặc REST API backend trong increment này.

---

## 3. Ràng Buộc Kỹ Thuật (Technical Rules & Invariants)

1. **Chuẩn Hóa Đường Dẫn Note:**
   - Sử dụng `normalizeFilePath(rawPath)`: Đồng bộ chuẩn hóa dấu xuyệt `/`, loại bỏ khoảng trắng thừa.
2. **Kiểm Tra Ranh Giới (Boundary Checking):**
   - Đối chiếu `sourcePath` với `canonicalLibraryRoot` qua `classifyPathRelativeToRoot`.
3. **Tương Thích Ngược Tuyệt Đối (Zero Regression):**
   - Các ghi chú cũ không có `sourcePath` tiếp tục render và hoạt động bình thường, xuất hiện dưới trạng thái `unspecified` trong manifest audit mà không gây lỗi.
4. **Blast Radius:**
   - `src/types/index.ts`
   - `src/components/modals/NoteFormModal.tsx`
   - `src/components/notes/NotesManager.tsx`
   - `src/lib/fileLibraryAudit.ts`
