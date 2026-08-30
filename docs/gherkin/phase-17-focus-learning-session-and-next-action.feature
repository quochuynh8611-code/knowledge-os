# language: vi
Tính năng: Phiên Học Tập Trung và Điều Hướng Hành Động Kế Tiếp (Phase 17)
  Là một học giả sử dụng Knowledge OS
  Tôi muốn có một không gian học tập trung tĩnh tại với thanh trạng thái phiên học đồng hành và điều hướng rõ ràng
  Để tôi tiếp thu tri thức liền mạch, ít ma sát và dễ dàng ghi nhận thành quả đúc kết.

  Bối cảnh:
    Cho rằng hệ thống Knowledge OS đã nạp dữ liệu chủ đề "Học Thuyết Âm Dương" thuộc danh mục "Đông Y"
    Và người dùng đang ở giao diện Dashboard hoặc Chi Tiết Chủ Đề

  Kịch bản: Kích hoạt Active Learning Session Bar khi bắt đầu học
    Khi người dùng bấm nút "Bắt đầu học" cho chủ đề "Học Thuyết Âm Dương"
    Thì thanh "ActiveLearningSessionBar" xuất hiện nổi ở phía dưới màn hình
    Và thanh hiển thị đúng tên chủ đề "Học Thuyết Âm Dương"
    Và đồng hồ hiển thị thời gian đang đếm tăng dần
    Và người dùng có thể tự do đọc nội dung và tài liệu mà không bị modal che khuất

  Kịch bản: Tạm dừng và tiếp tục phiên học với bảo toàn thời gian
    Giả sử thanh ActiveLearningSessionBar đang đếm ở giây thứ 120
    Khi người dùng bấm nút "Tạm dừng"
    Thì đồng hồ dừng lại ở 02:00 và nút chuyển thành "Tiếp tục"
    Và khi người dùng bấm nút "Tiếp tục"
    Thì đồng hồ tiếp tục đếm từ 02:01 mà không bị reset về 00:00

  Kịch bản: Hoàn tất phiên học và lưu Takeaway đúc kết thành ghi chú mới
    Giả sử người dùng đã học được 25 phút trong phiên học
    Khi người dùng bấm nút "Hoàn tất" trên thanh ActiveLearningSessionBar
    Thì cửa sổ "SessionWrapupModal" xuất hiện hiển thị thời gian đã học "25 phút"
    Và khi người dùng nhập đúc kết "Âm Dương tương sinh tương khắc trong tạng tượng"
    Và chọn tiến độ hoàn thành 70% rồi bấm "Lưu thành quả"
    Thì thời gian tích lũy của chủ đề được tăng thêm 25 phút
    Và tiến độ của chủ đề được cập nhật lên 70%
    Và một ghi chú mới loại "insight" với nội dung đúc kết được tạo trong chủ đề
    Và thanh ActiveLearningSessionBar được đóng lại

  Kịch bản: Hoàn tất phiên học khi không nhập Takeaway
    Giả sử người dùng hoàn tất phiên học 15 phút nhưng để trống ô nhập đúc kết
    Khi người dùng bấm "Lưu thành quả"
    Thì thời gian tích lũy của chủ đề được tăng thêm 15 phút
    Và hệ thống KHÔNG tạo thêm ghi chú rác nào
    Và thanh ActiveLearningSessionBar được đóng lại

  Kịch bản: Tinh giản toolbar và hiển thị Next-Action Hub trong Chi tiết Chủ đề
    Khi người dùng mở trang Chi tiết Chủ đề
    Thì toolbar hiển thị nút hành động chính "Bắt đầu phiên học"
    Và các công cụ nâng cao "Obsidian", "NotebookLM", "Handoff Bundle" được gom trong menu "Công cụ nghiên cứu"
    Và đầu trang hiển thị thẻ "Hành động kế tiếp" với trạng thái học tập rõ ràng
