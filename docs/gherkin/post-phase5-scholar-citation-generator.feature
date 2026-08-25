# language: vi
Tính năng: Post-Phase 5 Micro-Increment - Sinh Trích Dẫn Học Thuật Cho Tài Liệu Tham Khảo (Scholar Citation Generator)
  Là một học giả nghiên cứu Phật học và Huyền học trên Knowledge OS
  Tôi muốn tự động tạo trích dẫn chuẩn APA, BibTeX và Markdown Footnote từ tài liệu tham khảo
  Để dễ dàng đưa nguồn tư liệu vào các bài khảo cứu, luận văn hoặc ghi chú Obsidian mà không cần định dạng thủ công

  Bối cảnh:
    Cho một tài liệu tham khảo "Câu Xá Luận" thuộc chủ đề "Vi Diệu Pháp" với tác giả "Vasubandhu"

  Kịch bản: 1. Sinh trích dẫn chuẩn APA 7th khi có đầy đủ metadata
    Khi tôi yêu cầu tạo trích dẫn APA 7th cho tài liệu có tác giả "Vasubandhu", năm "2024", loại "book" và URL "https://example.com/abhidharma.pdf"
    Thì chuỗi trích dẫn phải chứa "Vasubandhu"
    Và chuỗi trích dẫn phải chứa "(2024)"
    Và chuỗi trích dẫn phải chứa "Câu Xá Luận"
    Và chuỗi trích dẫn phải kết thúc bằng "https://example.com/abhidharma.pdf"

  Kịch bản: 2. Xử lý fallback chuẩn APA 7th khi khuyết tác giả và khuyết năm
    Khi tôi yêu cầu tạo trích dẫn APA 7th cho tài liệu không có tác giả, không có năm, có filePath "02_Resources/trung-a-ham.pdf"
    Thì chuỗi trích dẫn phải bắt đầu bằng tiêu đề tài liệu
    Và chuỗi trích dẫn phải chứa "(n.d.)"
    Và chuỗi trích dẫn phải chứa "Tệp cục bộ: 02_Resources/trung-a-ham.pdf"

  Kịch bản: 3. Sinh trích dẫn chuẩn BibTeX cho loại sách với citation key tất định
    Khi tôi yêu cầu tạo trích dẫn BibTeX cho tài liệu loại "book" có tác giả "Vasubandhu"
    Thì định dạng phải bắt đầu bằng "@book{"
    Và khối BibTeX phải chứa trường "author = {Vasubandhu}"
    Và khối BibTeX phải chứa trường "title = {Câu Xá Luận}"

  Kịch bản: 4. Sinh trích dẫn chuẩn BibTeX cho loại tài liệu PDF hoặc Video bài giảng
    Khi tôi yêu cầu tạo trích dẫn BibTeX cho tài liệu loại "pdf" hoặc "video"
    Thì định dạng phải sử dụng "@misc{"
    Và trường howpublished phải thể hiện loại định dạng tương ứng

  Kịch bản: 5. Sinh trích dẫn dạng Markdown Footnote cho Obsidian
    Khi tôi yêu cầu tạo trích dẫn Markdown Footnote
    Thì chuỗi trả về phải có tiền tố "[^1]:"
    Và chuỗi phải chứa tiêu đề in nghiêng hoặc liên kết Markdown

  Kịch bản: 6. Giao diện Citation Modal hỗ trợ chuyển đổi linh hoạt các định dạng
    Khi người dùng nhấn nút "Trích dẫn" trên thẻ tài liệu
    Thì hộp thoại trích dẫn phải mở ra
    Và người dùng có thể chuyển đổi giữa các tab "APA 7th", "BibTeX", "Markdown Footnote"
    Và nội dung tương ứng được hiển thị trong khung văn bản xem trước

  Kịch bản: 7. Sao chép trích dẫn vào Clipboard an toàn
    Khi người dùng nhấn nút "Sao chép trích dẫn"
    Thì nội dung chuỗi trích dẫn được ghi vào Clipboard của trình duyệt
    Và hiển thị phản hồi "Đã sao chép" trong 2 giây
