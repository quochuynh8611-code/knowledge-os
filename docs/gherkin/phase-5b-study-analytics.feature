# language: vi
Tính năng: Workstream 5B — Spaced Repetition (SM-2) Study Session Analytics & Retention Dashboard
  Để giúp người nghiên cứu tối ưu hóa nhịp độ học tập, nắm bắt tỷ lệ duy trì trí nhớ và dự báo khối lượng ôn tập
  Là một Nhà Nghiên Cứu Tri Thức
  Tôi muốn một bộ máy phân tích dữ liệu SM-2 thuần túy in-memory và bảng điều khiển trực quan hóa chu kỳ trí nhớ dự phóng.

  Bối cảnh:
    Cho hệ thống Knowledge OS đang chứa 35 topics canonical kèm thông tin tiến độ studyProgress hiện tại

  # -----------------------------------------------------------------------------
  # SCENARIO 1: ESTIMATED RETENTION RATE CALCULATION (PURE IN-MEMORY)
  # -----------------------------------------------------------------------------
  Kịch bản: Tính toán tỷ lệ ghi nhớ dự phóng (Estimated Retention Rate) in-memory
    Cho danh sách các chủ đề đã có dữ liệu chu kỳ ôn tập (interval, easeFactor, lastReviewed)
    Khi bộ máy phân tích tính toán chỉ số duy trì trí nhớ
    Thì tỷ lệ ghi nhớ dự phóng trung bình được trả về trong khoảng từ 0% đến 100%
    Và các chủ đề có interval dài và easeFactor cao có tỷ lệ suy giảm trí nhớ chậm hơn theo mô hình Ebbinghaus

  # -----------------------------------------------------------------------------
  # SCENARIO 2: MASTERY STAGE DISTRIBUTION (STATE-BASED GROUPING)
  # -----------------------------------------------------------------------------
  Kịch bản: Phân loại danh mục chủ đề theo các giai đoạn thuần thục kiến thức
    Cho danh sách 35 chủ đề với số lần lặp lại (repetitions) và trạng thái hiện tại
    Khi hệ thống phân tích phân bố thuần thục (Mastery Stage Distribution)
    Thì kết quả trả về số lượng chính xác cho 4 nhóm: "Chưa học", "Đang học", "Đang củng cố", "Đã thuần thục"
    Và tổng số lượng các nhóm luôn bằng tổng số chủ đề trong hệ thống

  # -----------------------------------------------------------------------------
  # SCENARIO 3: 7-DAY DUE REVIEW QUEUE FORECAST (PROJECTED QUEUE)
  # -----------------------------------------------------------------------------
  Kịch bản: Dự báo hàng đợi ôn tập trong 7 ngày tiếp theo (7-Day Review Queue Forecast)
    Cho các chủ đề có thời điểm ôn tập tiếp theo (nextReview) phân bổ trong tương lai
    Khi hệ thống trích xuất dự báo hàng đợi 7 ngày
    Thì danh sách 7 ngày (từ Hôm nay đến D+6) trả về số lượng chủ đề cần ôn cho từng ngày
    Và số lượng được bóc tách chi tiết theo lĩnh vực Phật Học và Huyền Học

  # -----------------------------------------------------------------------------
  # SCENARIO 4: FORGETTING CURVE PROJECTION GENERATION
  # -----------------------------------------------------------------------------
  Kịch bản: Tạo chuỗi điểm dữ liệu đường cong quên dự phóng (Forgetting Curve Projection)
    Cho người dùng yêu cầu xem mô hình suy giảm trí nhớ 30 ngày
    Khi thuật toán mô phỏng đường cong quên dự phóng thực thi
    Thì chuỗi 30 điểm dữ liệu thể hiện độ ghi nhớ lý thuyết theo thời gian được tạo ra cho từng nhóm Ease Factor
    Và độ ghi nhớ giảm dần theo hàm mũ âm tự nhiên e^(-t/S)

  # -----------------------------------------------------------------------------
  # SCENARIO 5: GRACEFUL ZERO / EMPTY STATE HANDLING
  # -----------------------------------------------------------------------------
  Kịch bản: Xử lý an toàn khi toàn bộ chủ đề chưa được học hoặc dataset rỗng
    Cho hệ thống với danh sách topics hoàn toàn mới (chưa có lượt ôn tập nào)
    Khi hệ thống thực hiện phân tích
    Thì tỷ lệ ghi nhớ dự phóng trả về 0%, số chủ đề quá hạn trả về 0
    Và không phát sinh lỗi chia cho 0 (NaN / Infinity) hay lỗi runtime

  # -----------------------------------------------------------------------------
  # SCENARIO 6: UI DASHBOARD INTEGRATION SURFACE
  # -----------------------------------------------------------------------------
  Kịch bản: Hiển thị các chỉ số phân tích và biểu đồ dự báo trên giao diện StudyProgressView
    Cho người nghiên cứu mở tab "Tiến độ học tập & Spaced Repetition"
    Khi giao diện tải hoàn tất
    Thì 4 thẻ KPI dự phóng (Tỷ lệ ghi nhớ dự phóng, Điểm ổn định trí nhớ, Chủ đề thuần thục, Hàng đợi hôm nay) được hiển thị
    Và biểu đồ dự báo hàng đợi ôn tập 7 ngày cùng danh sách hàng đợi trực quan được tích hợp đồng bộ
