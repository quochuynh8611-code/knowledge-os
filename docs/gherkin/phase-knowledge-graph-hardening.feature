# language: vi
Tính năng: Gia Cố Đồ Thị Tri Thức & Duyệt Đa Bước Nhảy Tất Định (Phase Knowledge Graph Hardening)

  Bối cảnh:
    Cho hệ thống Đồ Thị Tri Thức đang chứa danh sách các chủ đề, ghi chú và tài liệu tham khảo thuộc nhiều lĩnh vực

  Kịch bản: 1. Duyệt k-hop tất định có ưu tiên trọng số và phân giải chu trình
    Cho đồ thị chứa nhiều nhánh liên kết với trọng số và loại quan hệ khác nhau
    Khi người dùng thực hiện duyệt k-hop từ một chủ đề gốc với giới hạn maxNodesLimit
    Thì thuật toán BFS mở rộng theo thứ tự ưu tiên: liên kết có trọng số cao hơn trước, sau đó đến thứ tự bảng chữ cái
    Và kết quả trả về hoàn toàn giống nhau 100% giữa các lần thực thi liên tiếp
    Và cờ hasCycles phản ánh chính xác sự hiện diện của chu trình khép kín

  Kịch bản: 2. Truy vết nguồn gốc bước nhảy và khoảng cách hop cho từng node con
    Cho người dùng duyệt đồ thị con xuất phát từ một chủ đề gốc với maxDepth = 3
    Khi hệ thống trích xuất danh sách các node trong đồ thị con
    Thì mỗi node chứa thông tin khoảng cách bước nhảy hopDistance so với node gốc
    Và node chứa định danh parentHopId chỉ rõ node nào đã dẫn dắt đến node hiện tại

  Kịch bản: 3. Tìm đường đi ngắn nhất giữa hai chủ đề bất kỳ
    Cho hai chủ đề A và B có liên kết gián tiếp qua chuỗi chủ đề trung gian
    Khi người dùng yêu cầu tìm đường liên kết ngắn nhất từ A đến B
    Thì hệ thống trả về danh sách các cạnh và node tạo thành đường đi tối ưu
    Và nếu không có liên kết nào giữa A và B thì trả về kết quả rỗng an toàn

  Kịch bản: 4. Phân bổ cụm tọa độ đồ thị động theo danh mục gốc đa lĩnh vực
    Cho hệ thống chứa nhiều lĩnh vực nghiên cứu gốc (Phật học, Huyền học, Triết học, v.v.)
    Khi đồ thị tri thức tiến hành tính toán bố cục hiển thị Canvas
    Thì các cụm node được phân bổ tâm tọa độ động theo số lượng lĩnh vực thực tế
    Và bộ lọc lĩnh vực trên thanh công cụ hiển thị đầy đủ danh sách các lĩnh vực gốc

  Kịch bản: 5. Khử trùng và nhóm các cạnh song song giữa cùng một cặp node
    Cho hai chủ đề có đồng thời nhiều liên kết ngữ nghĩa qua lại
    Khi đồ thị dựng danh sách các cạnh hiển thị
    Thì các cạnh được đánh dấu phân biệt và không làm sai lệch số bậc kết nối (degree) của node
