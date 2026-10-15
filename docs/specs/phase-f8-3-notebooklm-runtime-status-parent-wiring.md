# Phase F8.3 Specification: NotebookLM Runtime Status Parent Wiring (Truthful, No Live Fetch)

## 1. Mục tiêu & Bối cảnh
- **Bối cảnh**: Phase F8.2 đã tạo contract prop presentation-only `runtimeStatus?: 'unknown' | 'configured' | 'verified' | 'blocked'` trên `<NotebookLMHeader />` và `<NotebookLMStudioModal />`, với fallback mặc định là `'unknown'` (`Chưa kiểm tra`).
- **Mục tiêu Phase F8.3**: Kết nối prop `runtimeStatus` từ các container cha (`App.tsx`, `Navbar.tsx`, `TopicDetail.tsx`) xuống `<NotebookLMStudioModal />` một cách trung thực (truthful), không giả vờ rằng UI đã chạy live diagnostics, không đọc file evidence JSON runtime trong browser, và không tạo network side effect.

---

## 2. Nguyên tắc Truthfulness & Ranh giới Dữ liệu

1. **Không Hardcode `verified`**:
   - Backend live smoke test (Tier 1) đã chạy thành công trong môi trường Node.js CLI, nhưng dữ liệu đó thuộc về môi trường dev/CI và được ghi vào `docs/session-logs/evidence/`.
   - Trình duyệt phía client hiện tại **không có kênh truyền an toàn** để đọc bằng chứng đó mà không vi phạm quy tắc đóng gói hoặc gọi live network.
   - Do đó, việc tự ý truyền `verified` ở giao diện client sẽ là giả mạo (fabricated state). Giao diện chỉ được hiển thị những gì nó thực sự có thể kiểm chứng tại tầng client.
2. **Nguồn Chân Lý Khả Dụng (Client-Side Truth Sources)**:
   - **Tích hợp tính năng (Feature Integration)**: Tính năng đóng gói nguồn, sinh prompt, và quản lý artifact của NotebookLM Research Hub v2.1 đã được cài đặt và cấu hình sẵn trong repository (`notebooklm.ts`, `antigravityPipeline.ts`). Khi một container cha mở modal với mục đích sử dụng các công cụ này, container biểu đạt trạng thái `'configured'` (`Đã cấu hình`).
   - **Ràng buộc nghiệp vụ (Business Capability Constraints)**: Theo ADR-103 và kết quả khảo sát schema MCP (`studio_status` schema requirement), tính năng Audio Overview (Podcast 2 Hosts) hiện chưa thể kích hoạt tự động qua Direct MCP runtime. Nếu container hoặc ngữ cảnh yêu cầu phản ánh rào cản này, trạng thái `'blocked'` (`Audio Overview: Chưa khả dụng`) sẽ được sử dụng.
   - **Mặc định khi thiếu thông tin**: Luôn là `'unknown'` (`Chưa kiểm tra`).

---

## 3. Mapping đề xuất cho từng Entry Point

| Entry Point | Vị trí file | Ngữ cảnh sử dụng | Mapping `runtimeStatus` đề xuất | Rationale (Lý do) |
| :--- | :--- | :--- | :---: | :--- |
| **`App.tsx`** | `src/App.tsx:491` | Mở modal qua Global Command Palette hoặc Top Header | `'configured'` | `App` là orchestrator chính, biết rõ tính năng NotebookLM Studio đã được cài đặt và cấu hình sẵn trong hệ thống Knowledge OS. |
| **`Navbar.tsx`** | `src/components/layout/Navbar.tsx:466` | Mở trực tiếp từ nút "NotebookLM" trên thanh điều hướng | `'configured'` | Nút bấm trên Navbar đại diện cho tính năng đóng gói NotebookLM Studio đã được kích hoạt. |
| **`TopicDetail.tsx`** | `src/components/topics/TopicDetail.tsx:1546` | Mở in-context từ thanh công cụ nghiên cứu của một Topic cụ thể | `'configured'` | TopicDetail cung cấp topic cụ thể cho modal, tính năng đã được cấu hình cho chủ đề này. |

*Lưu ý kiến trúc:* Để đảm bảo không bị phân mảnh (no divergence) và dễ bảo trì, tạo một helper thuần túy tại `src/components/integrations/notebooklm/runtimeBridgeConfig.ts`:
```typescript
export interface ResolveRuntimeStatusOptions {
  isConfigured?: boolean;
  isAudioBlocked?: boolean;
}

export function resolveDefaultRuntimeStatus(options?: ResolveRuntimeStatusOptions): NotebookLMRuntimeStatus {
  if (options?.isAudioBlocked) return 'blocked';
  if (options?.isConfigured) return 'configured';
  return 'unknown';
}
```

---

## 4. Giới hạn Hiện tại & Bước đi Tương lai
- **Hiện tại**: Cả 3 entry point truyền `'configured'`, phản ánh trung thực rằng client đã cấu hình sẵn bộ công cụ NotebookLM Studio nhưng chưa xác thực smoke test trực tiếp trên browser session.
- **Tương lai (Phase sau)**: Khi có REST endpoint `/api/research/providers` được bọc bởi React Query hoặc polling hook an toàn, UI có thể tự động nâng từ `'configured'` lên `'verified'` một cách tự động và trung thực.
