# Đặc Tả Kỹ Thuật: Hướng Dẫn Vận Hành Thư Viện Tệp & Sẵn Sàng Sao Lưu (Post-Phase 6b)

> **Tài liệu tham chiếu:** [`ADR-017`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/adr-017-file-library-backup-architecture.md) · [`docs/specs/post-phase6-file-library-backup-architecture.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase6-file-library-backup-architecture.md)  
> **Người thực hiện:** Staff Software Engineer / Technical Architect  
> **Trạng thái:** Active / Approved  

---

## 1. Mục Tiêu

Cung cấp cho học giả và người vận hành hệ thống:
1. Bản thiết kế cấu trúc thư mục lưu trữ vật lý tiêu chuẩn (**Recommended Library Folder Hierarchy**).
2. Hướng dẫn chi tiết quy trình sao lưu trọn gói 3 thành phần kết hợp Obsidian Vault (**3-Pillar + Vault Backup Readiness**).
3. Minh bạch hóa hoàn toàn giới hạn sandbox của trình duyệt: Không bao giờ báo trạng thái `exists` giả mạo khi chưa có capability quét đĩa trực tiếp, sử dụng `unverified` minh bạch.
4. Cung cấp tiện ích quản lý cấu hình thư mục gốc chuẩn (`canonicalLibraryRoot`) có kiểm tra hợp lệ, lưu trữ bền vững và phản hồi trực quan.

---

## 2. Cấu Trúc Thư Mục Thư Viện Tệp Vật Lý Chuẩn (Recommended Structure)

Hệ thống khuyến nghị người dùng tổ chức thư viện nghiên cứu trên ổ cứng theo cấu trúc:

```text
Knowledge-Library/
├── PDF/           # Sách, giáo trình, bài báo học thuật, luận văn PDF
├── Notes/         # Bản dịch thô, trích yếu, tệp Markdown ghi chép ngoài
├── Attachments/   # Biểu đồ, hình ảnh minh họa, tệp âm thanh/video bài giảng
├── Inbox/         # Tài liệu mới thu thập chờ phân loại và gắn vào topic
└── Exports/       # Nơi lưu trữ các tệp Snapshot JSON và File Manifest JSON
```

---

## 3. Rào Chắn Vận Hành (Operational Invariants & Guardrails)

1. **Không Tự Động Thao Tác Tệp Vật Lý:** Ứng dụng tuyệt đối không tự ý di chuyển, đổi tên, xóa, hoặc copy file trên máy tính của người dùng.
2. **Zero Binary Ingestion:** Không lưu dữ liệu nhị phân PDF/Audio vào cơ sở dữ liệu hoặc snapshot JSON.
3. **Minh Bạch Trạng Thái Trình Duyệt (Browser Limitation Handling):**
   - Trong môi trường trình duyệt client-side, hệ thống không thể tự ý quét ổ cứng do sandbox bảo mật.
   - Mọi tệp có đường dẫn hợp lệ sẽ được hiển thị ở trạng thái `unverified` (Đã kê khai đường dẫn) thay vì tự nhận là `exists` giả tạo.
   - Trạng thái `outside_library` vẫn được phát hiện chính xác dựa trên phân tích tiền tố đường dẫn với `canonicalLibraryRoot`.

---

## 4. Danh Mục Sao Lưu Toàn Diện (Complete Backup Readiness)

Một bản sao lưu toàn diện hoàn chỉnh bao gồm 4 thành phần:

| Thành phần | Định dạng | Mục đích | Vị trí lưu trữ |
| :--- | :--- | :--- | :--- |
| **1. Application Snapshot** | `.json` (Semver 2.x) | Dữ liệu logic, chủ đề, ghi chú, tiến độ SM-2 | `Exports/` hoặc `backups/` |
| **2. File Library Manifest** | `.json` (v1.0) | Bảng kê kiểm toán đường dẫn tệp vật lý | `Exports/` hoặc `backups/` |
| **3. Thư mục Thư viện Tệp** | Thư mục vật lý | Chứa toàn bộ file PDF, Audio, Video thật | `Knowledge-Library/` |
| **4. Obsidian Vault (Nếu có)** | Thư mục Vault | Chứa các liên kết Markdown hai chiều | Thư mục Vault cục bộ |

---

## 5. Pure Helpers Bổ Sung (`src/lib/fileLibraryAudit.ts`)

- `DEFAULT_RECOMMENDED_LIBRARY_STRUCTURE`: Khai báo cấu trúc thư mục mẫu.
- `getRecommendedLibraryTreeText()`: Trả về chuỗi mô tả cây thư mục phục vụ hiển thị hướng dẫn.
- `validateLibraryRootPath(path: string)`: Kiểm tra tính hợp lệ cơ bản của đường dẫn thư mục gốc.
