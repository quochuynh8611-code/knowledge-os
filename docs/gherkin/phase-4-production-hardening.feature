# language: vi
Tính năng: Phase 4 — Production Readiness, Security Guardrails & Operational Hardening
  Để đảm bảo hệ thống Knowledge OS vận hành an toàn, ổn định và có khả năng phục hồi cao trên môi trường Production
  Là một Staff Software Engineer và Quản trị viên hệ thống
  Tôi muốn thiết lập các rào chắn bảo mật boundary, rate limiting, kiểm tra sức khỏe DB tất định, và kiểm soát phục hồi AI có giới hạn.

  Bối cảnh:
    Cho hệ thống Knowledge OS đang hoạt động với cấu hình Dual-Tier Persistence và 35 chủ đề canonical

  # -----------------------------------------------------------------------------
  # SCENARIO 1: PAYLOAD SIZE & BOUNDARY REJECTION
  # -----------------------------------------------------------------------------
  Kịch bản: Từ chối gói phục hồi hoặc gói bàn giao vượt quá kích thước an toàn
    Cho máy khách (client) gửi một payload phục hồi hoặc prompt vượt quá giới hạn kích thước quy định
    Khi yêu cầu chạm tới ranh giới kiểm tra hợp chuẩn (Validation Boundary)
    Thì yêu cầu bị từ chối một cách tất định với mã lỗi phù hợp (HTTP 400 hoặc 413)
    Và không có bất kỳ thay đổi nào xảy ra trên cơ sở dữ liệu hoặc hệ thống tệp cục bộ

  # -----------------------------------------------------------------------------
  # SCENARIO 2: MALFORMED RESTORE PAYLOAD REJECTION
  # -----------------------------------------------------------------------------
  Kịch bản: Từ chối snapshot phục hồi bị lỗi cấu trúc trước khi bắt đầu rehydration
    Cho máy khách gửi một payload phục hồi có cấu trúc JSON bị hỏng hoặc thiếu các trường bắt buộc
    Khi bộ xử lý phục hồi kiểm tra tính hợp lệ của yêu cầu
    Thì yêu cầu bị từ chối ngay lập tức với lỗi VALIDATION_ERROR
    Và quá trình rehydration không được phép bắt đầu, trạng thái bộ nhớ cũ được bảo toàn 100%

  # -----------------------------------------------------------------------------
  # SCENARIO 3: POSTGRESQL UNAVAILABLE HEALTH PROBE
  # -----------------------------------------------------------------------------
  Kịch bản: Cơ sở dữ liệu PostgreSQL mất kết nối hoặc không phản hồi
    Cho cơ sở dữ liệu PostgreSQL đang ngoại tuyến hoặc kết nối bị từ chối
    Khi có yêu cầu kiểm tra sức khỏe gửi tới endpoint "/api/health/db"
    Thì trường "connected" trong kết quả trả về là false
    Và trường "status" có giá trị là "unhealthy"
    Và các trường "latencyMs" và "timestamp" vẫn hiện diện đầy đủ

  # -----------------------------------------------------------------------------
  # SCENARIO 4: DATABASE LATENCY POLICY ENFORCEMENT
  # -----------------------------------------------------------------------------
  Kịch bản: Phân loại trạng thái sức khỏe cơ sở dữ liệu theo chính sách độ trễ
    Cho cơ sở dữ liệu PostgreSQL phản hồi với các mức độ trễ khác nhau
    Khi endpoint "/api/health/db" đo thời gian khứ hồi của truy vấn SELECT 1
    Thì trạng thái được gán là "healthy" nếu độ trễ dưới 100ms
    Và trạng thái được gán là "degraded" nếu độ trễ từ 100ms đến dưới 1000ms
    Và trạng thái được gán là "unhealthy" nếu độ trễ từ 1000ms trở lên

  # -----------------------------------------------------------------------------
  # SCENARIO 5: CANONICAL DATA BACKUP EXPORT INTEGRITY
  # -----------------------------------------------------------------------------
  Kịch bản: Xuất dữ liệu sao lưu snapshot chuẩn mực với đầy đủ siêu dữ liệu phiên bản và checksum
    Cho hệ thống đang chứa dữ liệu canonical hợp lệ
    Khi lệnh xuất sao lưu dữ liệu được thực thi qua "/api/backup/export"
    Thì tài liệu snapshot xuất ra phải hợp chuẩn với BackupSnapshotSchema Semver 2.x
    Và có đầy đủ mã băm SHA-256 Checksum 64 ký tự hex tính toán trên 5 tập hợp thực thể cốt lõi

  # -----------------------------------------------------------------------------
  # SCENARIO 6: CHECKSUM MISMATCH RESTORE BLOCKING
  # -----------------------------------------------------------------------------
  Kịch bản: Chặn đứng giao dịch phục hồi khi phát hiện mã SHA-256 Checksum không khớp
    Cho tệp snapshot sao lưu bị chỉnh sửa hoặc bị hỏng dẫn đến sai lệch checksum SHA-256
    Khi lệnh phục hồi bắt đầu thực thi
    Thì giao dịch phục hồi bị chặn đứng hoàn toàn trước khi mở transaction ghi dữ liệu
    Và hệ thống trả về mã lỗi có kiểm soát CHECKSUM_MISMATCH

  # -----------------------------------------------------------------------------
  # SCENARIO 7: GEMINI RETRYABLE ERROR BOUNDED RETRY & FALLBACK
  # -----------------------------------------------------------------------------
  Kịch bản: Tự động thử lại có giới hạn và chuyển tiếp model dự phòng khi gặp lỗi nhà cung cấp AI quá tải
    Cho dịch vụ Gemini AI trả về các lỗi quá tải hoặc giới hạn hạn ngạch (503, 429, UNAVAILABLE)
    Khi tầng phục hồi AI (Resilience Layer) xử lý yêu cầu
    Thì số lần thử lại trên mỗi model bị giới hạn tối đa 2 lần với khoảng dừng giãn cách
    Và hệ thống tự động chuyển sang thử nghiệm các model dự phòng được phê duyệt trong danh sách

  # -----------------------------------------------------------------------------
  # SCENARIO 8: GEMINI NON-RETRYABLE ERROR IMMEDIATE ABORT
  # -----------------------------------------------------------------------------
  Kịch bản: Ngắt ngay lập tức và không thử lại khi gặp lỗi AI không thể phục hồi
    Cho dịch vụ Gemini AI trả về lỗi không thể phục hồi (400, 401, INVALID_ARGUMENT, sai khóa API)
    Khi tầng phục hồi AI xử lý yêu cầu
    Thì quá trình thử lại lập tức dừng lại, không chuyển tiếp sang các model khác
    Và ném ra một lỗi có cấu trúc rõ ràng để tầng giao diện xử lý minh bạch
