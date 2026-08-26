# language: vi
Tính năng: Tái Cấu Trúc Information Architecture & Điều Hướng Đa Lĩnh Vực (Phase 7D)

  Bối cảnh:
    Cho rằng ứng dụng Không Gian Nghiên Cứu đang chạy với DataProvider
    Và người dùng xem danh mục điều hướng tại Sidebar

  Kịch bản: 1. Danh mục chính cấp 1 chỉ chứa các luồng công việc nghiên cứu phổ quát
    Khi người dùng quan sát khối "Danh mục chính" ở thanh điều hướng bên trái
    Thì khối "Danh mục chính" chỉ chứa các mục: "Tổng quan", "AI hỗ trợ", "Chủ đề", "Bản đồ tri thức", "Tiến độ", "Ghi chú", "Tài liệu", "Tìm kiếm"
    Và các mục "Ma trận phân tích", "Mô hình hệ thống", "Từ điển thuật ngữ" không còn nằm trong khối "Danh mục chính" cấp 1

  Kịch bản: 2. Các công cụ chuyên biệt được gom vào nhóm "Công cụ chuyên sâu"
    Khi người dùng quan sát thanh điều hướng bên trái
    Thì có một nhóm riêng biệt mang tên "Công cụ chuyên sâu"
    Và nhóm này chứa các công cụ: "Ma trận phân tích", "Mô hình hệ thống", "Từ điển thuật ngữ"
    Và người dùng có thể nhấp vào từng công cụ để mở giao diện phân tích tương ứng

  Kịch bản: 3. Tương thích ngược toàn diện cho activeTab cũ
    Khi activeTab của ứng dụng được thiết lập là "abhidharma_matrix", "divination_matrix", hoặc "lexicon"
    Thì ứng dụng hiển thị component tương ứng mà không bị crash
    Và nút điều hướng tương ứng trong nhóm "Công cụ chuyên sâu" được đánh dấu trạng thái Active

  Kịch bản: 4. Ngôn ngữ giao diện trung tính, đa lĩnh vực
    Khi người dùng duyệt qua thanh Sidebar và giao diện
    Thì các nhãn điều hướng mang tính trung tính khoa học ("Chủ đề", "Bản đồ tri thức", "Tiến độ", "Ghi chú", "Tài liệu", "Tìm kiếm")
