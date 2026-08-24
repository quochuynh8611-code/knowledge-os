# Feature: Local File Picker UX & Knowledge Bridge (Obsidian, NotebookLM, Antigravity)
# ADR: ADR-012 (docs/adr/ADR-012-local-file-picker-and-knowledge-bridge.md)
# Components: ResourceFormModal.tsx, ObsidianBridgeModal.tsx, NotebookLMStudioModal.tsx
# Tests: tests/unit/resource-form-modal-file-picker.test.tsx

Feature: Bộ chọn Tệp Cục bộ (File Picker) và Cầu nối Hệ Tri thức Đa Nền tảng
  # Cung cấp trải nghiệm thêm tệp cục bộ nhanh chóng bằng nút Duyệt tệp không cần gõ tay,
  # đồng thời chuẩn hóa luồng bàn giao tri thức sang Obsidian, NotebookLM và Antigravity.

  Background:
    Given Hệ thống Knowledge OS đang hoạt động
    And Người dùng mở modal 'Thêm Tài Liệu Nghiên Cứu'

  # -------------------------------------------------------------------
  # Phase 1: Local File Picker UX
  # -------------------------------------------------------------------
  Scenario: 1. Nút Duyệt Tệp hiển thị khi chuyển sang chế độ Tệp Trên Máy
    When Người dùng chọn chế độ 'Tệp trên máy'
    Then Giao diện hiển thị nút 'Duyệt tệp trên máy'
    And Ô nhập đường dẫn tệp (filePath) sẵn sàng nhận giá trị

  Scenario: 2. Tự động trích xuất tên tệp và định dạng khi chọn file PDF qua File Picker
    When Người dùng chọn tệp cục bộ có tên 'Abhidhamma-Khao-Luan.pdf' qua nút Duyệt tệp
    Then Ô filePath tự động được điền 'Abhidhamma-Khao-Luan.pdf'
    And Định dạng tài liệu tự động chuyển sang 'PDF'
    And Ô tiêu đề tài liệu tự động gợi ý 'Abhidhamma Khao Luan' nếu đang trống

  Scenario: 3. Tự động nhận diện định dạng Audio / Video khi chọn file đa phương tiện
    When Người dùng chọn tệp cục bộ có tên 'Phap-Am-Tu-Niem-Xu.mp3' qua nút Duyệt tệp
    Then Định dạng tài liệu tự động chuyển sang 'Audio'
    And Ô filePath hiển thị 'Phap-Am-Tu-Niem-Xu.mp3'

  Scenario: 4. Hiển thị thông báo hướng dẫn giới hạn sandbox trình duyệt
    When Người dùng duyệt chọn tệp từ máy cục bộ
    Then Giao diện hiển thị ghi chú giải thích về giới hạn bảo mật đường dẫn tuyệt đối của trình duyệt
    And Cho phép người dùng chỉnh sửa thêm tiền tố thư mục vào ô filePath nếu muốn

  Scenario: 5. Ràng buộc an toàn — Không nạp binary vào payload submit
    When Người dùng lưu tài liệu vừa chọn qua File Picker
    Then Hàm addResource được gọi với filePath là chuỗi tên/đường dẫn tệp
    And Không có chuỗi base64 hoặc binary ArrayBuffer nào được gửi kèm
    And Dung lượng payload luôn nhỏ hơn 2KB

  # -------------------------------------------------------------------
  # Phase 2a: Obsidian Open & Vault Export
  # -------------------------------------------------------------------
  Scenario: 6a. Mở topic trong Obsidian Vault qua giao thức obsidian://open
    Given Một chủ đề 'Vi Diệu Pháp Toàn Tập' thuộc danh mục Phật Học
    And Người dùng đã cấu hình tên Vault 'Khao-Cuu-Phat-Hoc-Huyen-Hoc'
    When Người dùng chọn hành động 'Mở trong Obsidian'
    Then Hệ thống sinh URI theo cấu trúc 'obsidian://open?vault=Khao-Cuu-Phat-Hoc-Huyen-Hoc&file=Phat-Hoc/Vi%20Di%E1%BB%87u%20Ph%C3%A1p%20To%C3%A0n%20T%E1%BA%ADp'
    And Đường dẫn file được làm sạch các ký tự đặc biệt ăn khớp 100% với tên file trong gói ZIP

  Scenario: 6b. Tạo note mới trong Obsidian qua giao thức obsidian://new
    Given Một chủ đề 'Kỳ Môn Độn Giáp' kèm nội dung luận thuyết
    When Người dùng chọn 'Tạo note mới trong Obsidian'
    Then Hệ thống sinh URI 'obsidian://new?vault=...&name=...&content=...'
    And Toàn bộ YAML frontmatter, [[Wiki Links]], và nội dung được mã hóa URI an toàn

  Scenario: 6c. Sao chép Markdown định dạng chuẩn Obsidian vào Clipboard
    Given Modal Obsidian Bridge đang hiển thị chủ đề hiện tại
    When Người dùng bấm 'Sao chép Note (+ Frontmatter)'
    Then Nội dung Markdown chứa YAML Frontmatter và danh sách liên kết [[Wiki Links]] được sao chép vào clipboard
    And Giao diện hiển thị phản hồi 'Đã sao chép Markdown!'

  Scenario: 6d. Xuất trọn bộ Obsidian Vault dạng file ZIP
    Given Hệ thống có 35 chủ đề canonical, các ghi chú và tài liệu tham khảo
    When Người dùng bấm 'Tải Xuống Trọn Bộ Obsidian Vault (.zip)'
    Then Hệ thống sinh file nén ZIP chứa '00_Map_Of_Content.md'
    And Thư mục 'Phat-Hoc/' chứa toàn bộ tệp Markdown chủ đề Phật học
    And Thư mục 'Huyen-Hoc/' chứa toàn bộ tệp Markdown chủ đề Huyền học
    And Thư mục 'Ghi-Chu/' chứa toàn bộ ghi chú khảo cứu
    And Tệp ZIP được tải về tự động với tên dạng '{VaultName}-{Date}.zip'

  Scenario: 6e. Quản lý và lưu trữ Vault Name với cơ chế Fallback
    When Người dùng nhập tên Vault mới trong modal Obsidian Bridge
    Then Tên Vault được lưu tức thì vào LocalStorage với khóa 'obsidian_vault_name_pref'
    And Nếu người dùng xóa trống hoặc nhập toàn khoảng trắng, hệ thống tự động fallback về 'Khao-Cuu-Phat-Hoc-Huyen-Hoc'

  # -------------------------------------------------------------------
  # Phase 2b: NotebookLM Source Packaging & Artifact Studio
  # -------------------------------------------------------------------
  Scenario: 7a. Đóng gói tài liệu nguồn chuẩn 5 phần bao gồm cả nguồn Web và Local File
    Given Chủ đề 'Kỳ Môn Độn Giáp' kèm các ghi chú và tài liệu tham khảo (Web URL và Local filePath)
    When Người dùng mở 'NotebookLM Studio'
    Then Hệ thống tạo bản tài liệu Markdown chuẩn hóa 5 phần gồm: Tóm tắt định vị, Luận thuyết kinh điển, Liên kết tri thức, Ghi chú khảo cứu, và Thư tịch trích dẫn
    And Nguồn tài liệu cục bộ hiển thị đúng tên tệp tham chiếu mà không nhúng dữ liệu nhị phân (Zero Binary)

  Scenario: 7b. Sao chép và tải về tệp nguồn Markdown cho NotebookLM
    Given Modal NotebookLM Studio đang hiển thị tài liệu nguồn của chủ đề
    When Người dùng bấm 'Sao chép nguồn' hoặc 'Tải File Nguồn (.md)'
    Then Nội dung tài liệu nguồn 5 phần được sao chép vào clipboard an toàn hoặc tải xuống dưới dạng tệp Markdown
    And Tên tệp tải xuống được làm sạch theo dạng 'NotebookLM-Source-{TopicTitle}.md'

  Scenario: 7c. Quản lý lưu trữ và xóa kết quả Artifacts từ NotebookLM
    When Người dùng lưu một kết quả Audio Overview Summary từ NotebookLM
    Then Kết quả được gán ID duy nhất và lưu vào LocalStorage 'phat_hoc_notebooklm_artifacts_v1'
    And Danh sách kết quả được hiển thị phân loại theo chủ đề và có thể xóa khi cần

  Scenario: 7d. Chuyển đổi chủ đề linh hoạt trong NotebookLM Studio
    When Người dùng đổi chủ đề được chọn trong danh sách thả xuống
    Then Nội dung tài liệu nguồn tự động tái đóng gói theo chủ đề mới
    And Kho kết quả Artifacts tự động lọc hiển thị đúng các mục của chủ đề được chọn

  # -------------------------------------------------------------------
  # Phase 3: Antigravity Research Scholar Handoff
  # -------------------------------------------------------------------
  Scenario: 8. Tạo gói bàn giao nghiên cứu cho Antigravity Scholar
    Given Chủ đề khảo cứu cần phân tích liên ngành
    When Người dùng kích hoạt gói bàn giao Antigravity Handoff Bundle
    Then Hệ thống tổng hợp đầy đủ bối cảnh, trọng số liên kết, luận thuyết và câu hỏi nghiên cứu
