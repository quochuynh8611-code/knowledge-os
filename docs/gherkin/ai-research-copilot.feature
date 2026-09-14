# language: vi
Tính năng: AI Research Copilot & Nguồn Tài Liệu Obsidian Bounded Context

  Là một người học tập và nghiên cứu tri thức trong Knowledge OS,
  Tôi muốn sử dụng AI Copilot để khảo cứu các chủ đề dựa trên ghi chú và tài liệu Obsidian cá nhân,
  Để tổng hợp kiến thức chính xác, có trích dẫn nguồn gốc và không bị rò rỉ dữ liệu ngoài ý muốn.

  Bối cảnh:
    Cho rằng hệ thống Knowledge OS đang chạy cục bộ với đầy đủ cấu hình Obsidian Vault
    Và người dùng đang mở giao diện AI Research Studio của một chủ đề

  Kịch bản: Người dùng chọn phạm vi nguồn khảo cứu trong chủ đề
    Khi người dùng bật tùy chọn "Ghi chú trong chủ đề" và "Tài nguyên liên kết"
    Và nhập câu hỏi "Tóm lược các chi phần của Bát Chánh Đạo"
    Và nhấn nút "Khảo Cứu"
    Thì hệ thống chỉ gửi ngữ cảnh thuộc các ghi chú và tài nguyên của chủ đề hiện tại đến AI Model
    Và phản hồi hiển thị kèm danh sách trích dẫn tham chiếu tương ứng

  Kịch bản: Người dùng mở modal chọn tài liệu Obsidian theo từng Vault
    Khi người dùng bật tùy chọn "Obsidian Vault" và nhấn "Chọn tài liệu..."
    Thì modal chọn nguồn tài liệu Obsidian xuất hiện
    Và dropdown hiển thị danh sách các Vault đã được quản lý (Phật Học, Đông Y, Huyền Học)

  Kịch bản: Người dùng chọn tài liệu trong Vault Đông Y
    Khi người dùng chọn Vault "Đông Y Obsidian" trong dropdown
    Thì danh sách tài liệu hiển thị chỉ chứa các bài viết thuộc Vault Đông Y
    Và không chứa bất kỳ tài liệu nào từ Vault Phật Học
    Và mọi đường dẫn hiển thị đều là đường dẫn tương đối (relative path)

  Kịch bản: Giới hạn số lượng tài liệu Obsidian tối đa là 3
    Khi người dùng đã chọn đủ 3 tài liệu trong Vault
    Thì bộ đếm hiển thị "3 / 3"
    Và các checkbox của những tài liệu chưa chọn khác đều bị vô hiệu hóa
    Và người dùng không thể chọn thêm tài liệu thứ 4

  Kịch bản: Đổi Vault tự động làm sạch danh sách lựa chọn cũ
    Cho rằng người dùng đang chọn 3 tài liệu trong Vault "Đông Y Obsidian"
    Khi người dùng chuyển dropdown sang "Phật Học Obsidian"
    Thì danh sách tài liệu cũ bị xóa ngay lập tức
    Và bộ đếm lựa chọn được reset về "0 / 3"
    Và các tài liệu của Vault Đông Y không bị gửi nhầm sang Vault mới

  Kịch bản: Đổi Vault nhanh không gây ra race condition hoặc banner lỗi
    Khi người dùng liên tục chuyển đổi giữa các Vault trong dropdown
    Thì các request HTTP đang chạy dở của Vault cũ bị hủy bằng AbortController
    Và không hiển thị banner lỗi giả AbortError
    Và danh sách kết quả cuối cùng phản ánh chính xác tài liệu của Vault được chọn sau cùng

  Kịch bản: Tìm kiếm tài liệu theo từ khóa trong phạm vi Vault
    Khi người dùng chọn Vault "Đông Y Obsidian"
    Và nhập từ khóa "kinh mạch" vào ô tìm kiếm
    Thì danh sách hiển thị chỉ gồm các tài liệu khớp từ khóa bên trong Vault Đông Y
    Và khi xóa nội dung tìm kiếm thì danh sách trả về toàn bộ tài liệu của Vault Đông Y

  Kịch bản: Xử lý an toàn khi toàn bộ tài liệu đã chọn bị xóa trên đĩa
    Cho rằng người dùng chọn một tài liệu Obsidian nhưng sau đó tệp bị xóa khỏi máy tính
    Khi người dùng gửi yêu cầu khảo cứu
    Thì hệ thống trả về mã lỗi 422 Unprocessable Entity
    Và hiển thị thông báo lỗi rõ ràng mà không gửi yêu cầu tốn token đến Gemini API

  Kịch bản: Bản nháp nghiên cứu được lưu cục bộ theo từng chủ đề
    Khi người dùng soạn thảo câu hỏi và chọn các tài liệu Obsidian cho Topic A
    Và chuyển sang xem Topic B rồi quay lại Topic A
    Thì nội dung câu hỏi, cấu hình phạm vi nguồn và các tài liệu đã chọn của Topic A được khôi phục nguyên vẹn
