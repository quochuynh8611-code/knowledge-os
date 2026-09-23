# Ma Trận Kiểm Thử Phase 20: Global Citation Navigation & Reader Orchestration (Test Matrix)

| Test ID | Tên Kiểm Thử | Surface / Module | Kịch Bản & Mục Tiêu Kiểm Thử | Kỳ Vọng Kết Quả |
|---|---|---|---|---|
| **P20-U1** | Navbar Reader Cross-Doc Navigation | `Navbar.tsx` | Click citation trỏ tới tài liệu khác khi đọc trong Reader từ Navbar | `onNavigateToDocument` kích hoạt, `activeReaderDoc` cập nhật doc mới |
| **P20-U2** | TopicDetail NoteReaderModal Citation Jump | `TopicDetail.tsx` | Click citation trong `NoteReaderModal` mở tài liệu tương ứng | `NoteReaderModal` đóng, `UnifiedResearchReader` mở với đúng `initialPosition` |
| **P20-U3** | TopicDetail Vault EPUB Selection | `TopicDetail.tsx` | Chọn tệp `.epub` từ Vault Browser Modal trong `TopicDetail` | Mở trực tiếp vào `UnifiedResearchReader` format `epub`, loại bỏ `activeEpubFile` |
| **P20-U4** | NotesManager NoteReaderModal Citation Jump | `NotesManager.tsx` | Click citation trong `NoteReaderModal` ở `NotesManager` | `UnifiedResearchReader` mở với tài liệu được phân giải và `initialPosition` |
| **P20-S1** | Security & Read-Only Invariant | Global Navigation | Thực hiện chuỗi nhấp citation liên tiếp giữa các tài liệu khác nhau | 0 mutating HTTP requests (POST/PUT/DELETE), 0 vault file writes |
