Feature: Idempotent Note synchronization and bounded retries

  Scenario: Replay POST Note cùng ID không phát sinh P2002
    Given Note với client-provided ID đã tồn tại trong cơ sở dữ liệu
    When client gửi lại POST /notes với cùng ID và payload tương đương
    Then server trả về HTTP success idempotent
    And database duy trì một bản ghi duy nhất cho Note với ID đó

  Scenario: Permanent validation/conflict error không retry
    Given một mutation sync nhận HTTP 400, 409, 422 hoặc Prisma P2002 không thể giải quyết
    When queue xử lý mutation
    Then mutation chuyển sang trạng thái dead-letter hoặc exhausted
    And mutation không được retry tự động trong các chu kỳ flush kế tiếp
    And thông tin lỗi và mã HTTP được giữ lại để người dùng xem hoặc bỏ qua

  Scenario: Transient error được retry hữu hạn
    Given một mutation sync gặp network error, timeout, HTTP 408, 429 hoặc 5xx
    When queue xử lý mutation
    Then queue lập lịch retry backoff với thời gian tăng dần
    And retryCount tăng lên nhưng không vượt quá ngưỡng MAX_RETRY_COUNT
    And mutation chuyển sang exhausted khi vượt ngưỡng 5 lần thử

  Scenario: Permanent failure không chặn các job sau
    Given mutation đầu tiên trong queue là dead-letter hoặc permanent failure
    And mutation kế tiếp là một thao tác hợp lệ
    When queue flush
    Then mutation đầu tiên được giữ nguyên trạng thái lỗi
    And mutation hợp lệ phía sau vẫn được thực thi và replay thành công

  Scenario: Job hiện hữu có retryCount rất lớn
    Given local queue có mutation Note với retryCount là 226
    When queue khởi tạo hoặc chuẩn hóa dữ liệu
    Then mutation được chuẩn hóa sang trạng thái exhausted
    And mutation không bị replay tự động vô hạn
    And người dùng có thể xem chi tiết lỗi và bỏ qua mutation một cách an toàn
