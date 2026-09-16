# Phase D Acceptance & Hardening Note

**Workspace**: Knowledge OS — Professional Research Workbench Upgrade  
**Phase**: Phase D (Study Suite & Knowledge Visualizations)  
**Acceptance Date**: 2026-09-16  
**Status**: ACCEPTED & HARDENED

---

## 1. Scope Hoàn Tất

Phase D tập trung chuẩn hóa và nâng cấp toàn bộ hệ thống Học tập, Phân tích Spaced Repetition, Đồ thị Tri thức Đa chiều và AI Copilot Khảo cứu theo chuẩn **Professional Research Workbench** (Design Tokens V2, micro-surfaces sắc nét, trung tính, không gradient SaaS bóng bẩy, hỗ trợ dark mode toàn diện).

Các khu vực và module chính:
1. **Flashcard Review Studio**: Trải nghiệm ôn tập thẻ ngắt quãng, canvas lật thẻ, thanh điều khiển session, action bar chấm điểm SM-2 và màn hình chúc mừng.
2. **Card Browser**: Quản lý, lọc phân loại (facets), tìm kiếm, sắp xếp, thao tác hàng loạt và phân trang kho thẻ.
3. **Study Launcher**: Trung tâm khởi động phiên học với 4 chiến lược ôn tập (`review`, `new`, `weak`, `cram`) và cấu hình giới hạn thẻ hàng ngày.
4. **Flashcard Analytics Dashboard**: Bảng điều khiển phân tích học tập, KPI thống kê, biểu đồ SVG dự báo khối lượng ôn tập theo ngày, danh sách thẻ yếu và xu hướng quên.
5. **Duplicate Detection Dashboard**: Bảng điều khiển phát hiện và xử lý thẻ trùng lặp nội dung theo thuật toán chuẩn hóa tiếng Việt, đối chiếu song song và nhật ký thao tác thiết bị.
6. **Study Progress View**: Theo dõi tiến độ học tập và ghi nhớ dự phóng SM-2/Ebbinghaus, dự báo hàng đợi 7 ngày, biểu đồ xu hướng học tuần và phân bổ lĩnh vực.
7. **Knowledge Graph**: Trực quan hóa mạng lưới liên kết tri thức đa chiều, bộ lọc động (Domain, Tag, Semantic Edge), canvas SVG tương tác và side inspector đa chặng (multi-hop traversal).
8. **AI Research Studio**: AI Copilot khảo cứu học thuật có kiểm soát độ sâu (Quick, Standard, Deep), phạm vi nguồn nội bộ (Canonical, Notes, Resources, Flashcards, Obsidian Vault), định dạng đầu ra (Answer, Brief, Flashcard Draft), đề cương 1 round-trip, lưới bằng chứng và nhận diện độ bất định.

---

## 2. Danh Sách File Đã Sửa

| STT | File Path | Mục Đích Sửa Đổi |
|---|---|---|
| 1 | `src/components/flashcards/FlashcardReviewStudio.tsx` | Nâng cấp canvas ôn tập, celebration screen, header control strip, rating action bar theo DS v2, giữ nguyên phím tắt và SM-2 logic. |
| 2 | `src/components/flashcards/CardBrowser.tsx` | Nâng cấp search bar, facet filter dropdowns, bulk action bar, table rows và pagination footer. |
| 3 | `src/components/flashcards/StudyLauncher.tsx` | Refactor 4 thẻ chiến lược học và panel cấu hình daily limits sang token workbench. |
| 4 | `src/components/flashcards/FlashcardAnalyticsDashboard.tsx` | Refactor insights panel, KPI grid, SVG workload forecast bar chart, weak cards panel và lapse trend panel. |
| 5 | `src/components/flashcards/DuplicateDetectionDashboard.tsx` | Refactor header, feedback banner, candidate groups, so sánh đối chiếu thẻ gốc/trùng, nút swap/suspend và audit modal. |
| 6 | `src/components/progress/StudyProgressView.tsx` | Refactor KPI retention summary, 7-day forecast chart, weekly trend chart, domain pie chart và topic progress sliders. |
| 7 | `src/components/graph/KnowledgeGraph.tsx` | Refactor header, legend pills, dynamic domain/tag/semantic filter bar, canvas HUD, zoom pills và node inspector drawer. |
| 8 | `src/components/ai/AIResearchStudio.tsx` | Refactor header, control panel (source scope checkboxes, depth pills, output formats), topic history, result box, citations và uncertainties panels. |
| 9 | `src/components/layout/Sidebar.tsx` | Đồng bộ tiêu đề "Lĩnh Vực Nghiên Cứu" và placeholder tạo lĩnh vực mới với hệ thống kiểm thử taxonomy. |

---

## 3. Invariants Đã Bảo Toàn 100%

- **Thuật toán cốt lõi & Scheduler**: Toàn bộ thuật toán SM-2, tính toán retention rate, dự báo queue 7 ngày, duplicate detection score (Levenshtein/Jaccard tiếng Việt), thuật toán multi-hop graph traversal.
- **Phím tắt & Focus Flow**: Phím `Space` lật thẻ, phím `1-4` xếp hạng thẻ, ngăn chặn va chạm phím chuyển tab (shortcut collision isolation) khi đang ở trong studio.
- **Tích hợp & Handoff**: Modal đóng gói Handoff 6 phần cho Reasoning AI, xuất Markdown khảo cứu, Obsidian Vault source picker và DataContext synchronization.
- **Testing & Accessibility Selectors**: Giữ nguyên toàn bộ `data-testid` (`rating-btn-1..4`, `btn-swap-primary-*`, `btn-suspend-duplicate-*`, `btn-view-audit-logs`, `stat-retention`, v.v.) và `aria-label` (`semantic-edge-filter`, `Độ sâu duyệt`).

---

## 4. Bằng Chứng Kiểm Chứng Thực Tế (Test Evidence)

### A. TypeScript Typecheck
```bash
npm run typecheck
```
**Kết quả**:
```
> react-example@0.0.0 typecheck
> tsc --noEmit
Exit code: 0 (0 errors)
```

### B. Kiểm tra Coverage nhóm Card Browser
Trong báo cáo Phase D trước đó, 2 file UI/Integration (`card-browser.test.tsx`, `topic-card-browser.test.tsx`) đã được kiểm tra, và 2 file logic/routing (`card-browser-logic.test.ts`, `card-browser-routing.test.ts`) nay đã được chạy bổ sung độc lập và tích hợp đầy đủ.

```bash
npx vitest run tests/unit/card-browser.test.tsx tests/unit/card-browser-logic.test.ts tests/unit/card-browser-routing.test.ts tests/integration/topic-card-browser.test.tsx
```
**Kết quả**:
- `tests/unit/card-browser-routing.test.ts` (7 tests passed)
- `tests/unit/card-browser-logic.test.ts` (15 tests passed)
- `tests/unit/card-browser.test.tsx` (7 tests passed)
- `tests/integration/topic-card-browser.test.tsx` (3 tests passed)
**Tổng cộng**: 4 suites, 32 passed (0 failed).

### C. Toàn bộ Test Suites liên quan Phase D (22 Suites, 188 Tests Passed)
```bash
npx vitest run \
  tests/unit/flashcard-scheduler-transitions.test.ts \
  tests/unit/flashcard-cloze-parsing.test.ts \
  tests/unit/study-session-logic.test.ts \
  tests/unit/study-analytics-ui-integration.test.tsx \
  tests/unit/study-analytics-lib.test.ts \
  tests/unit/knowledge-graph-lib.test.ts \
  tests/unit/knowledge-graph-ui-integration.test.tsx \
  tests/unit/duplicate-detection-dashboard.test.tsx \
  tests/unit/ai-research-copilot-ui.test.tsx \
  tests/unit/ai-research-studio-persistence-ui.test.tsx \
  tests/unit/ai-research-storage.test.ts \
  tests/integration/flashcard-review-studio.test.tsx \
  tests/unit/flashcard-shortcut-collision.test.tsx \
  tests/unit/card-browser.test.tsx \
  tests/unit/card-browser-logic.test.ts \
  tests/unit/card-browser-routing.test.ts \
  tests/integration/topic-card-browser.test.tsx \
  tests/unit/study-launcher.test.tsx \
  tests/unit/study-launcher-routing.test.ts \
  tests/integration/flashcard-analytics-widget.test.tsx \
  tests/unit/study-progress-null-crash.test.tsx \
  tests/unit/dynamic-taxonomy-ui.test.tsx
```
**Kết quả**:
- **Test Files**: 22 passed (22)
- **Tests**: 188 passed (188)
- **Duration**: 8.06s

---

## 5. Residual Risks (Rủi Ro Còn Lại & Điểm Cần Lưu Ý)

1. **Hiệu năng Canvas Đồ thị trên tập dữ liệu rất lớn**: Mặc dù `KnowledgeGraph.tsx` đã giới hạn `maxNodesLimit: 200` cho chế độ multi-hop traversal, khi người dùng mở rộng toàn bộ đồ thị với hàng nghìn node ghi chú/tài liệu cùng lúc, việc tính toán vị trí cụm có thể tốn tài nguyên SVG DOM.
2. **Khả năng hiển thị biểu đồ Recharts / SVG trên màn hình cực nhỏ (dưới 360px)**: Biểu đồ dự báo cột 7 ngày và biểu đồ xu hướng tuần trong `StudyProgressView.tsx` được thiết kế co giãn (responsive), nhưng trên các màn hình có chiều rộng rất nhỏ (< 360px), các nhãn ngày tháng có thể bị rút gọn.
3. **Phụ thuộc API Vault Obsidian trong môi trường Offline**: Trong `AIResearchStudio.tsx`, việc chọn nguồn Obsidian Vault sử dụng API `/api/obsidian/vaults`. Nếu môi trường không khởi chạy backend server, studio sẽ tự động fallback sang các nguồn nội bộ tiêu chuẩn (Canonical, Notes, Flashcards) mà không làm crash ứng dụng.

---

## 6. Hướng Dẫn Kiểm Tra Thủ Công Trong UI (Manual QA Checklist)

Khi kiểm thử giao diện trực tiếp trên trình duyệt, các điểm sau cần được kiểm tra:

1. **Flashcard Review Studio & Keyboard Flow**:
   - Nhấn phím `Space` khi xem mặt trước thẻ -> xác nhận thẻ lật sang mặt sau mượt mà và trang không bị cuộn.
   - Nhấn phím `1`, `2`, `3`, `4` -> xác nhận thẻ được đánh giá (Again, Hard, Good, Easy) và chuyển sang thẻ tiếp theo, không bị kích hoạt chuyển tab navbar.
2. **Knowledge Graph Zoom / Filter / Multi-hop Inspector**:
   - Nhấp chọn một chủ đề -> xác nhận vòng sáng halo và drawer chi tiết xuất hiện ở góc dưới bên phải.
   - Bật "Khảo cứu lân cận" -> chọn độ sâu `1-hop`, `2-hop`, `3-hop` và kiểm tra đồ thị lọc subgraph tương ứng.
   - Thử kéo thả (drag) các node và dùng các nút zoom in/out/center.
3. **AI Research Studio Persistence & Export**:
   - Chọn một chủ đề và chọn các nguồn (Canonical, Notes, Obsidian Vault).
   - Chọn định dạng "Tạo Q&A Draft (Flashcards)" -> nhấn "Khảo Cứu".
   - Bấm nút "Lưu Q&A Draft" -> xác nhận thẻ được thêm vào Notes; bấm "Xuất Markdown" -> kiểm tra file `.md` được tải về với tên file đã được chuẩn hóa.
4. **Study Progress & Analytics Charts**:
   - Kiểm tra các thẻ KPI hiển thị đúng số lượng và tỷ lệ phần trăm retention.
   - Di chuột lên các cột trong biểu đồ "Dự báo hàng đợi ôn tập 7 ngày" để xem tooltip phân bổ theo từng lĩnh vực.
5. **Duplicate Detection Action Flows**:
   - Truy cập tab Thẻ trùng lặp -> kiểm tra danh sách các nhóm thẻ trùng.
   - Bấm nút "Chọn làm thẻ gốc" -> kiểm tra vị trí Thẻ Gốc và Thẻ Trùng được hoán đổi.
   - Bấm nút "Tạm ngưng thẻ này" -> xác nhận modal mở ra và thẻ được đưa vào trạng thái `suspended` sau khi xác nhận.
