# language: vi
Tính năng: Trung Tâm Lĩnh Vực Nghiên Cứu Trên Dashboard (Domain Hub - Phase 8A)

  Bối cảnh:
    Cho rằng ứng dụng Không Gian Nghiên Cứu đang chạy với DataProvider
    Và người dùng truy cập vào trang Tổng quan (Dashboard)

  Kịch bản: 1. Dashboard hiển thị khối Trung Tâm Lĩnh Vực Nghiên Cứu rõ ràng
    Khi người dùng mở trang Tổng quan (Dashboard)
    Thì có phần hiển thị tiêu đề "Lĩnh Vực Nghiên Cứu" hoặc "Trung Tâm Lĩnh Vực"
    Và hiển thị các thẻ card cho từng lĩnh vực nghiên cứu gốc (Phật Học, Huyền Học và các lĩnh vực khác)
    Và mỗi thẻ card hiển thị số lượng chủ đề, tiến độ hoàn thành và nút điều hướng

  Kịch bản: 2. Lĩnh vực do người dùng tạo mới xuất hiện ngay tại Domain Hub
    Khi người dùng tạo thêm một lĩnh vực nghiên cứu mới (ví dụ "Khoa Học Tự Nhiên")
    Thì Domain Hub lập tức hiển thị một thẻ card mới tương ứng
    Và thẻ card mới hiển thị đúng tên, mô tả và số lượng chủ đề ban đầu là 0

  Kịch bản: 3. Nhấp vào thẻ Lĩnh Vực sẽ kích hoạt bộ lọc và chuyển sang Chủ Đề
    Khi người dùng nhấp vào thẻ card của một lĩnh vực (ví dụ "Phật Học")
    Thì ứng dụng thiết lập selectedCategoryFilter tương ứng với ID của lĩnh vực đó
    Và ứng dụng chuyển đổi activeTab sang "topics"
    Và giao diện hiển thị danh sách các chủ đề thuộc lĩnh vực đã chọn

  Kịch bản: 4. Bảo toàn các chức năng phụ trợ trên Dashboard
    Khi người dùng xem trang Tổng quan (Dashboard)
    Thì khối thông báo ôn tập SM-2 vẫn hiển thị khi có hàng đợi đến hạn
    Và danh sách "Tiến độ tuần này" vẫn hiển thị các chủ đề đang nghiên cứu
    Và các khối hoạt động gần đây (ghi chú, tài liệu) không bị ảnh hưởng
