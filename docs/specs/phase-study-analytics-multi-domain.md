# Technical Specification: Phase Study Analytics Multi-Domain Alignment

## 1. Executive Summary

Phase **Study Analytics Multi-Domain Alignment** hoàn thiện quá trình phổ quát hóa toàn diện hệ thống phân tích nhịp độ học tập và ghi nhớ dự phóng (`src/lib/studyAnalytics.ts` và `src/components/progress/StudyProgressView.tsx`).
Trước đây, module phân tích hàng đợi ôn tập ngắt quãng (SM-2 / Ebbinghaus) hardcode gom nhóm theo 2 lĩnh vực tĩnh (`phatHocCount` và `huyenHocCount`).
Phase này tái cấu trúc hệ thống phân tích học tập để:
1. Hỗ trợ gom nhóm và dự báo hàng đợi ôn tập động cho không giới hạn số lượng Root Domains dựa theo cây phân cấp danh mục `Category.parentId`.
2. Bảo toàn 100% tính tương thích ngược cho các trường legacy (`phatHocCount`, `huyenHocCount`).
3. Cố định tính tất định thời gian trong toàn bộ test suite bằng Fake Timers.
4. Đồng bộ hóa giao diện Bảng Điều Khiển Tiến Độ Học Tập (`StudyProgressView.tsx`) với cột biểu đồ động, chú giải động, cân bằng lĩnh vực (PieChart) động, và presentation resolver màu sắc trung tính cho các chủ đề thuộc lĩnh vực mới.

---

## 2. Problem Statement & Gaps

1. **Hardcoded Two-Domain Forecast In Core Lib**: Hàm `calculateReviewForecast` trước đây chỉ tăng đếm cố định cho 2 trường `phatHocCount` và `huyenHocCount` dựa trên `topic.type`. Các chủ đề thuộc domain thứ 3 hoặc danh mục phân cấp con bị bỏ sót hoặc gộp sai.
2. **Missing Root Domain Hierarchy In Analytics**: Hàm tính toán không nhận `categories` làm tham số, khiến các chủ đề gán danh mục con cháu (`cat-tam-tang`, `cat-dao-de`...) không thể tra cứu ngược lên Root Category tương ứng.
3. **Time-Dependent Test Flakiness**: Các kiểm thử trước đây gọi trực tiếp `Date.now()` và `new Date()` mà không cố định thời gian hệ thống, gây rủi ro lệch ngày hoặc flakiness khi chạy qua ranh giới nửa đêm hoặc các múi giờ khác nhau.
4. **UI Hardcoded BarChart & Legend**: Giao diện `StudyProgressView.tsx` chỉ hiển thị 2 cột `<Bar>` tĩnh và 2 nhãn chú giải cố định "Phật Học" / "Huyền Học".
5. **Binary Topic Styling In Progress Cards**: Thanh tiến độ topic và huy hiệu danh mục sử dụng nhánh điều kiện nhị phân `topic.type === 'phat-hoc' ? amber : indigo`, khiến mọi chủ đề thuộc domain thứ 3 vô tình bị hiển thị theo phong cách của Huyền Học.

---

## 3. Core Invariants

1. **Deterministic Multi-Domain Aggregation**: Mỗi topic có `nextReview` hợp lệ chỉ được đếm chính xác 1 lần vào đúng 1 ngày dự báo (`totalCount`) và 1 domain key duy nhất (`domainCounts[domainKey]`). Tuyệt đối không xảy ra hiện tượng đếm trùng (Double-Counting = 0).
2. **Deterministic Domain Ordering**: Danh sách `domains` trong từng ngày dự báo (`DailyForecast`) và bảng tổng hợp `DomainStudySummary[]` luôn được sắp xếp tất định theo thứ tự từ điển A-Z của `domain` key.
3. **Safe Fallback & Zero Crash**: Khi `topic` không có danh mục hoặc cây danh mục rỗng, hệ thống tự động fallback an toàn về `'other'` và không làm crash giao diện.
4. **100% Backward Compatibility**: Các trường `phatHocCount` và `huyenHocCount` được tính toán chính xác song song với `domainCounts` để bảo đảm tương thích với bất kỳ thành phần cũ nào.
5. **Neutral Presentation for New Domains**: Các chủ đề thuộc lĩnh vực mới (`triet-hoc`, `khoa-hoc`...) được cấp kiểu dáng phân biệt rõ ràng (emerald/neutral), không bị ánh xạ nhầm sang màu của Huyền Học hay Phật Học.

---

## 4. Architectural Decisions & Implementation Summary

### ADR-020: Dynamic Root Domain Resolution in Study Analytics
- **Bối cảnh**: Hệ thống đã chuyển đổi sang mô hình phân cấp danh mục động (ADR-016), nhưng module analytics vẫn phân loại theo `topic.type`.
- **Quyết định**:
  - Xây dựng helper `getTopicRootDomain(topic, categories)` tra cứu đệ quy `Category.parentId` kèm chống chu trình lặp (`visited = new Set<string>()`).
  - Mở rộng kiểu dữ liệu:
    ```typescript
    export interface DomainReviewBreakdown {
      domain: string;
      count: number;
    }

    export interface DailyForecast {
      dateStr: string;
      dayLabel: string;
      phatHocCount: number;  // legacy compatibility
      huyenHocCount: number; // legacy compatibility
      domainCounts: Record<string, number>; // dynamic counts map
      domains?: DomainReviewBreakdown[];    // deterministically sorted array
      totalCount: number;
    }
    ```
  - Bổ sung helper `calculateDomainRetentionSummary(topics, categories): DomainStudySummary[]`.

### ADR-021: UI-Local Topic Presentation Resolver in Study Progress View
- **Bối cảnh**: Thanh tiến độ và huy hiệu topic trong `StudyProgressView.tsx` phân nhánh nhị phân cứng.
- **Quyết định**:
  - Tạo resolver cục bộ `getTopicPresentation(topic, categories)` trả về `badgeClass` và `progressBarClass` nhất quán:
    - `phat-hoc` $\rightarrow$ Amber (Hổ phách)
    - `huyen-hoc` $\rightarrow$ Indigo (Lam tím)
    - Mọi domain khác $\rightarrow$ Emerald / Neutral (Ngọc bích / Trung tính)
  - Biểu đồ BarChart và chú giải Legend tự động ánh xạ từ `activeForecastDomains` thu thập từ dữ liệu dự báo.

---

## 5. Non-Goals

- Không thiết kế lại toàn bộ giao diện StudyProgressView (giữ nguyên layout và thẻ KPI).
- Không thay đổi thuật toán suy giảm trí nhớ Ebbinghaus hay tham số SM-2 (`easeFactor`, `interval`, `repetitions`).
- Không thay đổi schema cơ sở dữ liệu hoặc snapshot JSON format.
- Không can thiệp sang các module khác ngoài Study Analytics.

---

## 6. Increment Breakdown

### **Increment 1: Core Analytics Calculation Contract (Commit `d7ad5b3`)**
- Cập nhật `src/lib/studyAnalytics.ts`:
  - Mở rộng `DailyForecast` với `domainCounts` và `domains`.
  - Triển khai `getTopicRootDomain` và `calculateDomainRetentionSummary`.
  - Hỗ trợ tham số tùy chọn `categories?: Category[]` trong `calculateReviewForecast`.
- Cập nhật `tests/unit/study-analytics-lib.test.ts`:
  - Cố định thời gian test bằng `vi.useFakeTimers()` và `vi.setSystemTime()`.
  - Kiểm thử dự báo đa lĩnh vực, tương thích ngược, dữ liệu rỗng và sắp xếp tất định.

### **Increment 2: UI Dynamic Domain Alignment & Neutral Presentation (Commit `2b9e33f`)**
- Cập nhật `src/components/progress/StudyProgressView.tsx`:
  - Ingest `categories` từ `useData()` vào `calculateReviewForecast`.
  - Render dynamic bars và dynamic legend trong Forecast BarChart.
  - Render dynamic category balance trong PieChart & danh sách tỷ lệ.
  - Triển khai `getTopicPresentation` giải quyết triệt để lỗi gán nhầm màu Huyền Học cho domain mới.
- Cập nhật `tests/unit/study-analytics-ui-integration.test.tsx`:
  - 7 test cases kiểm chứng KPI, hàng đợi, bộ lọc, modal review, dynamic legend, dynamic balance, và neutral topic badge/progress bar.

---

## 7. Verification & Acceptance Criteria

1. `npm run lint` (`tsc --noEmit`): 0 lỗi.
2. `tests/unit/study-analytics-lib.test.ts` (12/12 tests PASS).
3. `tests/unit/study-analytics-ui-integration.test.tsx` (7/7 tests PASS).
4. Full Test Suite: 80/80 test files PASS (507/507 tests 100% Green).
5. Khi người dùng tạo thêm lĩnh vực thứ 3, 4:
   - Forecast tự động sinh cột và chú giải riêng.
   - Cân bằng lĩnh vực tự động phản ánh danh mục mới.
   - Thẻ chủ đề hiển thị đúng huy hiệu và màu tiến độ trung tính, không bị gán nhầm sang Huyền Học.
