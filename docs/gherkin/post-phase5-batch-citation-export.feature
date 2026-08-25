# language: vi
Tính năng: Post-Phase 5 Micro-Increment - Xuất Danh Mục Trích Dẫn Hàng Loạt (Batch Citation Export)
  Là một học giả nghiên cứu Phật học và Huyền học trên Knowledge OS
  Tôi muốn xuất toàn bộ trích dẫn của các tài liệu đang lọc theo chủ đề ra tệp BibTeX, APA hoặc Markdown
  Để có thể nạp ngay vào Zotero, Overleaf hoặc chèn danh mục tham khảo vào luận văn và Obsidian

  Bối cảnh:
    Cho một danh sách gồm 3 tài liệu tham khảo:
      | Title | Author | Type |
      | Câu Xá Luận | Vasubandhu | book |
      | Kinh Trung Bộ | | pdf |
      | Thiền Quán Tứ Niệm Xứ | Sayadaw U Tejaniya | video |

  Kịch bản: 1. Xuất hàng loạt định dạng BibTeX nối các khối entry chuẩn
    Khi tôi yêu cầu xuất hàng loạt 3 tài liệu theo định dạng "bibtex"
    Thì chuỗi trả về phải chứa cả 3 khối "@book{", "@misc{", "@misc{"
    Và các khối BibTeX phải được phân cách bởi hai dấu xuống dòng

  Kịch bản: 2. Xuất hàng loạt định dạng APA tự động sắp xếp theo thứ tự bảng chữ cái ABC
    Khi tôi yêu cầu xuất hàng loạt 3 tài liệu theo định dạng "apa"
    Thì tài liệu có tiêu đề "Kinh Trung Bộ" (khuyết tác giả) phải đứng trước "Sayadaw U Tejaniya" hoặc "Vasubandhu" theo thứ tự ABC
    Và chuỗi trả về phải chứa đầy đủ 3 trích dẫn APA phân cách bởi hai dấu xuống dòng

  Kịch bản: 3. Xuất hàng loạt định dạng Markdown Footnotes đánh số thứ tự liên tục
    Khi tôi yêu cầu xuất hàng loạt 3 tài liệu theo định dạng "markdown"
    Thì dòng đầu tiên phải bắt đầu bằng "[^1]:"
    Và dòng thứ hai phải bắt đầu bằng "[^2]:"
    Và dòng thứ ba phải bắt đầu bằng "[^3]:"

  Kịch bản: 4. Xử lý an toàn khi danh sách tài liệu rỗng
    Khi tôi yêu cầu xuất hàng loạt với mảng tài liệu rỗng
    Thì kết quả trả về phải là chuỗi rỗng
    Và hệ thống không được ném ra ngoại lệ hoặc lỗi

  Kịch bản: 5. Xác định đúng tên tệp tải về tương ứng với từng định dạng
    Khi tôi yêu cầu tên tệp tải về cho định dạng "bibtex" thì kết quả phải là "references.bib"
    Và khi tôi yêu cầu tên tệp tải về cho định dạng "apa" thì kết quả phải là "references.txt"
    Và khi tôi yêu cầu tên tệp tải về cho định dạng "markdown" thì kết quả phải là "references.md"

  Kịch bản: 6. Nút xuất danh mục trên Toolbar hiển thị đúng số lượng và bị vô hiệu hóa khi rỗng
    Khi danh sách tài liệu lọc có 3 mục
    Thì nút xuất danh mục trên Toolbar phải hiển thị "Xuất danh mục (3)"
    Và nút phải ở trạng thái kích hoạt
    Khi danh sách tài liệu lọc có 0 mục
    Thì nút xuất danh mục phải ở trạng thái vô hiệu hóa (disabled)

  Kịch bản: 7. Hộp thoại BatchCitationModal hỗ trợ sao chép toàn bộ và tải tệp
    Khi người dùng mở hộp thoại xuất danh mục hàng loạt
    Thì hộp thoại phải hiển thị tổng số tài liệu đang xuất
    Và người dùng có thể chuyển đổi giữa các tab "APA", "BibTeX", "Markdown"
    Và nhấn nút "Sao chép toàn bộ" ghi toàn bộ nội dung danh mục vào Clipboard
    Và nút tải tệp hiển thị đúng tên tệp tương ứng "references.bib" / "references.txt" / "references.md"
