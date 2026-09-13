# language: vi
Tính năng: Tái thiết kế Không gian Làm việc NotebookLM theo nguyên tắc Progressive Disclosure
  Là một học giả / người dùng Knowledge OS
  Tôi muốn một không gian làm việc NotebookLM tinh gọn, rõ ràng theo quy trình 3 bước
  Để có thể chuẩn bị nguồn, tạo prompt và nhập kết quả nghiên cứu một cách nhanh chóng, tập trung và không bị rối loạn thông tin

  Bối cảnh:
    Giả sử ứng dụng Knowledge OS đã khởi tạo dữ liệu nghiên cứu hợp lệ
    Và người dùng đã mở modal "NotebookLM"

  Kịch bản 1: Chọn topic và xem tóm tắt nguồn ở Bước 1
    Khi người dùng đang ở bước "Nguồn"
    Và người dùng chọn chủ đề "Kỳ Môn Độn Giáp Toàn Thư"
    Thì giao diện hiển thị tóm tắt gồm số lượng ghi chú và tài liệu tham khảo của chủ đề
    Và khung xem trước nguồn chuẩn hóa được giới hạn chiều cao tối đa

  Kịch bản 2: Sao chép tài liệu nguồn thành công
    Khi người dùng đang ở bước "Nguồn"
    Và người dùng nhấn nút "Sao chép nguồn"
    Thì toàn bộ nội dung tài liệu nguồn 5 phần được sao chép vào bộ nhớ tạm
    Và giao diện hiển thị phản hồi "Đã sao chép!"

  Kịch bản 3: Tải tài liệu nguồn định dạng Markdown (.md)
    Khi người dùng đang ở bước "Nguồn"
    Và người dùng nhấn nút "Tải File Nguồn (.md)"
    Thì trình duyệt kích hoạt tải xuống tệp Markdown với tên đã được chuẩn hóa

  Kịch bản 4: Mở Google NotebookLM trong tab mới mà không làm mất trạng thái modal
    Khi người dùng đang ở bước "Nguồn"
    Và người dùng nhấn nút "Mở Google NotebookLM"
    Thì một tab trình duyệt mới được mở tới liên kết "https://notebooklm.google.com/"
    Và modal NotebookLM trên Knowledge OS vẫn duy trì trạng thái hiện tại

  Kịch bản 5: Chọn loại artifact và tạo Task Prompt có chỉ dẫn tùy chọn ở Bước 2
    Khi người dùng chuyển sang bước "Prompt"
    Và người dùng chọn loại artifact là "Study Guide"
    Và người dùng nhập chỉ dẫn tùy chọn "Chú trọng đối chiếu Abhidhamma"
    Thì khung xem trước Task Prompt tự động cập nhật chứa nội dung chỉ dẫn đã nhập

  Kịch bản 6: Chống tạo trùng lặp handoff khi thao tác đang thực hiện
    Khi người dùng đang ở bước "Prompt"
    Và người dùng nhấn nút "Chuẩn bị Handoff Antigravity"
    Thì nút bấm chuyển sang trạng thái đang xử lý và tạm thời bị vô hiệu hóa
    Và một bản ghi Handoff Job mới được tạo trong hàng đợi với trạng thái "queued"

  Kịch bản 7: Handoff thành công hiển thị trạng thái thân thiện với người dùng
    Khi bản ghi Handoff Job được tạo thành công
    Thì thông báo xác nhận được hiển thị trên giao diện
    Và trạng thái Job được hiển thị bằng tiếng Việt rõ ràng như "Đang chờ xử lý"

  Kịch bản 8: Lệnh CLI Headless và lịch sử Pipeline chỉ xuất hiện trong vùng Advanced
    Khi người dùng đang ở bất kỳ bước nào trong modal
    Thì vùng "Chi tiết kỹ thuật nâng cao" mặc định ở trạng thái thu gọn
    Và khi người dùng nhấn mở rộng vùng này
    Thì lệnh CLI "agy -p" cùng danh sách lịch sử Handoff Job mới được hiển thị

  Kịch bản 9: Nạp tệp Markdown hợp lệ ở Bước 3
    Khi người dùng chuyển sang bước "Kết quả"
    Và người dùng chọn tải lên một tệp Markdown có tiêu đề "# Giáo Trình Khảo Cứu"
    Thì tiêu đề và nội dung tệp được tự động điền vào biểu mẫu nạp kết quả
    Và người dùng có thể lưu kết quả vào kho lưu trữ

  Kịch bản 10: Hiển thị thông báo lỗi khi nạp dữ liệu không hợp lệ hoặc rỗng
    Khi người dùng đang ở bước "Kết quả"
    Và người dùng cố gắng lưu một kết quả có nội dung trống
    Thì giao diện hiển thị thông báo lỗi "Nội dung artifact không được để trống"
    Và bản ghi không được lưu vào hệ thống

  Kịch bản 11: Mở bảng thẩm định kết quả (ArtifactReviewDrawer) từ thẻ kết quả
    Khi có ít nhất một kết quả trong kho kết quả ở Bước 3
    Và người dùng nhấn nút "Thẩm định" trên thẻ kết quả
    Thì bảng thẩm định "ArtifactReviewDrawer" được mở ra
    Và người dùng có thể thẩm định, xem trích dẫn hoặc nhập thành Note/Flashcard

  Kịch bản 12: Đóng modal bằng nút đóng ở header và phím Escape
    Khi modal NotebookLM đang mở
    Và người dùng nhấn nút đóng ở header hoặc nhấn phím "Escape"
    Thì modal được đóng lại và tiêu điểm (focus) được trả về phần tử kích hoạt trước đó

  Kịch bản 13: Bẫy tiêu điểm bàn phím (Focus Trap) không để focus thoát khỏi modal
    Khi modal NotebookLM đang mở
    Và người dùng liên tục nhấn phím "Tab" hoặc "Shift+Tab"
    Thì tiêu điểm bàn phím chỉ luân chuyển giữa các phần tử tương tác bên trong modal

  Kịch bản 14: Giao diện tương thích và mượt mà trên nhiều kích thước màn hình
    Khi người dùng mở modal trên màn hình laptop hoặc màn hình tablet/mobile
    Thì kích thước modal tự động co giãn tối đa 90vh
    Và các nội dung dài có thanh cuộn riêng biệt, không làm tràn viewport trình duyệt
