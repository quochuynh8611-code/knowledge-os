# language: vi
Tính năng: Thiết lập vận hành thư viện tệp và sẵn sàng sao lưu (Operational File Library Setup & Backup Readiness)

  Là một học giả nghiên cứu quản lý tài liệu PDF, tệp ghi chú và tệp đính kèm
  Tôi muốn được hướng dẫn cấu trúc thư mục lưu trữ chuẩn và kiểm tra danh mục sao lưu toàn diện
  Để tôi biết chính xác vị trí lưu trữ tệp thật, tránh nhầm lẫn giữa bản sao lưu metadata và tệp vật lý.

  Bối cảnh:
    Cho hệ thống Knowledge OS hoạt động theo mô hình Filesystem-First
    Và ứng dụng không lưu trữ dữ liệu nhị phân PDF trong cơ sở dữ liệu

  Kịch bản: Người dùng xem giải thích 3 trụ cột sao lưu
    Cho hộp thoại Quản Lý Dữ Liệu đang mở
    Khi người dùng chuyển sang tab "Kiểm toán tệp & Manifest"
    Thì giao diện hiển thị rõ ràng 3 trụ cột sao lưu gồm App Snapshot JSON, File Manifest JSON và Thư mục tệp vật lý

  Kịch bản: Người dùng nhận khuyến nghị cấu trúc thư mục thư viện chuẩn
    Cho người dùng truy cập phần quản lý thư viện tệp
    Khi xem cấu trúc thư mục đề xuất
    Thì hệ thống hiển thị cấu trúc gồm Knowledge-Library với các thư mục con PDF, Notes, Attachments, Inbox, Exports

  Kịch bản: Người dùng lưu cấu hình thư mục thư viện gốc chuẩn
    Cho người dùng nhập đường dẫn thư viện gốc là "/Users/researcher/Knowledge-Library"
    Khi người dùng bấm nút Lưu cấu hình
    Thì đường dẫn chuẩn hóa được lưu vào bộ nhớ cục bộ
    Và giao diện hiển thị thông báo đã lưu thành công

  Kịch bản: Cảnh báo giới hạn quét ổ đĩa của trình duyệt
    Cho ứng dụng chạy trên trình duyệt web không có quyền quét đĩa trực tiếp
    Khi hiển thị kết quả kiểm toán
    Thì các tệp được phân loại rõ ràng là "unverified" hoặc "outside_library"
    Và hệ thống không báo trạng thái "exists" giả lập

  Kịch bản: Danh mục kiểm tra sao lưu nhắc nhở sao chép thư mục tệp thật
    Cho người dùng chuẩn bị thực hiện sao lưu
    Khi xem danh mục kiểm tra sao lưu (Checklist)
    Thì danh mục kiểm tra yêu cầu đầy đủ cả Snapshot JSON, File Manifest và Thư mục file vật lý
    Và cảnh báo rằng chỉ xuất Manifest thôi là chưa chứa nội dung file PDF thật

  Kịch bản: Tài liệu cũ không có đường dẫn không làm lỗi hệ thống
    Cho tài liệu nghiên cứu cũ không có filePath
    Khi chạy kiểm toán thư viện tệp
    Thì ứng dụng không bị lỗi
    Và tài liệu được ghi nhận ở mục "unspecified"
