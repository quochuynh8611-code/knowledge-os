# Báo Cáo Đóng Phase D2: Global Quick-Capture Modal (`⌘N` / `Ctrl+N`)

**Ngày hoàn thành:** 2026-10-11  
**Người phụ trách:** Staff Software Engineer kiêm Technical Architect  
**Trạng thái:** ✅ **HOÀN TẤT & ĐƯỢC XÁC MINH CỤC BỘ (LOCAL-ONLY / NOT PUSHED)**  
**Commit Policy:** Chưa stage, chưa commit, chưa push — đang dừng tại Human-Approval Gate.  

---

## 1. Tóm Tắt Kết Quả Triển Khai (Executive Summary)

Phase D2 đã hoàn thành toàn bộ mục tiêu theo đặc tả kiến trúc:
1. **Global Quick-Capture Modal (`QuickCaptureModal.tsx`)**:
   - Modal toàn cục nhẹ, hiển thị tiêu đề "Ghi Chú Chớp Nhoáng", badge "Research Inbox", và ô `textarea` tự động focus khi mở.
   - Hỗ trợ phím tắt submit `⌘+Enter` (macOS) / `Ctrl+Enter` (Windows/Linux) và nút bấm "Lưu vào Inbox".
   - Phím `Escape` hoặc click nút đóng sẽ đóng modal tức thì mà không cần hộp thoại xác nhận hủy bản nháp (tối ưu hóa luồng ghi chép không ma sát).
   - Error-retention contract: Nếu việc lưu vào DataContext gặp lỗi, modal không đóng và không làm mất nội dung người dùng đã nhập.
2. **Keyboard Shortcut (`⌘N` / `Ctrl+N`)**:
   - Tích hợp vào hook toàn cục `useKeyboardShortcuts.ts`, gọi `e.preventDefault()` và `e.stopPropagation()` để ngăn chặn hành vi mở cửa sổ mới của trình duyệt.
   - Không gây xung đột hoặc hồi quy với các phím tắt hiện hữu (`⌘K`, `?`, phím số `1-7`, `Escape`).
3. **Command Palette Fallback Action**:
   - Đăng ký action `act-quick-capture` ("Ghi Chú Nhanh (Quick Capture)") trong danh mục `Hành động nhanh` của `useCommandPalette.ts` như một đường lui (fallback) bắt buộc đề phòng xung đột phím tắt trình duyệt.
4. **Canonical Payload Contract & Zero Schema Migration**:
   - Khi lưu, nội dung được chuyển đổi thành một bản ghi canonical `ResearchExcerpt`:
     - `archivedDocumentId: "quick-capture"`
     - `citationSnapshot: { title: "Ghi chú chớp nhoáng", author: "Quick Capture" }`
     - `status: "inbox"`
     - `positionSelector: {}`
     - `highlightColor: "#f59e0b"`
   - Đẩy trực tiếp vào `Research Inbox` thông qua `addExcerptToInbox(excerpt)` trong `DataContext.tsx`.
   - Không tạo bảng mới, không có Prisma schema migration, không sửa backend/API routes.
   - Không thêm nút mới trên `Navbar.tsx`.
5. **Shortcuts Modal Updates**:
   - Cập nhật `ShortcutsModal.tsx` bổ sung dòng tra cứu `⌘N` / `Ctrl+N` trong nhóm "Thao Tác Nhanh & Tìm Kiếm".

---

## 2. Bằng Chứng Kiểm Thử & Xác Minh (Verification Evidence)

### 2.1. Targeted Unit & Integration Tests (12/12 PASS)
Tập tin kiểm thử: [`tests/unit/quick-capture-modal.test.tsx`](tests/unit/quick-capture-modal.test.tsx)
- `1. Keyboard Shortcut (Cmd+N / Ctrl+N)`:
  - ✓ Kích hoạt `onOpenQuickCapture` khi nhấn `Ctrl+N` hoặc `Cmd+N`.
  - ✓ Không làm hỏng shortcut cũ (`Cmd+K`, `?`, phím số `1-7`).
- `2. Command Palette Fallback Action`:
  - ✓ Đăng ký action `act-quick-capture` trong danh mục "Hành động nhanh".
- `3. QuickCaptureModal Component`:
  - ✓ Không hiển thị khi `isOpen = false`.
  - ✓ Tự động focus vào ô nhập liệu textarea khi mở modal.
  - ✓ Gọi `onSave` với canonical payload và đóng modal khi nhấn `Cmd+Enter`.
  - ✓ Gọi `onSave` và đóng modal khi click nút "Lưu vào Inbox".
  - ✓ Không submit nếu nội dung rỗng hoặc chỉ có khoảng trắng.
  - ✓ Đóng modal ngay lập tức khi nhấn `Escape`.
  - ✓ Error Retention: khi `onSave` thất bại, không đóng modal và giữ nguyên nội dung.
- `4. Integration in App Shell`:
  - ✓ Mở QuickCaptureModal khi ấn `Cmd+N` trong `App` và lưu thành công vào localStorage inbox (`phat_hoc_huyen_hoc_clean_v3_research_inbox`).
  - ✓ Mở QuickCaptureModal qua Command Palette action.

### 2.2. Regression Test Suites (30/30 PASS)
Lệnh chạy: `npx vitest run tests/unit/quick-capture-modal.test.tsx tests/unit/keyboard-shortcuts.test.tsx tests/unit/command-palette-caller-wiring.test.tsx tests/unit/dashboard-daily-due-widget.test.tsx`
- `tests/unit/keyboard-shortcuts.test.tsx`: 7/7 PASS.
- `tests/unit/dashboard-daily-due-widget.test.tsx`: 7/7 PASS.
- `tests/unit/quick-capture-modal.test.tsx`: 12/12 PASS.
- `tests/unit/command-palette-caller-wiring.test.tsx`: 4/4 PASS.
- **Tổng cộng**: 30/30 tests PASS.

### 2.3. TypeScript Typecheck
Lệnh chạy: `npx tsc --noEmit`
- **Kết quả**: Exit code 0, 0 errors, 0 warnings.

---

## 3. Danh Sách Tập Tin Đã Thay Đổi (Blast Radius)

| Tập tin | Loại thay đổi | Mô tả |
| :--- | :---: | :--- |
| `src/components/modals/QuickCaptureModal.tsx` | Mới | Component modal ghi chú nhanh toàn cục |
| `src/hooks/useKeyboardShortcuts.ts` | Sửa | Bổ sung `onOpenQuickCapture`, bắt `Cmd+N` / `Ctrl+N` |
| `src/hooks/useCommandPalette.ts` | Sửa | Bổ sung action `act-quick-capture` trong "Hành động nhanh" |
| `src/components/modals/ShortcutsModal.tsx` | Sửa | Bổ sung dòng tra cứu `⌘N` / `Ctrl+N` |
| `src/App.tsx` | Sửa | Wiring state `showQuickCaptureModal`, `handleSaveQuickCapture`, render modal |
| `tests/unit/quick-capture-modal.test.tsx` | Mới | Suite 12 tests kiểm thử unit và integration |
| `docs/specs/phase-d2-global-quick-capture-modal-spec.md` | Mới | Đặc tả kỹ thuật Phase D2 |
| `docs/adr/ADR-098-phase-d2-global-quick-capture-modal.md` | Mới | Quyết định kiến trúc ADR-098 |
| `docs/reports/phase-d2-global-quick-capture-modal-closure-report.md` | Mới | Báo cáo đóng phase D2 |
| `docs/PROJECT_STATUS.md` | Sửa | Cập nhật governance bảng trạng thái dự án |

**Các tập tin TUYỆT ĐỐI KHÔNG đụng vào:**
- `src/server/**`
- `prisma/**`
- `src/components/layout/Navbar.tsx`
- Các module Mind Map, Flashcards, Reader không liên quan trực tiếp.

---

## 4. Các Rủi Ro Còn Mở & Khuyến Nghị (Open Risks & Recommendations)

1. **Browser Hotkey Collision (`⌘N` / `Ctrl+N`)**:
   - Một số trình duyệt trên môi trường không phải PWA hoặc chế độ fullscreen có thể bắt `⌘N`/`Ctrl+N` mở cửa sổ mới trước khi JS kịp gọi `preventDefault`.
   - **Đã giảm thiểu**: Fallback qua Command Palette (`⌘K` -> `quick capture`) hoạt động 100% tin cậy.
2. **Review/Triage Workflow trong tương lai (Phase R3.B / D3)**:
   - Các trích đoạn từ Quick Capture hiện xuất hiện trực tiếp trong `Research Inbox`. Có thể cân nhắc thêm filter tag hoặc filter source "Quick Capture" trong `ReaderSidebar` hoặc trang quản lý Inbox chuyên biệt ở các phase tiếp theo.
