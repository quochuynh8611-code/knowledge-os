# Phase 15: Root Domain Expansion & Starter Topics Enrichment

> **Status:** COMPLETED & VERIFIED (Commit `6671e42` & `0bca6ce`)  
> **Type:** Feature Specification  
> **Related Architecture:** ADR-016 (Dynamic Root Taxonomy & Topic Visibility)  
> **Gherkin Reference:** [`docs/gherkin/phase-15-root-domain-expansion.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/phase-15-root-domain-expansion.feature)  
> **Test Suites:** [`tests/unit/phase15a-root-domain-expansion.test.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/tests/unit/phase15a-root-domain-expansion.test.tsx), [`tests/unit/phase15b-starter-topics-enrichment.test.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/tests/unit/phase15b-starter-topics-enrichment.test.tsx)

---

## 1. Bối cảnh & Mục tiêu (Context & Objective)

Sau khi hoàn tất hệ thống phân cấp động (Dynamic Root Taxonomy - ADR-016) và cơ chế ưu tiên lĩnh vực trọng tâm (Focus Domain Priority - Phase 14), hệ thống tri thức Knowledge OS cần mở rộng cơ sở dữ liệu mẫu khởi đầu bằng cách bổ sung hai lĩnh vực tri thức truyền thống quan trọng:
1. **Đông Y (Traditional Chinese / East Asian Medicine - `cat-root-dong-y`)**: Bao gồm các chủ đề nền tảng như Học Thuyết Âm Dương - Ngũ Hành trong Y Học, Kinh Lạc và Tạng Tượng.
2. **Ngôn Ngữ Học & Cổ Ngữ (Languages & Linguistics - `cat-root-ngon-ngu`)**: Bao gồm các chủ đề nghiên cứu ngôn ngữ văn bản cổ (Tiếng Phạn - Sanskrit, Tiếng Pali, Hán Cổ).

Mục tiêu kỹ thuật:
- Khởi tạo 2 danh mục gốc mới trong `INITIAL_CATEGORIES` (`src/data/initialData.ts`).
- Bổ sung các chủ đề mẫu chất lượng cao (`INITIAL_TOPICS`) đầy đủ metadata học tập, ghi chú mẫu và liên kết tài liệu.
- Tích hợp liền mạch với thuật toán xếp hạng và bộ chọn lĩnh vực ưu tiên (`getFocusDomainOrdering`, `getTopicRootDomain`).
- Bảo đảm 100% tương thích ngược và bảo toàn dữ liệu hiện hữu qua cơ chế chuẩn hóa dữ liệu (`normalizeCategories`, `normalizeTopics`).

---

## 2. Kiến trúc & Đặc tả Chi tiết (Technical Specification)

### 2.1. Cấu trúc Danh mục Gốc Mới (Root Categories Schema)

```typescript
// Đông Y (Traditional Medicine)
{
  id: 'cat-root-dong-y',
  name: 'Đông Y',
  slug: 'dong-y',
  type: 'dong-y',
  parentId: null,
}

// Ngôn Ngữ (Languages & Linguistics)
{
  id: 'cat-root-ngon-ngu',
  name: 'Ngôn Ngữ',
  slug: 'ngon-ngu',
  type: 'ngon-ngu',
  parentId: null,
}
```

### 2.2. Danh mục Con & Chủ đề Mẫu (Subcategories & Starter Topics)

1. **Lĩnh vực Đông Y:**
   - Subcategories: `cat-sub-kinh-lac` (Kinh Lạc), `cat-sub-tang-tuong` (Tạng Tượng).
   - Starter Topics:
     - `top-dong-y-am-duong`: Học thuyết Âm Dương trong Chẩn Trị.
     - `top-dong-y-kinh-mach`: Hệ thống 12 Kinh Mạch Chính & Kỳ Kinh Bát Mạch.
2. **Lĩnh vực Ngôn Ngữ:**
   - Subcategories: `cat-sub-sanskrit` (Sanskrit Phạn ngữ), `cat-sub-pali` (Pali Cổ ngữ).
   - Starter Topics:
     - `top-ngon-ngu-sanskrit-101`: Ngữ pháp Sanskrit Căn bản cho Khảo cứu Phật điển.
     - `top-ngon-ngu-pali-canon`: Cú pháp Pali trong Tam Tạng Nikaya.

### 2.3. Quy Tắc Xếp Hạng Lĩnh Vực (Domain Ordering Rules)

Bộ chọn `getFocusDomainOrdering(categories, topics, focusDomainId)` tuân thủ thứ tự ưu tiên:
1. **Focus Domain:** Lĩnh vực được người dùng ghim chọn làm trọng tâm (`focusDomainId`) luôn đứng vị trí đầu tiên.
2. **Activity / Topic Volume:** Các lĩnh vực có số lượng chủ đề hoạt động nhiều hơn được xếp ưu tiên tiếp theo.
3. **Deterministic Lexical Fallback:** Sắp xếp theo tên A-Z nếu cùng mức độ hoạt động.

---

## 3. Rào chắn An Toàn & Bất Biến (Guardrails & Invariants)

1. **Zero Breaking Schema Change:** `Category` và `Topic` type interface không thay đổi.
2. **Rehydration Resilience:** Cơ chế nạp dữ liệu cũ (v1/v2 snapshots) tự động bảo toàn các danh mục người dùng đã tạo mà không ghi đè mất mát.
3. **Neutral Presentation:** Giao diện `getTopicPresentation` áp dụng bảng màu ngọc bích (emerald/teal/neutral) cho các domain mới, phân định rõ ràng với Phật Học (vàng hổ phách) và Huyền Học (tím thạch anh).

---

## 4. Ma trận Kiểm Thử (Verification Matrix)

| Test Suite | File | Nội Dung Kiểm Chứng |
| :--- | :--- | :--- |
| **Phase 15A** | `tests/unit/phase15a-root-domain-expansion.test.tsx` | Khởi tạo đúng 2 root categories mới, không trùng lặp ID/slug, render đúng trên Dashboard. |
| **Phase 15B** | `tests/unit/phase15b-starter-topics-enrichment.test.tsx` | Starter topics có đầy đủ `studyProgress`, liên kết danh mục chuẩn xác và tương thích bộ lọc tìm kiếm. |
