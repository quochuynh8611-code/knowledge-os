# SPECIFICATION: Post-Phase 6h — Restore Drill Evidence Capture

## 1. Context & Executive Summary
Tiếp nối thành công của Phase 6g (**Operator Restore Drill Readiness**), hệ thống đã chuẩn hóa 5 giai đoạn trong hành trình diễn tập của người vận hành (Operator Journey) cùng 4 rào chắn an toàn (Gate 1 Checksum & Schema, Gate 2 In-Memory Dry Run, Gate 3 Confirmation Gate, Gate 4 Rehydration State Preserving).

**Phase 6h (Restore Drill Evidence Capture)** thiết lập hợp đồng kỹ thuật chuẩn mực (Technical Contract) cho việc trích xuất và đóng gói **Bản Ghi Bằng Chứng Diễn Tập Khôi Phục (`RestoreDrillEvidenceRecord`)** từ kết quả của `evaluateRestoreDrillReadiness` / `OperatorDrillReadinessReport`.

Bản ghi bằng chứng này được sử dụng thuần túy cho mục đích kiểm toán (audit), lưu vết diễn tập mô phỏng (dry-run record), và ký xác nhận vận hành (operator sign-off). Bản ghi này **hoàn toàn cách ly** khỏi database, API và không bao giờ tự động kích hoạt live restore.

---

## 2. Non-Goals (Ranh Giới Không Thực Hiện)
1. **Không thực hiện Live Restore:** Không ghi đè hoặc thay đổi dữ liệu thật trong cơ sở dữ liệu hoặc LocalStorage.
2. **Không Database/API Persistence:** Không tạo endpoint REST API mới hay bảng Prisma mới để lưu evidence record.
3. **Không Binary Ingestion:** Không lưu trữ tệp nhị phân (PDF, âm thanh, hình ảnh) bên trong evidence record.
4. **Không Auto-Dispatch / Cloud Sync:** Không tự động gửi bản ghi bằng chứng lên đám mây hoặc qua webhook.

---

## 3. Technical Contract & Evidence Schema

### 3.1 Input Contract
Hàm `captureRestoreDrillEvidence` nhận đầu vào là một `OperatorDrillReadinessReport` (kết quả từ `evaluateRestoreDrillReadiness`) kèm các tùy chọn cấu hình ký duyệt tùy chọn (`RestoreDrillEvidenceCaptureOptions`):

```typescript
export interface RestoreDrillEvidenceCaptureOptions {
  evidenceId?: string;
  operatorSignOffStatus?: 'pending' | 'signed_off' | 'rejected';
  operatorNotes?: string;
  timestamp?: string;
}
```

### 3.2 Output Contract: `RestoreDrillEvidenceRecord`
Bản ghi bằng chứng được chuẩn hóa chứa đầy đủ 10 trường thông tin thiết yếu:

```typescript
export interface RestoreDrillEvidenceRecord {
  evidenceId: string;
  snapshotChecksum?: string;
  snapshotFormat: 'snapshot_v2' | 'legacy_json' | 'unknown';
  validationStatus: 'valid' | 'invalid';
  dryRunStatus: 'simulated_success' | 'simulated_failed';
  simulatedMode: 'merge' | 'replace';
  simulatedImpact: {
    categoriesDelta: number;
    topicsDelta: number;
    notesDelta: number;
    resourcesDelta: number;
    tagsDelta: number;
  };
  gateSummary: {
    gate1Passed: boolean;
    gate2Passed: boolean;
    gate3Required: boolean;
    overallDrillReady: boolean;
  };
  timestamp: string;
  operatorSignOffStatus: 'pending' | 'signed_off' | 'rejected';
  operatorNotes?: string;
}
```

---

## 4. Safety Gates & Policy Enforcements

| Khía Cạnh Chính Sách | Quy Tắc Thực Thi Của Evidence Capture |
| :--- | :--- |
| **Gate 1 (Validation Summary)** | Phản ánh chính xác `gate1Validation.passed`, `checksumMatch` và `format` từ readiness report. |
| **Gate 2 (Dry-Run Simulation)** | Phản ánh `gate2DryRun.isDryRun: true` và `drillSuccess`, bảo toàn tuyệt đối số lượng biến động delta. |
| **Gate 3 (Confirmation Flag)** | Đánh dấu `gate3Required: true` khi chế độ mô phỏng là `replace` (yêu cầu gõ cụm từ xác nhận). |
| **Immutability Requirement** | Hàm `captureRestoreDrillEvidence` là pure function, tạo đối tượng mới độc lập, không làm thay đổi report gốc hay live state và không chia sẻ mutable nested reference. |
| **Timestamp Priority Policy** | Thứ tự ưu tiên: (1) `options.timestamp` -> (2) `readinessReport.evidenceRecord.timestamp` -> (3) Fallback `new Date().toISOString()`. |
| **Evidence Identifier Policy** | Nếu caller cung cấp `options.evidenceId`, sử dụng trực tiếp (hỗ trợ deterministic replay / audit log). Nếu không cung cấp, sinh tự động theo định dạng runtime `drill-ev-<timestamp>-<hash>`. |
| **Invalid Payload Policy** | Khi readiness report biểu thị thất bại (Gate 1 hoặc Gate 2 fail), `validationStatus` là `'invalid'`, `dryRunStatus` là `'simulated_failed'`, `overallDrillReady` là `false` mà không làm crash tiến trình. |

---

## 5. Security & Blast Radius Assessment

- **Blast Radius: Zero.** Chỉ bổ sung pure types và pure helper functions trong `src/lib/backupVerification.ts`.
- Không có bất kỳ import nào từ database, Prisma client, hay axios/fetch trong evidence capture helper.
- Bản ghi bằng chứng có thể xuất dưới dạng JSON độc lập để người vận hành đính kèm vào báo cáo kiểm toán định kỳ.

---

## 6. Acceptance Criteria (Tiêu Chí Nghiệm Thu Phase 6h)
1. Có tài liệu đặc tả `docs/specs/post-phase6h-restore-drill-evidence-capture.md`.
2. Có kịch bản hành vi Gherkin `docs/gherkin/post-phase6h-restore-drill-evidence-capture.feature`.
3. Có bộ unit test `tests/unit/restore-drill-evidence-capture.test.ts` kiểm chứng toàn diện 12 yêu cầu kỹ thuật.
4. Đạt trạng thái test RED trước khi được phê duyệt triển khai mã nguồn sản phẩm.
