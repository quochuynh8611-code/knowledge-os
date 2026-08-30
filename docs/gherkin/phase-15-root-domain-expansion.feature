# language: vi
Tính năng: Mở rộng Lĩnh vực Gốc Đông Y & Ngôn Ngữ cùng Chủ đề Mẫu
  Là một học giả sử dụng Knowledge OS
  Tôi muốn hệ thống khởi tạo sẵn các lĩnh vực Đông Y và Ngôn Ngữ cùng các chủ đề mẫu chất lượng cao
  Để tôi có thể bắt đầu nghiên cứu liên ngành ngay lập tức mà không phải cấu hình thủ công từ đầu.

  Bối cảnh:
    Cho rằng hệ thống Knowledge OS đang hoạt động với cấu hình Dynamic Root Taxonomy (ADR-016)
    Và dữ liệu mẫu mặc định được nạp từ INITIAL_CATEGORIES và INITIAL_TOPICS

  Kịch bản: Khởi tạo danh mục gốc Đông Y và Ngôn Ngữ
    Khi người dùng mở ứng dụng lần đầu hoặc thực hiện đặt lại dữ liệu mặc định
    Thì danh mục gốc "Đông Y" (id: "cat-root-dong-y") phải xuất hiện với parentId là null
    Và danh mục gốc "Ngôn Ngữ" (id: "cat-root-ngon-ngu") phải xuất hiện với parentId là null
    Và cả hai danh mục phải hiển thị trên thanh điều hướng Sidebar và bộ lọc Cây Chủ Đề

  Kịch bản: Bổ sung các danh mục con và chủ đề mẫu cho Đông Y
    Khi hệ thống nạp dữ liệu mẫu ban đầu
    Thì các danh mục con "Kinh Lạc" và "Tạng Tượng" phải thuộc danh mục gốc "cat-root-dong-y"
    Và các chủ đề mẫu như "Học thuyết Âm Dương" và "Hệ thống 12 Kinh Mạch" phải được liên kết chính xác
    Và mỗi chủ đề mẫu phải có đầy đủ tiến độ học tập studyProgress ở trạng thái hợp lệ

  Kịch bản: Bổ sung các danh mục con và chủ đề mẫu cho Ngôn Ngữ
    Khi hệ thống nạp dữ liệu mẫu ban đầu
    Thì các danh mục con "Sanskrit Phạn ngữ" và "Pali Cổ ngữ" phải thuộc danh mục gốc "cat-root-ngon-ngu"
    Và các chủ đề mẫu ngữ pháp tiếng Phạn và văn bản Pali phải có đầy đủ ghi chú và tài liệu tham khảo

  Kịch bản: Ưu tiên xếp hạng lĩnh vực trọng tâm trên Dashboard
    Giả sử người dùng chọn "Đông Y" làm lĩnh vực trọng tâm (focusDomainId = "cat-root-dong-y")
    Khi bảng điều khiển Dashboard Overview tính toán thứ tự hiển thị các thẻ lĩnh vực
    Thì thẻ "Đông Y" phải xuất hiện ở vị trí đầu tiên
    Và các lĩnh vực còn lại được sắp xếp theo mức độ hoạt động và thứ tự từ điển
