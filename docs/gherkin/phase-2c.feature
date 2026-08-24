Feature: Phase 2C - Data Management UI, Disaster Recovery Center and Real-Time Health Indicator

  Background:
    Given Người dùng đang mở Dashboard Knowledge OS
    And Ứng dụng đang kết nối với máy chủ API PostgreSQL

  # --- Group 1: Backup Export Flow ---
  Scenario: 1. Export backup snapshot thành công
    Given Người dùng mở modal Data Management ở tab "Sao Lưu"
    When Người dùng nhấn "Sao Lưu Toàn Bộ Dữ Liệu (.json)"
    Then Hệ thống gọi ApiDataRepository.exportBackupSnapshot()
    And Trình duyệt tạo Blob và tải về file "phat-hoc-huyen-hoc-backup-YYYY-MM-DD.json"
    And Thông báo thành công hiển thị mã SHA-256 Checksum 64-hex

  Scenario: 2. Export backup thất bại khi mất kết nối mạng
    Given Mạng máy chủ bị gián đoạn (Network Error)
    When Người dùng nhấn "Sao Lưu Toàn Bộ Dữ Liệu (.json)"
    Then Giao diện hiển thị cảnh báo lỗi "Không thể xuất bản sao lưu: Máy chủ không phản hồi"
    And State dữ liệu hiện tại trên UI không bị biến đổi

  # --- Group 2: Client Pre-Validation & Checksum Parity ---
  Scenario: 3. Từ chối file snapshot hỏng cấu trúc schema ngay tại client
    Given Người dùng chọn file snapshot JSON bị thiếu các trường bắt buộc
    When FileReader hoàn tất đọc nội dung file
    Then Trạng thái UI chuyển sang "invalid_file"
    And Hiển thị danh sách chi tiết các trường vi phạm schema
    And Nút xác nhận phục hồi bị vô hiệu hóa

  Scenario: 4. Phát hiện Checksum Mismatch bằng Web Crypto SHA-256 parity
    Given Người dùng upload file snapshot bị sửa đổi 1 ký tự trong mảng topics
    When Client thực thi băm SHA-256 trên chuỗi canonical data bằng WebCrypto
    Then Mã băm tính toán không khớp với trường checksum trong header
    And Trạng thái UI chuyển sang "checksum_invalid"
    And Cảnh báo đỏ hiển thị "Mã băm không khớp: File đã bị sửa đổi hoặc hỏng hóc"
    And Tuyệt đối không phát sinh HTTP request lên máy chủ

  # --- Group 3: Restore Modes & Safety Gate ---
  Scenario: 5. Khôi phục dữ liệu chế độ Merge (Gộp thông minh LWW)
    Given File snapshot hợp lệ đã được upload và vượt qua kiểm tra checksum
    When Người dùng chọn chế độ "Gộp Dữ Liệu (Merge LWW)"
    And Nhấn nút "Tiến Hành Gộp Dữ Liệu"
    Then Gửi POST request /api/backup/restore với mode "merge"
    And Nhận về HTTP 200 OK và chuyển sang trạng thái "success_server"

  Scenario: 6. Chặn chế độ Replace khi chuỗi xác nhận an toàn chưa khớp
    Given File snapshot hợp lệ đã được upload
    When Người dùng chọn chế độ "Thay Thế Toàn Bộ (Replace All)"
    And Nhập sai chuỗi (ví dụ: "xác nhận thay thế" hoặc để trống)
    Then Nút "Tiến Hành Thay Thế Dữ Liệu" ở trạng thái disabled

  Scenario: 7. Mở khóa và thực thi Replace sau khi gõ chính xác "XÁC NHẬN THAY THẾ"
    Given File snapshot hợp lệ đã được upload
    When Người dùng chọn chế độ "Thay Thế Toàn Bộ (Replace All)"
    And Nhập chính xác từng ký tự hoa "XÁC NHẬN THAY THẾ"
    And Nhấn "Tiến Hành Thay Thế Dữ Liệu"
    Then Gửi POST request /api/backup/restore với mode "replace" và confirmReplace là true
    And Nhận về HTTP 200 OK và chuyển sang trạng thái "success_server"

  # --- Group 4: Post-Restore Rehydration Lifecycle ---
  Scenario: 8. Tự động rehydrate DataContext thành công sau khi server restore
    Given Quá trình restore server đã hoàn tất thành công (trạng thái "success_server")
    When Hệ thống tự động kích hoạt reloadAllData() ở trạng thái "rehydrating"
    And Dữ liệu mới được tải về thành công từ máy chủ
    Then State topics, notes, resources trên DataContext được cập nhật mới
    And Cache LocalStorage được cập nhật đồng bộ
    And Trạng thái UI chuyển sang "completed"

  Scenario: 9. Xử lý cách ly an toàn khi rehydrate thất bại sau server restore
    Given Quá trình restore server đã hoàn tất thành công (trạng thái "success_server")
    When Bước reloadAllData() gặp sự cố mất mạng đột ngột
    Then Trạng thái UI chuyển sang "rehydrate_failed"
    And Hiển thị thông báo "Dữ liệu máy chủ đã phục hồi thành công nhưng giao diện chưa cập nhật"
    And Nút "Thử Tải Lại Dữ Liệu" hiển thị để người dùng thử lại
    And State in-memory cũ được bảo lưu 100%, không bị reset về rỗng

  # --- Group 5: LocalStorage Unsupported Contract (Option A) ---
  Scenario: 10. LocalStorageDataRepository từ chối các thao tác disaster recovery
    Given Ứng dụng đang chạy ở chế độ offline với LocalStorageDataRepository
    When Gọi phương thức restoreBackupSnapshot hoặc exportBackupSnapshot
    Then Repository từ chối bằng lỗi "UNSUPPORTED_OFFLINE_OPERATION"
    And Không ghi đè các khóa localStorage hiện tại

  # --- Group 6: DB Health Badge Monitoring ---
  Scenario: 11. Health Badge hiển thị trực quan trạng thái DB và độ trễ
    Given Máy chủ đang hoạt động với độ trễ phản hồi 15ms
    When Component HealthBadge polling endpoint /api/health/db
    Then Hiển thị chấm xanh lá kèm nhãn "DB: 15ms"

  Scenario: 12. Health Badge hiển thị trạng thái mất kết nối khi server offline
    Given Máy chủ API bị ngắt kết nối
    When Component HealthBadge polling gặp lỗi fetch
    Then Hiển thị chấm đỏ nhấp nháy kèm nhãn "DB: Mất kết nối"
