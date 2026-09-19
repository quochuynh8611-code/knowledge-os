# language: vi
Tính năng: Phase R1 Research Reading Workspace
  Là một nhà nghiên cứu sử dụng Knowledge OS
  Tôi muốn có một không gian làm việc hợp nhất giữa Thư viện tài liệu, Trình đọc đa định dạng và Hộp tiếp nhận nghiên cứu
  Để duyệt, đọc sâu tài liệu PDF/EPUB/Markdown, trích xuất dữ liệu học thuật và phân loại tri thức mà không làm thay đổi tệp tin gốc trong Vault

  Quy tắc: Thư viện nghiên cứu hỗ trợ tìm kiếm, phân loại định dạng và chuyển đổi chế độ xem
    Kịch bản: Người dùng lọc danh sách tài liệu theo định dạng PDF và EPUB
      Giả sử người dùng đang ở màn hình "Thư Viện Nghiên Cứu"
      Khi người dùng chọn bộ lọc định dạng là "PDF"
      Thì danh sách chỉ hiển thị các tệp có định dạng ".pdf"
      Và khi người dùng chọn bộ lọc định dạng là "EPUB"
      Thì danh sách chỉ hiển thị các sách điện tử có định dạng ".epub"

    Kịch bản: Người dùng chuyển đổi giữa chế độ xem Lưới và Danh sách
      Giả sử danh sách tài liệu đang hiển thị ở chế độ Lưới (Card Grid)
      Khi người dùng nhấp vào nút chuyển chế độ "Danh sách"
      Thì giao diện chuyển sang dạng bảng tóm tắt dòng gọn (Compact List View)
      Và các thông tin tiêu đề, định dạng, dung lượng vẫn hiển thị đầy đủ

    Kịch bản: Người dùng tìm kiếm tài liệu theo từ khóa
      Giả sử người dùng nhập từ khóa "Vi Diệu Pháp" vào ô tìm kiếm
      Thì danh sách tài liệu tự động lọc ra các tệp có tiêu đề hoặc đường dẫn chứa "Vi Diệu Pháp"

  Quy tắc: Không gian đọc hợp nhất cung cấp thanh công cụ và Sidebar đa năng 4 tab
    Kịch bản: Người dùng mở tài liệu Markdown từ thư viện vào Unified Reader
      Giả sử người dùng nhấp vào tài liệu "Nghiên Cứu Vi Diệu Pháp.md"
      Thì không gian "UnifiedResearchReader" được kích hoạt
      Và thanh điều khiển hiển thị tiêu đề cùng nhãn định dạng "Markdown"
      Và thanh Sidebar 4 tab hiển thị các tab "Outline", "Notes", "Highlights", "Inbox"

    Kịch bản: Người dùng chuyển qua lại giữa các tab trong Sidebar của Reader
      Giả sử người dùng đang đọc tài liệu trong Unified Reader
      Khi người dùng nhấp vào tab "Highlights" trên Sidebar
      Thì danh sách các đoạn trích đã đánh dấu của tài liệu hiện tại được hiển thị
      Và khi người dùng nhấp vào tab "Inbox"
      Thì danh sách các trích đoạn trong Research Inbox được hiển thị ngay trong Sidebar

  Quy tắc: Bôi đen văn bản kích hoạt thanh công cụ tuyển chọn với 5 hành động học thuật
    Kịch bản: Người dùng bôi đen đoạn văn bản và thêm vào Research Inbox
      Giả sử người dùng bôi đen đoạn văn bản "Vạn pháp do duyên sinh" trong tài liệu
      Thì thanh công cụ nổi "UnifiedSelectionToolbar" xuất hiện
      Khi người dùng nhấp vào hành động "Thêm vào Inbox"
      Thì một mục `ResearchInboxItem` mới được tạo với `isProcessed` bằng false
      Và thông báo "Đã thêm trích đoạn vào Research Inbox" xuất hiện
      Và số đếm `unprocessedInboxCount` trên thanh điều hướng tăng lên 1

    Kịch bản: Người dùng sao chép trích dẫn học thuật tự động từ đoạn chọn
      Giả sử người dùng bôi đen văn bản trong tài liệu PDF tại trang 15
      Khi người dùng nhấp vào hành động "Trích dẫn" trên thanh công cụ
      Thì trích dẫn kèm định dạng trang và nguồn được sao chép an toàn vào clipboard
      Và hiển thị thông báo "Đã sao chép trích dẫn học thuật"

  Quy tắc: Hộp tiếp nhận nghiên cứu hỗ trợ triage và mở lại đúng vị trí nguồn
    Kịch bản: Người dùng mở lại vị trí gốc từ một mục trong Research Inbox
      Giả sử trong Research Inbox có một trích đoạn từ tài liệu Markdown với `headingId` là "chuong-1-tong-quan"
      Khi người dùng nhấp vào nút "Xem nguồn" của mục trích đoạn đó
      Thì tài liệu gốc được mở trong Unified Reader
      Và màn hình tự động cuộn đến tiêu đề "chuong-1-tong-quan"

    Kịch bản: Người dùng chuyển trích đoạn từ Inbox thành Ghi chú đúc kết
      Giả sử người dùng nhấp vào "Gửi vào Ghi chú" cho một mục trong Research Inbox
      Khi người dùng chọn ghi chú đích trong modal "TargetNoteSelectorModal"
      Thì đoạn trích được chèn vào nội dung ghi chú dưới dạng blockquote học thuật
      Và mục trong Inbox được đánh dấu `isProcessed = true`

  Quy tắc: Ranh giới bất biến của Obsidian Vault được bảo toàn tuyệt đối
    Kịch bản: Đọc và trích xuất dữ liệu từ tệp tin thuộc Obsidian Vault
      Giả sử người dùng mở tệp tin từ Obsidian Vault và thực hiện đánh dấu, trích dẫn, tạo ghi chú
      Thì các tệp tin trong thư mục Obsidian Vault trên đĩa không bị ghi đè hay thay đổi nội dung
      Và toàn bộ dữ liệu trích xuất chỉ được lưu trong bộ nhớ ứng dụng và cơ sở dữ liệu Dashboard
