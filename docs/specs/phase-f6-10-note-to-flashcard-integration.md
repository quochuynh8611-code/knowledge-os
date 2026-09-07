# Technical Specification: Phase F6.10 — Note-to-Flashcard Integration
# (Tạo Flashcard Trực Tiếp Từ Ghi Chú)

## 1. TỔNG QUAN & BỐI CẢNH

Trong hệ sinh thái **Knowledge OS**, ghi chú (Note) là nơi người dùng thu thập, tổng hợp và phân tích kiến thức sâu.
Giai đoạn **Phase F6.10 — Note-to-Flashcard Integration** sẽ thiết lập cầu nối trực tiếp giữa **Note Subsystem** và **Flashcard Subsystem**, cho phép người dùng chuyển hóa nhanh các luận điểm quan trọng trong ghi chú thành các thẻ nhớ Active Recall (Spaced Repetition) mà không cần nhập liệu thủ công lặp lại.

---

## 2. USER STORIES & USE CASES

### User Story 1: Tạo thẻ từ văn bản bôi đen trong ghi chú
- **Là**: Người dùng đang đọc hoặc soạn thảo một ghi chú trong Topic/Lĩnh vực.
- **Tôi muốn**:
  1. Dùng chuột bôi đen một đoạn văn bản (text selection) bất kỳ trong phần nội dung ghi chú.
  2. Xuất hiện thanh công cụ ngữ cảnh (Floating Action Toolbar) hoặc bấm nút / phím tắt (ví dụ: `Cmd/Ctrl + Shift + F` hoặc `Alt + F`).
  3. Một modal "Tạo Flashcard từ Ghi Chú" bật lên với:
     - Mặt trước (Front): Đoạn văn bản bôi đen được điền tự động (hoặc người dùng tinh chỉnh).
     - Mặt sau (Back): Gợi ý tóm tắt hoặc để trống cho người dùng nhập đáp án/nghĩa.
     - Tự động liên kết: `topicId` lấy theo Topic hiện tại của Note; `noteId` được tự động gán vào trường foreign key `Flashcard.noteId`.
- **Để**: Tôi có thể nhanh chóng lưu lại khái niệm vừa đọc thành thẻ ôn tập.

### User Story 2: Tự động nhận diện cú pháp Cloze Deletion
- **Là**: Người dùng ghi chép theo cấu trúc điền khuyết `{{c1::từ khóa}}`.
- **Tôi muốn**:
  - Khi bôi đen đoạn văn bản chứa mẫu `{{c1::...}}`, hệ thống tự động nhận diện và chuyển loại thẻ sang `cloze`.
  - Tự động điền câu đục lỗ vào mặt trước và tách các từ khóa vào gợi ý đáp án mặt sau.
- **Để**: Tiết kiệm thời gian và đảm bảo độ chính xác của câu hỏi cloze.

### User Story 3: Tạo nhiều flashcard từ nhiều đoạn text (Batch Note-to-Card)
- **Là**: Người dùng đọc ghi chú dài có nhiều định nghĩa (ví dụ: các cặp Sinh - Khắc trong Ngũ Hành).
- **Tôi muốn**:
  - Lựa chọn danh sách các dòng gạch đầu dòng trong ghi chú.
  - Chuyển đổi mỗi dòng thành một Flashcard độc lập trong 1 lần nhấn nút (tách theo dấu hai chấm `: `, gạch nối `-`, hoặc cloze pattern).
- **Để**: Chuyển đổi toàn bộ tài liệu tóm tắt thành bộ thẻ nhớ chỉ trong vài giây.

### User Story 4: Điều hướng sau khi tạo (Post-Creation Action)
- **Tôi muốn**:
  - Tùy chọn: "Tạo và tiếp tục đọc ghi chú" (giữ nguyên ngữ cảnh hiện tại).
  - Tùy chọn: "Tạo và chuyển đến Card Browser / Ôn ngay" (redirect sang `#/flashcards/:topicId` hoặc `#/topics/:topicId/browse`).

---

## 3. THIẾT KẾ KỸ THUẬT DỰ KIẾN (TECHNICAL DESIGN)

### 3.1. Dữ liệu & Ràng buộc Schema (Prisma)
- Mô hình `Flashcard` hiện tại đã có sẵn quan hệ:
  ```prisma
  noteId     String?
  note       Note?     @relation(fields: [noteId], references: [id], onDelete: SetNull)
  ```
- Không cần migration schema mới; tận dụng 100% trường `noteId` để liên kết nguồn gốc ghi chú.
- Khi một Note bị xoá, quan hệ `onDelete: SetNull` đảm bảo thẻ nhớ không bị mất mà chỉ chuyển thành thẻ độc lập của Topic.

### 3.2. UI Components dự kiến
1. **`NoteTextSelectionPopover.tsx`**:
   - Lắng nghe sự kiện `mouseup` / `selectionchange` trên trình đọc Markdown hoặc editor ghi chú.
   - Hiển thị popover nổi gồm nút: `[Tạo Thẻ Nhớ]` và `[Cloze Thẻ Nhớ]`.
2. **`NoteToFlashcardModal.tsx`** (hoặc tích hợp nâng cấp `FlashcardFormModal.tsx`):
   - Nhận props: `initialText: string`, `topicId: string`, `noteId: string`.
   - Xem trước thẻ basic / cloze với live preview.
3. **`NoteCardListSection.tsx`**:
   - Ở cuối mỗi ghi chú (trong Note view), hiển thị danh sách các Flashcard đã được tạo từ ghi chú này (`GET /api/flashcards?noteId=...`).
   - Giúp người dùng biết ghi chú này đã có những thẻ ôn tập nào.

---

## 4. RÀNG BUỘC & ĐỊNH VỊ ROADMAP

| Giai đoạn | Tên Giai Đoạn | Trạng thái |
| :--- | :--- | :--- |
| **F6.4** | Topic-Scoped Flashcard Review Hub | ✅ Đã hoàn thành |
| **F6.5** | Card Browser & Card Lifecycle Management | 🔄 Đang triển khai |
| **F6.6** | Custom/Cram Sessions & Multi-Topic Review | ⏳ Kế hoạch tiếp theo |
| **F6.7** | Topic Hierarchy & Descendant Cards | ⏳ Kế hoạch tiếp theo |
| **F6.9** | Duplicate Detection & Card Merging | ⏳ Kế hoạch tiếp theo |
| **F6.10** | **Note-to-Flashcard Integration** | 📌 **Đã ghi nhận Roadmap chính thức** |
