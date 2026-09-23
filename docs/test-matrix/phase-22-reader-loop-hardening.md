# Test Matrix — Phase 22: Bidirectional Research Loop Verification & Reader Release Hardening

## Status

Draft / Proposed

---

## 1. Tổng Quan Ma Trận Kiểm Thử

Ma trận kiểm thử Phase 22 được thiết kế nhằm kiểm chứng chu trình nghiên cứu 2 chiều toàn trình (End-to-End Bidirectional Loop) và các cơ chế phòng vệ vòng đời (Lifecycle Hardening) trong `NoteReaderModal` và `UnifiedResearchReader`.

---

## 2. Bảng Ma Trận Chi Tiết (Detailed Test Matrix)

| Test ID | Cấp Độ | Component Mục Tiêu | Mục Tiêu Kiểm Thử | Điều Kiện Đầu Vào (Pre-conditions & Inputs) | Kết Quả Kỳ Vọng (Expected Assertions) | File Test Mục Tiêu |
|---|---|---|---|---|---|---|
| **UT-22.1** | Unit | `NoteReaderModal` | Unmount timer cleanup & ref safety | Render modal với `targetCitation`, timer 2.5s đang chạy thì unmount modal lập tức (<50ms). | Không ném exception, timer được clear sạch qua effect cleanup hook, không có rò rỉ bộ nhớ. | `tests/unit/note-reader-archive-deeplink.test.tsx` |
| **UT-22.2** | Unit | `NoteReaderModal` | Selector escaping với ký tự đặc biệt | Render modal với `targetCitation` chứa `locator = "sec-2.1#sub&test=1"`. | `escapeSelectorValue` bọc an toàn query string; `scrollIntoView` được gọi chính xác mà không ném `DOMException`. | `tests/unit/note-reader-archive-deeplink.test.tsx` |
| **IT-22.1** | Integration | `UnifiedResearchReader` + `NoteReaderModal` + `ReaderSidebar` | Luồng A: Selection $\rightarrow$ Save Excerpt $\rightarrow$ Dynamic Backlinks | Mở reader với `doc-triet-hoc`, bôi đen text ở `chuong-2`, chọn lưu vào `note-new`. | `archive://doc-triet-hoc?loc=chuong-2` được ghi vào note; tab Notes trong Sidebar cập nhật backlink card `note-new` ngay lập tức. | `tests/integration/reader-loop-hardening.test.tsx` |
| **IT-22.2** | Integration | `UnifiedResearchReader` + `NoteReaderModal` + `ReaderSidebar` | Luồng B: Backlink Click $\rightarrow$ Modal Occurrence Focus $\rightarrow$ Jump $\rightarrow$ Close | Mở reader tại $P_0$, click backlink card $\rightarrow$ modal cuộn tới occurrence $\rightarrow$ click link citation trong modal $\rightarrow$ đóng modal. | Modal scroll tới đúng citation; Reader nhảy tới $P_1$; đóng modal giữ nguyên Reader tại $P_1$, không reload hay mất state. | `tests/integration/reader-loop-hardening.test.tsx` |
| **IT-22.3** | Integration | `UnifiedResearchReader` + `globalReadingPositionStore` | Độ ổn định phiên đọc khi đóng/mở modal nhiều lần liên tiếp | Mở reader, điều hướng qua 3 ghi chú backlink khác nhau, đóng mở modal liên tục. | `globalReadingPositionStore` bảo toàn chính xác vị trí đọc cuối cùng; không có race condition hay reset vị trí về 0. | `tests/integration/reader-loop-hardening.test.tsx` |

---

## 3. Bản Đồ Quality Gates (Quality Gate Mapping)

### Tier 1 — Blocking Release Gate (Bắt buộc chạy trước khi đóng gói Phase 22)

```bash
# 1. Whitespace & Syntax Check
git diff --check

# 2. TypeScript Typecheck
npm run typecheck

# 3. Reader Subsystem Regression Suite (< 10s)
npx vitest run \
  tests/unit/reader-citation-backlinks-selector.test.ts \
  tests/unit/note-reader-archive-deeplink.test.tsx \
  tests/unit/reader-sidebar-citation-jump.test.tsx \
  tests/unit/reader-sidebar-document-notes.test.tsx \
  tests/integration/reader-bidirectional-citation.test.tsx \
  tests/integration/global-citation-orchestration.test.tsx \
  tests/integration/reader-loop-hardening.test.tsx
```

### Tier 2 — Informational Monitor (Theo Dõi Tổng Quan)

```bash
# Chạy bất đồng bộ để kiểm tra tính tương thích toàn hệ thống (không chặn release của Reader)
npx vitest run
```

---

## 4. Quy Tắc Phân Loại Test & Ranh Giới Cô Lập

1. **Unit Test (`tests/unit/`):** Kiểm tra logic vi mô trong `NoteReaderModal` (timer teardown, regex escaping, DOM attribute matching).
2. **Integration Test (`tests/integration/`):** Kiểm tra sự phối hợp giữa `UnifiedResearchReader`, `ReaderSidebar`, `NoteReaderModal`, và `DataContext`.
3. **Môi Trường Mock:**
   - Mock `scrollIntoView` qua `window.HTMLElement.prototype.scrollIntoView = vi.fn()`.
   - Giữ nguyên toàn bộ logic thuần của `extractCitationBacklinks` và `resolveCitationTargetDocument`.
   - Cấm mock đè lên `DataContext` nội bộ nếu không cần thiết để đảm bảo tính xác thực của state update.
