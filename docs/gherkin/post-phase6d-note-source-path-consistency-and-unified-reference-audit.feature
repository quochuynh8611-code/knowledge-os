# language: vi
Tính năng: Đồng bộ đường dẫn nguồn ghi chú và kiểm toán tham chiếu hợp nhất (Note Source Path Consistency & Unified Reference Audit)

  Là một học giả quản lý ghi chú nghiên cứu và đồng bộ với Obsidian
  Tôi muốn ghi chú có thể lưu đường dẫn tệp nguồn Markdown đã chuẩn hóa và xuất hiện trong bảng kê manifest
  Để việc kiểm toán tệp và sao lưu toàn diện bao quát cả tài liệu tham khảo lẫn các tệp ghi chép cá nhân.

  Bối cảnh:
    Cho hệ thống Knowledge OS hoạt động theo mô hình Filesystem-First
    Và ứng dụng hỗ trợ liên kết ghi chú với các tệp Markdown trên máy tính

  Kịch bản: Ghi chú cũ không có đường dẫn nguồn vẫn hoạt động bình thường
    Cho một ghi chú cũ trong hệ thống không có thuộc tính sourcePath
    Khi người dùng mở danh sách hoặc chi tiết ghi chú
    Thì ghi chú hiển thị đầy đủ tiêu đề và nội dung mà không gây lỗi
    Và trong bảng kê kiểm toán tệp, ghi chú được phân loại là "unspecified"

  Kịch bản: Chuẩn hóa đường dẫn nguồn ghi chú khi lưu
    Cho người dùng nhập đường dẫn tệp ghi chú có khoảng trắng thừa và dấu gạch chéo ngược " D:\\Notes\\Abhidharma\\\\insight.md "
    Khi người dùng bấm Lưu Ghi Chú
    Thì đường dẫn tệp nguồn được chuẩn hóa thành "D:/Notes/Abhidharma/insight.md"

  Kịch bản: Cảnh báo đường dẫn nguồn ghi chú nằm ngoài thư viện gốc
    Cho người dùng đã cấu hình thư viện gốc là "/Users/researcher/Knowledge-Library"
    Và người dùng nhập đường dẫn tệp ghi chú là "/Users/researcher/Desktop/quick-note.md"
    Khi xem trước biểu mẫu nhập ghi chú
    Thì giao diện hiển thị cảnh báo tệp ghi chú nằm ngoài thư viện gốc chuẩn

  Kịch bản: Bảng kê kiểm toán hợp nhất gồm cả tài liệu và ghi chú
    Cho hệ thống có 1 tài liệu PDF và 1 ghi chú có sourcePath
    Khi người dùng xuất Bảng Kê File Library Manifest
    Thì bảng kê chứa cả mục sourceType "resource" và mục sourceType "note"
    Và cả hai đều sử dụng cùng định dạng đường dẫn đã chuẩn hóa

  Kịch bản: Sao chép đường dẫn tệp ghi chú và mở qua Obsidian
    Cho một ghi chú đã lưu có đường dẫn tệp nguồn hợp lệ
    Khi người dùng xem thẻ ghi chú trong Quản Lý Ghi Chú
    Thì giao diện hiển thị đường dẫn tệp nguồn
    Và người dùng có thể sao chép đường dẫn hoặc mở qua Obsidian
