# language: vi
Tính năng: Workstream 5A — Advanced Knowledge Graph & Multi-Hop Traversal Explorer
  Để giúp học giả khảo cứu mối tương quan đa chiều và duyệt liên kết theo nhiều bước nhảy giữa các chủ đề, ghi chú và tài liệu
  Là một Nhà Nghiên Cứu Tri Thức
  Tôi muốn một bộ máy đồ thị thuần túy hỗ trợ duyệt k-hop, lọc quan hệ ngữ nghĩa/cấu trúc và chống vòng lặp an toàn.

  Bối cảnh:
    Cho hệ thống Knowledge OS đang chứa 35 topics canonical cùng các notes và resources

  # -----------------------------------------------------------------------------
  # SCENARIO 1: DIRECT 1-HOP NEIGHBORHOOD TRAVERSAL
  # -----------------------------------------------------------------------------
  Kịch bản: Truy vấn thông tin chi tiết một node và các liên kết 1-hop trực tiếp
    Cho người nghiên cứu chọn topic "topic-tu-dieu-de"
    Khi hệ thống trích xuất node và các liên kết 1-hop trực tiếp
    Thì kết quả trả về đúng thông tin node "Tứ Diệu Đế" kèm các hàng xóm trực tiếp (topics, notes, resources)
    Và bậc của node (degree) được tính toán chính xác

  # -----------------------------------------------------------------------------
  # SCENARIO 2: BOUNDED MULTI-HOP (K-HOP) TRAVERSAL
  # -----------------------------------------------------------------------------
  Kịch bản: Duyệt đồ thị đa tầng (Multi-hop traversal) với giới hạn độ sâu k-hop
    Cho người dùng yêu cầu duyệt đồ thị xuất phát từ "topic-duyen-he-patthana" với độ sâu maxDepth = 2
    Khi thuật toán duyệt đồ thị BFS thực thi
    Thì tất cả các node trong bán kính 2 bước nhảy được trích xuất
    Và không có node nào vượt quá độ sâu maxDepth = 2 được thêm vào kết quả
    Và số lượng node trích xuất bị giới hạn an toàn bởi maxNodesLimit

  # -----------------------------------------------------------------------------
  # SCENARIO 3: CYCLE DETECTION & AVOIDANCE
  # -----------------------------------------------------------------------------
  Kịch bản: Tự động ngắt và chống vòng lặp (Cycle Avoidance) trong đồ thị có chu trình
    Cho đồ thị chứa chu trình khép kín giữa các topics (Topic A -> Topic B -> Topic C -> Topic A)
    Khi người dùng thực hiện duyệt multi-hop với maxDepth = 4
    Thì thuật toán phát hiện chu trình (hasCycles = true)
    Và mỗi node chỉ được đưa vào danh sách thăm một lần duy nhất mà không gây đệ quy vô tận

  # -----------------------------------------------------------------------------
  # SCENARIO 4: SEMANTIC & STRUCTURAL EDGE FILTERING
  # -----------------------------------------------------------------------------
  Kịch bản: Lọc đồ thị con theo loại quan hệ ngữ nghĩa hoặc cấu trúc
    Cho đồ thị chứa các cạnh ngữ nghĩa ("prerequisite", "contradicts", "related", "advanced") và cạnh cấu trúc ("has_note", "has_resource")
    Khi người dùng cấu hình lọc chỉ lấy loại liên kết "prerequisite" và các cạnh cấu trúc
    Thì đồ thị con trả về chỉ chứa các cạnh thỏa mãn điều kiện lọc
    Và các cạnh không khớp bị loại bỏ khỏi đồ thị con

  # -----------------------------------------------------------------------------
  # SCENARIO 5: NODE TYPE FILTERING (TOPIC, NOTE, RESOURCE)
  # -----------------------------------------------------------------------------
  Kịch bản: Lọc đồ thị con chỉ hiển thị các loại node được chọn
    Cho người dùng cấu hình bộ lọc nodeTypes chỉ bao gồm "topic" và "resource" (loại trừ "note")
    Khi hệ thống xây dựng đồ thị con
    Thì danh sách nodes trả về chỉ chứa các node thuộc loại "topic" và "resource"
    Và tất cả các note nodes cùng các cạnh has_note liên quan bị loại bỏ

  # -----------------------------------------------------------------------------
  # SCENARIO 6: DANGLING EDGE REFERENCE HANDLING (GRACEFUL DEGRADATION)
  # -----------------------------------------------------------------------------
  Kịch bản: Xử lý an toàn khi gặp liên kết trỏ tới ID không tồn tại
    Cho một topic chứa liên kết với targetId = "non-existent-topic-id"
    Khi hệ thống xây dựng cấu trúc đồ thị
    Thì liên kết rác tự động bị loại bỏ an toàn
    Và ứng dụng không phát sinh bất kỳ lỗi runtime nào

  # -----------------------------------------------------------------------------
  # SCENARIO 7: ZERO BINARY INGESTION INVARIANT
  # -----------------------------------------------------------------------------
  Kịch bản: Bảo toàn tuyệt đối nguyên tắc Zero Binary Ingestion trên Resource Nodes
    Cho một Resource node biểu diễn tệp cục bộ "Majjhima-Nikaya.pdf"
    Khi đồ thị nạp dữ liệu node
    Thì node chỉ chứa metadata title, type và filePath
    Và ứng dụng tuyệt đối không nạp nội dung nhị phân vào cấu trúc đồ thị
