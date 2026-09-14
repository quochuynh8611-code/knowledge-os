# Hướng Dẫn Sử Dụng: AI Research Copilot & Tích Hợp Obsidian Vault

---

## 1. Giới Thiệu Tổng Quan

**AI Research Copilot** là trợ lý nghiên cứu học thuật thông minh trong Knowledge OS, được thiết kế theo triết lý **Bounded Knowledge Context** (nghiên cứu trong phạm vi tri thức có kiểm soát). Thay vì tạo ra các câu trả lời chung chung trên mạng, AI Copilot tổng hợp, đối chiếu và trích dẫn trực tiếp từ:
- Ghi chú cá nhân trong Chủ đề (Topic Notes)
- Tài nguyên liên kết (Topic Resources)
- Các kho tài liệu Markdown trong Obsidian Vaults (Phật Học, Đông Y, Huyền Học, v.v.)

---

## 2. Các Bước Sử Dụng

### Bước 1: Mở AI Research Studio
1. Từ giao diện chi tiết Chủ đề (`TopicDetail`), chuyển sang tab **Khảo Cứu AI** (hoặc mở trực tiếp từ Dashboard / Command Palette `Ctrl+K` $\rightarrow$ `AI Research Studio`).
2. Nhập câu hỏi hoặc đề tài nghiên cứu vào khung soạn thảo.

### Bước 2: Chọn Phạm Vi Nguồn Dữ Liệu (Source Scope)
Tại khu vực **Phạm vi nguồn dữ liệu**:
- Tích chọn **Ghi chú trong chủ đề** nếu muốn AI tham chiếu các note hiện có.
- Tích chọn **Tài nguyên liên kết** để AI đọc các bài viết, link sách trong chủ đề.
- Tích chọn **Obsidian Vault** để mở rộng nghiên cứu sang kho tri thức Obsidian cá nhân.

### Bước 3: Chọn Tài Liệu Obsidian Theo Vault
Khi tích chọn **Obsidian Vault** hoặc nhấn nút **Chọn tài liệu...**:
1. Chọn kho lưu trữ mục tiêu trong dropdown (ví dụ: *Đông Y Obsidian* hoặc *Phật Học Obsidian*).
2. Hệ thống sẽ hiển thị danh sách tài liệu tương ứng với Vault đó.
3. Dùng ô tìm kiếm để lọc tài liệu theo từ khóa mong muốn.
4. Tích chọn từ **1 đến tối đa 3 tài liệu** quan trọng nhất làm ngữ cảnh nghiên cứu.
5. Nhấn **Xác nhận nguồn** để hoàn tất.

> **Lưu ý an toàn:** Khi bạn đổi sang một Vault khác, danh sách các tài liệu đã chọn ở Vault trước sẽ tự động được làm sạch để tránh nhầm lẫn dữ liệu giữa các ngành học.

### Bước 4: Tùy Chỉnh Độ Sâu & Định Dạng Đầu Ra
- **Độ sâu nghiên cứu (Research Depth):**
  - *Tóm tắt nhanh (Brief):* Khái quát định nghĩa và ý chính.
  - *Phân tích sâu (Deep):* Khảo cứu đa chiều, đối chiếu ngữ nghĩa và phương pháp luận.
  - *Tổng hợp toàn diện (Synthesis):* Hệ thống hóa sơ đồ và liên hệ thực chứng.
- **Định dạng kết quả (Output Format):**
  - *Ghi chú Markdown:* Bài viết học thuật có tiêu đề, phân mục rõ ràng.
  - *Bộ câu hỏi Flashcard:* Các cặp câu hỏi - đáp án Active Recall sẵn sàng để ôn tập ngắt quãng.
  - *Sơ đồ khái niệm:* Bản đồ tri thức thể hiện mối quan hệ giữa các khái niệm.

### Bước 5: Gửi Yêu Cầu & Thẩm Định Kết Quả
1. Nhấn nút **Khảo Cứu** (hoặc `Ctrl+Enter`).
2. Đọc câu trả lời được AI phân tích bám sát tài liệu nguồn.
3. Kiểm tra danh sách **Trích dẫn nguồn gốc (Citations)** ở bên dưới để đối chiếu tính xác thực.
4. Bạn có thể sao chép kết quả hoặc lưu thành ghi chú mới vào chủ đề.

---

## 3. Các Câu Hỏi Thường Gặp (FAQ)

### Vì sao tôi chỉ được chọn tối đa 3 tài liệu Obsidian?
Để đảm bảo chất lượng phản hồi cao nhất, hạn chế chi phí token và tránh làm loãng ngữ cảnh của mô hình AI, hệ thống giới hạn tối đa 3 tài liệu trọng tâm cho mỗi lần khảo cứu.

### Dữ liệu tệp trên máy tính của tôi có bị gửi ra ngoài không?
Hệ thống chỉ đọc nội dung tệp Markdown mà bạn đã chủ động chọn. Mọi đường dẫn thư mục tuyệt đối trên máy tính cá nhân (`/Users/...`) đều được loại bỏ trước khi gửi yêu cầu lên API.

### Tôi có thể nghiên cứu tìm kiếm trên Internet được không?
Hiện tại tính năng nghiên cứu Internet bên ngoài được tắt theo thiết kế để đảm bảo tri thức luôn bám sát các tài liệu tin cậy mà bạn đã lưu trữ trong Knowledge OS.
