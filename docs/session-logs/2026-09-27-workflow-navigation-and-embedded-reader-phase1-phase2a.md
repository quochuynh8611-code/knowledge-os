# Session Log — Workflow-First Shell Navigation & Embedded Research Workspace (Phase 1 & Phase 2A)

## 1. Session Metadata
- **Project Path:** `/Users/mr.chem/Documents/Lap-trinh/Dashboard-update`
- **Topic:** Tái cấu trúc Workflow-First Shell (Phase 1) & Tích hợp Embedded Research Reader vào DocsExplorerView (Phase 2A)
- **Date:** 2026-09-27
- **Current Branch:** `main`
- **Role:** Staff Software Engineer / Technical Architect
- **Status:** ✅ Completed & Verified 100% (428/428 test files passed, 3.640 tests, 0 typecheck errors)

---

## 2. Phase 1: Workflow-First Shell / Navigation

### 2.1. Mục Tiêu & Root Cause
- **Vấn đề:** Điều hướng cũ phân mảnh theo từng module/tầng chức năng riêng lẻ, thiếu tính tập trung theo chuỗi quy trình làm việc học tập và nghiên cứu (Research-to-Learning).
- **Giải pháp:** Tái cấu trúc thanh điều hướng `Sidebar.tsx` thành **4 Workflow Hubs** trực quan:
  1. **Khảo Cứu** (Thư Viện Sách `library`, Tài Liệu & Giáo Trình `resources`)
  2. **Học Tập & Ôn Tập** (Tổng Quan `dashboard`, Thẻ Nhớ `flashcards`, Tiến Độ & Hàng Đợi `progress`)
  3. **Vườn Tri Thức** (Chủ Đề Học `topics`, Ghi Chú & Đúc Kết `notes`, Bản Đồ Tri Thức `graph`)
  4. **Phân Tích & Công Cụ** (Tìm Kiếm `search`, AI Hỗ Trợ `ai_studio`)

### 2.2. Kết Quả Kỹ Thuật
- Bảo toàn 100% backward compatibility với các hash deep-link (`#/dashboard`, `#/library`, `#/flashcards/launch`, `#/resources`,...).
- Khóa toàn diện bằng bộ unit test mới: `tests/unit/workflow-navigation-hubs.test.tsx` (4 tests passed).

---

## 3. Phase 2A: Reader-Centered Embedded Research Workspace

### 3.1. Mục Tiêu & Root Cause
- **Vấn đề:** `UnifiedResearchReader` trước đây bị đóng khung cứng trong modal dialog `fixed inset-0 z-50` (`role="dialog"`), che khuất toàn bộ giao diện và ngăn cản việc vừa đọc vừa duyệt danh sách sách/tài liệu trong `DocsExplorerView`.
- **Giải pháp:**
  - Bổ sung prop `layoutMode?: 'embedded' | 'modal'` vào `UnifiedResearchReaderProps` (mặc định `'modal'`).
  - Khi `layoutMode="embedded"`, reader lược bỏ lớp modal dialog backdrop toàn màn hình và render vừa vặn vào khung chứa workspace.
  - Tích hợp `layoutMode="embedded"` vào panel phải của `DocsExplorerView`. Người dùng có thể chọn bất kỳ tài liệu nào từ danh sách bên trái hoặc từ Vault để đọc ngay trong split-view liền mạch; chuyển tài liệu mượt mà mà không làm mất trạng thái workspace.

### 3.2. Verification & Safety
- **Failing test-first:** Khởi tạo `tests/unit/embedded-research-reader.test.tsx` trước khi viết code (5/5 tests passed sau khi implement).
- **Zero blast radius:** Không can thiệp `src/App.tsx`, `ResourcesManager.tsx`, `DataContext.tsx`, `resourceOpenResolver.ts`, `server.ts` hay `prisma/*`.

---

## 4. Verification Matrix

| Bộ Kiểm Thử | Lệnh Kiểm Tra | Kết Quả |
| :--- | :--- | :--- |
| **Typecheck** | `npm run typecheck` | ✅ 0 errors |
| **Embedded Reader** | `npx vitest run tests/unit/embedded-research-reader.test.tsx` | ✅ 5/5 passed |
| **Navigation Hubs** | `npx vitest run tests/unit/workflow-navigation-hubs.test.tsx` | ✅ 4/4 passed |
| **Docs Explorer Routing** | `npx vitest run tests/unit/docs-explorer-epub-routing.test.tsx` | ✅ 3/3 passed |
| **Reader Citations & Notes**| `npx vitest run tests/unit/reader-selection-toolbar-actions.test.tsx tests/unit/reader-sidebar-citation-jump.test.tsx` | ✅ 14/14 passed |
| **Full Test Suite** | `npx vitest run` | ✅ **428/428 files passed (3.640 passed, 3 skipped)** |

---

## 5. Scope Files Audit

- **Files Modified:**
  - `src/components/layout/Sidebar.tsx` (Phase 1)
  - `src/components/reader/UnifiedResearchReader.tsx` (Phase 2A)
  - `src/components/docs/DocsExplorerView.tsx` (Phase 2A)
  - `tests/unit/workflow-navigation-hubs.test.tsx` (Phase 1 Test - New)
  - `tests/unit/embedded-research-reader.test.tsx` (Phase 2A Test - New)
  - `tests/unit/phase7d-information-architecture-navigation.test.tsx` (Phase 1 Test Update)
  - `tests/unit/docs-explorer-epub-routing.test.tsx` (Phase 2A Test Update)
