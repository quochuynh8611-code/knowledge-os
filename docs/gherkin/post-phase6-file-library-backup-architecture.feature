# language: vi
Tính năng: Kiến trúc thư viện tệp vật lý và kiểm toán sao lưu (File Library & Backup Architecture)

  Là một học giả nghiên cứu quản lý tài liệu PDF, tài liệu tham khảo và ghi chú
  Tôi muốn kiểm toán tính toàn vẹn của các đường dẫn tệp vật lý và xuất bảng kê kiểm kê tệp (manifest)
  Để tôi có thể sao lưu trọn vẹn dữ liệu hệ thống mà không làm phình to cơ sở dữ liệu với dữ liệu nhị phân.

  Bối cảnh:
    Cho hệ thống Knowledge OS hoạt động theo mô hình Zero Binary Ingestion
    Và cơ sở dữ liệu chỉ lưu trữ metadata kèm đường dẫn tệp filePath

  Kịch bản: Xuất snapshot ứng dụng không chứa nội dung nhị phân PDF
    Cho một tài liệu có loại "pdf"
    Và tài liệu có đường dẫn filePath là "/Users/researcher/Library/abhidharmakosa.pdf"
    Khi người dùng thực hiện xuất snapshot ứng dụng JSON
    Thì tệp JSON chứa trường tham chiếu metadata filePath
    Và tệp JSON không chứa chuỗi dữ liệu nhị phân của tệp PDF

  Kịch bản: Bảng kê thư viện tệp liệt kê danh mục đường dẫn tệp vật lý
    Cho danh sách tài liệu chứa các đường dẫn tệp trên ổ đĩa
    Khi người dùng xuất bảng kê thư viện tệp (file library manifest)
    Thì mỗi mục trong bảng kê chứa đường dẫn tệp vật lý tương ứng
    Và bảng kê chứa tổng số dung lượng và trạng thái kiểm toán của tệp

  Kịch bản: Phát hiện tệp thất lạc khi kiểm toán đường dẫn
    Cho một tài liệu có đường dẫn trỏ tới tệp không còn tồn tại trên ổ đĩa
    Khi tiến hành kiểm toán thư viện tệp
    Thì tài liệu đó được đánh dấu trạng thái "missing"

  Kịch bản: Phát hiện tệp nằm ngoài thư mục thư viện gốc chuẩn
    Cho thư mục thư viện gốc được cấu hình là "/Users/researcher/KnowledgeLibrary"
    Và một tài liệu có đường dẫn trỏ tới "/Volumes/ExternalDrive/random_book.pdf"
    Khi tiến hành kiểm toán thư viện tệp
    Thì tài liệu đó được đánh dấu trạng thái "outside_library"

  Kịch bản: Tương thích ngược hoàn toàn với dữ liệu cũ không có thông tin kiểm toán
    Cho dữ liệu snapshot hoặc tài liệu cũ không có metadata kiểm toán
    Khi ứng dụng nạp dữ liệu
    Thì các tài liệu và ghi chú vẫn tải lên thành công và không gây lỗi runtime

  Kịch bản: Tạo danh mục kiểm tra sao lưu trọn gói 3 thành phần
    Cho người dùng muốn thực hiện sao lưu toàn diện hệ thống
    Khi người dùng xem bảng hướng dẫn sao lưu
    Thì danh mục kiểm tra yêu cầu đầy đủ 3 thành phần:
      | Thành phần | Ý nghĩa |
      | App Snapshot JSON | Trạng thái logic ứng dụng (chủ đề, ghi chú, tiến độ) |
      | File Library Manifest | Bảng kê danh mục kiểm toán đường dẫn tệp vật lý |
      | Thư mục tệp vật lý | Thư mục chứa các tệp PDF và tư liệu gốc trên máy |
