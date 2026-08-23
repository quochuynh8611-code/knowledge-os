# language: vi
Tính năng: Trải nghiệm Giao diện, Khung xương Tải, Thanh Lệnh Toàn Năng & Phím Tắt (Phase 1)
  Là một học giả nghiên cứu Phật học và Huyền học Đông phương
  Tôi muốn có giao diện phản hồi tức thời, thanh lệnh tìm kiếm nhanh và phím tắt điều hướng
  Để tối ưu hóa sự tập trung và tốc độ khảo cứu kinh điển

  # -------------------------------------------------------------
  # KỊCH BẢN 1: COMMAND PALETTE (Ctrl/Cmd + K)
  # -------------------------------------------------------------
  Kịch bản: Người dùng mở và đóng Command Palette bằng phím tắt
    Giả sử người dùng đang ở bất kỳ trang nào trong ứng dụng
    Khi người dùng nhấn tổ hợp phím "Ctrl+K" hoặc "Cmd+K"
    Thì hộp thoại Command Palette phải xuất hiện trên màn hình
    Và ô nhập liệu tìm kiếm phải tự động nhận tiêu điểm (focus)
    Khi người dùng nhấn phím "Escape"
    Thì hộp thoại Command Palette phải đóng lại

  Kịch bản: Tìm kiếm và kích hoạt hành động từ Command Palette
    Giả sử hộp thoại Command Palette đang mở
    Khi người dùng nhập từ khóa "Vi Diệu Pháp"
    Thì danh sách kết quả phải hiển thị chủ đề "Abhidharma - Vi Diệu Pháp Toàn Tập"
    Khi người dùng nhấn phím "Enter" hoặc nhấp chuột vào kết quả
    Thì hộp thoại Command Palette đóng lại
    Và ứng dụng điều hướng đến màn hình chi tiết của chủ đề "Abhidharma - Vi Diệu Pháp Toàn Tập"

  # -------------------------------------------------------------
  # KỊCH BẢN 2: BỘ LỌC TÌM KIẾM (SearchFilters)
  # -------------------------------------------------------------
  Kịch bản: Lọc danh sách theo Lĩnh vực (Domain) và Thẻ phân loại (Tags)
    Giả sử người dùng đang ở trang Tra Cứu hoặc Danh Sách Chủ Đề
    Khi người dùng chọn bộ lọc Lĩnh vực là "Phật Học"
    Thì chỉ các chủ đề thuộc lĩnh vực Phật học (Tipiṭaka, Abhidharma, Thiền định) được hiển thị
    Và các chủ đề thuộc Huyền học (Kỳ Môn, Dịch Học) phải bị ẩn đi
    Khi người dùng chọn thêm thẻ phân loại "#Abhidharma"
    Thì danh sách chỉ còn các chủ đề chứa thẻ "#Abhidharma"

  # -------------------------------------------------------------
  # KỊCH BẢN 3: BREADCRUMBS ĐIỀU HƯỚNG PHÂN CẤP
  # -------------------------------------------------------------
  Kịch bản: Hiển thị đúng chuỗi điều hướng phân cấp chủ đề
    Giả sử người dùng đang xem chi tiết chủ đề "89 Tâm & 52 Tâm Sở"
    Thì thanh Breadcrumbs phải hiển thị chuỗi: "Trang chủ > Tam Tạng > Abhidharma > 89 Tâm & 52 Tâm Sở"
    Khi người dùng nhấp vào mục "Abhidharma" trên thanh Breadcrumbs
    Thì ứng dụng điều hướng về danh mục "Abhidharma"

  # -------------------------------------------------------------
  # KỊCH BẢN 4: TRẠNG THÁI TRỐNG (EmptyState)
  # -------------------------------------------------------------
  Kịch bản: Hiển thị trạng thái trống khi không tìm thấy kết quả
    Giả sử người dùng tìm kiếm từ khóa không tồn tại "xyz123abc"
    Thì màn hình phải hiển thị thành phần EmptyState
    Với tiêu đề "Không tìm thấy dữ liệu khảo cứu"
    Kèm theo nút hành động "Xóa bộ lọc" hoặc "Tạo chủ đề mới"

  # -------------------------------------------------------------
  # KỊCH BẢN 5: CHUYỂN ĐỔI CHẾ ĐỘ SÁNG / TỐI (ThemeToggle)
  # -------------------------------------------------------------
  Kịch bản: Người dùng chuyển đổi giữa giao diện Sáng (Giấy cổ) và Tối (Mực nho)
    Giả sử ứng dụng đang ở giao diện Sáng (Light mode)
    Khi người dùng nhấp vào nút ThemeToggle
    Thì giao diện chuyển sang chế độ Tối (Dark mode)
    Và thẻ <html> hoặc body được bổ sung thuộc tính dark
    Và trạng thái giao diện được lưu vào localStorage để duy trì cho các phiên sau

  # -------------------------------------------------------------
  # KỊCH BẢN 6: BẢNG TRA CỨU PHÍM TẮT (ShortcutsModal)
  # -------------------------------------------------------------
  Kịch bản: Mở bảng tra cứu phím tắt bằng phím "?"
    Giả sử người dùng đang ở giao diện chính và không nhập liệu vào ô input
    Khi người dùng nhấn phím "?" (Shift + /)
    Thì bảng danh mục phím tắt ShortcutsModal phải xuất hiện
    Hiển thị đầy đủ danh sách:
      | Phím tắt       | Chức năng                        |
      | Ctrl/Cmd + K   | Mở Command Palette               |
      | Ctrl/Cmd + /   | Tra cứu phím tắt                 |
      | G sau đó D     | Về trang Tổng quan (Dashboard)   |
      | G sau đó T     | Về Cây chủ đề (Topics)           |
      | G sau đó G     | Về Biểu đồ tri thức (Graph)      |
