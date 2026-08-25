# SPECIFICATION: Post-Phase 6f — Restore Evidence Pack & Operator Runbook

## 1. Context & Background
Trải qua các micro-phase từ 6a đến 6e, hệ thống Knowledge OS đã thiết lập vững chắc:
- Kiến trúc kiểm toán đường dẫn tệp vật lý (**File Library & Path Audit Engine**),
- Bảng kê kiểm toán sao lưu (**File Library Manifest JSON**),
- Chuẩn hóa đường dẫn tệp tài liệu (`Resource.filePath`) và ghi chú (`Note.sourcePath`),
- Cơ chế đánh giá mức độ sẵn sàng sao lưu 3 lớp (**3-Layer Backup Readiness**),
- Cơ chế diễn tập khôi phục mô phỏng thuần túy trong bộ nhớ (**Restore Drill - In-Memory Dry Run**).

Để quy trình sao lưu và phục hồi có thể được chuyển giao, vận hành lặp lại và kiểm chứng độc lập bởi người vận hành (Operator), hệ thống cần một **Gói Bằng Chứng Khôi Phục (Restore Evidence Pack)** chuẩn hóa kèm theo **Sổ Tay Vận Hành (Operator Runbook)** chi tiết bằng tiếng Việt.

---

## 2. Problem Statement
1. **Thiếu Fixture Chuẩn Hóa Độc Lập:** Các bài kiểm thử trước đây chủ yếu tạo payload snapshot và manifest dạng inline trong code test, thiếu các tệp JSON fixture mẫu đại diện cho các kịch bản: Hợp lệ (Valid v2.x), Kế thừa (Legacy v1.x), Hỏng cấu trúc / sai checksum (Malformed), và Manifest đa trạng thái (Mixed statuses).
2. **Nguy Cơ Hiểu Nhầm Trong Vận Hành:** Nếu không có tài liệu Runbook chuẩn mực, người vận hành có thể lầm tưởng rằng việc tải xuống tệp `snapshot.json` đồng nghĩa với việc toàn bộ tệp PDF/Audio trên máy đã được sao lưu an toàn.
3. **Cần Quy Trình Diễn Tập Có Thể Tái Lập (Reproducible Drill):** Người vận hành cần các bước hướng dẫn cụ thể để chạy diễn tập khôi phục an toàn (in-memory dry run), đối chiếu số liệu xem trước (preview counts) với fixture mà không gây rủi ro cho dữ liệu đang chạy.

---

## 3. Goals & Non-Goals

### Goals
1. **Restore Evidence Pack (Fixtures):**
   - Cung cấp bộ fixture JSON đặt tại `tests/fixtures/backup/` gồm:
     - `valid-snapshot.json`: Bản snapshot Semver 2.x hợp lệ kèm checksum SHA-256 chính xác và dữ liệu mẫu đa dạng.
     - `legacy-snapshot.json`: Bản snapshot định dạng cũ (Legacy v1.x) để chứng minh khả năng tương thích ngược.
     - `malformed-snapshot.json`: Bản snapshot hỏng (sai checksum hoặc cấu trúc không hợp lệ) để chứng minh cơ chế từ chối an toàn.
     - `manifest-mixed-statuses.json`: Bản manifest chứa đầy đủ 4 trạng thái (`exists`, `unverified`, `missing`, `outside_library`).
     - `README.md`: Hướng dẫn chi tiết cấu trúc và mục đích của từng fixture.
2. **Operator Runbook:**
   - Biên soạn tài liệu `docs/runbooks/backup-restore-operator-runbook.vi.md` bằng tiếng Việt rõ ràng, chặt chẽ, đầy đủ checklist ký xác nhận.
3. **Automated Verification Contract:**
   - Tạo các test suites tự động kiểm chứng tính đúng đắn của các fixture, đảm bảo không làm crash hệ thống và không làm biến đổi state live.
   - Đảm bảo các tệp fixture không bao giờ bị đóng gói vào bundle production (`dist/`).

### Non-Goals
- Không xây dựng cloud sync tự động hay daemon chạy nền can thiệp filesystem máy chủ.
- Không tự động di chuyển, đổi tên, sao chép hoặc xóa file vật lý của người dùng.
- Không thay đổi schema database hay REST API trong micro-phase này.

---

## 4. Evidence Pack Structure & Fixture Contracts

### Directory Layout
```text
tests/fixtures/backup/
├── valid-snapshot.json          # Semver 2.x snapshot hợp lệ (categories, topics, notes, resources, tags)
├── legacy-snapshot.json         # Legacy v1.x snapshot không có checksum header v2
├── malformed-snapshot.json      # Snapshot lỗi checksum hoặc format sai
├── manifest-mixed-statuses.json # Manifest đầy đủ: exists, unverified, missing, outside_library
└── README.md                    # Tài liệu giải thích chi tiết các fixtures
```

### Fixture Contracts
1. **`valid-snapshot.json` Contract:**
   - Bắt buộc tuân thủ `BackupSnapshotSchema` (Semver `2.0.0`).
   - `checksum` phải là mã SHA-256 chính xác tính từ `data` qua `calculateBackupChecksum`.
   - `counts` khớp chính xác với số lượng mảng thực thể trong `data`.
   - Tuyệt đối không chứa nhị phân PDF/Media (zero binary ingestion).
2. **`legacy-snapshot.json` Contract:**
   - Đại diện cho payload xuất từ các phiên bản v1 cũ (mảng các thực thể ở root hoặc cấu trúc phẳng).
   - Được xử lý mượt mà qua fallback của `inspectSnapshotPayload`, `validateRestoreCandidate` và `runRestoreDrill`.
3. **`malformed-snapshot.json` Contract:**
   - Chứa chuỗi checksum sai lệch hoặc cấu trúc bị cắt cụt.
   - `validateBackupSnapshotPreflight` và `validateRestoreCandidate` phải trả về `isValid: false` với thông điệp lỗi rõ ràng.
   - `runRestoreDrill` phải trả về `drillSuccess: false` và giữ nguyên trạng thái ứng dụng.
4. **`manifest-mixed-statuses.json` Contract:**
   - Chứa các mục tham chiếu đại diện cho cả 4 trạng thái:
     - `exists`: Tệp hợp lệ trong thư viện gốc.
     - `unverified`: Tệp chưa xác minh trong môi trường sandbox trình duyệt.
     - `missing`: Tệp chỉ định đường dẫn nhưng không tìm thấy.
     - `outside_library`: Tệp nằm ngoài `canonicalLibraryRoot`.

---

## 5. Operator Runbook Requirements

Tài liệu `docs/runbooks/backup-restore-operator-runbook.vi.md` phải bao gồm 12 phần trọng tâm:
1. **Phạm vi & Nguyên tắc An toàn Cốt lõi.**
2. **Phân định 3 Lớp Sao Lưu (3-Layer Architecture):**
   - Lớp 1: App Snapshot JSON (Logic state & metadata).
   - Lớp 2: File Library Manifest JSON (Bảng kê tham chiếu đường dẫn).
   - Lớp 3: Physical File Set (Thư mục tệp gốc trên máy).
3. **Quy trình Sao Lưu Chuẩn bị (Pre-change Backup Procedure).**
4. **Quy trình Kiểm tra Mức Độ Sẵn Sàng (Backup Readiness Check).**
5. **Quy trình Diễn Tập Khôi Phục Trong Bộ Nhớ (Restore Drill Procedure).**
6. **Hướng dẫn Đọc & Phân Tích Kết Quả Xem Trước (Restore Preview Analysis).**
7. **Quy trình Khôi Phục Dữ Liệu Thật (Live Restore Execution):**
   - Phân biệt chế độ Gộp (Merge) và Thay thế (Replace).
   - Rào chắn an toàn Confirmation Gate (`XÁC NHẬN THAY THẾ`).
8. **Quy trình Xử lý Các Trạng Thái Kiểm Toán Bất Thường (`unverified`, `missing`, `outside_library`).**
9. **Quy trình Sao Lưu Phối Hợp với Obsidian Vault.**
10. **Quy trình Kiểm Thử Xác Minh Sau Khôi Phục (Post-Restore Smoke Test).**
11. **Kế Hoạch Khắc Phục Sự Cố & Rollback (Escalation & Rollback Plan).**
12. **Bảng Ký Xác Nhận Hoàn Thành của Người Vận Hành (Operator Sign-off Checklist).**

---

## 6. Safeguards & Sandbox Isolation

- **Browser Sandbox Non-Fabrication:** Runbook và Test phải khẳng định rõ ràng rằng trong môi trường web sandbox, trạng thái `unverified` là thiết kế an toàn có chủ đích, không phải lỗi.
- **Pure In-Memory Guarantee:** Mọi hoạt động của Restore Drill chỉ thực hiện tính toán trên bộ nhớ RAM, không phát sinh bất kỳ write side-effects nào lên LocalStorage hay API Database.
- **Bundle Isolation:** Tệp trong `tests/fixtures/` chỉ được tham chiếu trong test suites và tài liệu, hoàn toàn cách ly khỏi production build.

---

## 7. Acceptance Criteria
1. Đầy đủ 4 tệp fixture JSON và 1 tệp README trong `tests/fixtures/backup/`.
2. Tạo mới 3 test suites tự động:
   - `tests/unit/restore-evidence-fixtures.test.ts`
   - `tests/unit/operator-runbook-contract.test.ts`
   - `tests/unit/manifest-status-fixtures.test.ts`
3. Đầy đủ tài liệu Runbook `docs/runbooks/backup-restore-operator-runbook.vi.md`.
4. Toàn bộ test suites (cũ + mới) đạt 100% GREEN.
5. `npm run lint`, `npm run build`, `git diff --check` đạt 100% PASS.
