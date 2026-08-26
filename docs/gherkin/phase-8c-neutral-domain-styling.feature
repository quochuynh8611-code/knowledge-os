# language: vi
Tính năng: Trung Tính Hóa & Tự Động Định Kiểu Lĩnh Vực Nghiên Cứu (Phase 8C)

  Bối cảnh:
    Cho rằng ứng dụng Không Gian Nghiên Cứu đang hiển thị trang Dashboard và Sidebar
    Và người dùng có nhiều lĩnh vực nghiên cứu khác nhau

  Kịch bản: 1. Loại bỏ logic hard-code ưu tiên riêng cho Phật học và Huyền học
    Khi hệ thống render các thẻ card trong Domain Hub
    Thì phong cách trực quan được xác định qua cơ chế resolver trung tính
    Và không tồn tại điều kiện rẽ nhánh hard-code riêng biệt ép buộc theo tên slug

  Kịch bản: 2. Lĩnh vực do người dùng tạo có bảng màu và nhận diện chuyên nghiệp tương đương
    Khi người dùng tạo thêm nhiều lĩnh vực nghiên cứu mới (ví dụ "Khoa Học Tự Nhiên", "Kinh Tế Học", "Lịch Sử Thế Giới")
    Thì mỗi lĩnh vực nhận được một phong cách màu sắc và icon hài hòa từ bảng màu học thuật
    Và các lĩnh vực mới không bị gộp chung vào một màu fallback đơn điệu duy nhất

  Kịch bản: 3. Tính tất định (Deterministic) của phong cách trực quan
    Khi cùng một lĩnh vực nghiên cứu được render nhiều lần hoặc trên các bề mặt khác nhau (Dashboard và Sidebar)
    Thì màu sắc và biểu tượng của lĩnh vực đó luôn nhất quán và không bị thay đổi ngẫu nhiên giữa các lần render

  Kịch bản: 4. Bảo toàn tính ổn định và tương thích ngược
    Khi hiển thị các lĩnh vực thiếu metadata màu sắc hoặc icon
    Thì hệ thống tự động phân giải fallback an toàn mà không gây crash hoặc lỗi layout
