# 📋 ĐẶC TẢ KỸ THUẬT: POST-PHASE 5 MICRO-INCREMENT
## Dynamic Root Taxonomy & Soft Topic Visibility (Quản Lý Lĩnh Vực Động & Ẩn/Hiện Chủ Đề An Toàn)

> **Trạng thái:** SPEC-FIRST / PENDING REVIEW  
> **Phạm vi:** Post-Phase 5 Micro-Increment (Kiến trúc phân cấp lĩnh vực động tầng 1 và quản lý vòng đời ẩn/hiển thị chủ đề)  
> **Tài liệu liên quan:** [`docs/specs/adr-016-dynamic-root-taxonomy-and-topic-visibility.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/adr-016-dynamic-root-taxonomy-and-topic-visibility.md)  
> **Mục tiêu:** Cho phép người dùng tự do thêm lĩnh vực gốc mới từ giao diện (không hardcode thêm miền tri thức trong code), đồng thời cung cấp cơ chế ẩn/khôi phục chủ đề không làm mất dữ liệu.

---

## 🎯 1. BỐI CẢNH & VẤN ĐỀ CẦN GIẢI QUYẾT (PROBLEM STATEMENT)

1. **Khóa cứng miền tri thức:** Hệ thống hiện tại bị hardcode với 2 miền 'Phật Học' và 'Huyền Học'. Khi người dùng muốn nghiên cứu thêm các lĩnh vực khác (ví dụ: Ngôn ngữ học, Lịch sử, Khoa học...), hệ thống không có cách nào để bổ sung lĩnh vực ở tầng 1 (Root Category).
2. **Không có cơ chế Ẩn Chủ Đề (Topic Soft Hide):** Khi có nhiều chủ đề đã hoàn thành hoặc tạm dừng ôn tập, người dùng không thể ẩn chúng khỏi tầm nhìn mà phải xóa. Xóa chủ đề sẽ kéo theo việc xóa toàn bộ Ghi chú, Tài liệu và Lịch sử ôn tập Spaced Repetition.

---

## 🛡️ 2. MỤC TIÊU & PHẠM VI (GOALS & NON-GOALS)

### ✅ Mục tiêu (Goals):
1. **Dynamic Root Category (Tầng 1):**
   - Người dùng có thể nhấn nút **"Thêm lĩnh vực"** trên Sidebar (hoặc TopicTree) để tạo một Root Category mới (`parentId: null`).
   - Root Category mới xuất hiện ngay lập tức trên Sidebar và trong bộ lọc phân cấp.
   - Phật Học và Huyền Học trở thành các Root Category bình thường trong danh sách, loại bỏ hardcoded special-case UI.
2. **Dynamic Topic Creation / Editing:**
   - Trong `TopicFormModal`, người dùng chọn Lĩnh vực gốc (Root Category) $\rightarrow$ sau đó chọn Danh mục con (Child Category) nếu có, hoặc tạo chủ đề trực thuộc Lĩnh vực gốc.
3. **Soft Topic Visibility (`active` | `hidden`):**
   - Thêm thuộc tính `visibility?: 'active' | 'hidden'` vào model `Topic`. Mặc định là `'active'`.
   - Ẩn chủ đề: Chủ đề không hiển thị trong danh sách mặc định nhưng giữ nguyên 100% `notes`, `resources`, `studyProgress`, `links`, `timestamps`.
   - Khôi phục chủ đề: Có bộ lọc "Đã ẩn" để xem và bấm "Khôi phục" (`restoreTopic`) đưa chủ đề trở lại trạng thái `'active'`.
4. **Tương Thích Ngược & Backfill Dữ Liệu:**
   - Dữ liệu cũ trong LocalStorage hoặc Snapshot không có `visibility` tự động được nạp dưới dạng `active`.
   - Seed data cũ tiếp tục hoạt động hoàn hảo.

### ❌ Ngoài phạm vi (Non-goals):
- KHÔNG hardcode thêm các miền như "Kinh tế", "Triết học" vào codebase.
- KHÔNG thay đổi schema backend hay REST API contract ngoài việc bổ sung trường tùy chọn tương thích ngược.
- KHÔNG xóa liên kết đồ thị khi một topic bị ẩn (graph traversal vẫn an toàn).

---

## 📐 3. THIẾT KẾ MÔ HÌNH DỮ LIỆU & HỢP ĐỒNG (DATA MODEL & CONTRACTS)

### 3.1. Types (`src/types/index.ts`)
```typescript
export type CategoryType = 'phat-hoc' | 'huyen-hoc' | string;
export type TopicVisibility = 'active' | 'hidden';

export interface Category {
  id: string;
  name: string;
  slug: string;
  type?: CategoryType;
  parentId?: string | null;
  description?: string;
  icon?: string;
  color?: string;
}

export interface Topic {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  categorySlug?: string;
  categoryName?: string;
  type?: CategoryType;
  parentId?: string | null;
  description: string;
  content: string;
  tags: string[];
  links: KnowledgeLink[];
  studyProgress: StudyProgress;
  visibility?: TopicVisibility; // Default: 'active'
  createdAt: string;
  updatedAt: string;
}
```

### 3.2. DataContext Actions (`src/context/DataContext.tsx`)
```typescript
interface DataContextType {
  // Category Actions
  addCategory: (categoryData: Omit<Category, 'id'>) => string;
  updateCategory: (id: string, categoryData: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // Topic Visibility Actions
  hideTopic: (id: string) => void;
  restoreTopic: (id: string) => void;
}
```

### 3.3. Helper Migration & Normalization (`src/lib/taxonomyMigration.ts`)
- `normalizeCategories(categories: Category[]): Category[]`
- `normalizeTopics(topics: Topic[]): Topic[]`
- Đảm bảo các chủ đề luôn có `visibility: 'active'` nếu trường này bị thiếu.

---

## 🧪 4. FITNESS FUNCTIONS & KIỂM CHỨNG (TEST PLAN)

1. **Category Hierarchy Test:** Thêm Root Category mới với `parentId = null`, thêm Child Category trỏ `parentId = rootId`.
2. **Sidebar Dynamic Rendering Test:** Sidebar hiển thị đầy đủ tất cả Root Categories từ state mà không bị giới hạn 2 miền cứng.
3. **Topic Visibility Lifecycle Test:**
   - Ẩn topic $\rightarrow$ topic không nằm trong danh sách active nhưng vẫn tồn tại trong storage với nguyên vẹn notes/resources.
   - Khôi phục topic $\rightarrow$ topic xuất hiện trở lại trong danh sách active.
4. **Legacy Data Backfill Test:** Snapshot hoặc dữ liệu cũ không có `visibility` được tải mượt mà thành `active`.
5. **Form Integration Test:** Tạo topic thuộc Root Category mới thành công.
