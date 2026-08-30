@phase-16 @taxonomy @safe-merge @persistence
Feature: Dynamic Taxonomy Cleanup, Safe Category Merge & Rehydration Persistence

  Background:
    Given hệ thống Knowledge OS đang hoạt động với cấu trúc danh mục và chủ đề học tập
    And các danh mục cũ gồm "Kinh Tế" (cat-root-kinh-te) và "Kinh Tế Học" (cat-root-kinh-te-hoc) có thể tồn tại trong dữ liệu người dùng cũ

  Scenario: 1. Gộp danh mục an toàn không làm mất chủ đề, ghi chú hay tài liệu
    Given danh mục nguồn "Kinh Tế" có các chủ đề trực tiếp và ghi chú liên kết
    When quản trị viên thực hiện gộp sang danh mục đích "Kinh Tế & Tài Chính" qua helper "mergeCategoryData"
    Then toàn bộ chủ đề của danh mục nguồn được chuyển categoryId sang danh mục đích
    And danh mục nguồn được gỡ bỏ khỏi danh sách danh mục
    And 100% ghi chú, tài liệu tham khảo và tiến độ học SM-2 được bảo toàn nguyên vẹn

  Scenario: 2. Bảo vệ danh mục con khi gộp danh mục cha
    Given danh mục nguồn có các danh mục con (child categories)
    When thực hiện gộp danh mục
    Then parentId của các danh mục con được trỏ lại chính xác vào danh mục đích
    And không có danh mục con nào bị mồ côi (orphan parentId)

  Scenario: 3. Khóa an toàn giao diện ngăn xóa hủy diệt danh mục kinh tế cũ
    When người dùng nhấn nút xóa (icon Thùng rác) tại danh mục "Kinh Tế" hoặc "Kinh Tế Học" trên Cây Phân Cấp
    Then hệ thống bật hộp thoại xác nhận gộp an toàn vào "Kinh Tế & Tài Chính"
    And nếu người dùng đồng ý, kích hoạt action "mergeCategories" thay vì xóa trắng
    And nếu người dùng hủy, danh mục được giữ nguyên vẹn

  Scenario: 4. Đồng bộ bền vững trạng thái gộp qua chu trình Reload và Rehydration
    Given người dùng đã gộp danh mục "Kinh Tế Học" vào "Kinh Tế & Tài Chính"
    When ứng dụng khởi động lại hoặc gọi "reloadAllData()"
    Then danh mục nguồn đã gộp không bị hồi sinh trở lại
    And các chủ đề vẫn duy trì liên kết với danh mục đích

  Scenario: 5. Khôi phục mặc định (Reset to Default) dọn sạch hoàn toàn các ID kinh tế cũ
    When người dùng kích hoạt "resetToDefaultData()"
    Then toàn bộ các root category kinh tế cũ (cat-root-kinh-te, cat-root-kinh-te-hoc, cat-root-kinh-te-tai-chinh) bị xóa sạch
    And giao diện mặc định không hiển thị bất kỳ nhãn hay nút xóa nào của các nhóm kinh tế cũ
