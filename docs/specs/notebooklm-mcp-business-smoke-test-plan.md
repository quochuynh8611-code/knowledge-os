# Kế Hoạch Kiểm Thử: NotebookLM MCP Business Operations Smoke Test (Phase 4)

- **Spec tham chiếu:** [`docs/specs/notebooklm-mcp-business-smoke-spec.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/notebooklm-mcp-business-smoke-spec.md)
- **ADR tham chiếu:** [`docs/adr/ADR-103-notebooklm-mcp-handshake-lifecycle.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/adr/ADR-103-notebooklm-mcp-handshake-lifecycle.md)
- **Khu vực kỹ thuật:** Stdio MCP Transport, NotebookLMMcpClient, Cloud Sandbox Verification
- **Trạng thái:** Proposed / Awaiting Human Approval

---

## 1. Phân Tầng Kiểm Thử (Test Tiers)

Để kiểm soát rủi ro và giới hạn bán kính ảnh hưởng (blast radius), kế hoạch kiểm thử được phân định thành 3 tầng độc lập:

```text
┌──────────────────────────────────────────────────────────────┐
│  Tier 0 (T0): Read-Only Discovery & Readiness Probe           │
│  - Không ghi dữ liệu, không tạo workspace, an toàn tuyệt đối  │
└──────────────────────────────┬───────────────────────────────┘
                               │ (Human Approval Bắt Buộc)
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  Tier 1 (T1): Controlled Live Smoke (CRUD + Query)           │
│  - Tạo 1 workspace có tiền tố [SMOKE-TEST]                   │
│  - Ingest 1 source inline text                                │
│  - Query kiểm tra câu trả lời có trích dẫn                   │
│  - Reconcile kiểm tra CONFIRMED_PRESENT                       │
│  - Xóa 100% trong khối finally, kiểm tra CONFIRMED_ABSENT    │
└──────────────────────────────┬───────────────────────────────┘
                               │ (Human Approval Bắt Buộc)
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  Tier 2 (T2): Optional Async Audio Generation (Blocked)      │
│  - Tạo Audio Overview và poll status                          │
│  - Hiện tại xếp Optional do thiếu context notebook_id         │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Ma Trận Kiểm Thử Nghiệp Vụ (Business Operations Test Matrix)

| Test ID | Tầng (Tier) | Điều Kiện Tiên Quyết (Precondition) | Thao Tác (Action) | Kết Quả Kỳ Vọng (Expected Result) | Tác Động Cloud (Side Effect) | Bằng Chứng Thu Thập (Evidence) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SMK-01** | **T0** | Binary `/Users/mr.chem/.local/bin/notebooklm-mcp` tồn tại | Khởi chạy handshake `initialize` và `notifications/initialized` | Server chấp nhận handshake, trả về version `3.4.0` | Không có | JSON response `initialize` (id: 1) |
| **SMK-02** | **T0** | Đã hoàn tất handshake SMK-01 | Gửi request `tools/list` | Danh sách trả về chứa đủ 8 công cụ cốt lõi | Không có | Danh sách tên tool và input schemas |
| **SMK-03** | **T0** | Đã hoàn tất handshake SMK-01 | Gửi `tools/call: server_info` | `status: "success"` và `auth_status: "configured"` | Không có | Output `server_info` sạch (latency ~2.5s) |
| **SMK-04** | **T1** | SMK-03 ĐẠT; Human Approval cấp cờ `--live-sandbox` | Gọi `createWorkspace` với title `[SMOKE-TEST] Verification` | Nhận được `workspaceId` dạng UUID hợp lệ (không phải ID ngụy tạo) | Tạo 1 notebook tạm thời | `workspaceId` UUID, log thời gian tạo |
| **SMK-05** | **T1** | SMK-04 ĐẠT; `workspaceId` còn hiệu lực | Gọi `ingestSources` với 1 văn bản inline text ngắn | Nhận được `remoteSourceIds` (UUID thật từ Cloud) và `status: "COMPLETED"` | 1 source được đính kèm vào notebook | Mảng `source_id`, trạng thái ingest |
| **SMK-06** | **T1** | SMK-05 ĐẠT; source đã sẵn sàng | Gọi `query` với câu hỏi trắc nghiệm nội dung vừa nạp | Nhận được `answer` có ý nghĩa và `citedSourceIds` chứa ID của source | Tiêu tốn 1 lượt prompt inference | Đoạn trích dẫn câu trả lời, latency query |
| **SMK-07** | **T1** | SMK-05 & SMK-06 ĐẠT | Gọi `reconcileWorkspace` với `expectedSources` | Trả về chính xác enum `"CONFIRMED_PRESENT"` | Không có | Kết quả enum reconciliation |
| **SMK-08** | **T1** | SMK-04 ĐẠT (kích hoạt trong khối `finally`) | Gọi `deleteWorkspace` với `workspaceId` và `confirm: true` | Lệnh xóa thành công (status không phải failed) | Notebook tạm thời bị xóa vĩnh viễn | Log xác nhận xóa thành công |
| **SMK-09** | **T1** | SMK-08 ĐẠT | Gọi lại `reconcileWorkspace` trên `workspaceId` vừa xóa | Trả về chính xác enum `"CONFIRMED_ABSENT"` | Không có | Kết quả enum xác nhận không còn tồn tại |
| **SMK-10** | **T1** | SMK-04 ĐẠT; Cố tình giả lập lỗi ở bước Ingest hoặc Query | Kiểm tra khối `try ... finally` của probe runner | Khối cleanup kích hoạt tự động, `notebook_delete` được gửi đi, không sót orphan | Notebook được dọn dẹp sạch sẽ | Log dọn dẹp khẩn cấp trong `finally` |
| **SMK-11** | **T2** | SMK-05 ĐẠT; Human Approval cấp cờ `--with-audio` | Gọi `studio_create` với `confirm: true` | Nhận được `operationId` hợp lệ | Bắt đầu tác vụ sinh audio trên Cloud | ID của artifact âm thanh |
| **SMK-12** | **T2** | SMK-11 ĐẠT | Gọi `studio_status` kèm `notebook_id` và `artifact_id` | Trả về trạng thái tiến trình `isDone: boolean` | Không có | Status string từ server |

---

## 3. Operator Preflight Checklist

Trước khi thực thi bất kỳ kiểm thử nào liên quan đến T1 (Live Smoke), người vận hành **bắt buộc** phải tích xác nhận các điểm sau:

- [ ] **Preflight 1 (Binary):** Xác nhận binary tồn tại và có quyền thực thi:
  ```bash
  test -x /Users/mr.chem/.local/bin/notebooklm-mcp && echo "BINARY_OK"
  ```
- [ ] **Preflight 2 (Auth Status):** Chạy T0 probe để khẳng định token xác thực Google không bị hết hạn (`auth_status === "configured"`). Nếu là `"stale"` hoặc `"not_configured"`, phải chạy `nlm login` trước.
- [ ] **Preflight 3 (Safety Flags):** Xác nhận các cờ an toàn trong môi trường:
  - `NOTEBOOKLM_SANDBOX_PERMITTED=true`
  - Không chạy trên tài khoản Google dùng chung sản xuất.
- [ ] **Preflight 4 (Orphan Sweeper Ready):** Đảm bảo cơ chế xóa notebook thừa đã sẵn sàng xử lý nếu có sự cố ngắt kết nối.
- [ ] **Preflight 5 (Approval):** Đã nhận được **Human Approval** bằng văn bản từ chủ sở hữu hệ thống.

---

## 4. Chính Sách Xử Lý Bằng Chứng (Evidence Redaction Policy)

Mọi log output, file evidence (`.json` / `.txt`), hay console report phát sinh từ smoke test đều phải tuân thủ quy tắc khử dữ liệu nhạy cảm:

1. **Khử Token & Secret:**
   - Thay thế toàn bộ chuỗi khớp mẫu `Bearer ya29\.[a-zA-Z0-9_\-]+` bằng `Bearer [REDACTED_OAUTH]`.
   - Thay thế toàn bộ chuỗi khớp mẫu `AIzaSy[a-zA-Z0-9_\-]{33}` bằng `[REDACTED_API_KEY]`.
   - Thay thế toàn bộ chuỗi cookie Google (`SID`, `HSID`, `SSID`, `OSID`) bằng `[REDACTED_COOKIE]`.
2. **Không In Raw Payloads Lớn:**
   - Chỉ ghi nhận: UUID của workspace/source, tiêu đề, độ dài ký tự của câu trả lời, latency (ms), và HTTP/RPC status codes.
3. **Lưu trữ Evidence:**
   - Evidence được xuất vào thư mục tạm được gitignore: `docs/session-logs/evidence/` hoặc console stdout có lọc.

---

## 5. Quy Trình Dọn Dẹp & Phục Hồi (Cleanup & Recovery Checklist)

### 5.1. Dọn dẹp Bình thường (Standard Cleanup)
- [ ] Sau khi query thành công, khối `finally` tự động gọi:
  ```typescript
  await client.deleteWorkspace({ workspaceId });
  ```
- [ ] Gọi `reconcileWorkspace` để xác nhận kết quả là `"CONFIRMED_ABSENT"`.

### 5.2. Phục hồi Khẩn cấp khi Quá trình Bị Ngắt (Emergency Cleanup)
Nếu smoke test bị dừng đột ngột (ví dụ người dùng bấm `Ctrl+C` hoặc máy bị sập mạng):
1. Chạy lệnh sweeper dọn dẹp riêng:
   ```bash
   npx tsx scripts/smoke/notebooklm-mcp-smoke.ts --cleanup-only
   ```
2. Sweeper sẽ:
   - Liệt kê toàn bộ notebook qua công cụ `notebook_list`.
   - Tìm tất cả notebook có tiêu đề bắt đầu bằng `[SMOKE-TEST]`.
   - Gửi yêu cầu `notebook_delete` với `confirm: true` cho từng notebook tìm thấy.
   - Báo cáo số lượng workspace đã giải phóng.

---

## 6. Tiêu Chí Đỏ / Xanh (Red / Green Criteria)

### A. Tiêu Chí Đỏ (Failing Criteria)
Hệ thống bị đánh giá **FAIL (ĐỎ)** nếu xảy ra bất kỳ điều kiện nào sau đây:
- Handshake `initialize` bị timeout (> 10s) hoặc server trả về mã lỗi JSON-RPC.
- `server_info` trả về `auth_status !== "configured"`.
- `createWorkspace` trả về ID rỗng, hoặc client tự sinh ID giả lập.
- `source_add` thất bại hoặc không lập chỉ mục được văn bản mẫu.
- `notebook_query` không trả về câu trả lời hoặc không trích dẫn được nguồn vừa nạp.
- `deleteWorkspace` thất bại, để lại notebook thừa trên Cloud.
- Phát hiện bất kỳ secret (token, key, cookie) nào chưa được lọc trong log output.

### B. Tiêu Chí Xanh (Passing Criteria)
Hệ thống đạt **PASS (XANH)** khi và chỉ khi:
- 100% các bước SMK-01 đến SMK-09 hoàn tất không có ngoại lệ.
- Workspace được tạo và xóa sạch sẽ, `reconcileWorkspace` cuối cùng trả về `"CONFIRMED_ABSENT"`.
- Toàn bộ thời gian chạy T1 nằm trong giới hạn cho phép (< 120s).
- Không có bất kỳ cảnh báo rò rỉ bảo mật nào.

---

## 7. Ánh Xạ Kịch Bản (Gherkin to Test Implementation Mapping)

| Kịch Bản Gherkin trong Spec | Tầng Kiểm Thử | Tệp Kiểm Thử Tương Ứng | Cơ Chế Kiểm Chứng |
| :--- | :--- | :--- | :--- |
| **Scenario 1:** Handshake + tools/list + server_info | **T0** | `tests/unit/notebooklm-mcp-client.test.ts` (Test 18) & Smoke Probe CLI | Unit test với FakeChild + Smoke probe kiểm tra binary thật |
| **Scenario 2:** Create -> Ingest -> Query -> Reconcile -> Delete | **T1** | `tests/unit/notebooklm-mcp-smoke-runner.test.ts` & Live Probe | Fake transport test trước, sau đó chạy live với approval |
| **Scenario 3:** Cleanup on partial failure | **T1** | `tests/unit/notebooklm-mcp-smoke-runner.test.ts` | Mô phỏng crash/reject ở bước Ingest, kiểm chứng khối `finally` gọi `notebook_delete` |
| **Scenario 4:** Auth/Config failure | **T0** | `tests/unit/notebooklm-mcp-client.test.ts` (Test 19) | Test transport từ chối khởi tạo khi server báo lỗi |
| **Scenario 5:** Malformed response (no fake IDs) | **T1** | Unit contract tests | Kiểm tra client ném `MALFORMED_RESPONSE` thay vì fallback sinh ID ngẫu nhiên |
| **Scenario 6:** Optional Audio Overview | **T2** | Deferred / Manual test | Chỉ kiểm tra sau khi cập nhật client hỗ trợ `notebook_id` cho `studio_status` |

---

## 8. Lệnh CLI Dự Kiến Cho Các Tầng (Chưa Thực Thi Destructive)

Các lệnh sau được thiết kế cho probe runner trong Phase 4 (chưa thực thi tại bước này):

```bash
# 1. Chạy Tier 0: Khảo sát tĩnh và kiểm tra readiness (Read-Only, an toàn tuyệt đối)
npx tsx scripts/smoke/notebooklm-mcp-smoke.ts --tier0

# 2. Chế độ Dry-Run: Kiểm tra cấu hình và fake execution không tác động Cloud
npx tsx scripts/smoke/notebooklm-mcp-smoke.ts --dry-run

# 3. Chạy Tier 1: Live Smoke Test có kiểm soát (Yêu cầu Human Approval)
# npx tsx scripts/smoke/notebooklm-mcp-smoke.ts --tier1 --live-sandbox

# 4. Lệnh cứu hộ: Quét và xóa toàn bộ orphan notebooks có tiền tố [SMOKE-TEST]
# npx tsx scripts/smoke/notebooklm-mcp-smoke.ts --cleanup-only
```

---

## 9. Điều Kiện Bắt Buộc Trước Khi Được Phép Chạy Tier 1 (Live Operations)

Tuyệt đối **KHÔNG ĐƯỢC CHẠY TIER 1** nếu chưa thỏa mãn 3 điều kiện:
1. File Đặc Tả (`docs/specs/notebooklm-mcp-business-smoke-spec.md`) và Test Plan này đã được người dùng phê duyệt hoàn toàn.
2. Bộ unit test cho smoke runner (`tests/unit/notebooklm-mcp-smoke-runner.test.ts`) đã được viết theo chuẩn Test-First và đạt 100% PASS trên fake transport.
3. Người dùng cấp lệnh xác nhận trực tiếp trong chat cho phép gọi live network operation tới NotebookLM Cloud.
