Feature: Root category topic filtering and Add Domain CTA

  Scenario: Phật Học hiển thị topic thuộc category con
    Given root category "Phật Học" có các category con như "Tam Tạng", "Abhidharma", "Thiền Định"
    And các topic được gán vào các category con đó
    When người dùng chọn lọc theo "Phật Học"
    Then tất cả topic thuộc các category con của Phật Học phải được hiển thị
    And số lượng chủ đề của Phật Học không được bằng 0

  Scenario: Huyền Học hiển thị topic thuộc category con
    Given root category "Huyền Học" có các category con như "Tam Thức", "Dịch Học", "Phong Thủy"
    And các topic được gán vào các category con đó
    When người dùng chọn lọc theo "Huyền Học"
    Then tất cả topic thuộc các category con của Huyền Học phải được hiển thị
    And số lượng chủ đề của Huyền Học không được bằng 0

  Scenario: Add Domain CTA visible in TopicTree
    Given người dùng đang ở màn hình cây phân cấp chủ đề (TopicTree)
    When giao diện TopicTree được render
    Then nút "+ Thêm lĩnh vực" phải xuất hiện rõ ràng tại khu vực header hoặc bộ lọc
    And người dùng có thể kích hoạt form tạo lĩnh vực mới trực tiếp từ TopicTree

  Scenario: New root category does not receive old topics
    Given người dùng tạo một root category mới tên là "Khoa Học Tự Nhiên"
    When hệ thống tính toán số lượng chủ đề cho "Khoa Học Tự Nhiên"
    Then root category mới phải có đúng 0 chủ đề
    And không được đếm nhầm bất kỳ topic nào của Phật Học hay Huyền Học
