# language: vi
Tính năng: Điều hướng Trích dẫn Toàn cục và Điều phối Trình đọc Nghiên cứu (Phase 20)
  Để hoàn thiện chu trình nghiên cứu hai chiều giữa Ghi chú và Tài liệu nguồn
  Là một người nghiên cứu và học tập
  Tôi muốn có thể nhấp vào liên kết trích dẫn ở bất kỳ màn hình nào (Navbar, Note Reader Modal, Topic Detail) để mở trực tiếp tài liệu trong Unified Research Reader tại đúng vị trí trích đoạn

  Bối cảnh:
    Giả sử hệ thống đã nạp danh mục tài nguyên gồm có:
      | id            | title                 | type | filePath                      | topicId |
      | doc-triet-hoc | Triết Học Khái Luận   | md   | docs/books/triet-hoc.md       | topic-1 |
      | doc-tam-ly    | Tâm Lý Học Nhận Thức  | book | 05_EPUB_Export/tam-ly.epub    | topic-2 |
      | doc-y-hoc     | Đông Y Toàn Thư       | pdf  | 02_PDF_Source/y-hoc.pdf       | topic-3 |

  Kịch bản: Cross-document navigation được điều phối thành công từ Reader Sidebar trong Navbar
    Giả sử người dùng đang đọc tài liệu "Triết Học Khái Luận" trong UnifiedResearchReader mở từ Navbar
    Và tab Notes của Reader Sidebar hiển thị ghi chú có trích dẫn "archive://doc-tam-ly?loc=chuong-1-phan-xa"
    Khi người dùng nhấp vào liên kết trích dẫn này
    Thì UnifiedResearchReader chuyển sang hiển thị tài liệu "Tâm Lý Học Nhận Thức"
    Và định dạng tài liệu là "epub"
    Và vị trí ban đầu "initialPosition" được truyền là "chuong-1-phan-xa"

  Kịch bản: Mở trích dẫn từ NoteReaderModal trong TopicDetail
    Giả sử người dùng đang xem chi tiết chủ đề "Triết Học"
    Và người dùng mở NoteReaderModal xem một ghi chú chứa liên kết "archive://doc-y-hoc?loc=42"
    Khi người dùng nhấp vào liên kết trích dẫn trong nội dung ghi chú
    Thì NoteReaderModal tự động đóng lại
    Và UnifiedResearchReader mở ra với tài liệu "Đông Y Toàn Thư"
    Và định dạng tài liệu là "pdf"
    Và số trang ban đầu là "42"

  Kịch bản: Mở sách EPUB từ Vault Browser Modal trong TopicDetail chuyển đúng vào UnifiedResearchReader
    Giả sử người dùng đang ở trang chi tiết chủ đề
    Và người dùng mở Obsidian Vault Browser Modal
    Khi người dùng chọn tệp sách "05_EPUB_Export/tam-ly.epub"
    Thì Obsidian Vault Browser Modal đóng lại
    Và UnifiedResearchReader mở ra với format "epub"
    Và không kích hoạt FileViewer cũ

  Kịch bản: Bảo toàn tính bất biến chỉ đọc của Obsidian Vault khi điều hướng trích dẫn toàn cục
    Giả sử người dùng nhấp vào các liên kết trích dẫn trên nhiều bề mặt khác nhau
    Khi các tài liệu Markdown, EPUB, PDF được mở và điều hướng
    Thì không có bất kỳ yêu cầu HTTP dạng POST, PUT, DELETE nào được gửi tới máy chủ
    Và nội dung tệp trong Obsidian Vault được bảo toàn 100% nguyên vẹn
