# ADR-046: Mô Hình Xếp Hạng Kết Quả & Khử Trùng Lặp Cho Command Palette

- **Mã ADR:** ADR-046
- **Trạng thái:** APPROVED
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Lead Frontend Architect / Product Experience Lead
- **Phạm vi:** `src/hooks/useCommandPalette.ts`, `src/components/search/CommandPalette.tsx`

---

## 1. Bối Cảnh (Context)
Tại Phase P5.0 và P5.1, Command Palette đã hỗ trợ Recent History và Deep Actions. Tuy nhiên, khi tìm kiếm từ khóa, kết quả trả về chỉ được lọc thông qua `.filter()` bảo lưu thứ tự mảng tĩnh ban đầu mà không có thuật toán xếp hạng theo mức độ liên quan. Điều này dẫn đến tình trạng các kết quả khớp phụ ở phần mô tả xuất hiện trước các kết quả khớp chính xác ở phần tiêu đề. Đồng thời, việc nạp `customItems` chưa có cơ chế khử trùng lặp theo `id`.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Mô Hình Tính Điểm Trọng Số Khớp Trong Bộ Nhớ (In-Memory Tiered Scoring)**:
   - Sử dụng pure function tính điểm cho từng item thay vì thêm thư viện index nặng.
   - Thang điểm:
     - Exact Title Match: 100 điểm.
     - Title Prefix: 80 điểm.
     - Title Substring: 60 điểm.
     - Keyword Match: 40 điểm.
     - Description Match: 20 điểm.
     - Category Match: 10 điểm.
2. **Điểm Cộng Ngữ Cảnh Gần Đây (Recency Boost +5)**:
   - Các lệnh có điểm khớp cơ sở > 0 và nằm trong `recentIds` được cộng thêm +5 điểm để ưu tiên đưa lên trên các mục cùng hạng.
3. **Khử Trùng Lặp ID Với Quyền Ghi Đè (ID-Based Dedup with Override)**:
   - Sử dụng `Map<string, CommandPaletteItem>` để merge `baseItems` và `customItems`.
   - `customItems` có cùng `id` sẽ ghi đè `baseItem` tương ứng (Last-write-wins), ngăn chặn triệt để lỗi duplicate React key và lỗi tính `selectedIndex`.
4. **Chuỗi Phân Xử Hòa Điểm Tất Định (Explicit Tie-Break Chain)**:
   - `Sort logic`: `Score Descending` $\rightarrow$ `Category Priority Order` $\rightarrow$ `Original Insertion Order`.

---

## 3. Đánh Giá Trade-offs (Trade-offs & Alternatives)

| Tiêu chí | Quyết định chọn | Lựa chọn thay thế bị bác bỏ | Lý do |
| :--- | :--- | :--- | :--- |
| **Công cụ xếp hạng** | Pure function in-memory scoring | Thư viện full-text search (FlexSearch / Fuse.js) | Số lượng item < 100, pure function thực thi < 0.2ms, zero bundle overhead. |
| **Chiến lược khử trùng lặp** | Last-write-wins (customItem override) | Bỏ qua customItem trùng hoặc báo lỗi | Cho phép caller linh hoạt override action hoặc icon của item mặc định khi cần. |
| **Giá trị Recency Boost** | +5 điểm | +50 điểm hoặc không cộng điểm | +5 điểm đủ để phân xử giữa các item cùng hạng (ví dụ cùng prefix) mà không lấn át một item khớp chính xác hơn. |
