# Đặc Tả Kỹ Thuật: Dynamic Root Taxonomy – Root Topic Filter & Add Domain CTA Fix

> **Trạng thái:** Spec & ADR Addendum (Post-Phase 5 Micro-Fix)  
> **Tài liệu liên quan:** `docs/specs/adr-016-dynamic-root-taxonomy-and-topic-visibility.md`  
> **Người thực hiện:** Staff Software Engineer / Technical Architect  
> **Ngày tạo:** 2026-08-25  

---

## 1. Bối Cảnh & Vấn Đề (Problem Statement)

1. **Sai lệch Topic Count & Filter Match ở Root Categories:**
   - Trong dữ liệu ban đầu và di trú, các chủ đề (topics) được gán trực tiếp vào các danh mục con (như `cat-tam-tang`, `cat-abhidharma`, `cat-tam-thuc`...), các danh mục này có `parentId` trỏ về Root Category (`cat-root-phat-hoc`, `cat-root-huyen-hoc`).
   - Giao diện `TopicTree.tsx` và `Sidebar.tsx` lọc và đếm theo `t.categoryId === cat.id` hoặc kiểm tra điều kiện rời rạc không nhất quán (`type`, `categorySlug`, `cat.parentId`).
   - Hậu quả: Khi duyệt hoặc lọc theo root category "Phật Học" / "Huyền Học", các chủ đề thuộc các danh mục con cháu (descendants) không được tính và không được hiển thị trọn vẹn, dẫn tới hiển thị "Phật Học (0 chủ đề)" và "Huyền Học (0 chủ đề)".

2. **CTA "Thêm lĩnh vực" bị khuất:**
   - Nút "Thêm lĩnh vực" hiện chỉ nằm ở Sidebar bên trái, người dùng khi tập trung tại màn hình Cây Chủ Đề (`TopicTree`) khó nhận biết và thao tác.

---

## 2. Quyết Định Thiết Kế (Architectural Decisions)

### 2.1. Canonical Root Category Filtering
- `selectedCategoryFilter` sử dụng giá trị chuẩn là `rootId` (ID của Root Category, ví dụ `cat-root-phat-hoc`).
- Mọi quan hệ giữa Topic và Root Category được xác định duy nhất qua chuỗi `Category.parentId`.
- Tuyệt đối **không** dùng `topic.type` hay `categorySlug` làm nguồn chân lý chính để xác thực phân cấp.

### 2.2. Recursive Descendant Category Resolution
Cung cấp các helper thuần túy (pure functions, zero-side-effects) trong `src/lib/taxonomyMigration.ts`:
- `getDescendantCategoryIds(categories, rootId)`: Trả về danh sách tất cả ID của `rootId` và toàn bộ danh mục con cháu của nó (an toàn, chống lặp vô hạn).
- `resolveRootCategory(categories, categoryId)`: Đi ngược `parentId` để tìm root category cao nhất.
- `resolveCategoryFilterToRootId(categories, filterValue)`: Chuẩn hóa bất kỳ giá trị filter nào (ID, slug cũ, type cũ) về canonical `rootId`.
- `topicBelongsToRootCategory(topic, categories, rootId)`: Kiểm tra topic có thuộc `rootId` hoặc bất kỳ descendant nào của `rootId` hay không.
- `countTopicsForRootCategory(topics, categories, rootId)`: Đếm tổng số topic thuộc root category và toàn bộ descendants.

### 2.3. Add Domain CTA trong TopicTree
- Bổ sung nút bấm **"+ Thêm lĩnh vực"** trực tiếp tại giao diện `TopicTree.tsx` (khu vực Header / Toolbar).
- Thao tác tạo lĩnh vực mới kích hoạt hàm `addCategory({ name, parentId: null })`, sinh ra một root category mới độc lập.
- Lĩnh vực mới không chứa topic nào cho đến khi người dùng tạo hoặc chuyển topic vào đó; không đếm nhầm topic của các lĩnh vực hiện hữu.

---

## 3. Khả Năng Tương Thích & Migration (Compatibility Guardrails)

1. **Khả năng tương thích ngược (Backward Compatibility):**
   - Nếu `selectedCategoryFilter` từ code cũ hoặc URL/state cũ chứa `root.slug` (ví dụ `"phat-hoc"`) hoặc `root.type`, `resolveCategoryFilterToRootId` tự động ánh xạ về `root.id` tương ứng.
2. **Bảo toàn dữ liệu:**
   - Thao tác lọc và thêm lĩnh vực không làm thay đổi các trường `notes`, `resources`, `links`, `studyProgress` hay metadata của Topic.
   - Không phá vỡ định dạng export/import JSON và localStorage snapshots.

---

## 4. Kế Hoạch Kiểm Thử (Verification Plan)

1. **Unit Tests (`tests/unit/dynamic-taxonomy-lib.test.ts`):**
   - Kiểm tra `getDescendantCategoryIds` tìm đúng toàn bộ con cháu không bị lặp.
   - Kiểm tra `resolveCategoryFilterToRootId` ánh xạ đúng ID, slug, type.
   - Kiểm tra `topicBelongsToRootCategory` và `countTopicsForRootCategory` tính đúng số lượng chủ đề cho Phật Học (> 0) và Huyền Học (> 0).
2. **UI Integration Tests (`tests/unit/dynamic-taxonomy-ui.test.tsx`):**
   - Kiểm tra khi chọn filter "Phật Học" / "Huyền Học", các topic thuộc category con hiển thị đầy đủ.
   - Kiểm tra nút "+ Thêm lĩnh vực" xuất hiện trong `TopicTree` và tạo thành công lĩnh vực mới.
   - Kiểm tra lĩnh vực mới tạo ra có 0 chủ đề ban đầu và không đếm nhầm chủ đề cũ.
