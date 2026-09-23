# language: vi
Tính năng: Điều hướng Hai chiều bằng Liên kết Trích dẫn Sâu (Phase 19)
  Là một nhà nghiên cứu sử dụng Knowledge OS
  Tôi muốn nhấp vào các liên kết trích dẫn archive:// trong ghi chú của thanh bên Reader
  Để hệ thống tự động mở đúng tài liệu nguồn và cuộn tới chính xác vị trí trích đoạn đã lưu

  Quy tắc:
    - Phạm vi lát cắt đầu tiên tập trung vào Tab Ghi chú của ReaderSidebar (các surface khác như NoteReaderModal được deferred).
    - Định dạng citation luôn tuân thủ: archive://{documentId}?loc={locator}
    - Chỉ chấp nhận scheme archive://, chặn đứng javascript:, data:, vbscript:, file:
    - Không thực hiện bất kỳ hành động ghi nào vào Obsidian Vault (Read-only boundary)
    - Xử lý lỗi an toàn không gây sập ứng dụng (Graceful degradation)

  Bối cảnh:
    Cho một kho dữ liệu nghiên cứu chứa các tài liệu:
      | documentId     | title                | format | filePath                 |
      | doc-triet-hoc  | Triết Học Khái Luận  | md     | docs/books/triet-hoc.md  |
      | doc-tam-ly     | Tâm Lý Học Nhận Thức | epub   | books/tam-ly.epub        |
      | doc-y-hoc      | Đông Y Toàn Thư      | pdf    | 02_PDF_Source/y-hoc.pdf  |
    Và các ghi chú nghiên cứu đã lưu trích dẫn với marker archive://

  # ---------------------------------------------------------------------------
  # 1. Same-Document Navigation
  # ---------------------------------------------------------------------------
  Kịch bản: Điều hướng cùng tài liệu Markdown tới vị trí tiêu đề có sẵn
    Cho người dùng đang đọc tài liệu Markdown "doc-triet-hoc" trong UnifiedResearchReader
    Và thanh bên ReaderSidebar đang mở ở tab "Ghi chú"
    Khi người dùng nhấp vào liên kết trích dẫn "archive://doc-triet-hoc?loc=chuong-2-nhan-thuc-luan"
    Thì hệ thống không nạp lại toàn bộ tài liệu
    Và khung đọc cuộn mượt mà đến phần tử có ID "chuong-2-nhan-thuc-luan"
    Và hiển thị thông báo toast "Đã chuyển đến: chuong-2-nhan-thuc-luan" với aria-live="polite"

  Kịch bản: Điều hướng cùng tài liệu EPUB tới vị trí CFI
    Cho người dùng đang đọc sách EPUB "doc-tam-ly" trong UnifiedResearchReader
    Khi người dùng nhấp vào liên kết trích dẫn "archive://doc-tam-ly?loc=epubcfi(%2F6%2F4%5Bchap1%5D!%2F4%2F2%2F10)"
    Thì EpubReaderAdapter gọi hàm display với mã CFI đã giải mã
    Và vị trí đọc được cập nhật thành công

  Kịch bản: Điều hướng cùng tài liệu PDF tới trang cụ thể
    Cho người dùng đang xem tài liệu PDF "doc-y-hoc" trong UnifiedResearchReader
    Khi người dùng nhấp vào liên kết trích dẫn "archive://doc-y-hoc?loc=42"
    Thì PdfReaderAdapter cập nhật trang hiện tại thành 42
    Và hiển thị thông báo toast "Đã chuyển đến: 42"

  # ---------------------------------------------------------------------------
  # 2. Cross-Document Navigation
  # ---------------------------------------------------------------------------
  Kịch bản: Điều hướng liên tài liệu từ Markdown sang sách EPUB
    Cho người dùng đang đọc tài liệu "doc-triet-hoc"
    Và trong ghi chú có trích dẫn từ sách "doc-tam-ly" dạng "archive://doc-tam-ly?loc=epubcfi(%2F6%2F2)"
    Khi người dùng nhấp vào liên kết trích dẫn này
    Thì hệ thống phân giải thành công tài liệu "doc-tam-ly" theo định dạng "epub"
    Và UnifiedResearchReader chuyển đổi sang hiển thị sách "Tâm Lý Học Nhận Thức"
    Và tab thanh bên vẫn giữ nguyên ở tab "Ghi chú"
    Và danh sách ghi chú, điểm trích và mục lục được tự động cập nhật theo tài liệu "doc-tam-ly"

  Kịch bản: Phân giải tài liệu nguồn qua đường dẫn tương đối (Canonical Path Resolution)
    Cho người dùng đang đọc tài liệu bất kỳ
    Khi người dùng nhấp vào liên kết "archive://02_PDF_Source%2Fy-hoc.pdf?loc=15"
    Thì resolver chuẩn hóa đường dẫn và khớp thành công với tài liệu "doc-y-hoc"
    Và UnifiedResearchReader mở tài liệu "Đông Y Toàn Thư" ở trang 15

  # ---------------------------------------------------------------------------
  # 3. Graceful Fallbacks & Failure Taxonomy
  # ---------------------------------------------------------------------------
  Kịch bản: Xử lý an toàn khi URI trích dẫn bị hỏng cú pháp
    Cho người dùng đang đọc tài liệu "doc-triet-hoc"
    Khi người dùng nhấp vào liên kết trích dẫn sai cấu trúc "archive://?loc=123" hoặc "javascript:alert(1)"
    Thì hệ thống từ chối điều hướng
    Và không làm thay đổi tài liệu hay vị trí hiện tại
    Và hiển thị thông báo "Định dạng liên kết trích dẫn không hợp lệ"

  Kịch bản: Xử lý an toàn khi không tìm thấy tài liệu nguồn (Unresolved Document)
    Cho người dùng đang đọc tài liệu "doc-triet-hoc"
    Khi người dùng nhấp vào liên kết trích dẫn "archive://doc-khong-ton-tai?loc=10"
    Thì hệ thống không thể phân giải tài liệu nguồn
    Và giữ nguyên tài liệu "doc-triet-hoc" và vị trí đọc hiện tại
    Và hiển thị thông báo toast "Không tìm thấy tài liệu nguồn tương ứng"

  Kịch bản: Xử lý an toàn khi trích dẫn không có locator
    Cho người dùng đang đọc tài liệu bất kỳ
    Khi người dùng nhấp vào liên kết trích dẫn "archive://doc-triet-hoc"
    Thì hệ thống nhận diện đúng tài liệu nhưng không có vị trí cụ thể
    Và giữ nguyên tài liệu ở đầu trang với thông báo "Đang ở tài liệu hiện tại"

  Kịch bản: Xử lý an toàn khi locator không tồn tại trong tài liệu
    Cho người dùng đang đọc tài liệu Markdown "doc-triet-hoc"
    Khi người dùng nhấp vào liên kết "archive://doc-triet-hoc?loc=heading-khong-co"
    Thì hệ thống không tìm thấy phần tử DOM tương ứng
    Và không phát sinh lỗi ngoại lệ JavaScript
    Và hiển thị thông báo "Không tìm thấy vị trí trích đoạn trong tài liệu"

  # ---------------------------------------------------------------------------
  # 4. Security & Vault Read-Only Boundary
  # ---------------------------------------------------------------------------
  Kịch bản: Bảo toàn tính chỉ đọc của Obsidian Vault khi điều hướng
    Cho người dùng thực hiện 10 lần điều hướng liên tiếp qua các tài liệu trong Vault
    Khi kiểm tra toàn bộ network requests và filesystem operations
    Thì chỉ có các yêu cầu HTTP GET đọc tệp đính kèm
    Và không có bất kỳ lệnh POST, PUT, DELETE hoặc ghi tệp nào vào thư mục Vault vật lý
