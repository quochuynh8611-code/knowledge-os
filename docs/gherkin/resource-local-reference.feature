# Feature: Resource Management — Local File Reference & Web URL Support
# ADR: ADR-011 (docs/adr/ADR-011-resource-local-file-reference.md)
# Schema: src/lib/validation.ts (ResourceSchema, ResourceCreateSchema)
# UI: src/components/modals/ResourceFormModal.tsx, ResourceViewerModal.tsx
# Tests: tests/unit/resource-local-reference.test.ts

Feature: Quản lý Tài liệu Tham khảo — Hỗ trợ Tham chiếu File Cục bộ & URL Web
  # Đảm bảo hệ thống hỗ trợ đính kèm tài liệu tham khảo thông qua đường dẫn tệp cục bộ
  # mà không upload binary hay làm phình dung lượng lưu trữ của ứng dụng.

  Background:
    Given Hệ thống Knowledge OS đang hoạt động với danh sách topics chuẩn
    And Schema Resource hỗ trợ cả hai trường tùy chọn 'url' và 'filePath'

  # -------------------------------------------------------------------
  Scenario: 1. Thêm tài liệu tham chiếu file cục bộ với filePath hợp lệ
    When Người dùng thêm tài liệu mới với:
      | topicId  | topic-abhidharma-tong-quan                       |
      | title    | Thắng Pháp Tập Yếu Luận PDF                      |
      | type     | pdf                                              |
      | author   | Trưởng Lão Anuruddha                             |
      | filePath | /Users/mr.chem/Documents/PhatHoc/Abhidhamma.pdf   |
      | notes    | Bản scan PDF chất lượng cao lưu trên máy cục bộ  |
    Then Resource mới được tạo thành công với ID hợp lệ
    And Trường filePath lưu chính xác đường dẫn tệp cục bộ
    And Dung lượng lưu trữ của resource không vượt quá 2KB (không chứa binary)

  # -------------------------------------------------------------------
  Scenario: 2. Thêm tài liệu bằng đường dẫn Web URL
    When Người dùng thêm tài liệu mới với:
      | topicId  | topic-thien-vipassana                            |
      | title    | Đại Niệm Xứ Kinh (Mahā Satipaṭṭhāna Sutta)       |
      | type     | article                                          |
      | author   | HT. Thích Minh Châu dịch                         |
      | url      | https://suttacentral.net/dn22                    |
    Then Resource mới được tạo thành công với ID hợp lệ
    And Trường url lưu chính xác liên kết web
    And Trường filePath là undefined hoặc rỗng

  # -------------------------------------------------------------------
  Scenario: 3. Thêm tài liệu kết hợp cả URL và File Path cục bộ
    When Người dùng thêm tài liệu mới chứa đồng thời:
      | url      | https://ctext.org/book-of-changes/vi             |
      | filePath | /Volumes/Data/Books/KinhDich/ChuDichToanThu.pdf  |
    Then Resource mới được lưu trữ đầy đủ cả hai nguồn tham chiếu
    And Người dùng có thể tùy chọn mở liên kết web hoặc sao chép đường dẫn file cục bộ

  # -------------------------------------------------------------------
  Scenario: 4. Ràng buộc nguồn tài liệu — Không được để trống cả URL và File Path
    When Người dùng cố gắng tạo tài liệu chỉ có tiêu đề mà không có cả 'url' lẫn 'filePath'
    Then Hệ thống hoặc form validation cảnh báo yêu cầu cung cấp ít nhất một nguồn tài liệu

  # -------------------------------------------------------------------
  Scenario: 5. Bảo toàn 4 INITIAL_RESOURCES hiện hữu trong SSOT
    When Đọc mảng INITIAL_RESOURCES từ src/data/initialData.ts
    Then Toàn bộ 4 tài liệu hạt nhân (res-1, res-2, res-3, res-4) đều hợp lệ với ResourceSchema
    And Không có tài liệu hạt nhân nào bị mất dữ liệu hoặc lỗi kiểu dữ liệu

  # -------------------------------------------------------------------
  Scenario: 6. Cập nhật tài liệu chuyển đổi giữa URL và File Path
    Given Một tài liệu ban đầu chỉ có URL web
    When Người dùng cập nhật bổ sung thêm filePath cục bộ
    Then Dữ liệu tài liệu được cập nhật thành công mà không làm thay đổi ID và createdAt ban đầu

  # -------------------------------------------------------------------
  # [FUTURE CONSIDERATION / OUT OF SCOPE FOR CURRENT PHASE]
  # Scenario 7: Định hướng hiển thị huy hiệu và hành động sao chép trên Viewer/Manager
  # (Sẽ thực hiện trong phase UX Enhancements kế tiếp)
  # Scenario: 7. Hiển thị phân biệt nguồn tài liệu trên giao diện (UI Badges & Actions)
  #   When Người dùng xem danh sách tài liệu trong ResourcesManager hoặc TopicDetail
  #   Then Tài liệu có filePath được hiển thị icon nhận diện tệp cục bộ kèm nút 'Sao chép đường dẫn'
  #   And Tài liệu có url được hiển thị icon liên kết web kèm nút 'Mở liên kết'
