# 📦 Backup & Restore Test Fixtures (Evidence Pack)

Thư mục này chứa các tệp fixture JSON mẫu phục vụ cho việc kiểm thử tự động, kiểm định tính toàn vẹn (Verification Pass) và diễn tập khôi phục (Restore Drill) cho người vận hành.

---

## 📑 Danh Mục Tệp Fixtures

### 1. `valid-snapshot.json`
- **Mục đích:** Bản sao lưu snapshot hợp lệ tuân thủ Semver `2.0.0`.
- **Cấu trúc:**
  - Checksum SHA-256 chính xác (`69da0aca4ed05f3a63e257f38a1ec23f5a37d4e8c673ecdabc054b990185acd2`).
  - Số lượng thực thể: 2 danh mục, 2 chủ đề (kèm SM-2 studyProgress), 2 ghi chú (kèm `sourcePath`), 2 tài liệu (kèm `filePath`), 3 thẻ.
  - **Zero Binary Ingestion:** Không chứa bất kỳ dữ liệu nhị phân PDF/Audio nào.

### 2. `legacy-snapshot.json`
- **Mục đích:** Bản sao lưu snapshot định dạng cũ (Legacy v1.x).
- **Cấu trúc:** Mảng phẳng các thực thể ở root, không có cấu trúc bao bọc `data` và header checksum v2.
- **Tính năng kiểm thử:** Kiểm tra khả năng tương thích ngược (Backward Compatibility) của parser và Restore Drill fallback.

### 3. `malformed-snapshot.json`
- **Mục đích:** Bản sao lưu bị lỗi hoặc bị chỉnh sửa trái phép (Tampered/Corrupted).
- **Cấu trúc:** Mã băm SHA-256 sai lệch hoàn toàn so với nội dung `data` bên trong.
- **Tính năng kiểm thử:** Đảm bảo hệ thống từ chối an toàn (Safety Rejection) với thông điệp lỗi rõ ràng và tuyệt đối không làm thay đổi dữ liệu thật.

### 4. `manifest-mixed-statuses.json`
- **Mục đích:** Bảng kê kiểm toán thư viện tệp (**File Library Manifest**) chứa đầy đủ 4 trạng thái kiểm toán.
- **Các trạng thái đại diện:**
  - `exists`: Tệp hợp lệ nằm trong thư viện gốc.
  - `unverified`: Tệp chưa xác minh trong môi trường sandbox trình duyệt.
  - `missing`: Tệp có đường dẫn nhưng không tồn tại trên ổ đĩa.
  - `outside_library`: Tệp nằm ngoài thư mục `canonicalLibraryRoot`.

---

## 🛡️ Rào Chắn An Toàn (Safety & Isolation)
- Toàn bộ tệp trong thư mục này chỉ phục vụ mục đích kiểm thử tự động và tài liệu diễn tập.
- Tuyệt đối không được import trực tiếp vào mã nguồn runtime của ứng dụng để tránh bị đóng gói vào bundle production (`dist/`).
