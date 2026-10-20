# Knowledge OS Release Notes — Reader Error Recovery & Refresh Persistence Hardening

**Phiên bản**: Reader Hotfix Release (Phát hành chính thức)  
**Ngày hoàn thành**: 20/10/2026  
**Branch**: `main`  
**Commits liên quan**:  
- `3209c5d`: `fix(reader): recover broken epub sessions without persisting stale history`  
- `9e5d45d`: `fix(reader): prevent broken epub rehydration after refresh via canonical alias cleanup`  
**Trạng thái kiểm thử**: 35/35 targeted & regression tests PASS (100%), Manual QA: PASS  

---

## 1. Tóm Tắt Giá Trị Bản Phát Hành (Executive Summary)

Bản phát hành giải quyết dứt điểm chuỗi lỗi nghiêm trọng liên quan đến vòng đời đọc sách EPUB khi file nguồn bị mất, đường dẫn hỏng (HTTP 404) hoặc không giải mã được nội dung nhị phân:
1. **Lối thoát phục hồi lỗi toàn diện (Full Lifecycle Error Recovery)**: Người dùng không còn bị kẹt trong màn hình lỗi vô tận. Giao diện cung cấp đầy đủ 3 lựa chọn cứu cánh: "Thử lại", "Đóng trình đọc", và "Gỡ khỏi danh sách đọc".
2. **Loại bỏ triệt để trên mọi bề mặt đọc**: Khi bấm "Gỡ khỏi danh sách đọc", tài liệu biến mất ngay lập tức khỏi Kệ đọc gần đây (`Recent Reads Shelf`), Chỉ số phân tích tổng quan (`Reading Analytics Breakdown`), và Danh sách chi tiết đang đọc (`In-Progress Drilldown`).
3. **Bảo toàn tính nhất quán tầng Persistence sau khi F5 / Restart**: Giải quyết dứt điểm lỗi phục hồi lại vị trí đọc cũ sau khi reload/refresh trình duyệt thông qua cơ chế chuẩn hóa Canonical Alias Identity và dọn dẹp triệt để trong cơ sở dữ liệu SQLite.
4. **An toàn tuyệt đối với dữ liệu người dùng**: Không can thiệp file hệ thống vật lý, không xóa tài liệu nguồn trong Obsidian Vault, không vi phạm nguyên tắc Zero-Default Universal Baseline.

---

## 2. Chi Tiết Các Cải Tiến Kỹ Thuật (Technical Details)

### 2.1. Full Lifecycle Error Recovery Contract (`EpubReaderAdapter.tsx`)
- Phân loại lỗi chính xác: tách biệt lỗi tạm thời (HTTP 503) với lỗi hỏng đường dẫn/mất file vĩnh viễn (HTTP 404, tệp HTML trả về thay vì file zip EPUB).
- Khi gặp lỗi 404 / hỏng file:
  - Cung cấp nút **"Gỡ khỏi danh sách đọc"** gọi callback `onRemoveBrokenSession(documentId)`.
  - Cung cấp nút **"Đóng trình đọc"** gọi `onClose()`.
  - Giữ nút **"Thử lại"** cho các trường hợp lỗi mạng chập chờn.
- Đảm bảo an toàn không crash ngay cả khi component cha không truyền các callback phục hồi.

### 2.2. Triệt Tiêu Race Condition & Auto-Persist Guard (`UnifiedResearchReader.tsx`)
- Khi người dùng bấm "Gỡ khỏi danh sách đọc":
  - Kích hoạt cờ `isSessionBrokenRef.current = true;` để hủy bỏ toàn bộ timer ghi nhận lượt mở sách (`openTimerRef`) và debounce lưu vị trí (`debounceTimerRef`).
  - Thiết lập `hasFlushedOnCloseRef.current = true;` nhằm chốt chặn tuyệt đối không cho React unmount cleanup kích hoạt `fetch(..., { keepalive: true })` ghi đè vị trí cũ vào database.
  - Loại bỏ lệnh gọi kép `onClose()`, nhường quyền đóng trình đọc cho callback `onRemoveBrokenSession` để tránh race condition.

### 2.3. Single Source of Truth & Refetch Coordination (`DocsExplorerView.tsx`)
- Chuyển đổi toàn bộ việc tính toán thống kê sang `effectiveArchivedDocs` làm Single Source of Truth duy nhất, tự động lọc sạch các ID trong `deletedHistoryIds`.
- Cả Kệ đọc gần đây, thẻ KPI "Tài liệu đang đọc", và bảng Drilldown Modal đều phản ánh đồng bộ trạng thái gỡ bỏ ngay lập tức.
- Trong `handleDeleteRecentRead`:
  - Ưu tiên truyền canonical archive ID (`finalTargetId`) lên backend.
  - Thực thi `await fetch(DELETE)` thành công trước khi gọi `fetchArchivedDocs()`, loại bỏ nguy cơ request GET list đọc dữ liệu cũ chưa kịp xóa trong DB.

### 2.4. Canonical Alias Identity Resolver (`archiveRoutes.ts`)
- Xây dựng hai hàm helper dùng chung:
  - `getCandidateLookupKeys(rawId)`: Phân tích và mở rộng mọi biến thể đường dẫn (`rawId`, `cleanPath`, `vault:${cleanPath}`, `vault://${cleanPath}`, `archive:${cleanPath}`, `archive://${cleanPath}`).
  - `findArchivedDocumentByAnyKey(rawId)`: Truy vấn đa tầng theo ID khóa chính, mã băm SHA-256 (`contentHash`), khóa nguồn (`sourceKey`), đường dẫn nguồn (`sourcePath`), và đường dẫn lưu trữ (`storageRelPath`).
- Thống nhất cơ chế tìm kiếm cho cả 4 endpoints: `GET /archive/file/:id`, `GET /archive/document/:id`, `PATCH /archive/document/:id/position`, và `DELETE /archive/document/:id/history`.
- Tại endpoint `DELETE /archive/document/:id/history`:
  - Sử dụng `prisma.archivedDocument.updateMany` để cập nhật đồng thời tất cả các bản ghi alias liên quan trong cơ sở dữ liệu.
  - Xóa sạch `lastReadAt: null`, `readCount: 0`, và `lastPosition: null`.

---

## 3. Kết Quả Kiểm Thử & Quality Gates

| Bộ Kiểm Thử | Số lượng test | Trạng thái | Nội dung xác minh |
|---|:---:|:---:|---|
| `docs-explorer-broken-epub-recovery.test.tsx` | 12/12 | **PASS** | Vòng đời recovery trên UI, gỡ khỏi shelf & drilldown, và kịch bản mô phỏng F5/remount không phục hồi vị trí cũ |
| `archive-reading-position-persistence.test.ts` | 4/4 | **PASS** | Lưu trữ và cập nhật vị trí đọc EPUB/Markdown trên route archive |
| `archive-routes.test.ts` | 9/9 | **PASS** | Upload, streaming, metadata, và fallback SHA-256 contentHash |
| `epub-reader-adapter-error-recovery.test.tsx` | 6/6 | **PASS** | Error fallback UI, nút thử lại, nút đóng, nút gỡ sách lỗi |
| `unified-reader-broken-session-guard.test.tsx` | 4/4 | **PASS** | Hủy auto-persist open timer và keepalive close persist khi session lỗi |
| **Tổng cộng kiểm thử tự động** | **35/35** | **100% PASS** | Không có lỗi hồi quy |
| **Manual QA (Human Gate)** | — | **PASS** | Trực tiếp kiểm thử hành vi thực tế trên trình duyệt |
| **Static Typecheck** | — | **0 lỗi** | `npx tsc --noEmit` hoàn toàn sạch |
| **Git Whitespace & Syntax** | — | **0 lỗi** | `git diff --check` đạt chuẩn |

---

## 4. Kỷ Luật Kiến Trúc Đã Tuân Thủ

1. **Zero-Default Universal Baseline (`ADR-076`)**:
   - `INITIAL_CATEGORIES`, `INITIAL_TOPICS`, `INITIAL_NOTES` duy trì mảng rỗng `[]`.
   - Không gian làm việc ban đầu của người dùng thương mại được bảo vệ tuyệt đối (0 bản ghi rác).
2. **Hermetic Test Guard**:
   - 100% các bài test đều duy trì tính cô lập tuyệt đối, không có HTTP mutation nào lọt ra ngoài môi trường test.
3. **Zero DB Mutation & Schema Invariance**:
   - Hoàn toàn không sửa đổi file `prisma/schema.prisma`, không migration database.
4. **Git Hygiene**:
   - Chỉ stage và commit đúng các file trong ranh giới đã được Human phê duyệt.
   - Không tự ý commit/push nếu chưa có lệnh từ Human.

---

## 5. Danh Sách Tệp Đã Thay Đổi

- `src/server/routes/archiveRoutes.ts` (Backend alias resolver & history deletion updateMany)
- `src/components/reader/UnifiedResearchReader.tsx` (Reader error guard & unmount persist suppression)
- `src/components/docs/DocsExplorerView.tsx` (Single Source of Truth analytics & safe delete coordination)
- `src/components/reader/adapters/EpubReaderAdapter.tsx` (Recovery UI controls & error classification)
- `tests/integration/docs-explorer-broken-epub-recovery.test.tsx` (End-to-end recovery & refresh test suite)
- `tests/unit/epub-reader-adapter-error-recovery.test.tsx` (Unit tests for adapter error recovery)
- `tests/unit/unified-reader-broken-session-guard.test.tsx` (Unit tests for auto-persist cancellation)
