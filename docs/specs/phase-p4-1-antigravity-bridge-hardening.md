# Technical Specification: Phase P4.1 — Antigravity & NotebookLM Bridge Hardening

## 1. Problem Statement & Motivation
Hệ thống Knowledge OS sở hữu cơ chế kết nối tri thức hai chiều với **Antigravity 2.0 (Headless Agent CLI)** và **NotebookLM Studio Modal**:
- **Chiều xuất (Outbound Handoff)**: Đóng gói tài liệu nguồn 6 phần (`*-source.md`), sinh chỉ thị khảo cứu (`*-prompt.md`), tạo tệp manifest (`*-manifest.json`) và sinh câu lệnh `agy -p`.
- **Chiều nhập (Inbound Absorption)**: Nhận kết quả từ Antigravity/NotebookLM (`*-result.md`), nạp lại vào Topic/Note và tự động đánh dấu hoàn tất Job (`completeMatchingHandoffJob`).

**Các điểm yếu & khoảng trống kỹ thuật cần củng cố (Gaps & Vulnerabilities)**:
1. **Lưu trữ Unbounded & Chưa dùng Safe Storage Helper**: `antigravityPipeline.ts` đang gọi trực tiếp `localStorage.getItem / setItem` thay vì dùng `safeGetLocalStorageItem / safeSetLocalStorageItem`, và chưa có giới hạn rolling buffer (dễ làm phình storage).
2. **Thiếu Schema Validation cho Manifest**: Chưa có schema Zod / pure validator để kiểm tra tính toàn vẹn của `*-manifest.json` khi agent đọc/ghi liên tiến trình.
3. **Thiếu Runbook & Quy chuẩn Headless Agent Execution**: Chưa có cẩm nang hướng dẫn Antigravity Agent cách đọc manifest từ thư mục `.agents/handoffs/`, thực thi prompt và ghi file kết quả đúng hợp đồng.

Phase P4.1 củng cố toàn bộ cầu nối này nhằm đạt tính **ổn định cao, chuẩn hóa liên tiến trình và zero blast radius vào các phân hệ khác**.

---

## 2. Architecture & Data Flow

```
  ┌────────────────────────────────────────────────────────┐
  │                   KNOWLEDGE OS (UI)                    │
  │  1. User selects Topic & Artifact Type                 │
  │  2. createAntigravityHandoffJob() generates:           │
  │     - .agents/handoffs/{jobId}-source.md               │
  │     - .agents/handoffs/{jobId}-prompt.md               │
  │     - .agents/handoffs/{jobId}-manifest.json           │
  │  3. Displays CLI Command: agy -p "..."                 │
  │  4. Tracks Job state in safe rolling storage (max 50)  │
  └───────────────────────────┬────────────────────────────┘
                              │
                    Operator / CLI Execution
                        (agy -p "...")
                              │
  ┌───────────────────────────▼────────────────────────────┐
  │                 ANTIGRAVITY 2.0 AGENT                  │
  │  5. Reads Manifest Schema (Validated JSON)             │
  │  6. Ingests source.md & executes prompt.md             │
  │  7. Writes Output: .agents/handoffs/{jobId}-result.md  │
  └───────────────────────────┬────────────────────────────┘
                              │
                    Result Import / Absorption
                              │
  ┌───────────────────────────▼────────────────────────────┐
  │                   KNOWLEDGE OS (UI)                    │
  │  8. User imports result.md into Topic Note/Resource    │
  │  9. completeMatchingHandoffJob() marks status='success'│
  └────────────────────────────────────────────────────────┘
```

---

## 3. Core Invariants & Security Boundaries

1. **Zero Binary Ingestion (Chỉ Văn Bản)**:
   - Toàn bộ source pack và handoff package chỉ chứa Markdown / JSON thuần túy, tuyệt đối không nhúng binary file.
2. **Rolling Buffer cho UI Tracker Storage**:
   - `phat_hoc_antigravity_handoff_jobs_v1` duy trì tối đa **50 jobs gần nhất**, tự động cắt gọt các jobs cũ để bảo vệ hạn mức `localStorage`.
3. **Safe Storage I/O**:
   - Sử dụng `safeGetLocalStorageItem` và `safeSetLocalStorageItem` để chống uncaught exceptions.
4. **Idempotent Job Completion**:
   - `completeMatchingHandoffJob` chỉ chuyển trạng thái Job thành `success` nếu tìm thấy job khớp `jobId` hoặc khớp `topicId` ở trạng thái chờ (`queued`/`processing`), không ghi đè job đã hoàn tất.

---

## 4. Reversibility & Blast Radius Analysis

- **Reversibility**: 100% Reversible (Two-Way Door).
- **Blast Radius**: Rất thấp (Chỉ giới hạn trong `src/lib/antigravityPipeline.ts`, `docs/specs/*`, `docs/runbooks/*`).
- **Tách biệt hoàn toàn với Sync Subsystem**: Không chạm vào `src/lib/syncQueue.ts`, `src/services/syncQueue.ts` hay `src/lib/syncTelemetry.ts`.

---

## 5. File Changes Matrix (Đề Xuất Cho Phase P4.1)

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `docs/specs/phase-p4-1-antigravity-bridge-hardening.md` | **NEW** | Bản đặc tả kỹ thuật Phase P4.1 này. |
| `docs/adr/ADR-042-antigravity-bridge-hardening.md` | **NEW** | Quyết định kiến trúc củng cố cầu nối Antigravity & NotebookLM. |
| `docs/gherkin/phase-p4-1-antigravity-bridge-hardening.feature` | **NEW** | Kịch bản kiểm thử BDD cho quy trình Handoff & Validation. |
| `docs/runbooks/antigravity-notebooklm-bridge-runbook.md` | **NEW** | Cẩm nang vận hành và hướng dẫn Agent thực thi headless job. |
| `src/lib/antigravityPipeline.ts` | **MODIFY** | Thay thế bằng `safeStorage`, áp dụng rolling buffer 50 jobs, bổ sung schema validator. |
| `tests/unit/antigravity-pipeline-hardening.test.ts` | **NEW** | Unit test kiểm chứng rolling buffer, safe storage và manifest validation. |
