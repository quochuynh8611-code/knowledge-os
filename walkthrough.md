# Walkthrough: Phase P7.3 Completed — Saved Views & Lightweight Retrieval Ranking

## Tổng Quan Phase P7.3

Phase P7.3 hoàn thiện tính năng **Saved Views** (Góc nhìn đã lưu) và **Lightweight Retrieval Ranking** (Xếp hạng tìm kiếm trọng số nhẹ) theo đúng quy trình **spec-first, ADR-first, test-first**:

1. **P7.3a — Storage Helper & Ranking Core**:
   - Tầng lưu trữ thuần túy `savedViewStorage.ts` quản lý tối đa 20 views (`phat_hoc_saved_views_v1`), sắp xếp tất định (pinned lên đầu, sau đó theo `updatedAt desc`).
   - Tinh chỉnh hợp đồng: `pinned` là boolean bắt buộc, `updateSavedSearchView` không thay đổi pin (quản lý độc quyền qua `togglePinSavedSearchView`), cho phép `query === ""` nếu có ít nhất 1 bộ lọc khác mặc định.
   - Điểm thưởng xếp hạng trọng số nhẹ trong `scholarSearch.ts`: Multi-token Title Coverage (+15) và Word-boundary Description Match (+10), bảo toàn tuyệt đối thứ bậc ưu tiên.

2. **P7.3b — UI Integration & Command Palette Convergence**:
   - Giao diện `AdvancedSearch.tsx`: Thanh chip "Góc nhìn đã lưu:" hỗ trợ 1-click replay (nạp lại query & filters), nút Pin (📌) và Delete (✕) dùng `e.stopPropagation()` để không trigger replay ngoài ý muốn, inline save panel mở khi điều kiện tìm kiếm hợp lệ.
   - Hội tụ `useCommandPalette.ts`: Nhận `savedViews` qua options (Dependency Injection) và hiển thị dạng command item `[Góc nhìn] <Tên>` trong danh mục "Điều hướng".
   - Tài liệu kiến trúc và đặc tả: `ADR-050` và Gherkin `phase-p7-3-saved-views-and-ranking.feature`.

---

## Chi Tiết Commit Boundaries

| Commit Hash | Commit Message | Files Thay Đổi |
| :--- | :--- | :--- |
| **`96ff9d6`** | `feat(retrieval): implement P7.3a saved views storage helper and additive ranking` | `src/lib/scholarSearch.ts`<br>`src/lib/savedViewStorage.ts`<br>`src/lib/recentSearchStorage.ts`<br>`tests/unit/saved-view-storage.test.ts`<br>`tests/unit/scholar-ranking-affinity.test.ts`<br>`tests/unit/recent-search-storage.test.ts` |
| **`f2db438`** | `feat(search-ui): implement P7.3b saved views chip stream, inline save panel, and palette convergence` | `src/components/search/AdvancedSearch.tsx`<br>`src/hooks/useCommandPalette.ts`<br>`tests/unit/advanced-search-saved-views.test.tsx`<br>`tests/unit/command-palette-saved-views.test.tsx`<br>`docs/adr/ADR-050-saved-views-and-retrieval-ranking.md`<br>`docs/gherkin/phase-p7-3-saved-views-and-ranking.feature` |

---

## Kết Quả Kiểm Thử (Test Verification)

- **Targeted & Regression Suite (6 test files / 35 tests)**:
  - `tests/unit/saved-view-storage.test.ts`: **10/10 passed**
  - `tests/unit/scholar-ranking-affinity.test.ts`: **4/4 passed**
  - `tests/unit/scholar-search-lib.test.ts`: **8/8 passed**
  - `tests/unit/recent-search-storage.test.ts`: **7/7 passed**
  - `tests/unit/advanced-search-saved-views.test.tsx`: **4/4 passed**
  - `tests/unit/command-palette-saved-views.test.tsx`: **2/2 passed**
  - **Tổng cộng**: **35/35 tests passed (100% pass)**.
- **Typecheck & Lint (`npm run lint` - `tsc --noEmit`)**: **0 errors**.
- **Working Tree**: Clean.
