# language: vi
Tính năng: Tái định vị thương hiệu Nghiên Cứu và Chế độ đọc ghi chú chuyên sâu

  Bối cảnh:
    Cho rằng ứng dụng Không Gian Nghiên Cứu đã khởi chạy thành công
    Và dữ liệu ghi chú và chủ đề đã được nạp vào bộ nhớ

  Kịch bản: 1. Hiển thị nhận diện thương hiệu "Nghiên Cứu" trên thanh điều hướng Navbar
    Khi người dùng quan sát thanh điều hướng trên cùng (Navbar)
    Thì người dùng nhìn thấy tiêu đề thương hiệu chính là "Nghiên Cứu"
    Và không còn hiển thị nhãn độc quyền "Knowledge OS"

  Kịch bản: 2. Thanh điều hướng bên (Sidebar) sử dụng ngôn ngữ trung tính, dễ tiếp cận
    Khi người dùng quan sát danh mục điều hướng chính trên Sidebar
    Thì các mục điều hướng hiển thị các nhãn ngắn gọn, trung tính như:
      | Mục             |
      | Tổng quan       |
      | AI hỗ trợ       |
      | Chủ đề          |
      | Bản đồ tri thức |
      | Tiến độ         |
      | Ghi chú         |
      | Tài liệu        |
      | Tìm kiếm        |
    Và các công cụ chuyên sâu vẫn có thể truy cập mà không chiếm ưu tiên áp đảo

  Kịch bản: 3. Người dùng nhấp vào thẻ ghi chú để mở chế độ đọc tập trung (Focus Reading View)
    Khi người dùng đang ở trang Quản lý Ghi chú
    Và người dùng nhấp vào một thẻ ghi chú có tiêu đề "Khảo cứu phương pháp học sâu"
    Thì một hộp thoại chế độ đọc tập trung (Focus Reader) xuất hiện
    Và hiển thị tiêu đề ghi chú lớn, rõ ràng
    Và nội dung ghi chú được trình bày với kích thước chữ dễ đọc, khoảng cách dòng thoáng
    Và các liên kết Wiki link dạng [[Tên chủ đề]] có thể tương tác được

  Kịch bản: 4. Người dùng đóng chế độ đọc tập trung để quay lại danh sách ghi chú
    Cho rằng người dùng đang mở chế độ đọc tập trung của một ghi chú
    Khi người dùng nhấp nút "Đóng" hoặc nhấn phím "Escape"
    Thì hộp thoại đọc tập trung biến mất
    Và danh sách ghi chú vẫn duy trì trạng thái bộ lọc và vị trí cuộn ban đầu
