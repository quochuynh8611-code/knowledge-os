# ADR-099: Củng Cố Trải Nghiệm Xuất File Sơ Đồ Tư Duy (Phase M4a Mind Map Export UX Hardening)

**Ngày**: 2026-10-11  
**Trạng thái**: Accepted / Implemented Locally (Local-only / Uncommitted)  
**Tác giả**: Staff Software Engineer kiêm Technical Architect  
**Phạm vi**: Mind Map Export Subsystem (`MindMapView.tsx`)  

---

## 1. Ngữ Cảnh & Vấn Đề (Context & Problem Statement)

Trong hệ thống Knowledge OS, tính năng xuất sơ đồ tư duy ra tệp đồ họa vector (SVG) và ảnh bitmap độ phân giải cao (PNG) đóng vai trò then chốt giúp người dùng lưu trữ, xuất bản và đưa kiến thức vào bài giảng hoặc tài liệu nghiên cứu.

Module hạ tầng kỹ thuật `src/lib/mindmapExport.ts` đã hoàn thành chức năng tính toán layout W3C XML SVG và rasterize Canvas 2D ở tỷ lệ scale 2x. Tuy nhiên, tầng giao diện tương tác (`MindMapView.tsx`) gặp phải ba hạn chế trải nghiệm:
1. **Sai lệch tên tệp xuất trong chế độ lưu trữ**: Tên tệp xuất luôn được đặt theo tên của node gốc (`projection.rootTitle`), bỏ qua tên tài liệu đã lưu (`activeDocumentSummary.title`). Khi hai giá trị này khác nhau, tệp tải về làm mất ngữ cảnh tài liệu người dùng đã định nghĩa.
2. **Thiếu phản hồi trực quan xác nhận thành công**: Khi nhấn xuất file, trình duyệt tự động tải tệp qua thẻ `<a>` nhưng không có thông báo xác nhận thành công trên giao diện.
3. **Nuốt ngoại lệ trong im lặng khi xuất ảnh bị lỗi**: Khi bộ nhớ canvas bị tràn hoặc giải mã ảnh thất bại, ngoại lệ bị nuốt bởi `console.error`, không cung cấp cảnh báo cho người dùng và có nguy cơ để lại rò rỉ bộ nhớ Blob URL.

---

## 2. Các Quyết Định Kiến Trúc (Architectural Decisions)

### Quyết định 1: Ưu Tiên Tiêu Đề Tài Liệu Thay Vì Tiêu Đề Node Gốc
- **Quy tắc phân giải**:
  - Khi ở chế độ `saved-document`: Ưu tiên tuyệt đối `activeDocumentSummary.title`. Nếu không có, fallback về `projection.rootTitle`, rồi fallback về `"Topic"`.
  - Khi ở chế độ `live-topic`: Sử dụng `projection.rootTitle`, rồi fallback về `"Topic"`.
- **Lý do**: Tài liệu được lưu trữ là một đơn vị tri thức hoàn chỉnh (MindMapDocument). Người dùng quản lý tệp theo tên tài liệu (Document Title). Việc đồng bộ quy ước này áp dụng thống nhất cho cả SVG và PNG.
- **Thực thi**: Xử lý trực tiếp tại tầng orchestration [`MindMapView.tsx`](../../src/components/mindmap/MindMapView.tsx) trước khi gọi helper `getMindMapExportFilename`, giúp giữ cho `mindmapExport.ts` hoàn toàn độc lập và thuần túy (pure domain logic).

### Quyết định 2: Tái Sử Dụng Thành Phần `Toast` Có Sẵn Trong Codebase
- Thay vì cài đặt thêm thư viện thông báo từ bên ngoài (như `react-hot-toast`, `notistack`) hoặc hiển thị `window.alert`, hệ thống tái sử dụng component [`src/components/ui/Toast.tsx`](../../src/components/ui/Toast.tsx).
- **Phản hồi thành công**: Hiển thị Toast màu xanh lá (`type="success"`, `role="status"`).
- **Phản hồi thất bại**: Hiển thị Toast màu đỏ (`type="error"`, `role="alert"`).
- **Lợi ích**: Đồng bộ thiết kế với toàn bộ ứng dụng, chuẩn WAI-ARIA cho người khuyết tật, không phát sinh chi phí bundle size.

### Quyết định 3: Thu Dọn Tài Nguyên & Reset Loading Bằng Khối `finally`
- Đối với luồng bất đồng bộ của `handleExportPng`, `URL.revokeObjectURL(url)` và `setIsExportingPng(false)` được đặt trong khối `finally`.
- **Lý do**: Đảm bảo an toàn bộ nhớ trình duyệt, ngăn chặn memory leak ngay cả khi quá trình tải tệp bị hủy hoặc phát sinh ngoại lệ, đồng thời không bao giờ để nút bấm bị kẹt ở trạng thái disabled.

### Quyết định 4: Đảm Bảo Tính Bất Biến Trạng Thái (Zero State Invariants Mutation)
- Thao tác xuất tệp là tác vụ **Read-Only**:
  - Không kích hoạt `applyTreeMutation` hay `setWorkingDocumentTree`.
  - Không thay đổi cờ `isDirty` (tài liệu sạch vẫn giữ nguyên sạch).
  - Không đẩy bất kỳ entry nào vào `historyState` (Undo/Redo stack được bảo toàn).

---

## 3. Bảng So Sánh Các Phương Án (Considered Alternatives)

| Tiêu chí | Phương án A: Tái sử dụng `Toast` & phân giải tại `MindMapView` (Được chọn) | Phương án B: Tạo Modal Cấu Hình Xuất File Phức Tạp | Phương án C: Sửa đổi core schema của `mindmapExport.ts` |
| :--- | :--- | :--- | :--- |
| **Độ phức tạp** | **Tối thiểu**: Sửa đổi tinh gọn trên 1 file giao diện duy nhất | **Cao**: Cần thêm modal mới, state form, nút bấm xác nhận | **Trung bình**: Gây ảnh hưởng lan truyền tới các unit test cũ |
| **Trải nghiệm người dùng** | **Tức thì (1-click export)**: Tải file ngay, có Toast phản hồi | **Rườm rà**: Thêm bước nhấp xác nhận không cần thiết | Không thay đổi về mặt trải nghiệm |
| **Khả năng tái sử dụng** | Tận dụng 100% component và CSS có sẵn | Tốn công thiết kế và duy trì | Không mang lại giá trị mới |
| **Blast Radius** | **Cực nhỏ**: Chỉ trong 2 handler xuất file | **Lớn**: Thêm modal, tăng độ phức tạp của view | Trung bình |

---

## 4. Hệ Quả & Đánh Giá (Consequences)

### Tích cực
- Tên tệp xuất ra chuẩn xác, phản ánh đúng tên tài liệu nghiên cứu của người dùng.
- Trải nghiệm người dùng rõ ràng, minh bạch với thông báo thành công hoặc thông báo lỗi thân thiện.
- Không phát sinh rò rỉ bộ nhớ hoặc khóa giao diện khi gặp lỗi rasterize.
- Không làm ảnh hưởng đến luồng Undo/Redo hay trạng thái lưu trữ của tài liệu.

### Giới hạn & Bước tiếp theo
- Chưa hỗ trợ tùy chọn độ phân giải tùy biến (1x, 2x, 4x) hoặc nền trong suốt (transparent background). Hạng mục này có thể xem xét trong tương lai nếu người dùng có nhu cầu chuyên sâu.
- Các cải tiến về thanh trượt zoom và căn chỉnh viewport được phân tách độc lập và xử lý trong Phase M4b.

---

## 5. Đánh Giá Vùng Ảnh Hưởng (Blast Radius Notes)
- **Tập tin sản phẩm bị thay đổi**: 1 tập tin duy nhất: [`src/components/mindmap/MindMapView.tsx`](../../src/components/mindmap/MindMapView.tsx).
- **Tập tin kiểm thử bổ sung**: [`tests/integration/mindmap-export-workflow.test.tsx`](../../tests/integration/mindmap-export-workflow.test.tsx).
- **Hồi quy**: 0 lỗi hồi quy, 66/66 bài kiểm tra liên quan đều đạt (100% PASS).
- **TypeScript**: 0 lỗi kiểu dữ liệu (`npx tsc --noEmit` đạt Exit code 0).
