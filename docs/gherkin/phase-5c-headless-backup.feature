# language: vi
Tính năng: Workstream 5C - Tự Động Quản Trị Snapshot & Kịch Bản Sao Lưu Dòng Lệnh (Automated Snapshot Maintenance & Headless Backup Script)
  Để bảo vệ toàn vẹn dữ liệu nghiên cứu Phật Học & Huyền Học ngoại tuyến mà không phụ thuộc vào giao diện web
  Là một Nhà Nghiên Cứu Học Thuật hoặc Quản Trị Hệ Thống (DevOps / Scholar)
  Tôi muốn có một kịch bản dòng lệnh độc lập (Headless CLI) để tự động xuất snapshot, kiểm tra tính toàn vẹn bit-for-bit và dọn dẹp các bản sao lưu cũ theo chính sách an toàn.

  Bối cảnh:
    Cho rằng hệ thống cơ sở dữ liệu và bộ nhớ chứa đầy đủ 5 collections chuẩn:
      | Collection   | Số lượng tối thiểu |
      | categories   | 8                  |
      | topics       | 35                 |
      | notes        | 0                  |
      | resources    | 0                  |
      | tags         | 12                 |
    Và thư mục đích sao lưu mặc định là "./backups"
    Và quy tắc bất biến "Zero Binary Ingestion" luôn được duy trì (metadata < 2KB, không nhúng file nhị phân)
    Và cấu trúc snapshot luôn tương thích với BackupSnapshotSchema Semver 2.x

  Kịch bản: 1. Tạo snapshot hợp lệ với metadata header và SHA-256 Checksum tất định
    Khi thực thi lệnh tạo snapshot qua CLI hoặc module snapshotManager
    Thì một tệp snapshot JSON mới được tạo ra trong thư mục đích
    Và tên tệp phải tuân thủ đúng quy ước định dạng "snapshot-{YYYYMMDDTHHmmssZ}-{shortChecksum}.json"
    Và nội dung tệp phải chứa metadata header hợp lệ:
      | Trường       | Giá trị mong đợi                                  |
      | version      | "2.0.0" (hoặc semver 2.x)                         |
      | exportedAt   | Chuỗi thời gian chuẩn ISO-8601 UTC                |
      | checksum     | Chuỗi hex SHA-256 64 ký tự tính toán tất định     |
      | counts       | Số lượng khớp chính xác với số bản ghi trong data |
    Và trường "data" phải chứa đầy đủ 5 collections có cấu trúc hợp lệ theo BackupSnapshotSchema
    Và mã băm SHA-256 tính toán lại trên "data" phải khớp 100% với trường "checksum" trong header

  Kịch bản: 2. Cơ chế ghi nguyên tử (Atomic Write) bảo đảm không sinh tệp hỏng khi có lỗi
    Giả sử đang trong quá trình ghi tệp snapshot ra đĩa
    Khi xảy ra lỗi I/O, thiếu quyền ghi hoặc quá trình băm checksum phát hiện sai lệch
    Thì tệp tạm thời ".snapshot-*.tmp" phải được tự động dọn dẹp và xóa bỏ
    Và không có tệp snapshot dở dang hoặc bị hỏng nào tồn tại trong thư mục đích
    Và hệ thống trả về mã lỗi thất bại (Exit code > 0) kèm thông báo chi tiết mà không làm tổn hại dữ liệu hiện có

  Kịch bản: 3. Chế độ chạy thử mô phỏng (--dry-run) không ghi tệp vật lý
    Khi thực thi lệnh tạo snapshot với cờ tham số "--dry-run"
    Thì hệ thống trích xuất toàn bộ dữ liệu từ nguồn và kiểm tra hợp chuẩn BackupSnapshotSchema trong bộ nhớ
    Và tính toán mã băm SHA-256 Checksum và đếm số lượng bản ghi chính xác
    Nhưng không có bất kỳ tệp tin vật lý mới nào được tạo ra trên ổ đĩa
    Và hệ thống xuất báo cáo tóm tắt quá trình mô phỏng thành công với mã thoát 0

  Kịch bản: 4. Xác minh tính toàn vẹn tệp snapshot (--verify) phát hiện lỗi sai lệch và hỏng schema
    Giả sử có một tệp snapshot JSON cần kiểm tra tính toàn vẹn
    Khi thực thi lệnh xác minh với cờ "--verify <filepath>"
    Thì hệ thống thực hiện kiểm tra 2 lớp:
      | Lớp kiểm tra | Điều kiện thành công                                         |
      | Schema Check | Cấu trúc tệp phải thỏa mãn BackupSnapshotSchema Semver 2.x   |
      | Integrity    | SHA-256 tính lại trên "data" phải khớp chính xác checksum    |
    Và nếu tệp bị sửa đổi nội dung (tampered) hoặc sai lệch checksum:
      Thì hệ thống trả về kết quả "INVALID_CHECKSUM" kèm mã thoát 1
    Và nếu tệp không đúng cấu trúc schema:
      Thì hệ thống trả về kết quả "INVALID_SCHEMA" kèm chi tiết các trường bị lỗi

  Kịch bản: 5. Dọn dẹp bản sao lưu cũ (--prune & --retention) an toàn theo chính sách FIFO
    Giả sử thư mục "./backups" đang chứa 15 tệp snapshot hợp lệ và 2 tệp ghi chú tùy chỉnh ".txt"
    Khi thực thi lệnh dọn dẹp với cờ "--prune --retention 10"
    Thì hệ thống sắp xếp các tệp snapshot theo thời gian tạo từ mới nhất đến cũ nhất
    Và giữ lại chính xác 10 tệp snapshot mới nhất
    Và tự động xóa an toàn 5 tệp snapshot cũ nhất vượt quá hạn ngạch
    Và các tệp không phải snapshot (ví dụ: ".txt", ".gitkeep") tuyệt đối không bị xóa hoặc thay đổi
    Và hệ thống xuất danh sách các tệp đã được dọn dẹp thành công

  Kịch bản: 6. Cảnh báo an toàn khi kích thước snapshot vượt ngưỡng an toàn (Safety Size Guardrail)
    Giả sử dữ liệu snapshot sau khi tuần tự hóa có dung lượng lớn hơn 15MB (MAX_BACKUP_SIZE)
    Khi thực thi quá trình tạo snapshot
    Thì hệ thống phát ra cảnh báo "BACKUP_SIZE_WARNING: Dung lượng snapshot vượt ngưỡng an toàn 15MB"
    Và ghi nhận cảnh báo vào thông tin metadata hoặc log có cấu trúc
    Và bảo đảm không có chuỗi nhị phân (Binary Base64) nào bị nhúng trái phép vào tệp snapshot
