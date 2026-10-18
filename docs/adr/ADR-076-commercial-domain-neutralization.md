# ADR-076: Commercial Domain Neutralization & Zero-Default Universal Workspace

- **Status:** Accepted
- **Date:** 2026-10-16
- **Context:** Commercialization of Knowledge OS / Nghiên Cứu for universal multi-disciplinary user base.

## 1. Problem Statement
Ứng dụng trước đây được phát triển với bộ dữ liệu hạt nhân chuyên sâu về Phật học, Luận tạng Abhidhamma và Huyền học / Dịch học Đông phương. Mặc dù kiến trúc nền tảng (AppShell, DataProvider, SQLite/PostgreSQL, KnowledgeGraph, Flashcard SM-2, Research Reader) đã được phân tầng độc lập, giao diện và dữ liệu mặc định vẫn còn sót lại các yếu tố chuyên biệt:
1. Dữ liệu seed và initial state vẫn chứa các danh mục / chủ đề khởi điểm chuyên biệt (ví dụ: Đông Y hoặc Phật học/Huyền học trước đây).
2. Các nhãn, tiêu đề, và đoạn mô tả ở phần trên cùng khung phần mềm và tiêu đề biểu đồ tri thức còn chứa các thuật ngữ đặc thù ("Nghiên cứu Phật học & Dịch học", "Vi Diệu Pháp, Thiền định, Kỳ Môn, Thái Ất, Kinh Dịch").
3. Các trường nhập liệu (input placeholders) trong Tìm kiếm nâng cao, Tạo chủ đề, Tạo ghi chú, Tạo tài liệu còn gợi ý các thuật ngữ riêng ("Vi Diệu Pháp", "Tâm Vương", "Cửu Cung", "Quẻ Càn", "Bát Nhã", "Tứ Niệm Xứ", "Bộ Pháp Tụ", "Danh Sắc trong tâm", "Thắng Pháp Tập Yếu Luận", "HT. Thích Minh Châu").
4. Một số component render nhãn lĩnh vực bằng toán tử ternary nhị phân cứng (`topic.type === 'phat-hoc' ? 'Phật Học' : 'Huyền Học'`) thay vì đọc động từ category metadata.

Điều này cản trở việc thương mại hóa sản phẩm cho các nhóm người dùng đa ngành (y khoa, luật học, khoa học máy tính, ngôn ngữ học, quản trị kinh doanh, triết học,...).

## 2. Goals
- **Zero-default domain baseline:** Người dùng mới mở ứng dụng sẽ có tab "Lĩnh vực nghiên cứu" sạch hoàn toàn, tự do khởi tạo lĩnh vực học tập đầu tiên của riêng mình.
- **Header & Navbar neutrality:** Phần trên cùng khung phần mềm chỉ hiển thị thương hiệu và không gian làm việc trung tính, không chứa bất kỳ định danh chuyên biệt nào.
- **Universal placeholders:** Toàn bộ placeholder trong ô tìm kiếm và các form modal (Chủ đề, Ghi chú, Tài liệu, AI Copilot) chuyển sang ngôn ngữ học thuật trung tính, phổ quát.
- **Dynamic category rendering:** Loại bỏ toàn bộ các fallback nhị phân hardcoded (`Phật Học` / `Huyền Học`) trong UI, đồ thị tri thức, phân tích tiến độ và handoff generator.
- **Zero functional regression:** Bảo toàn 100% các tính năng hiện có: Quản lý chủ đề, Ghi chú Markdown, Đồ thị tri thức, Flashcards SM-2, AI Research Studio, Thư viện EPUB/PDF/MD.
- **Cache invalidation safety:** Nâng cấp `CURRENT_STORAGE_VERSION` (từ 3 lên 4) để xóa sạch cache stale của client cũ mà không ảnh hưởng cấu trúc ứng dụng.

## 3. Non-Goals
- Không thay đổi cấu trúc bảng cơ sở dữ liệu (Prisma schema giữ nguyên).
- Không đổi khóa lưu trữ kỹ thuật cốt lõi (`phat_hoc_huyen_hoc_clean_v3`) để tránh rủi ro phá vỡ tương thích hệ thống lưu trữ cấp thấp.
- Không xóa bỏ khả năng người dùng tự tạo chủ đề Phật học hoặc Huyền học nếu họ có nhu cầu; hệ thống hoàn toàn cho phép người dùng tự nhập bất kỳ lĩnh vực nào.

## 4. Affected Files
1. `src/data/initialData.ts`: Xóa rỗng các danh mục, chủ đề, tags, ghi chú mặc định thành `[]`.
2. `src/lib/storage.ts`: Nâng `CURRENT_STORAGE_VERSION` lên `4` để tự động dọn sạch cache trình duyệt cũ.
3. `src/components/layout/Navbar.tsx`: Tinh gọn thanh điều hướng trên cùng, loại bỏ định danh cũ.
4. `src/components/search/AdvancedSearch.tsx`: Trung tính hóa placeholder ô tìm kiếm và badge hiển thị danh mục động.
5. `src/components/graph/KnowledgeGraph.tsx`: Trung tính hóa mô tả đồ thị và loại bỏ nút fallback hardcoded Phật học / Huyền học.
6. `src/components/ai/AIResearchStudio.tsx`: Trung tính hóa placeholder ô nhập và quick prompts học thuật phổ quát.
7. `src/components/modals/TopicFormModal.tsx`: Trung tính hóa placeholder tên chủ đề và hỗ trợ trạng thái chưa có danh mục.
8. `src/components/modals/NoteFormModal.tsx`: Trung tính hóa placeholder tiêu đề ghi chú.
9. `src/components/modals/ResourceFormModal.tsx`: Trung tính hóa dropdown chủ đề và các placeholder tài liệu / tác giả.
10. `src/components/modals/ExportImportModal.tsx`: Trung tính hóa mô tả cài đặt lại dữ liệu.
11. `src/components/progress/StudyProgressView.tsx`: Loại bỏ fallback hardcoded Phật học / Huyền học khi categories rỗng.
12. `src/lib/topicSelector.ts`: Đặt `DEFAULT_PRIORITY_TOPIC_IDS = []` và xử lý `getTopicDomainLabel` động theo `categoryName`.
13. `src/lib/antigravity.ts`: Trung tính hóa persona học thuật của Antigravity AI Scholar.
14. `src/server/routes/geminiRoutes.ts`: Trung tính hóa system instructions và prompt liên ngành.
15. `src/components/topics/TopicTree.tsx`: Bổ sung empty state thân thiện khi chưa có lĩnh vực nào.
16. `src/components/dashboard/DashboardHome.tsx`: Bổ sung empty state khi danh sách lĩnh vực rỗng.

## 5. Risks & Mitigation
- **Risk 1:** UI rơi vào trạng thái null/undefined khi `categories` hoặc `topics` rỗng.
  - *Mitigation:* Thêm fallback guard và render empty state có hướng dẫn tạo lĩnh vực/chủ đề đầu tiên tại Dashboard, TopicTree, Selectors.
- **Risk 2:** Các unit tests cũ giả định seed data có ít nhất 1 category bị fail.
  - *Mitigation:* Cập nhật assertion kiểm tra tính trung tính của baseline mới (`length === 0` cho commercial clean profile).
- **Risk 3:** Người dùng cũ vẫn thấy cache cũ trên trình duyệt.
  - *Mitigation:* Bumping `CURRENT_STORAGE_VERSION = 4` kích hoạt hàm `ensureStorageVersionCompatibility()` tự động dọn sạch cache stale khi khởi động ứng dụng.

## 6. Rollback Plan
- Mọi thay đổi đều nằm trong các file nguồn gốc không làm thay đổi migration database. Rollback bằng cách `git checkout` các file đã chỉnh sửa hoặc revert commit.

---

## 7. Addendum 1 (2026-10-17): Hermetic Test Isolation & Strict Zero-Default Invariant

### Context & Discovery
Sau khi hoàn tất baseline 0 bản ghi, việc chạy test suite khi dev server (`server.ts`, port 3000) đang chạy nền đã làm rò rỉ các danh mục test (`Khoa Học Tự Nhiên`, `Khoa Học Xã Hội`, `Kinh Tế`, v.v.) vào cơ sở dữ liệu PostgreSQL do `ApiDataRepository` và `SyncQueueService` sử dụng `window.location.origin` mặc định của `jsdom` (`http://localhost:3000`).

### Decision & Immutable Policy
1. **Chốt chặn Hermetic Test Guard:** Đã bổ sung kiểm tra `process.env.VITEST` trong `src/services/dataRepository.ts` và `src/services/syncQueue.ts` để chặn hoàn toàn mọi HTTP request mutation ra mạng khi chạy test.
2. **Quy tắc bất biến khi nâng cấp:** **TUYỆT ĐỐI KHÔNG TÙY TIỆN THÊM BẤT KỲ LĨNH VỰC NGHIÊN CỨU (CATEGORIES) HOẶC CHỦ ĐỀ (TOPICS) MẶC ĐỊNH NÀO VÀO HỆ THỐNG TRONG MỌI BƯỚC NÂNG CẤP TIẾP THEO.**
3. Mọi dữ liệu hạt nhân `INITIAL_CATEGORIES`, `INITIAL_TOPICS`, `INITIAL_NOTES`, `INITIAL_RESOURCES` phải luôn duy trì là `[]`.

