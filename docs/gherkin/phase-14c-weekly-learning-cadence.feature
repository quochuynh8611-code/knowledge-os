@phase-14c @weekly-cadence @learning-ui
Feature: Weekly Learning Cadence Bar & Habit Formation Tracking

  Background:
    Given hệ thống Knowledge OS đang hoạt động với dữ liệu phân cấp tri thức và lịch sử tiến độ học tập
    And người dùng đang ở giao diện Tổng quan (Dashboard Overview)

  Scenario: 1. Tính toán nhịp điệu học tập 7 ngày trong tuần ISO (Monday-to-Sunday)
    Given người dùng có các chủ đề đã học (studyProgress.lastStudied) rải rác trong tuần hiện tại
    When hệ thống tính toán nhịp độ học qua selector "getWeeklyLearningCadence"
    Then chuỗi 7 ngày từ Thứ 2 (T2) đến Chủ Nhật (CN) được xác định chính xác theo múi giờ địa phương
    And ngày có ít nhất một chủ đề được học sẽ có trạng thái "active = true"
    And tổng số ngày hoạt động và số chủ đề hoạt động được tổng hợp đầy đủ

  Scenario: 2. Phân loại trạng thái nhịp điệu học tập theo 4 cấp bậc định lượng
    When tổng số ngày học trong tuần được xác định
    Then hệ thống phân loại trạng thái học tập thành:
      | Số ngày học | Trạng thái (cadenceStatus) | Thông điệp gợi ý (headlineMessage)               |
      | 0 ngày      | starting                   | Chưa có hoạt động học trong tuần này             |
      | 1-2 ngày    | building                   | Đang khởi động nhịp học                          |
      | 3-4 ngày    | consistent                 | Duy trì nhịp độ học ổn định                      |
      | 5-7 ngày    | strong                     | Nhịp học tập xuất sắc!                           |

  Scenario: 3. Hiển thị WeeklyCadenceBar ngay dưới TodayLearningHero trên Dashboard
    When người dùng mở màn hình Dashboard
    Then thanh "WeeklyCadenceBar" hiển thị trực quan ngay bên dưới Hero đề xuất học hôm nay
    And hiển thị 7 ô ngày với nhãn T2, T3, T4, T5, T6, T7, CN
    And ngày hiện tại (isToday) được đánh dấu nổi bật bằng viền và chỉ báo riêng
    And các ngày đã học được tô màu hổ phách/amber trực quan
    And hiển thị huy hiệu tổng kết số ngày và số chủ đề (ví dụ "3/7 ngày • 4 chủ đề")

  Scenario: 4. Bỏ qua các chủ đề đã ẩn (visibility = "hidden") khỏi nhịp điệu học
    Given có chủ đề đã học trong tuần nhưng mang cờ "visibility = 'hidden'"
    When selector "getWeeklyLearningCadence" tính toán nhịp độ
    Then các chủ đề đã ẩn bị loại trừ hoàn toàn khỏi số lượng chủ đề và ngày hoạt động

  Scenario: 5. Khởi tạo lĩnh vực mới không gây nhiễu nhịp điệu học tập
    Given hệ thống được bổ sung các chủ đề mẫu (Starter Topics) cho môn học mới nhưng chưa có phiên học thực tế
    When người dùng quan sát thanh WeeklyCadenceBar
    Then các chủ đề mẫu này không làm tăng giả tạo số ngày hoạt động hay số phút học
