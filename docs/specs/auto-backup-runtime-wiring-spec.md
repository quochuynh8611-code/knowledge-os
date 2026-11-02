# Phase 6 Extended Technical Specification: Auto-Backup Runtime Wiring & Storage Integrity

- **Status:** Approved for Implementation (RED Phase)
- **References:**
  - `docs/adr/ADR-110-phase-6-guarded-auto-backup-and-system-reliability.md`
  - `docs/adr/ADR-077-hermetic-test-guard.md`
  - `docs/specs/phase-6-guarded-auto-backup-and-system-reliability.md`

---

## 1. Bối Cảnh & Vấn Đề (Problem Statement)

Tại Phase 6 (ADR-110), engine `runGuardedAutoBackup`, các guard an toàn (Zero-Data Overwrite, SHA-256 Fingerprint Dedupe, Ring Buffer Retention) và giao diện `AutoBackupControlPanel` đã được cài đặt và kiểm thử đơn vị.
Tuy nhiên, qua điều tra thực tế trong runtime:
1. **Thiếu Runtime Scheduler:** Hàm toán học `isAutoBackupDue` không có bất kỳ caller nào trong mã nguồn ứng dụng `src/`. Checkbox "Tự động sao lưu định kỳ" mặc định `checked=true` nhưng không có timer hay hook nào thực sự kích hoạt sao lưu tự động theo chu kỳ.
2. **Báo Thành Công Giả Khi Ghi Thất Bại:** Hàm `runGuardedAutoBackup` nuốt kết quả của `safeSetLocalStorageItem`, luôn trả về `{ status: 'created' }` ngay cả khi `localStorage` bị đầy quota hoặc bị chặn.
3. **Lịch Sử Snapshot Không Cập Nhật Thời Gian Thực:** Khi một bản snapshot được tạo, panel lịch sử trong cùng tab không tự động làm mới nếu đang mở.

---

## 2. Nguồn Payload Chuẩn Hóa (Payload Contract)

- **Vị trí nguồn:** Lấy trực tiếp từ `useData()` trong `AppContent` ([`src/App.tsx:174`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/App.tsx#L174)), đồng nhất với luồng manual snapshot tại [`src/components/modals/ExportImportModal.tsx:600`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/modals/ExportImportModal.tsx#L600).
- **Cấu trúc thực thể:**
  ```ts
  const workspacePayload: WorkspaceBackupPayload = {
    categories,
    topics,
    notes,
    resources,
    tags,
  };
  ```
- **Ranh giới:**
  - Không tự ý loại bỏ bất kỳ thực thể nào đang được manual flow hỗ trợ (`categories`, `topics`, `notes`, `resources`, `tags`).
  - `flashcards` được `extractCollection` trong engine xử lý mặc định là mảng rỗng `[]` khi undefined ([`src/lib/autoBackupScheduler.ts:222`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/autoBackupScheduler.ts#L222)).
  - **Không mở rộng** coverage sang `researchExcerpts` trong slice này để bảo toàn dung lượng storage và tương thích ngược với format snapshot hiện hữu.

---

## 3. Điều Kiện Sẵn Sàng & Operation Guards (Readiness & Operation Guards)

Scheduler chỉ thực hiện đánh giá khi vượt qua toàn bộ các cổng bảo vệ sau:

### 3.1. Trạng Thái Hydration Thực Sự (Readiness Matrix)
| Kịch bản khởi động | Hành vi hệ thống | Trạng thái `isHydrated` | Quyền chạy Auto-Backup |
| :--- | :--- | :--- | :--- |
| **Server Hydration Thành Công** | `loadInitialData()` nạp dữ liệu server vào state hoàn tất | `true` | Được phép đánh giá |
| **Local-only Mode** | Repo chạy trên LocalStorage nạp dữ liệu local hoàn tất | `true` | Được phép đánh giá |
| **Server Lỗi / Offline** | Repo bắt lỗi và tiếp tục với dữ liệu local ổn định | `true` | Được phép đánh giá |
| **Chưa Hydrate Xong** | Đang trong quá trình fetch bất đồng bộ đầu phiên | `false` | **BỊ CHẶN TUYỆT ĐỐI** |

*Cơ chế kỹ thuật:* `DataContext` sẽ expose reactive state `isHydrated: boolean` trong `DataContextType` (thay vì chỉ dùng `useRef`), chuyển thành `true` ngay khi `loadInitialData` hoàn tất việc nạp dữ liệu ổn định vào state.

### 3.2. Chặn Khi Đang Restore Hoặc Reset (Operation Guard)
- Khi ứng dụng đang thực hiện `importAllDataJSON`, `resetToDefaultData` hoặc khôi phục snapshot, cờ `isOperationInProgress` (hoặc custom event `knowledge_os_operation_start` / `end`) được kích hoạt.
- Trong thời gian này, mọi tick đánh giá sao lưu tự động đều bị hoãn để tránh ghi lại trạng thái trung gian dở dang.

---

## 4. Chính Sách Định Thời (Scheduling Policy)

1. **Cold Start (Chưa từng có snapshot):**
   - Đánh giá ngay lập tức **một lần** sau khi `isHydrated === true`.
   - Không dùng `setTimeout` sleep giả lập (như 3 giây).
   - Nếu `totalEntities > 0`, tạo snapshot baseline đầu tiên.
   - Nếu `totalEntities === 0`, Zero-Data Overwrite Guard skip an toàn (`skipped-empty`).
2. **Warm Start (Đã có snapshot trong lịch sử):**
   - Chỉ kích hoạt khi `isAutoBackupDue(lastSnapshot.createdAt, prefs, now)` trả về `true`.
3. **Nhịp Đánh Giá Nhẹ (Periodic Tick):**
   - Chạy tick mỗi **30 giây** bằng `setInterval`.
   - Tránh parse toàn bộ JSON payload của snapshots trên mỗi tick bằng cách lưu trữ metadata nhẹ (`lastSnapshotMetaRef = { id, createdAt, fingerprint }`) trong bộ nhớ bộ đệm của hook. Cache này được cập nhật khi có snapshot mới hoặc khi nhận event đồng bộ.
4. **Hành Vi Sau Các Kết Quả Đánh Giá:**
   - **`skipped-unchanged` / `skipped-empty` / `rejected-invalid`:** Đặt `lastAttemptTimeRef = now`. Lần đánh giá auto tiếp theo không được diễn ra sớm hơn 1 khoảng chu kỳ (`intervalMinutes`).
   - **`storage-failed`:** Đặt `lastFailureTimeRef = now`. Áp dụng backoff **5 phút** trước khi thử lại lần kế tiếp nhằm tránh ghi lỗi dồn dập.
5. **Dữ Liệu Thay Đổi:**
   - Dữ liệu workspace cập nhật liên tục (rerender) **không reset lại deadline timer** và **không bypass throttle/backoff**.
6. **Tab Focus / Visibility:**
   - Khi tab chuyển từ `hidden` sang `visible` hoặc nhận `focus`, scheduler chỉ yêu cầu một lượt evaluate; lượt này vẫn phải đi qua đầy đủ các guard (readiness, single-flight, due, throttle, dedupe).
7. **Thay Đổi Preferences Cùng Tab:**
   - Khi người dùng đổi chu kỳ hoặc toggle enabled trong `AutoBackupControlPanel`, event `knowledge_os_preferences_changed` được phát để scheduler nạp cấu hình mới ngay lập tức.
8. **Giới Hạn Khi Reload:**
   - Do `lastAttemptTime` được lưu in-memory trong phiên tab, khi người dùng reload trang, trạng thái throttle in-memory này sẽ tái lập. Scheduler sẽ dựa vào `lastSnapshot.createdAt` đã lưu trong `localStorage` và SHA-256 dedupe để ngăn chặn snapshot trùng lặp ngoài ý muốn. Không bổ sung thêm key lưu trữ mới vào `localStorage`.

---

## 5. Vòng Đời Bất Đồng Bộ & Ngăn Ngừa Race Condition (Async Lifecycle)

1. **Single-Flight Guard:** Sử dụng `inFlightRef` để đảm bảo tại một thời điểm chỉ có tối đa một tác vụ sao lưu đang chạy.
2. **Cancellation & Commit Token:** Sử dụng `currentRunIdRef`:
   - Trước khi commit kết quả ghi hoặc cập nhật state, hàm kiểm tra:
     `if (runId !== currentRunIdRef.current || !isMountedRef.current || isOperationInProgressRef.current || !enabledRef.current) return;`
   - Khi unmount, disable hoặc khi bắt đầu thao tác restore/reset, `currentRunIdRef.current++` được gọi để vô hiệu hóa ngay lập tức bất kỳ tác vụ sao lưu nào đang chờ hash/storage.

---

## 6. Tính Toàn Vẹn Lưu Trữ & Thích Ứng Callers (Storage & Caller Integrity)

1. **Hợp Đồng Kết Quả Mới:**
   Bổ sung status `'storage-failed'` và `'cancelled'` vào `GuardedBackupResult`:
   ```ts
   export interface GuardedBackupResult {
     status: 'created' | 'skipped-empty' | 'skipped-unchanged' | 'rejected-invalid' | 'storage-failed' | 'cancelled';
     reason?: string;
     snapshot?: AutoBackupSnapshotRecord;
     retainedCount: number;
     fingerprint?: string;
   }
   ```
2. **Quy Tắc Persistence:**
   - Khi `safeSetLocalStorageItem` trả về `false` hoặc ném exception: Trả về `{ status: 'storage-failed' }`.
   - **Tuyệt đối không báo `'created'`**.
   - **Không phát success event**.
   - **Giữ nguyên 100% dữ liệu lịch sử cũ trong storage**, không cố xoá snapshot cũ để giải phóng dung lượng.
3. **Thích Ứng Callers:**
   - **Manual Snapshot:** Hiển thị thông báo lỗi rõ ràng nếu `status === 'storage-failed'` hoặc `status === 'rejected-invalid'`.
   - **Pre-Restore Safety Snapshot (Fail-Closed):** Nếu bản lưu an toàn trước khi khôi phục không thành công:
     + `created`: Cho phép tiếp tục khôi phục.
     + `skipped-unchanged`: Cho phép tiếp tục (dữ liệu hiện tại đã khớp bản lưu gần nhất).
     + `skipped-empty`: Cho phép tiếp tục (workspace hiện tại 0 thực thể, tuân thủ Zero-Data Overwrite Guard).
     + `storage-failed`: **Hủy ngay lập tức (Abort)**, hiển thị thông báo lỗi lưu trữ.
     + `rejected-invalid`: **Hủy ngay lập tức (Abort)**, hiển thị thông báo dữ liệu không hợp lệ.
     + `cancelled`: **Hủy ngay lập tức (Abort)**.
   - **Auto-Backup Observability:** Lỗi sao lưu tự động ngầm (`storage-failed`, `rejected-invalid`) được lưu trong shared runtime status (`getLastAutoBackupResult()`). Khi người dùng mở `AutoBackupControlPanel`, lỗi này lập tức hiển thị trên UI mà không cần bấm nút; khi auto-backup thành công sau đó, trạng thái lỗi tự động được dọn dẹp.
4. **Đồng Bộ Giao Diện:**
   - Khi snapshot được tạo thành công, phát custom event `knowledge_os_snapshot_updated`.
   - `AutoBackupControlPanel` lắng nghe event này và dọn dẹp listener sạch sẽ khi unmount, giúp danh sách snapshot cập nhật ngay lập tức trong cùng tab.

---

## 7. Gherkin Specification

```gherkin
Feature: Auto-Backup Runtime Scheduling & Reliable Storage

  Scenario: A. App ready, enabled, due, valid data -> trigger auto
    Given app is hydrated and auto-backup is enabled with interval 30 minutes
    And last backup was 35 minutes ago
    And workspace has valid research entities
    When scheduler tick executes
    Then runGuardedAutoBackup is called with trigger "auto"
    And a new snapshot with trigger "auto" is saved to storage

  Scenario: B. Modal is closed -> scheduler remains active
    Given the Export/Import modal is not open
    And elapsed time reaches 30 minutes
    When scheduler tick executes
    Then auto-backup evaluates and saves successfully without needing the modal

  Scenario: C. Pending hydration or disabled -> no snapshot created
    Given data is not yet hydrated OR preferences.enabled is false
    When scheduler tick executes
    Then runGuardedAutoBackup is not invoked
    And snapshot count remains unchanged

  Scenario: D. Continuous rerendering does not delay deadline indefinitely
    Given workspace entities update frequently on user typing
    When 30 minutes elapse based on clock time
    Then auto-backup evaluates on schedule without timer resetting

  Scenario: E. Payload uses latest workspace data (no stale closure)
    Given workspace initially had 2 notes
    And user adds a 3rd note before the scheduled backup tick
    When the backup tick fires
    Then the created snapshot payload contains all 3 notes

  Scenario: F. Preference change in same tab takes effect immediately
    Given user changes interval from 30 minutes to 5 minutes in preferences UI
    When 6 minutes have elapsed from last backup
    Then the scheduler recognizes the 5-minute interval and triggers backup

  Scenario: G. Unchanged data skips without duplicate snapshot and throttles
    Given a snapshot was already created for current workspace content
    When 30 minutes elapse and content has not changed
    Then runGuardedAutoBackup returns "skipped-unchanged"
    And snapshot count does not increase
    And next auto check is throttled for one interval

  Scenario: H. Empty workspace guard preserves history
    Given existing snapshots in history
    And current workspace has 0 entities
    When backup is evaluated
    Then status is "skipped-empty"
    And historical snapshots are preserved intact

  Scenario: I. Slow task execution prevents concurrent overlapping runs
    Given a backup evaluation is currently in flight
    When the next scheduler tick fires
    Then the second tick skips execution until the in-flight run completes

  Scenario: J. StrictMode mount/unmount cleans up timers cleanly
    Given the scheduler hook mounts, unmounts, and remounts
    Then only one active interval exists and no duplicate backups fire

  Scenario: K. Storage write failure reports storage-failed and preserves history
    Given safeSetLocalStorageItem returns false due to quota exhaustion
    When runGuardedAutoBackup is executed
    Then result status is "storage-failed" (NOT "created")
    And existing snapshots in storage remain intact

  Scenario: L. Auto-backup updates open history panel in same tab
    Given AutoBackupControlPanel is open on screen
    When an automated backup snapshot is created in background
    Then the snapshot list in the panel updates to show the new snapshot

  Scenario: M. Pre-restore safety snapshot failure aborts restore
    Given pre-restore safety snapshot fails with "storage-failed"
    When restore operation is requested
    Then restore mutation is aborted to protect current workspace state
```

---

## 8. Giới Hạn & Ranh Giới Kỹ Thuật (Boundaries & Non-Goals)

1. **Multi-Tab Leader Election:** Không triển khai bầu leader liên tab trong slice này; mỗi tab mở Knowledge OS sẽ tự quản lý nhịp đánh giá và tận dụng SHA-256 dedupe khi tab khác đã ghi trước.
2. **Mở Rộng Storage:** Không thay đổi storage engine từ `localStorage` sang `IndexedDB` trong slice này để đảm bảo tính an toàn và tương thích ngược.
3. **Tiến Trình Ngoài Trình Duyệt:** Tự động sao lưu phụ thuộc vào phiên duyệt web đang mở; không tạo background service worker hay cron job ngoài OS.
