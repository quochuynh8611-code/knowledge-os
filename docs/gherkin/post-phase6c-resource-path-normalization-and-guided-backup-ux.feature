# language: vi
Tính năng: Chuẩn hóa đường dẫn tài liệu và gia cố trải nghiệm hướng dẫn sao lưu (Resource Path Normalization & Guided Backup UX)

  Là một học giả quản lý tài liệu nghiên cứu
  Tôi muốn đường dẫn tệp cục bộ được chuẩn hóa tự động và được cảnh báo khi tệp nằm ngoài thư viện gốc
  Để việc quản lý tệp trên máy tính nhất quán, dễ sao chép và không bị sót tệp khi sao lưu.

  Bối cảnh:
    Cho hệ thống Knowledge OS hoạt động theo mô hình Filesystem-First
    Và ứng dụng không lưu trữ dữ liệu nhị phân PDF trong cơ sở dữ liệu

  Kịch bản: Chuẩn hóa đường dẫn tệp cục bộ khi lưu tài liệu
    Cho người dùng nhập đường dẫn tệp có dấu gạch chéo ngược Windows "D:\\Books\\Abhidharma\\\\kosa.pdf "
    Khi người dùng bấm Lưu Tài Liệu
    Thì đường dẫn tệp được chuẩn hóa thành "D:/Books/Abhidharma/kosa.pdf"

  Kịch bản: Từ chối lưu tài liệu khi để trống đường dẫn ở chế độ tệp trên máy
    Cho người dùng chọn chế độ "Tệp trên máy"
    Khi người dùng để trống trường đường dẫn tệp cục bộ
    Thì biểu mẫu hiển thị thông báo lỗi yêu cầu nhập đường dẫn hợp lệ
    Và tài liệu không được lưu

  Kịch bản: Cảnh báo tài liệu nằm ngoài thư mục thư viện gốc chuẩn
    Cho người dùng đã cấu hình thư viện gốc là "/Users/researcher/Knowledge-Library"
    Và người dùng nhập đường dẫn tệp là "/Users/researcher/Downloads/study.pdf"
    Khi xem trước biểu mẫu nhập tài liệu
    Thì giao diện hiển thị cảnh báo tệp nằm ngoài thư viện gốc chuẩn
    Và giải thích rủi ro có thể bị bỏ sót khi sao lưu

  Kịch bản: Hiển thị đường dẫn nhất quán và hỗ trợ sao chép trong hộp thoại xem trước
    Cho một tài liệu đã lưu có đường dẫn tệp cục bộ
    Khi người dùng mở hộp thoại Xem Trước Tài Liệu (ResourceViewerModal)
    Thì đường dẫn tệp cục bộ đã chuẩn hóa được hiển thị rõ ràng
    Và có nút sao chép đường dẫn để dán vào công cụ quản lý tệp

  Kịch bản: Nhắc nhở người dùng sao chép thư mục tệp khi xuất snapshot
    Cho người dùng ở tab "Xuất JSON" trong Quản Lý Dữ Liệu
    Khi xem hướng dẫn sao lưu
    Thì giao diện nêu rõ bản sao lưu Snapshot JSON chỉ chứa metadata và người dùng cần sao chép thư mục tệp thật
