# SPECIFICATION: Phase 14C — Weekly Learning Cadence Bar & Habit Formation Tracking

## 1. Bối cảnh & Mục tiêu

Sau khi hoàn tất Phase 13 (Learning-First Overview UX) và Phase 14A/14B (Focus Domain Priority & Responsive Ergonomics), hệ thống cần một cơ chế trực quan hóa nhịp điệu thói quen học tập trong tuần mà không gây áp lực streak độc hại hay tạo cảm giác tội lỗi (anti-toxic streak).

Phase 14C cung cấp:
- **`WeeklyCadenceSummary` Data Model & Selector**: Module thuần túy tính toán 7 ngày trong tuần ISO (T2 $\rightarrow$ CN) dựa trên `studyProgress.lastStudied` của các chủ đề đang hoạt động (`visibility !== 'hidden'`).
- **4 Cấp bậc Định lượng (Cadence Status Tiers)**: `starting` (0 ngày), `building` (1-2 ngày), `consistent` (3-4 ngày), `strong` (5-7 ngày).
- **`WeeklyCadenceBar` Presentational Component**: Hiển thị 7 khối ngày mini với chỉ báo hôm nay (`isToday`), ngày đã học (`isActive`), huy hiệu tổng kết số ngày/chủ đề và thanh thông điệp động viên.

---

## 2. Kiến trúc & Data Contract

### 2.1 Selector Logic (`src/lib/learningStateSelectors.ts`)

```typescript
export type CadenceStatus = 'starting' | 'building' | 'consistent' | 'strong';

export interface DayCadence {
  date: string;         // YYYY-MM-DD
  dayLabel: string;     // 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN'
  isActive: boolean;    // Có ít nhất 1 chủ đề được học trong ngày
  isToday: boolean;     // Trùng ngày hiện tại
  topicCount: number;   // Số chủ đề đã học trong ngày
  timeSpent: number;    // Số phút đã học trong ngày
}

export interface WeeklyCadenceSummary {
  days: DayCadence[];
  activeDaysCount: number;
  activeTopicsCount: number;
  totalTimeSpent: number;
  cadenceStatus: CadenceStatus;
  headlineMessage: string;
}
```

### 2.2 Component UI (`src/components/dashboard/WeeklyCadenceBar.tsx`)

- **Vị trí hiển thị**: Ngay dưới `TodayLearningHero` trong `DashboardHome.tsx`.
- **Rào chắn an toàn**:
  - Không tính các chủ đề đã ẩn (`visibility: 'hidden'`).
  - Không bị sai lệch múi giờ hay chuyển tháng/năm.
  - Render an toàn với mảng rỗng khi người dùng chưa có bất kỳ phiên học nào.

---

## 3. Kiểm thử & Chất lượng (Quality Verification)

- `tests/unit/weekly-cadence-selector.test.ts` (8/8 tests PASS)
- `tests/unit/weekly-cadence-bar.test.tsx` (7/7 tests PASS)
- `tests/unit/phase14b-focus-domain-ui.test.tsx` (4/4 tests PASS)
- `tests/unit/phase15a-root-domain-expansion.test.tsx` (4/4 tests PASS)
- `tests/unit/phase15b-starter-topics-enrichment.test.tsx` (4/4 tests PASS)
