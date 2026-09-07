# Knowledge OS Release Notes — Phase F6.12: SRS Algorithm Tuning

**Release Version**: `v0.12.0`  
**Date**: 2026-09-07  
**Branch**: `neh1`  
**Status**: General Availability (GA)  

---

## 🎯 Tính Năng Mới

### 1. Retention Curve Visualization (Pure SVG Canvas)
- **Đường cong quên lãng Ebbinghaus lý thuyết**: $R(t) = \exp(-t/S)$ với đường nét xanh ngọc bích mượt mà kết hợp gradient bóng đổ tinh tế.
- **Điểm dữ liệu thực nghiệm (Empirical Scatter Dots)**: Gom nhóm theo số ngày đã qua để biểu thị tỷ lệ ghi nhớ thực tế qua các mốc thời gian.
- **Tooltip tương tác**: Hiển thị tỷ lệ nhớ và tổng số lượt ôn thực tế khi hover vào từng điểm dữ liệu.
- **Bộ lọc đa chiều**: Lọc theo độ khó thẻ (Tất cả / Dễ / Vừa / Khó) và khung thời gian chân trời (14 ngày, 30 ngày, 60 ngày).
- **Huy hiệu Stability ($S$)**: Ước tính số ngày ổn định trí nhớ của người học.

### 2. Adaptive Scheduling Engine (Điều Lịch Thích Ứng)
- **Ước lượng độ ổn định trí nhớ**: Hàm `calculateStabilityFromReviews(reviews)` sử dụng hồi quy tuyến tính trên $\ln(R) = -t/S$ với Laplace smoothing.
- **Suy diễn độ khó thẻ tự động**: `inferCardDifficulty(card, reviews)` tổng hợp các yếu tố:
  - Số lần quên (Lapses)
  - Hệ số độ dễ (Ease Factor)
  - Tỷ lệ nhớ thành công (Retention Rate)
  - Độ trễ phản xạ phản hồi (Response Latency: thưởng khi <2.5s, phạt khi >15s)
- **Điều chỉnh lịch trình linh hoạt**: Tự động tăng hệ số dễ và nới rộng khoảng cách khi người học có phản xạ nhanh và chính xác.

### 3. Exam Countdown & Smart Review Queue (Mục Tiêu Thi Cử)
- **Thanh công cụ đếm ngược ngày thi (`ExamCountdownToolbar`)**:
  - Chọn ngày thi mục tiêu hoặc chọn các mốc nhanh (+7d, +14d, +30d).
  - Huy hiệu cảnh báo thông minh đổi màu theo mức độ khẩn cấp (xanh >14 ngày, cam 7–14 ngày, đỏ nhấp nháy <7 ngày).
- **Cơ chế Smart Priority Queue**:
  - Tự động sắp xếp thẻ cần ôn theo điểm số ưu tiên `calculateCardPriorityScore(card, { examDate, now })`.
  - Tự động nén khoảng cách ôn tập, đẩy các thẻ khó hoặc chưa thuần thục lên đầu hàng đợi khi ngày thi cận kề.

### 4. Card-Level A/B Testing Framework
- **Phân hoạch thẻ Deterministic**: Gán cố định từng thẻ vào Variant A (SM-2 Tiêu chuẩn) hoặc Variant B (Adaptive SRS) thông qua thuật toán hàm băm FNV-1a từ `card.id`.
- **Bảng so sánh song song**: Theo dõi trực quan tỷ lệ nhớ, tỷ lệ quên, và thời gian phản xạ trung bình giữa 2 thuật toán.
- **Kiểm định giả thuyết Two-Proportion Z-Test**: Tính toán Z-score và p-value tự động trong bộ nhớ bằng xấp xỉ phân phối chuẩn tích lũy chuẩn hóa Abramowitz & Stegun.
- **Đánh giá độ tin cậy thống kê**: Banner tự động xác nhận liệu thuật toán Adaptive có cải thiện trí nhớ vượt trội có ý nghĩa thống kê ($p < 0.05$).

---

## 🏗️ Kiến Trúc & Quyết Định Kỹ Thuật

1. **Zero Database Schema Migrations**:
   - Tất cả các metric (Stability, Inferred Difficulty, Priority Score, Algorithm Variant) được tính toán thuần túy tại runtime từ các thuộc tính sẵn có của `FlashcardSchedule` và `FlashcardReview`.
2. **Zero Heavy Charting Dependencies**:
   - Biểu đồ Retention Curve được xây dựng bằng React SVG Canvas thuần, hoàn toàn không cần thư viện bên thứ ba (như Chart.js hoặc Recharts), giữ bundle siêu nhẹ.
3. **Card-Level Split vs User-Level Split**:
   - Trong ứng dụng cá nhân hóa / local desktop, chia nhóm A/B theo thẻ là phương pháp tối ưu để người dùng có thể so sánh trực tiếp hiệu quả 2 thuật toán trên cùng tập dữ liệu học tập.

---

## 🧪 Kiểm Thử & Đảm Bảo Chất Lượng

- **Tổng số bài test Subsystem Flashcard & SRS**: **193/193 tests PASS (100%)**
- **Test files liên quan**: 28 files
- **TypeScript Typecheck**: **0 errors** (`npx tsc --noEmit` PASS)

---

## 📦 File Thay Đổi

- `src/lib/srsAlgorithmTuning.ts` (new)
- `src/components/flashcards/RetentionCurveChart.tsx` (new)
- `src/components/flashcards/ExamCountdownToolbar.tsx` (new)
- `src/components/flashcards/SrsVariantComparisonModal.tsx` (new)
- `src/components/flashcards/FlashcardReviewStudio.tsx` (modified)
- `src/components/flashcards/index.ts` (modified)
- `docs/specs/phase-f6-12-srs-algorithm-tuning.md` (new)
- `docs/adr/f6.12-srs-algorithm-tuning.md` (new)
- `docs/implementation-plans/f6.12-srs-algorithm-tuning.md` (new)
- `docs/PROJECT_STATUS.md` (modified)
- `tests/unit/srs-algorithm-tuning.test.ts` (new)
- `tests/unit/retention-curve-chart.test.tsx` (new)
- `tests/unit/exam-countdown-toolbar.test.tsx` (new)
- `tests/unit/srs-variant-comparison-modal.test.tsx` (new)
- `tests/integration/srs-tuning-integration.test.tsx` (new)
