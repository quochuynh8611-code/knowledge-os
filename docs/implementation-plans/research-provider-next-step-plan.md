# Kế Hoạch Triển Khai Tiếp Theo: Research Provider Architecture

Tài liệu này phân tích và đề xuất 3 lựa chọn kỹ thuật cho các bước tiếp theo sau khi đã hoàn tất nền tảng Core Provider, Service Layer Integration và Internal MCP Facade Skeleton ở Phase 5 & 4.9.

---

## 1. Tổng Quan Các Lựa Chọn

```
                    [ĐÃ HOÀN THÀNH: Core Provider + Service + MCP Skeleton]
                                             │
         ┌───────────────────────────────────┼───────────────────────────────────┐
         ▼                                   ▼                                   ▼
    [LỰA CHỌN A]                        [LỰA CHỌN B]                        [LỰA CHỌN C]
   HTTP Adapter Exposure            MCP Stdio Runtime Bootstrap      App-Layer Feature Flag Wiring
  (Mở endpoint REST mới)           (Chạy MCP qua tiến trình Stdio)    (Cấu hình runtime & Provider switch)
```

---

## 2. Chi Tiết Từng Lựa Chọn

### Lựa Chọn A: HTTP Adapter Exposure (Mở REST Endpoint Mới)
- **Mục tiêu**: Bổ sung endpoint REST mới (ví dụ: `POST /api/research/session/:id/provider-job` và `GET /api/research/session/:id/provider-status/:correlationId`) để frontend có thể kích hoạt luồng provider research qua HTTP API hiện hữu.
- **Phụ thuộc**: `ResearchSessionService.startProviderResearchForSession`, `ResearchSessionService.getProviderExecutionSnapshot`.
- **Rủi ro**: 
  - Thay đổi bề mặt API REST của server.
  - Cần bảo đảm phân quyền xác thực (auth/session checks) đồng nhất với các route hiện tại.
- **Khả năng đảo ngược (Reversible)**: **Có (Cao)**. Có thể gỡ bỏ hoặc tắt router bằng flag mà không ảnh hưởng logic cũ.
- **Thứ tự khuyến nghị**: **Ưu tiên 2** (sau khi đã chuẩn bị xong cấu hình feature flag).
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  1. Thêm controller và route handlers không phá vỡ route cũ trong `src/server/routes/researchSessionRoutes.ts`.
  2. Test unit REST endpoint pass 100% với mock service.
  3. Validate input schema chặt chẽ (Zod/type guards).

---

### Lựa Chọn B: MCP Runtime Bootstrap via Stdio (Chạy MCP Server qua Tiến Trình Stdio Thật)
- **Mục tiêu**: Tạo entrypoint script độc lập (ví dụ: `src/server/mcp/runResearchMcpServer.ts`) để khởi động `InternalResearchMcpServer` qua tiến trình `process.stdin` / `process.stdout`, cho phép Antigravity hoặc các AI IDE bên ngoài kết nối trực tiếp như một MCP Server.
- **Phụ thuộc**: `InternalResearchMcpServer`, `ResearchSessionService`, cơ chế pipe Stdio an toàn.
- **Rủi ro**:
  - Nguy cơ log rác từ các thư viện bên thứ 3 rò rỉ vào `stdout` làm hỏng giao thức JSON-RPC.
  - Cần xử lý tín hiệu kết thúc tiến trình (`SIGINT`, `SIGTERM`, unhandled exceptions).
- **Khả năng đảo ngược (Reversible)**: **Có (Cao)**. Là một file script entrypoint độc lập, không xâm nhập vào runtime server chính.
- **Thứ tự khuyến nghị**: **Ưu tiên 3** (triển khai khi có nhu cầu tích hợp tooling ngoài).
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  1. Script đọc từng dòng JSON-RPC từ `process.stdin` và xuất response chuẩn ra `process.stdout`.
  2. Toàn bộ `console.log` được redirect hoặc bọc sang `process.stderr`.
  3. Xử lý đóng kết nối sạch sẽ khi stdin bị đóng (EOF).

---

### Lựa Chọn C: Provider Selection & Feature-Flag Wiring in Application Layer (Khuyến Nghị Hàng Đầu)
- **Mục tiêu**: Thiết lập cấu hình khởi tạo `ProviderRegistry` và `ResearchSessionService` ở tầng application bootstrap (ví dụ: `server.ts` hoặc dependency injection container), gắn kết các biến môi trường cấu hình và feature flags.
- **Phụ thuộc**: `ProviderRegistryConfig`, `ResearchSessionService`.
- **Rủi ro**:
  - Cần kiểm soát biến môi trường mặc định an toàn để không vô tình kích hoạt enterprise provider khi chưa có credentials.
- **Khả năng đảo ngược (Reversible)**: **Có (Rất cao)**. Hoàn toàn phụ thuộc vào biến môi trường (`ENABLE_NOTEBOOKLM_ENTERPRISE_PROVIDER`).
- **Thứ tự khuyến nghị**: **Ưu tiên 1 (Khuyến nghị thực hiện đầu tiên)**.
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  1. `ProviderRegistry` được khởi tạo tự động khi server start với cấu hình an toàn.
  2. Mặc định hệ thống luôn fallback về `antigravity-legacy` nếu không có biến môi trường kích hoạt.
  3. Unit tests xác nhận luồng wiring hoạt động đúng theo cấu hình môi trường.

---

## 3. Lộ Trình Đề Xuất (Recommended Implementation Roadmap)

```
[BƯỚC 1: LỰA CHỌN C] ──> Thiết lập Feature Flag & DI Wiring trong server bootstrap
          │
          ▼
[BƯỚC 2: LỰA CHỌN A] ──> Mở REST Endpoint kết nối UI/Client với Service Provider
          │
          ▼
[BƯỚC 3: LỰA CHỌN B] ──> Mở Stdio CLI Entrypoint cho AI Agent Tooling (MCP)
```
