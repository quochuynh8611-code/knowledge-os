# language: vi
Tính năng: Post-Phase 5 Micro-Increment - Ghi Nhớ Tùy Chọn Định Dạng Trích Dẫn (Citation Format Preference Hardening)
  Là một học giả nghiên cứu trên Knowledge OS
  Tôi muốn hệ thống tự động ghi nhớ định dạng trích dẫn tôi thường dùng (APA, BibTeX, hoặc Markdown)
  Để khi chuyển đổi giữa trích dẫn một tài liệu hay xuất cả danh mục, tôi không phải chọn lại tab định dạng nhiều lần

  Bối cảnh:
    Cho hệ thống vừa khởi chạy và chưa có cấu hình định dạng trích dẫn trong LocalStorage

  Kịch bản: 1. Khởi tạo mặc định là định dạng APA 7th khi chưa có dữ liệu lưu trữ
    Khi tôi truy vấn định dạng trích dẫn đã lưu trong hệ thống
    Thì định dạng trả về phải là "apa"

  Kịch bản: 2. Lưu và đọc chính xác các định dạng hợp lệ
    Khi tôi lưu tùy chọn định dạng là "bibtex"
    Thì khi truy vấn lại, định dạng trả về phải là "bibtex"
    Khi tôi lưu tùy chọn định dạng là "markdown"
    Thì khi truy vấn lại, định dạng trả về phải là "markdown"

  Kịch bản: 3. Tự động fallback về APA khi giá trị lưu trữ bị lỗi hoặc không hợp lệ
    Khi bộ nhớ LocalStorage chứa giá trị không hợp lệ "invalid_custom_format"
    Thì khi truy vấn, định dạng trả về phải tự động chuyển thành "apa"
    Khi bộ nhớ LocalStorage bị xóa hoặc rỗng
    Thì khi truy vấn, định dạng trả về phải là "apa"

  Kịch bản: 4. Đồng bộ định dạng khi chuyển tab giữa CitationModal và BatchCitationModal
    Khi người dùng mở hộp thoại trích dẫn đơn lẻ CitationModal và chọn tab "BibTeX"
    Và người dùng đóng CitationModal lại
    Và sau đó người dùng mở hộp thoại xuất danh mục hàng loạt BatchCitationModal
    Thì tab đang được kích hoạt mặc định trong BatchCitationModal phải là "BibTeX"
    Và khung xem trước phải hiển thị cấu trúc "@book{" hoặc "@misc{"

  Kịch bản: 5. Đổi tab trong BatchCitationModal được ghi nhớ cho CitationModal lần mở sau
    Khi người dùng mở BatchCitationModal và chọn tab "Markdown Footnote"
    Và người dùng đóng BatchCitationModal lại
    Và sau đó người dùng mở CitationModal cho một tài liệu bất kỳ
    Thì tab đang được kích hoạt mặc định trong CitationModal phải là "Markdown Footnote"
    Và trích dẫn hiển thị phải bắt đầu bằng "[^1]:"
