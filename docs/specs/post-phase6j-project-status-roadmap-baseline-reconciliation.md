# SPECIFICATION: Post-Phase 6j — Project Status & Roadmap Baseline Reconciliation

## 1. Context & Executive Summary
Hệ thống sao lưu và kiểm toán diễn tập khôi phục 3 lớp (3-Layer Backup & Restore Drill Architecture) đã hoàn thành toàn bộ các micro-phases từ 6a đến 6i:
- **Phase 6a:** File Library & Backup Architecture for PDF / Notes (Pure Core Library).
- **Phase 6b:** Operational File Library Setup & Backup Readiness (Recommended Directory Guidance).
- **Phase 6c:** Resource Path Normalization & Guided Backup UX Hardening.
- **Phase 6d:** Note Source Path Consistency & Unified Reference Audit.
- **Phase 6e:** Backup Verification & In-Memory Restore Drill (`calculateBackupReadiness`, `runRestoreDrill`).
- **Phase 6f:** Restore Evidence Pack & Operator Runbook (`valid`, `legacy`, `malformed`, `manifest-mixed` & `RUNBOOK-BK-001`).
- **Phase 6g:** Operator Restore Drill Readiness & 4 Safety Gates (`evaluateRestoreDrillReadiness`).
- **Phase 6h:** Restore Drill Evidence Capture (`captureRestoreDrillEvidence` & `RestoreDrillEvidenceRecord` — Commit `4973acc`).
- **Phase 6i:** Restore Drill Evidence Serialization & Audit Validation (`serializeRestoreDrillEvidenceJSON`, `formatRestoreDrillEvidenceFilename`, `validateRestoreDrillEvidenceJSON` — Commit `5490ac4`).

**Phase 6j (Project Status & Roadmap Baseline Reconciliation)** thực hiện việc đồng bộ hóa tài liệu dự án (`docs/PROJECT_STATUS.md` và `docs/implementation-roadmap.md`) để:
1. Ghi nhận chính thức Phase 6h và Phase 6i cùng các commit SHA và năng lực kỹ thuật đã hoàn tất.
2. Cập nhật chỉ số kiểm thử baseline thực tế của repository lên **65 test files / 399 tests (100% GREEN)**.
3. Thay thế các chỉ số baseline cũ (63 test files / 379 tests) ở cuối tài liệu lộ trình.

---

## 2. Non-Goals (Ranh Giới Bất Biến)
1. **Không chỉnh sửa Source Code:** Không thay đổi bất kỳ tệp tin nào trong `src/` hoặc `server.ts`.
2. **Không Database / API / Storage Change:** Không thay đổi schema Prisma, REST API endpoints hay LocalStorage logic.
3. **Không tuyên bố hoàn thành sớm:** Không ghi nhận Phase 6j là "(ĐÃ HOÀN THÀNH)" khi chưa có human approval và chưa thực hiện cập nhật.
4. **Không Binary Ingestion:** Duy trì 100% nguyên tắc Zero Binary Ingestion trong toàn bộ tài liệu.

---

## 3. Reconciliation Contract & Required Doc Markers

### 3.1 `docs/PROJECT_STATUS.md`
Phải bổ sung 2 khối tóm tắt micro-increment mới nhất:
- **Post-Phase 6i Micro-Increment: Restore Drill Evidence Serialization & Audit Validation:**
  - Commit reference: `5490ac4`
  - Helpers: `serializeRestoreDrillEvidenceJSON`, `formatRestoreDrillEvidenceFilename`, `validateRestoreDrillEvidenceJSON`.
  - Test count: 9/9 tests PASS (`restore-drill-evidence-serialization.test.ts`).
- **Post-Phase 6h Micro-Increment: Restore Drill Evidence Capture:**
  - Commit reference: `4973acc`
  - Helpers: `captureRestoreDrillEvidence`, `RestoreDrillEvidenceRecord`, `RestoreDrillEvidenceCaptureOptions`.
  - Test count: 11/11 tests PASS (`restore-drill-evidence-capture.test.ts`).

### 3.2 `docs/implementation-roadmap.md`
- Bổ sung khối Phase 6h và Phase 6i vào danh mục các phase đã hoàn thành.
- Cập nhật mục `BẢNG TỔNG KẾT HỆ THỐNG (SYSTEM BASELINE)` ở cuối file:
  - `- **Toàn bộ Test Suite:** ✅ **65 / 65 test files PASS — 399 / 399 tests PASS (100% GREEN)**.`

---

## 4. Acceptance Criteria
1. Có tài liệu đặc tả `docs/specs/post-phase6j-project-status-roadmap-baseline-reconciliation.md`.
2. Có kịch bản hành vi Gherkin `docs/gherkin/post-phase6j-project-status-roadmap-baseline-reconciliation.feature`.
3. Có bộ unit test contract `tests/unit/project-status-roadmap-baseline.test.ts` kiểm tra 10 tiêu chuẩn đồng bộ tài liệu.
4. Đạt trạng thái test RED trước khi thực hiện cập nhật tài liệu.
