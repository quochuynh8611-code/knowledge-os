# SPECIFICATION: Post-Phase 6i — Restore Drill Evidence Serialization & Audit Validation

## 1. Context & Executive Summary
Tiếp nối sự thành công của Phase 6h (**Restore Drill Evidence Capture**), hệ thống đã có cấu trúc dữ liệu chuẩn mực cho Bản Ghi Bằng Chứng Diễn Tập Khôi Phục (`RestoreDrillEvidenceRecord`).

**Phase 6i (Restore Drill Evidence Serialization & Audit Validation)** mở rộng năng lực này bằng cách cung cấp các helper thuần túy (Pure Helpers) để:
1. **Tuần tự hóa (Serialization):** Xuất bản ghi bằng chứng thành chuỗi JSON chuẩn hóa, tất định, dễ đọc (formatted JSON).
2. **Quy ước Đặt tên Tệp An Toàn (Safe Filename Policy):** Sinh tên tệp xuất có cấu trúc ngày giờ và ID, tích hợp cơ chế chống tấn công vượt thư mục (Path Traversal Protection).
3. **Thẩm Định Kiểm Toán Độc Lập (Audit Validation):** Cho phép kiểm toán viên hoặc người vận hành nạp lại các tệp bằng chứng JSON cũ để thẩm định tính hợp lệ và cấu trúc mà không làm biến đổi bất kỳ dữ liệu thật nào.

---

## 2. Non-Goals (Ranh Giới Bất Biến)
1. **Không Live Restore Trigger:** Tệp Evidence JSON chỉ phục vụ lưu vết và kiểm toán đối chiếu, tuyệt đối không thể nạp nhầm làm tệp khôi phục Snapshot để ghi đè database.
2. **Không Binary Ingestion:** Tuyệt đối không lưu dữ liệu nhị phân (PDF, Audio, Video) bên trong tệp Evidence JSON.
3. **Không Database / API Persistence:** Không tạo endpoint REST API mới, không gọi Prisma client hay LocalStorage trong helper.
4. **Không Filesystem Write:** Helper chỉ trả về chuỗi JSON và tên tệp chuẩn hóa; việc lưu tệp do người vận hành hoặc trình duyệt tải về xử lý.

---

## 3. Technical Contract & Helper Schemas

### 3.1 Serialization: `serializeRestoreDrillEvidenceJSON`
Chuyển đổi một `RestoreDrillEvidenceRecord` thành chuỗi JSON chuẩn hóa:

```typescript
export interface SerializeEvidenceOptions {
  pretty?: boolean; // Mặc định true (2 spaces indent)
}

export function serializeRestoreDrillEvidenceJSON(
  evidence: RestoreDrillEvidenceRecord,
  options: SerializeEvidenceOptions = { pretty: true }
): string;
```

- **Quy tắc tất định:** Đảm bảo thứ tự các khóa JSON cố định và đồng nhất giữa các lần xuất.

### 3.2 Filename Formatting: `formatRestoreDrillEvidenceFilename`
Sinh tên tệp xuất an toàn và ngăn chặn hoàn toàn tấn công Path Traversal:

```typescript
export function formatRestoreDrillEvidenceFilename(
  evidence: RestoreDrillEvidenceRecord
): string;
```

- **Định dạng chuẩn:** `knowledge-os-restore-drill-evidence-YYYY-MM-DD-<safeId>.json`
- **Path Traversal Guard:** Loại bỏ hoặc thay thế tất cả các ký tự nguy hiểm như `..`, `/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|` bằng dấu gạch ngang `-`.

### 3.3 Audit Validation: `validateRestoreDrillEvidenceJSON`
Thẩm định tính hợp lệ của chuỗi JSON hoặc đối tượng bằng chứng:

```typescript
export interface EvidenceValidationResult {
  valid: boolean;
  evidence?: RestoreDrillEvidenceRecord;
  error?: string;
}

export function validateRestoreDrillEvidenceJSON(
  rawInput: unknown
): EvidenceValidationResult;
```

- **Quy tắc kiểm tra:**
  - Kiểm tra đầy đủ 10 trường bắt buộc: `evidenceId`, `snapshotFormat`, `validationStatus`, `dryRunStatus`, `simulatedMode`, `simulatedImpact` (5 chỉ số delta), `gateSummary` (4 cờ boolean), `timestamp` (ISO 8601 hợp lệ), `operatorSignOffStatus`.
  - Tự động bắt lỗi nếu chuỗi JSON không parse được (malformed JSON syntax).
  - Trả về bản sao độc lập (Deep Copy) để đảm bảo không chia sẻ mutable reference.

---

## 4. Policy & Security Enforcements

| Chính Sách | Cơ Chế Thực Thi Của Phase 6i |
| :--- | :--- |
| **Deterministic Serialization** | Định dạng JSON xuất đồng nhất, có thể so khớp checksum hoặc diff dễ dàng. |
| **Path Traversal Protection** | Tên file được sanitize nghiêm ngặt, loại bỏ hoàn toàn nguy cơ ghi tệp ngoài thư mục dự kiến. |
| **Safe Error Handling** | Mọi chuỗi JSON hỏng hoặc sai schema đều trả về `{ valid: false, error: '...' }` an toàn, không throw unhandled exception. |
| **Deep Reference Isolation** | Kết quả thẩm định thành công trả về object mới, ngăn chặn mutation liên đới. |
| **Zero Binary / Zero DB** | Thuần túy tính toán chuỗi trên RAM, 100% không phụ thuộc database hay storage API. |

---

## 5. Acceptance Criteria
1. Có tài liệu đặc tả `docs/specs/post-phase6i-restore-drill-evidence-serialization-audit-validation.md`.
2. Có kịch bản hành vi Gherkin `docs/gherkin/post-phase6i-restore-drill-evidence-serialization-audit-validation.feature`.
3. Có bộ unit test `tests/unit/restore-drill-evidence-serialization.test.ts` kiểm chứng toàn diện 11 yêu cầu kỹ thuật.
4. Đạt trạng thái test RED trước khi chuyển sang bước triển khai mã nguồn sản phẩm.
