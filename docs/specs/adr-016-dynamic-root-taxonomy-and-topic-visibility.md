# 🏛️ ADR-016: Dynamic Root Taxonomy & Soft Topic Visibility Architecture

> **Trạng thái:** ACCEPTED / READY FOR IMPLEMENTATION  
> **Ngày quyết định:** 2026-08-25  
> **Người phụ trách:** Staff Software Engineer / Technical Architect  
> **Phân loại quyết định:** Two-Way Door (Reversible Decision with Backward Compatibility)  
> **Tài liệu liên quan:** [`docs/specs/post-phase5-dynamic-root-categories-and-topic-visibility.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase5-dynamic-root-categories-and-topic-visibility.md) · [`docs/gherkin/post-phase5-dynamic-root-categories-and-topic-visibility.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/post-phase5-dynamic-root-categories-and-topic-visibility.feature)

---

## 🎯 1. BỐI CẢNH (CONTEXT)

Trong các phiên bản trước (Phase 1–5), Knowledge OS phân loại tri thức dựa trên kiểu dữ liệu cứng `CategoryType = 'phat-hoc' | 'huyen-hoc'`. Cấu trúc này dẫn đến một số giới hạn kiến trúc:
1. **Hardcoded UI & Special-Casing:** Sidebar, TopicTree, SearchFilters, và TopicFormModal đều giả định chỉ có 2 lĩnh vực gốc ('Phật Học' và 'Huyền Học').
2. **Không Thể Mở Rộng Lĩnh Vực Động:** Người dùng không thể tạo thêm các lĩnh vực nghiên cứu mới (ví dụ: Khoa học, Ngôn ngữ học, Tâm lý học...) từ giao diện mà không phải sửa code.
3. **Thiếu Cơ Chế Quản Lý Vòng Đời Chủ Đề (Topic Lifecycle):** Khi một chủ đề ít được sử dụng hoặc tạm ngưng nghiên cứu, người dùng chỉ có lựa chọn "Xóa vĩnh viễn" (Destructive Delete), dẫn đến nguy cơ mất toàn bộ Notes, Resources, Spaced Repetition logs và liên kết đồ thị.

---

## ⚖️ 2. CÁC PHƯƠNG ÁN ĐÃ CÂN NHẮC (OPTIONS CONSIDERED)

### Phương án A: Dynamic Root Hierarchy (ParentId-driven) + Soft Visibility (`active` | `hidden`) (ĐƯỢC CHỌN)
- Lĩnh vực gốc (Root Domain) được định nghĩa là bất kỳ Category nào có `parentId === null` hoặc `parentId === undefined`.
- Danh mục con (Child Category) liên kết qua `parentId === rootCategoryId` hoặc `parentId === parentCategoryId`.
- `CategoryType` được nới lỏng thành `string` (với alias `'phat-hoc' | 'huyen-hoc' | string`) để duy trì 100% tương thích ngược cho các snapshot dữ liệu cũ.
- Bổ sung trường `visibility: 'active' | 'hidden'` cho `Topic`. Các chủ đề bị ẩn vẫn giữ nguyên vẹn 100% Notes, Resources, StudyProgress, Links và Timestamps.
- **Ưu điểm:** Linh hoạt vô hạn, không hardcode thêm danh mục nào trong code, hỗ trợ khôi phục chủ đề tức thì mà không sợ mất dữ liệu.

### Phương án B: Hardcode Thêm Enum Mới trong Code (BỊ BÁC BỎ)
- Thêm `CategoryType = 'phat-hoc' | 'huyen-hoc' | 'kinh-te' | 'triet-hoc' | ...` vào type definition.
- **Nhược điểm:** Phá vỡ nguyên tắc mở rộng động (Open-Closed Principle), người dùng không thể tự thêm lĩnh vực của riêng họ.

### Phương án C: Hard Delete & Archive Table Riêng (BỊ BÁC BỎ)
- Tạo bảng/storage riêng `archived_topics`.
- **Nhược điểm:** Tăng blast radius, phức tạp hóa quan hệ khóa ngoại (foreign keys) với Notes/Resources/Links, khó đồng bộ hai chiều.

---

## 🚀 3. QUYẾT ĐỊNH (DECISION)

Chúng tôi quyết định chọn **Phương án A: Dynamic Root Hierarchy & Soft Topic Visibility**:

1. **Category Model & Taxonomy:**
   - Cấu trúc cây danh mục dựa hoàn toàn vào `Category.parentId`.
   - Các root category có `parentId: null` (hoặc `undefined`).
   - Cung cấp hành động `addCategory` trong `DataContext` để người dùng bấm nút **"Thêm lĩnh vực"** (tầng 1) trên Sidebar hoặc TopicTree.
   - Seed data gốc ("Phật Học" và "Huyền Học") trở thành 2 root categories chuẩn tắc (`cat-root-phat-hoc`, `cat-root-huyen-hoc`), các danh mục con liên kết qua `parentId`.
2. **Topic Model & Soft Visibility:**
   - Mở rộng `Topic` với trường `visibility: 'active' | 'hidden'` (mặc định `'active'`).
   - Cung cấp hành động `hideTopic(id)` và `restoreTopic(id)` trong `DataContext`.
   - Các bộ lọc mặc định trong app chỉ hiển thị topic active, đồng thời cung cấp toggle "Chủ đề đã ẩn" để xem lại và khôi phục khi cần.
3. **Migration & Hydration Normalization:**
   - Trong quá trình load từ LocalStorage / Hydrate: Tự động chuẩn hóa dữ liệu cũ (gán `visibility = 'active'` cho topic chưa có trường này; đảm bảo root categories được nhận diện đúng).
4. **UI Adaptation:**
   - `Sidebar.tsx`: Render danh sách lĩnh vực gốc từ `categories.filter(c => !c.parentId)`, tích hợp nút "Thêm lĩnh vực" (modal nhỏ gọn).
   - `TopicFormModal.tsx`: Chọn lĩnh vực gốc $\rightarrow$ Chọn danh mục phân nhánh $\rightarrow$ Tự động gán `categoryId`, `categoryName`, `categorySlug`, `type`.

---

## 🛡️ 4. HỆ QUẢ & KHẢ NĂNG PHỤC HỒI (CONSEQUENCES & ROLLBACK)

- **Backward Compatibility:** 100% snapshot dữ liệu cũ Semver 2.x và seed data đều tải mượt mà không lỗi.
- **Rollback Plan:** Do `visibility` và `parentId` là các trường tùy chọn/tương thích mở rộng, việc hoàn tác (nếu có) chỉ cần fallback `visibility` về `active`.
