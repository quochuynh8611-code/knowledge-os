# Đặc Tả Kỹ Thuật: Chuẩn Hóa Đường Dẫn Tài Liệu & Gia Cố Trải Nghiệm Hướng Dẫn Sao Lưu (Post-Phase 6c)

> **Tài liệu tham chiếu:** [`ADR-017`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/adr-017-file-library-backup-architecture.md) · [`docs/specs/post-phase6b-operational-file-library-setup.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase6b-operational-file-library-setup.md)  
> **Người thực hiện:** Staff Software Engineer / Technical Architect  
> **Trạng thái:** Active / Approved  

---

## 1. Bối Cảnh (Context) & Vấn Đề (Current Pain Points)

1. **Sai lệch định dạng đường dẫn:** Người dùng khi nhập `filePath` thủ công (đặc biệt giữa Windows `D:\...` và macOS/Linux `/Users/...`) thường để lại khoảng trắng dư thừa, dấu gạch chéo ngược lộn xộn hoặc dấu xuyệt kép (`//`).
2. **Thiếu cảnh báo sớm tại điểm nhập liệu:** Khi nhập tài liệu nằm ngoài `canonicalLibraryRoot`, form không đưa ra cảnh báo sớm, dẫn đến nguy cơ người dùng chỉ sao chép thư mục `Knowledge-Library/` mà bỏ sót tài liệu nằm ở `Downloads/` hay `Desktop/`.
3. **Hiển thị đường dẫn thiếu nhất quán:** Trong `ResourceViewerModal`, tệp cục bộ chưa hiển thị rõ đường dẫn chuỗi đã chuẩn hóa và thiếu nút 1-click Sao Chép Đường Dẫn (`Copy Path`) để mở trên hệ điều hành.
4. **Hiểu lầm về phạm vi sao lưu:** Người dùng dễ nhầm lẫn rằng tệp App Snapshot JSON đã bao gồm nội dung nhị phân (bytes) của sách PDF.

---

## 2. Mục Tiêu (Goals) & Phạm Vi (Scope)

### Mục Tiêu:
- **Chuẩn hóa tự động (Deterministic Normalization):** Tự động chuẩn hóa `filePath` thông qua `normalizeFilePath` trước khi lưu vào State/Database.
- **Xác thực chặt chẽ (Form Validation):** Bắt buộc có `filePath` hợp lệ khi ở chế độ `local` và từ chối chuỗi rỗng/khoảng trắng.
- **Cảnh báo vị trí tệp (Early Boundary Warning):** Hiển thị cảnh báo trực quan khi `filePath` nằm ngoài `canonicalLibraryRoot` đã cấu hình.
- **Trải nghiệm xem trước & Sao chép (Viewer Hardening):** Hiển thị đường dẫn tệp cục bộ rõ ràng trong `ResourceViewerModal` kèm nút sao chép đường dẫn (1-click copy).
- **Nhắc nhở sao lưu rõ ràng (Unambiguous Backup Guidance):** Nhấn mạnh trên giao diện xuất Snapshot rằng bản sao lưu JSON là dữ liệu metadata/logic và yêu cầu sao chép thư mục tệp vật lý.

### Non-Goals (Ngoài Phạm Vi):
- Không thay đổi Prisma schema hoặc REST API backend.
- Không tự động di chuyển, đổi tên, hoặc tạo file trên ổ đĩa vật lý của người dùng.
- Không đọc nạp dữ liệu nhị phân PDF vào database (giữ nguyên Zero Binary Ingestion).
- Không tự tạo trạng thái `exists` giả lập trên môi trường trình duyệt.

---

## 3. Ràng Buộc & Quy Tắc Kỹ Thuật (Technical Rules & Invariants)

1. **Chuẩn Hóa Đường Dẫn:**
   - Sử dụng `normalizeFilePath(rawPath)`: Trim khoảng trắng, thay `\` thành `/`, gộp dấu `/` liên tiếp, bỏ `/` ở cuối (trừ root).
2. **Kiểm Tra Ranh Giới (Boundary Checking):**
   - Đọc `canonicalLibraryRoot` từ `localStorage.getItem('knowledge_os_library_root_path')`.
   - Sử dụng `classifyPathRelativeToRoot(normalizedPath, libraryRoot)`: Nếu `'outside'`, hiển thị banner cảnh báo rủi ro bỏ sót khi sao lưu.
3. **Tương Thích Ngược (Backward Compatibility):**
   - Các tài liệu cũ không có `filePath` hoặc chỉ có `url` tiếp tục hoạt động trơn tru.
   - Ghi chú dạng Obsidian `sourcePath` được giữ nguyên vẹn.
4. **Blast Radius:**
   - `src/components/modals/ResourceFormModal.tsx`
   - `src/components/modals/ResourceViewerModal.tsx`
   - `src/components/resources/ResourcesManager.tsx`
   - `src/components/modals/ExportImportModal.tsx`
