# Đặc Tả Kỹ Thuật: Xác Minh Sao Lưu & Diễn Tập Khôi Phục (Backup Verification & Restore Drill - Post-Phase 6e)

> **Tài liệu tham chiếu:** [`ADR-017`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/adr-017-file-library-backup-architecture.md) · [`docs/specs/post-phase6-file-library-backup-architecture.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase6-file-library-backup-architecture.md) · [`docs/specs/post-phase6d-note-source-path-consistency-and-unified-reference-audit.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase6d-note-source-path-consistency-and-unified-reference-audit.md)  
> **Người thực hiện:** Staff Software Engineer / Technical Architect  
> **Trạng thái:** Active / Approved  

---

## 1. Bối Cảnh (Context) & Vấn Đề (Problem Statement)

1. **Hiểu lầm về tính toàn vẹn của bản sao lưu:** Người vận hành thường nhầm tưởng rằng việc xuất tệp `App Snapshot JSON` hoặc `File Library Manifest JSON` đã đồng nghĩa với việc toàn bộ tệp PDF và Markdown ngoài ổ đĩa đã được sao lưu an toàn.
2. **Thiếu cơ chế diễn tập khôi phục không xâm lấn (Non-destructive Restore Drill):** Trước đây, để kiểm tra một tệp backup JSON có phục hồi được không, người dùng phải thực hiện Import thật (có nguy cơ ghi đè dữ liệu đang dùng nếu chọn Replace hoặc làm bẩn dữ liệu nếu chọn Merge).
3. **Cần một báo cáo mức độ sẵn sàng sao lưu (Backup Readiness Report):** Cần một hàm thuần túy đánh giá 3 lớp sao lưu, chỉ rõ lớp nào đã sẵn sàng, lớp nào còn thiếu và đưa ra khuyến nghị hành động cụ thể.

---

## 2. Mô Hình Ba Lớp Sao Lưu (The 3-Layer Backup Architecture)

Hệ thống phân định rạch ròi 3 lớp dữ liệu không thể thay thế lẫn nhau:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        3-LAYER BACKUP STRUCTURE                        │
├──────────────────────────┬─────────────────────────────────────────────┤
│ 1. App Snapshot JSON     │ Dữ liệu logic, chủ đề, ghi chú (content),   │
│    (Logical State)       │ tiến độ học tập SM-2, tags, links.          │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 2. File Manifest JSON    │ Bảng kê danh mục đường dẫn đã chuẩn hóa,    │
│    (Reference Catalog)   │ trạng thái kiểm toán, phân loại ranh giới.  │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 3. Physical File Set     │ Tệp PDF, Audio, Video, Markdown gốc trên ổ  │
│    (Physical Storage)    │ cứng. KHÔNG nằm trong bất kỳ file JSON nào. │
└──────────────────────────┴─────────────────────────────────────────────┘
```

---

## 3. Mục Tiêu (Goals) & Non-Goals

### Mục Tiêu:
- **Module lõi thuần túy `backupVerification.ts`:**
  - `inspectSnapshotPayload(payload)`: Thẩm định cấu trúc snapshot, kiểm tra checksum SHA-256 và thống kê thực thể.
  - `inspectManifestPayload(payload)`: Thẩm định cấu trúc manifest, đếm số lượng tài liệu/ghi chú và phân loại trạng thái.
  - `calculateBackupReadiness(...)`: Tính toán báo cáo sẵn sàng cho cả 3 lớp dữ liệu (Snapshot, Manifest, Physical Files) với hành động khắc phục cụ thể.
  - `validateRestoreCandidate(payload)`: Kiểm tra tính hợp lệ của ứng viên khôi phục (hỗ trợ cả Snapshot v2.x và Legacy format).
  - `buildRestorePreview(payload)`: Xây dựng bản xem trước tác động khôi phục (entity counts, preview topics/notes) trong bộ nhớ.
  - `runRestoreDrill(payload, currentState)`: Chạy mô phỏng diễn tập khôi phục hoàn toàn in-memory, so sánh số liệu trước/sau mà KHÔNG làm thay đổi bất kỳ byte dữ liệu nào trong state thật.
- **Tích hợp Giao diện Diễn Tập An Toàn:**
  - Khu vực **"Kiểm Tra Độ Đầy Đủ Của Bộ Sao Lưu"** thể hiện trực quan 3 lớp.
  - Khu vực **"Diễn Tập Khôi Phục (Restore Drill)"** cho phép nạp tệp JSON, bấm "Chạy Diễn Tập", xem preview kết quả và thông điệp an toàn.

### Non-Goals:
- Không tự động ghi đè cơ sở dữ liệu hay LocalStorage khi chạy drill.
- Không tự động copy/di chuyển tệp vật lý.
- Không triển khai cloud sync hay network upload.

---

## 4. Ràng Buộc Kỹ Thuật & An Toàn (Safety Guardrails)

1. **Zero State Mutation during Drill:**
   - Hàm `runRestoreDrill` và các hàm thẩm định là Pure Functions.
   - Không gọi `localStorage.setItem`, không gửi API request ghi dữ liệu.
2. **Zero False Positives in Browser Sandbox:**
   - Trình duyệt không thể quét ổ cứng vật lý $\rightarrow$ Trạng thái `unverified` phải được giữ nguyên là `unverified`, không được báo thành `verified` giả tạo.
3. **Explicit Confirmation Gate:**
   - Mọi thao tác Import thật đều bắt buộc phải qua bước xem trước và xác nhận tường minh.
4. **Tương Thích Dữ Liệu Cũ (Legacy Compatibility):**
   - Hỗ trợ thẩm định và nạp các tệp snapshot cũ không có cấu trúc v2 hoặc thiếu trường metadata mới.

---

## 5. Blast Radius & Rollback Strategy

- **Files:**
  - `src/lib/backupVerification.ts` (Mới)
  - `src/components/modals/ExportImportModal.tsx` (Mở rộng)
- **Rollback:** Hoàn nguyên commit, không ảnh hưởng đến database schema hay cấu trúc dữ liệu đã lưu.
