@phase-13 @learning-first @ux-ia-reframe
Feature: Learning-First Overview & Multi-Disciplinary Study Control Tower

  Background:
    Given hệ thống Knowledge OS đã nạp dữ liệu các môn học gồm "Đông y", "Tiếng Trung", "Phật học", "Huyền học"
    And người dùng đang ở giao diện chính của ứng dụng

  Scenario: 1. Mở app và thấy ngay đề xuất học tập tất định trong ngày (Today Recommendation)
    Given người dùng có ít nhất một chủ đề đến hạn ôn tập trong Spaced Review Queue (SM-2)
    When người dùng mở màn hình Tổng quan (Dashboard)
    Then hệ thống phải hiển thị khối hành động "Hôm nay học gì" ở vị trí nổi bật trên cùng
    And hiển thị đề xuất học tập là chủ đề đến hạn ôn tập ưu tiên cao nhất
    And hiển thị lý do đề xuất rõ ràng "Ôn tập định kỳ SM-2"
    And cung cấp nút hành động trực tiếp "Học ngay" để kích hoạt phiên tính giờ học

  Scenario: 2. Nhìn thấy môn trọng tâm và bài học tiếp theo rõ ràng (Priority Domain & Next Step)
    Given môn "Đông y" là lĩnh vực có hoạt động học gần đây nhất
    When người dùng quan sát khối môn học trên trang Tổng quan
    Then môn "Đông y" được định vị là môn học trọng tâm
    And hệ thống hiển thị rõ ràng tên bài học kế tiếp cần học trong môn "Đông y"
    And hiển thị tổng thời gian thực học tích lũy của môn "Đông y"
    And có nút hành động 1-click để vào học ngay bài học kế tiếp đó

  Scenario: 3. Bắt lại dòng chảy học tập từ hàng đợi dở dang (Resume Queue)
    Given người dùng có các chủ đề đang học dở dang với trạng thái "in_progress"
    When người dùng nhìn vào khu vực "Tiếp tục bài học" (Resume Queue)
    Then danh sách hiển thị các chủ đề được sắp xếp theo thời gian học gần nhất giảm dần
    And mỗi mục hiển thị thanh tiến độ phần trăm và nhãn thời gian tương đối
    And nhấn vào nút tiếp tục sẽ khởi động phiên học cho chủ đề tương ứng ngay lập tức

  Scenario: 4. Truy cập các công cụ chuyên sâu và tài liệu ở tầng nhận thức thấp hơn
    When người dùng cần tra cứu từ điển thuật ngữ, xem tài liệu kiến trúc hoặc mở ma trận phân tích
    Then các công cụ này vẫn truy cập được đầy đủ thông qua nhóm "Công cụ" trên Sidebar hoặc khu vực phụ trợ ở cuối Overview
    And các công cụ này không chiếm dụng không gian thị giác của các khối điều phối học tập chính

  Scenario: 5. Phân định rõ ràng vai trò giữa Sidebar và Overview (Không trùng lặp)
    When người dùng tương tác với hệ thống điều hướng
    Then Sidebar cung cấp bộ lọc chuyển mạch môn học và điều hướng 3 tầng: Học tập, Tri thức, Công cụ
    And Overview đóng vai trò bảng điều phối hành động học tập thực tế
    And không xuất hiện các biểu mẫu tìm kiếm to bản trùng lặp gây nhiễu giữa trang

  Scenario: 6. Trải nghiệm học tập ưu tiên trên Viewport di động / Màn hình hẹp
    When người dùng truy cập ứng dụng trên màn hình di động hoặc thiết bị màn hình hẹp
    Then khối hành động "Hôm nay học gì" và danh sách "Tiếp tục học" vẫn được ưu tiên hiển thị ở vị trí đầu tiên
    And người dùng có thể kích hoạt phiên học của bài học trọng tâm với một thao tác chạm trực tiếp
    And các thông tin thống kê tĩnh và công cụ tra cứu phụ không che khuất hành động học tập cốt lõi
