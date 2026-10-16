# Đặc Tả Kiến Trúc & Khảo Sát Nguồn Chân Lý: NotebookLM Verified Runtime Status (Phase F8.4)

- **Trạng thái:** Proposed / Awaiting Human Approval
- **Khu vực kỹ thuật:** Frontend Integration / NotebookLM Research Hub UI / Runtime Diagnostics Contract
- **Tài liệu tham chiếu:**
  - [`docs/specs/phase-f8-3-notebooklm-runtime-status-parent-wiring.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/phase-f8-3-notebooklm-runtime-status-parent-wiring.md)
  - [`src/components/integrations/notebooklm/runtimeBridgeConfig.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/integrations/notebooklm/runtimeBridgeConfig.ts)
  - [`src/components/integrations/notebooklm/NotebookLMHeader.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/integrations/notebooklm/NotebookLMHeader.tsx)
  - [`src/server/services/providers/notebooklmMcpClient.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/server/services/providers/notebooklmMcpClient.ts)
  - [`src/server/routes/researchSessionRoutes.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/server/routes/researchSessionRoutes.ts)
  - [`docs/specs/notebooklm-mcp-business-smoke-spec.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/notebooklm-mcp-business-smoke-spec.md)

---

## 1. Problem Statement (Bài toán Đặt ra)

Tại Phase F8.2 và F8.3, repository đã thiết lập thành công:
1. Contract trình bày giao diện: `NotebookLMRuntimeStatus = 'unknown' | 'configured' | 'verified' | 'blocked'`.
2. Badge trên Header: `'unknown'` $\rightarrow$ `Chưa kiểm tra`, `'configured'` $\rightarrow$ `Đã cấu hình`, `'verified'` $\rightarrow$ `Smoke đã xác minh`, `'blocked'` $\rightarrow$ `Audio Overview: Chưa khả dụng`.
3. Single source of truth helper `resolveDefaultRuntimeStatus` tại `runtimeBridgeConfig.ts` nối xuống cả 3 container cha (`App.tsx`, `Navbar.tsx`, `TopicDetail.tsx`) biểu đạt trung thực trạng thái `'configured'`.

Tuy nhiên, giá trị `'verified'` (`Smoke đã xác minh`) hiện vẫn chỉ là một seam trình bày, chưa có nguồn chân lý (Source of Truth) tại tầng client:
- Backend MCP adapter đã chạy Tier 0 và Tier 1 Live Smoke Test PASS trong môi trường Node.js CLI, ghi nhận bằng chứng tại `docs/session-logs/evidence/t1-live-smoke.json`.
- Browser client **tuyệt đối không được phép đọc file evidence dev** và **không được phép tự tiện gọi live network/shell** để suy diễn rằng runtime đã được "verified".
- Câu hỏi kiến trúc cốt lõi là: *Nếu muốn UI phản ánh `verified` một cách trung thực (truthful), không ngụy tạo, không rò rỉ secret và không tạo side-effect bừa bãi, nguồn dữ liệu nào khả thi và có thực sự cần thiết đối với người dùng cuối hay không?*

---

## 2. Current State After F8.3 (Hiện trạng sau F8.3)

1. **Client-side Presentation Boundary:**
   - 3 container cha (`App`, `Navbar`, `TopicDetail`) đều truyền `resolveDefaultRuntimeStatus({ isConfigured: true })`.
   - UI hiển thị nhất quán badge màu xanh dương: `Đã cấu hình` (`configured`).
   - Modal hoạt động hoàn toàn ở chế độ Local Ingestion & Prompt Packaging, không kích hoạt bất kỳ network request nào ra ngoài khi mount.
2. **Backend Runtime State:**
   - Adapter `NotebookLMMcpClient` hỗ trợ phương thức `checkReadiness()` gọi lệnh MCP `server_info`.
   - Express server tại `src/server/routes/researchSessionRoutes.ts` có endpoint `GET /api/research/providers`, nhưng endpoint này hiện chỉ trả về danh sách provider được kích hoạt routing (`routingEnabled`, `providers: []`) dựa trên `ResearchProviderConfig`, chưa bọc telemetry của MCP readiness.
   - Các evidence artifact của smoke test nằm cô lập tại `docs/session-logs/evidence/` phục vụ kiểm thử và audit CI/CD.

---

## 3. Definitions of Runtime Statuses (Định nghĩa Bản chất từng Trạng thái)

| Trạng thái | Nhãn UI | Định nghĩa Bản chất | Đối tượng Tiêu thụ |
| :--- | :--- | :--- | :--- |
| `unknown` | `Chưa kiểm tra` | Mặc định fallback khi container cha không cấp context hoặc chưa khởi tạo. | Fallback an toàn |
| `configured` | `Đã cấu hình` | **(Trạng thái khuyến nghị cho End-User)**: Ứng dụng đã sẵn sàng các mẫu đóng gói nguồn, pipeline prompt và lưu trữ artifact. | Người dùng cuối (Learner/Researcher) |
| `verified` *(hoặc `server-verified`)* | `Smoke đã xác minh` / `Máy chủ sẵn sàng` | Adapter backend đã thực hiện handshake/readiness probe thành công với binary NotebookLM MCP thật và xác thực Google hợp lệ trong vòng TTL cho phép. | Kỹ sư vận hành (Operator/Admin) |
| `blocked` | `Audio Overview: Chưa khả dụng` | Ngăn chặn rõ ràng một capability cụ thể do thiếu hụt schema/contract đã được ghi nhận trong ADR-103. | Người dùng & Kỹ sư |

---

## 4. Candidate Architectures (Các Phương án Nguồn Chân Lý Khả Thi)

### Phương án A: Server-Exposed Read-Only Diagnostics Endpoint (Khuyến nghị nếu triển khai)
- **Cơ chế**:
  - Backend Express cung cấp route chỉ đọc `GET /api/research/providers/notebooklm/status`.
  - Endpoint này gọi `notebookLmMcpClient.checkReadiness()` (hoặc đọc cached readiness snapshot có TTL 60 giây).
  - Trả về payload sanitized: `{ status: "READY" | "INITIALIZING" | "UNAVAILABLE", authStatus: "configured" | "stale", lastVerifiedAt: string }`.
  - Frontend gọi endpoint này bằng `useQuery` (hoặc lazy-fetch khi mở modal) để nâng trạng thái từ `configured` lên `verified`.
- **Ưu điểm**:
  - Phản ánh trung thực 100% tình trạng kết nối thật của backend MCP tại thời điểm mở modal.
  - Phù hợp với kiến trúc Client-Server tiêu chuẩn.
- **Nhược điểm**:
  - Đòi hỏi sửa `src/server/routes/` và triển khai cơ chế caching/rate-limiting để tránh việc spam tiến trình con stdio.

### Phương án B: Build-time Static Telemetry Manifest (CI/Build-driven)
- **Cơ chế**:
  - Trong pipeline build hoặc test CI, khi `notebooklm-mcp-smoke.ts --tier0` hoàn tất thành công, pipeline tạo ra một file manifest tĩnh (ví dụ: `src/generated/smokeManifest.json` hoặc biến môi trường `VITE_NOTEBOOKLM_BUILD_VERIFIED=true`).
  - Frontend bundle đọc trực tiếp biến tĩnh này để hiển thị `verified`.
- **Ưu điểm**:
  - Không phát sinh network side-effect ở client browser.
  - Không cần endpoint mới.
- **Nhược điểm**:
  - **Mất tính trung thực theo thời gian thực (False Truthfulness)**: Token Google có thể hết hạn sau 1 giờ hoặc binary MCP bị gỡ bỏ, nhưng frontend vẫn báo "Smoke đã xác minh" vì chỉ căn cứ vào kết quả lúc build.

### Phương án C: Dừng ở `configured` cho End-User Modal, Chuyển `verified` vào Drawer Chi Tiết Kỹ Thuật
- **Cơ chế**:
  - Giữ nguyên `configured` trên Header của `NotebookLMStudioModal`.
  - Không cố gắng đưa badge `verified` lên thanh tiêu đề chính của người dùng thông thường.
  - Khái niệm "Smoke đã xác minh" chỉ được hiển thị bên trong component `AdvancedTechnicalDetails` (mục dành riêng cho Operator/Dev) khi có job handoff hoặc thông qua CLI manual command.
- **Ưu điểm**:
  - Đúng chuẩn UX sản phẩm: Người học không cần biết về "smoke test" hay các thuật ngữ kiểm thử phần mềm nội bộ.
  - Không thay đổi backend, không tăng surface area rủi ro bảo mật.
  - Bảo đảm triết lý thiết kế tinh gọn (Lean) của repository.

---

## 5. Phân Tích Trade-Offs & Ma Trận So Sánh

| Tiêu chí | Phương án A (Server Endpoint) | Phương án B (Build Manifest) | Phương án C (Dừng ở Configured + Drawer) |
| :--- | :---: | :---: | :---: |
| **Tính trung thực (Truthfulness)** | **Rất cao (100% Live)** | Thấp (Dễ stale sau build) | **Tuyệt đối (Không giả định)** |
| **Bảo vệ Secret & Khử nhạy cảm** | Cao (Sanitized qua API DTO) | Trung bình | **Tuyệt đối (Zero attack surface)** |
| **Tác động hiệu năng Browser** | Thêm 1 request nhẹ | Zero | **Zero** |
| **Độ phức tạp Backend** | Trung bình (cần TTL cache) | Thấp (scripts) | **Không thay đổi (Zero)** |
| **Trải nghiệm Người dùng Cuối** | Rõ ràng nhưng lộ từ chuyên môn | Rõ ràng nhưng có thể stale | **Thân thiện, đúng ngữ cảnh nghiệp vụ** |

---

## 6. Security, Privacy & Safety Implications (Hàng Rào An Toàn)

1. **Tuyệt đối CẤM Browser đọc Evidence Trực Tiếp:**
   - Thư mục `docs/session-logs/evidence/` chứa dữ liệu audit của quá trình smoke test dev/CI. Browser không được phép có bất kỳ loader, dynamic import, hay API route nào expose raw JSON từ thư mục này.
2. **Không Khởi Tạo Process từ Browser:**
   - Tuyệt đối không cho phép client trigger `notebooklm-mcp` CLI hoặc chạy script Node.js.
3. **Khử Nhạy Cảm Toàn Diện (Redaction):**
   - Nếu có endpoint diagnostics, payload trả về cho client chỉ được chứa enum trạng thái (`READY`, `UNAVAILABLE`) và timestamp, tuyệt đối không trả về cookie, token `ya29`, hay đường dẫn hệ thống nội bộ `/Users/mr.chem/...`.

---

## 7. Khuyến Nghị Kỹ Thuật (Architectural Recommendation)

1. **Khuyến nghị chính (Recommendation)**:
   - **Áp dụng Phương án C kết hợp lộ trình dài hạn của Phương án A**:
     - Trong phạm vi modal người dùng hiện tại, trạng thái `configured` (`Đã cấu hình`) là **đầy đủ, chuẩn mực và trung thực nhất**.
     - Nhãn `verified` (`Smoke đã xác minh`) không nên xuất hiện mặc định trên header chính của người dùng thông thường, mà nên được quy hoạch lại thành một chỉ số chẩn đoán máy chủ (`server-ready`) khi có module Settings/System Diagnostics chính thức.
2. **Quy tắc hiển thị Badge Header**:
   - Nếu không có nguồn diagnostics được cấp phát chính thức từ server, `resolveDefaultRuntimeStatus` sẽ duy trì `'configured'` khi `isConfigured: true`.
   - Trạng thái `verified` chỉ được phép kích hoạt nếu container cha nhận được cờ `isDiagnosticsVerified: true` từ một nguồn DTO máy chủ đã được kiểm chứng an toàn.

---

## 8. Explicit Non-Goals (Những Điều Tuyệt Đối Không Làm)

1. Không tạo REST endpoint mới trong Phase này (chưa có phê duyệt).
2. Không import bất kỳ file nào từ `docs/session-logs/evidence/` vào frontend.
3. Không thêm lệnh gọi fetch tự phát vào `NotebookLMStudioModal.tsx`.
4. Không hạ thấp tiêu chuẩn kiểm thử chỉ để làm xanh trạng thái `verified`.

---

## 9. Decision Gate: Quyết Định Pha Tiếp Theo

- [ ] **Lựa chọn 1 (Khuyến nghị)**: **DỪNG Ở `configured`**. Đóng Phase F8 với trạng thái `configured` hoàn chỉnh, chuyển hướng sang hoàn thiện các nghiệp vụ cốt lõi khác của hệ thống. Trạng thái `configured` đã hoàn toàn đáp ứng nhu cầu sử dụng thực tế của người dùng.
- [ ] **Lựa chọn 2**: **MỞ PHASE BỔ SUNG BACKEND DIAGNOSTICS ENDPOINT**. Nếu chủ sở hữu hệ thống thực sự muốn UI hiển thị `verified` theo thời gian thực, cần mở một phase backend riêng biệt: xây dựng route `GET /api/research/providers/diagnostics` với cơ chế cache an toàn, sau đó mới quay lại frontend nối hook `useQuery`.

---

## 10. Test Planning Only (Kế Hoạch Kiểm Thử cho Phase Sau nếu Triển Khai)

*(Phần này đóng vai trò Test Spec định hướng, KHÔNG thực thi code trong phase hiện tại)*

### Acceptance Criteria & Gherkin Scenarios:

```gherkin
Feature: Truthful Verified Runtime Status Resolution

  Scenario: Không có diagnostics contract thì UI không được hiện verified
    Given modal NotebookLM được render trong bất kỳ container cha nào
    And hệ thống không truyền cờ diagnostics chứng thực từ server
    When modal hiển thị trên màn hình
    Then header hiển thị trạng thái "Đã cấu hình" (configured)
    And header tuyệt đối không hiển thị "Smoke đã xác minh" (verified)

  Scenario: UI chỉ hiển thị verified khi server diagnostics khẳng định PASS
    Given backend cung cấp endpoint diagnostics an toàn
    And endpoint trả về status READY và auth_status configured
    When modal tiếp nhận dữ liệu diagnostics này
    Then header mới được phép hiển thị badge "Smoke đã xác minh" (verified)

  Scenario: Degrade an toàn về configured hoặc unknown khi diagnostics lỗi
    Given backend diagnostics endpoint gặp sự cố (timeout, 500, mạng gián đoạn)
    When modal nhận kết quả lỗi hoặc không có dữ liệu
    Then runtime status tự động degrade về "Đã cấu hình" hoặc "Chưa kiểm tra"
    And không được hiển thị verified sai lệch

  Scenario: Đảm bảo cách ly bảo mật dữ liệu dev
    Given ứng dụng frontend đang hoạt động
    When kiểm tra toàn bộ network requests và module bundler
    Then không có request nào trỏ tới docs/session-logs/evidence/
    And không có token hay path nhạy cảm bị rò rỉ trên giao diện
```
