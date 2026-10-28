# ADR: NotebookLM Research Hub & MindMap Tree Canvas Hardening

## 1. Bối cảnh (Context)
Trong quá trình vận hành hệ thống Knowledge OS, hai module tương tác cốt lõi gồm **Mindmap Tree Canvas** (trực quan hóa cây tri thức) và **NotebookLM Research Hub** (tổng hợp và xử lý tri thức học thuật) bộc lộ một chuỗi các khiếm khuyết liên quan đến stateful regex, điều hướng phân nhánh, giới hạn tỷ lệ zoom, tính ổn định màu sắc, chống trùng lặp dữ liệu ngoại tuyến, và tính toàn vẹn của tiến trình đồng bộ phiên nghiên cứu (Research Session).

Đợt hardening này giải quyết dứt điểm các lỗi đã được xác nhận (confirmed defects) thông qua chuỗi 8 commit độc lập, cô lập và có thể rollback riêng lẻ trên nhánh `feat/mindmap-notebooklm-hardening`.

---

## 2. Các lỗi đã xác nhận (Confirmed Defects)

### A. Nhóm MindMap
- **B1**: Stateful Regex `/g` trong parser trích dẫn khiến `RegExp.prototype.test` giữ `lastIndex`, làm mất trích dẫn xen kẽ khi render tiêu đề node liên tiếp.
- **B2**: Điều hướng bàn phím ở layout `radial_balanced` suy luận phía trái/phải (`left`/`right`) bằng `index % 2` tại từng cấp nút con. Khi vào sâu đến hop 3 hoặc hop 4, mũi tên điều hướng đi ngược về cha thay vì tiến sâu vào nhánh con.
- **B4**: Phím `Space` và `Shift+Space` bị xung đột: thao tác mở Quick Peek (`Shift+Space`) đồng thời kích hoạt callback đóng/mở nhánh (`onToggleCollapse`). Đồng thời, callback `onToggleQuickPeek` bị gọi bên trong state updater của React (`setPeekNodeId`).
- **B5**: `computeFitScale` bị clamp cứng vào khoảng zoom thủ công của người dùng `[0.5, 2.0]`. Với các sơ đồ tư duy lớn đòi hỏi tỷ lệ thu nhỏ `0.1 – 0.3`, chế độ fit-to-view bị ép lên `0.5`, làm cắt mất nội dung khỏi viewport.
- **B6**: Bảng màu nhánh (`BRANCH_PALETTES`) được gán theo `originalIndex % length`. Khi thêm, xóa hoặc sắp xếp lại thứ tự nhánh anh em, index thay đổi khiến màu sắc của toàn bộ các nhánh bị đảo lộn chéo.
- **B7**: Thao tác tạo flashcard từ nhánh/node mindmap thiếu khóa chống nhấp đúp (`isSubmitting`) và không có idempotency key phân định riêng biệt với ID bản ghi, dẫn đến sinh trùng lặp thẻ ghi nhớ.

### B. Nhóm NotebookLM Research Hub
- **A1**: Chung nguyên nhân với B1 (Stateful Regex).
- **A2 & A3**: Hệ thống coi `localStorage` như canonical store tuyệt đối, lưu local thành công trước rồi mới gọi backend mà nuốt lỗi (silent failure). Thiếu trạng thái `syncStatus` (`pending` / `failed` / `synced`) và thiếu nút Retry khi backend gặp sự cố (500, 503, mất mạng).
- **A4**: Đếm và dedupe artifact dựa trên chuỗi `title`. Hai artifact khác nhau có cùng tiêu đề bị đếm gộp thành 1.
- **A5**: `syncSession` phát lệnh POST `/api/research-sessions` mỗi khi đổi topic mà không có cơ chế `AbortController` để hủy request đang bay dở khi người dùng chuyển đổi chủ đề nhanh; thiếu chốt chặn idempotency khi topic hiện hành đã có session trùng khớp.
- **A6**: Toàn bộ các sync ngầm (`package-sources`, `task-prompt`, v.v.) sử dụng `.catch(() => {})` nuốt lỗi. Khi backend thất bại, người dùng không nhận được bất kỳ cảnh báo nào.
- **A7**: Hàm ước tính dung lượng `estimateSourceMetrics` dùng ngưỡng số từ cố định thay vì tỷ lệ so với context window của provider; thiếu cờ `isEstimate: true`.
- **A8**: Hệ thống âm thầm tự động ánh xạ (silent remap) `audio_overview_summary` thành `study_guide` trong payload gửi lên backend và khi lưu kết quả.
- **A9**: `validateArtifactImportInput` cho phép tiêu đề rỗng hoặc chỉ chứa khoảng trắng.
- **A10**: `parseArtifactMarkdownFile` tự động gán loại artifact mà không bắt người dùng xác nhận (`requiresConfirmation: true`).

---

## 3. Quyết định kiến trúc (Architectural Decisions)

### 3.1. MindMap Hardening
1. **Stateless Citation Token Matcher**:
   - Sử dụng regex neo cứng không cờ `/g` (`/^\[\d+(?:[–\-,\s]*\d+)*\]$/`) kết hợp `String.prototype.split` để render trích dẫn an toàn, không phụ thuộc `lastIndex`.
2. **Deterministic Radial Side Map (`computeRadialNodeSideMap`)**:
   - Khởi tạo bảng tra cứu thuần khiết `Map<string, 'left' | 'right'>` từ nút gốc:
     - Hop 0 (root): không có side.
     - Hop 1: gán `left` nếu `originalIndex % 2 === 1`, gán `right` nếu `originalIndex % 2 === 0`.
     - Hop $\ge 2$: kế thừa tuyệt đối side của nút cha hop 1.
   - Thao tác `ArrowLeft` / `ArrowRight` ở layout radial tra cứu trực tiếp từ side map để quyết định tiến sâu vào lá hoặc lùi về gốc.
3. **Phân tách giới hạn Zoom Người Dùng vs Fit-to-View**:
   - Hằng số điều khiển:
     - `USER_MIN_ZOOM = 0.5`
     - `USER_MAX_ZOOM = 2.0`
     - `FIT_MIN_ZOOM = 0.1`
   - Hàm `computeFitScale` clamp theo `[FIT_MIN_ZOOM, USER_MAX_ZOOM]`, bảo đảm hiển thị trọn vẹn sơ đồ tư duy quy mô lớn.
4. **Stable Branch Palette (Băm định danh nhánh FNV-1a)**:
   - Thay thế gán màu theo index mảng bằng hàm băm chuỗi ổn định `getStableBranchPaletteIndex(branchKey)`:
     $$\text{hash} = \text{FNV-1a}(\text{branchKey}) \pmod{\text{BRANCH\_PALETTES.length}}$$
   - Màu sắc của một nhánh được bảo toàn bất biến kể cả khi thêm, xóa hoặc đảo thứ tự các nhánh anh em.
5. **Khóa chống trùng Flashcard & Tách biệt Idempotency Key**:
   - Thêm cờ `isSubmittingFlashcard` vô hiệu hóa nút tạo flashcard trong suốt thời gian thực thi async.
   - Định danh `id` luôn tuân thủ chuẩn `fc-{timestamp}-{random}`. `idempotencyKey` được lưu riêng tại trường `idempotencyKey` và dùng làm khóa dedupe duy nhất.

### 3.2. NotebookLM Research Hub Hardening
1. **Phân tầng Dedupe Đa Khóa (Multi-Key Deduplication Hierarchy)**:
   - Thuật toán `deduplicateArtifacts` áp dụng thứ tự ưu tiên:
     1. Khớp `id`
     2. Khớp `idempotencyKey`
     3. Khớp `contentHash` (băm xác thực nội dung)
   - Tiêu đề (`title`) hoàn toàn không được dùng làm khóa định danh. Hai artifact cùng tiêu đề nhưng khác nội dung/ID được tính là 2 bản ghi riêng biệt.
2. **Quản lý Vòng đời Ngoại tuyến & Retry Tin cậy**:
   - Bổ sung trường `syncStatus?: 'synced' | 'pending' | 'failed'` vào `NotebookLMArtifact`.
   - Khi tạo artifact offline hoặc khi backend lỗi (500, 503, mất mạng), bản ghi được lưu cục bộ dưới dạng draft `pending`, UI hiển thị nhãn cảnh báo `"Chưa đồng bộ backend"` cùng nút `"Thử lại đồng bộ"` (`btn-retry-artifact-sync`).
   - Khi Retry thành công, bản ghi local cập nhật ID của server và chuyển sang `synced`, không sinh bản sao trùng.
   - Nếu Retry thất bại hoặc mất mạng, chuyển `syncStatus: 'failed'` và hiển thị banner cảnh báo nguyên nhân chi tiết.
3. **Session Idempotency & AbortController**:
   - Thêm `AbortController` vào `syncSession`, tự động hủy các request đang pending khi người dùng đổi chủ đề liên tục.
   - Guard `currentSessionRef.current?.topicId === topicId` ngăn chặn phát request POST trùng lặp, hỗ trợ cờ `force` khi cần đối soát chủ động sau live execution.
4. **Loại bỏ Nuốt Lỗi Ngầm & Cảnh báo UI**:
   - Gỡ bỏ toàn bộ `.catch(() => {})` trong các tác vụ sync ngầm (`package-sources`, `task-prompt`, v.v.).
   - Khi sync thất bại, thao tác local (sao chép/tải xuống) vẫn thành công nhưng UI hiển thị banner cảnh báo: `"Đã thực hiện cục bộ, nhưng chưa đồng bộ vào phiên nghiên cứu."`. Khi sync thành công, banner được xóa tự động.
5. **Strict Gating cho Audio Overview**:
   - Loại bỏ hoàn toàn hành vi tự ý remap `audio_overview_summary` thành `study_guide`.
   - Vô hiệu hóa nút thực thi trực tiếp khi chọn Audio Overview và hiển thị thông báo hướng dẫn sử dụng `"Chuẩn bị Handoff Antigravity"`.

---

## 4. Trade-off (Đánh đổi & Cân nhắc)

| Giải pháp lựa chọn | Giải pháp thay thế bị bác bỏ | Lý do & Đánh đổi |
| :--- | :--- | :--- |
| **Direct UI Retry & Explicit Status** | Xây dựng hệ thống Sync Queue chạy ngầm song song | Không phát sinh kiến trúc queue phức tạp vượt ngoài phạm vi `SyncQueueService` hiện có (chỉ xử lý note/resource/topic/progress); trao quyền kiểm soát và quan sát trực tiếp cho người dùng. |
| **Stateless Side Map Map<string, 'left' \| 'right'>** | Lưu trường `side` vào cơ sở dữ liệu hoặc state của node | Giữ nguyên tính bất biến của dữ liệu gốc; side map là một phép chiếu pure-projection suy ra từ topology cây tại thời điểm render. |
| **FNV-1a Hash gán màu nhánh** | Lưu color picker thủ công vào schema | Không làm phình Prisma schema; đảm bảo tính tự động và ổn định nhận diện trực quan mà không đòi hỏi thao tác cấu hình từ người dùng. |
| **Multi-Key Dedupe (ID -> IdempotencyKey -> ContentHash)** | Dedupe bằng Title | Tránh nuốt mất các phiên bản khảo cứu khác nhau của cùng một chủ đề học thuật có trùng tên. |

---

## 5. Chiến lược Kiểm thử Bảo vệ (Protective Testing Strategy)

1. **Test-First Isolation**:
   - Mọi bug đều được tái hiện bằng failing tests trước khi sửa mã nguồn production.
2. **Suite Chuyên biệt**:
   - `tests/unit/mindmap-keyboard-nav.test.tsx`: B1 citation regex, Shift+Space peek disambiguation, hop-4 radial navigation.
   - `tests/unit/mindmap-viewport-zoom.test.tsx`: B5 fit zoom bounds down to 0.1 vs manual clamp 0.5.
   - `tests/unit/mindmap-stable-branch-palette.test.tsx`: B6 stable palette hashing on branch insertion/reorder.
   - `tests/unit/mindmap-flashcard-dedupe.test.tsx`: B7 double-click lock, idempotencyKey separation, backend failure error handling.
   - `tests/unit/notebooklm-artifact-validation-dedupe.test.ts`: A4 title dedupe fix, A7 token metrics, A9 empty title validation, A10 suggestion confirmation.
   - `tests/unit/notebooklm-reliable-sync-idempotency.test.tsx`: A2/A3 syncStatus lifecycle, A5 session abort & idempotency, A6 sync warning, A8 audio overview gating.
   - `tests/unit/notebooklm-artifact-lifecycle.test.tsx`: Bộ test hồi quy toàn diện 16 kịch bản bao phủ vòng đời artifact, reload persistence, spectrum lỗi 500/503/mạng, và deduplication matrix 4 chiều.
3. **Hermetic Test Guard**:
   - Tuân thủ tuyệt đối quy tắc cô lập bộ kiểm thử theo `AGENTS.md`: không gọi live HTTP mutation ra `localhost:3000`. Toàn bộ 595 files (5019 tests) đạt tỷ lệ PASS 100%.

---

## 6. Hạn chế còn lại (Remaining Limitations)
- Tính năng khảo cứu trực tiếp (Direct Execution) qua MCP cho loại artifact `audio_overview_summary` hiện chưa được hỗ trợ trên giao diện frontend và vẫn phụ thuộc vào luồng Handoff Antigravity CLI.
- Bộ nhớ lưu trữ offline của NotebookLM artifact phía client hiện dựa trên `localStorage`. Khi chuyển đổi trình duyệt hoặc xóa cache trình duyệt, các bản nháp chưa được đồng bộ (`syncStatus: 'pending' | 'failed'`) sẽ không được tự động phục hồi nếu chưa từng ghi thành công vào database backend.
