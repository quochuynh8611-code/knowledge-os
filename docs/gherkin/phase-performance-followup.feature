# language: vi
Tính năng: Hậu Kiểm Hiệu Năng, Đo Lường Runtime & Toàn Vẹn Tải Module (Phase Performance-Followup)

  Bối cảnh:
    Cho rằng ứng dụng Không Gian Nghiên Cứu đã được triển khai cơ chế phân chia bundle và lazy loading tại commit 8f7a549

  Kịch bản: 1. App shell không tải JSZip khi khởi động
    Khi người dùng mở ứng dụng lần đầu tại trang chủ Dashboard
    Thì bundle ban đầu index.js và các vendor chunks cốt lõi được nạp
    Và tệp mã nguồn jszip.min-*.js không được trình duyệt gửi yêu cầu tải về

  Kịch bản: 2. JSZip chỉ tải khi export hoặc import ZIP
    Khi người dùng mở modal Obsidian hoặc Quản lý dữ liệu và kích hoạt hành động xuất tệp ZIP
    Thì hàm generateObsidianVaultZip thực hiện dynamic import gói jszip
    Và tệp jszip.min-*.js được nạp về bộ nhớ
    Và tệp lưu trữ ZIP định dạng Blob hợp lệ được tạo thành công

  Kịch bản: 3. Lazy tabs tải on-demand theo điều hướng của người dùng
    Khi người dùng chuyển sang tab chuyên sâu như Đồ Thị Tri Thức hoặc Ma Trận
    Thì chunk tương ứng của tab đó mới được tải về qua mạng
    Và giao diện hiển thị fallback TabLoadingFallback trong thời gian chờ nạp
    Và nội dung tab hoàn chỉnh xuất hiện mượt mà không gây lỗi ứng dụng

  Kịch bản: 4. Lazy modals không gây lỗi runtime và white screen
    Khi người dùng kích hoạt mở các modal tích hợp như ObsidianBridgeModal, NotebookLMStudioModal, AntigravityHandoffModal
    Thì component modal được tải và render trọn vẹn bên trong một React Suspense boundary
    Và không phát sinh cảnh báo "A component suspended while rendering"
    Và các props cùng callbacks đóng/mở được truyền nhận chính xác

  Kịch bản: 5. Reopen modal hoặc tab không gây lỗi lifecycle
    Khi người dùng đóng một modal lazy và sau đó mở lại modal đó lần thứ hai
    Thì modal hiển thị ngay lập tức từ bộ nhớ đệm
    Và không xảy ra hiện tượng treo màn hình hoặc mất liên kết dữ liệu với chủ đề đang chọn

  Kịch bản: 6. Build không hồi quy vượt ngưỡng cảnh báo 500 kB
    Khi hệ thống tiến hành biên dịch production bundle với npm run build
    Thì entry chunk index-*.js có kích thước không vượt quá 500 kB
    Và toàn bộ các chunk tách biệt (vendor-charts, vendor-react, jszip) đều nằm trong giới hạn an toàn

  Kịch bản: 7. Không thêm prefetch nếu chưa có bằng chứng thực tế
    Khi xem xét cấu hình nạp module của hệ thống
    Thì cơ chế tải On-Demand thuần túy được duy trì mặc định
    Và không tự ý tải trước các module chuyên sâu khi chưa có bằng chứng xác nhận tần suất sử dụng vượt trội
