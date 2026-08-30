# SPECIFICATION: Phase 16 — Taxonomy Cleanup, Safe Category Merge & Rehydration Persistence

## 1. Bối cảnh & Mục tiêu

Trong quá trình tiến hóa từ cấu trúc tĩnh 2 môn sang Dynamic Taxonomy đa ngành, một số bộ dữ liệu cũ tồn tại các danh mục gốc kinh tế trùng lặp/phân mảnh (`cat-root-kinh-te`, `cat-root-kinh-te-hoc`) bên cạnh danh mục chuẩn hóa (`cat-root-kinh-te-tai-chinh`).

Mục tiêu của Phase 16:
1. Cung cấp tiện ích thuần túy `mergeCategoryData` trong `src/lib/taxonomyMigration.ts` để gộp danh mục an toàn, tái liên kết topic & subcategory mà không làm thất thoát ghi chú, tài liệu hay tiến độ SM-2.
2. Tích hợp action `mergeCategories` trong `DataContext.tsx` kết nối tầng kho lưu trữ kép (`syncHydrate` + `deleteCategory`).
3. Khóa rào chắn an toàn trên UI `TopicTree.tsx` để hướng các thao tác xóa danh mục kinh tế cũ thành thao tác gộp an toàn.
4. Gia cố tính bền vững (Persistence Rehydration) chống hồi sinh category sau khi reload/mount lại.
5. Bảo đảm chức năng `resetToDefaultData()` làm sạch toàn bộ legacy economy IDs.

---

## 2. Kiến trúc & Data Contract

### 2.1 Pure Migration Helper (`src/lib/taxonomyMigration.ts`)

```typescript
export interface MergeCategoriesResult {
  success: boolean;
  error?: string;
  sourceCategory?: Category;
  targetCategory?: Category;
  updatedCategories: Category[];
  updatedTopics: Topic[];
  remappedTopicCount: number;
  remappedCategoryCount: number;
}

export function mergeCategoryData(
  sourceCategoryId: string,
  targetCategoryId: string,
  categories: Category[],
  topics: Topic[],
  now = new Date().toISOString()
): MergeCategoriesResult;
```

### 2.2 UI Safe Guard (`src/components/topics/TopicTree.tsx`)

- `FIXED_ECONOMY_MERGE_TARGET_ID = 'cat-root-kinh-te-tai-chinh'`
- `isEconomyMergeSource(categoryId)`: Chặn xóa hủy diệt đối với `cat-root-kinh-te` và `cat-root-kinh-te-hoc`, bật hộp thoại chuyển hướng gộp danh mục.

---

## 3. Kiểm thử & Chất lượng (Quality Verification)

- `tests/unit/taxonomy-migration.test.ts` (6/6 tests PASS)
- `tests/unit/taxonomy-merge-safety.test.tsx` (21/21 tests PASS)
  - Section 1: Naive deletion failure cases
  - Section 2: Pure migration helper contracts
  - Section 3: DataContext action & rehydration
  - Section 4: UI delete/merge confirm flow
  - Section 5: Final clean reset & clean default state hardening
