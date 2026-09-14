# Phase 2B Technical Specification: Scoped Obsidian Vault Sources

- **Status:** Implemented / Verified
- **Feature Code:** Phase 2B
- **Associated ADR:** [`ADR-075`](../adr/ADR-075-scoped-obsidian-vault-source-resolution.md)
- **Associated Feature File:** [`ai-research-copilot.feature`](../gherkin/ai-research-copilot.feature)

---

## 1. Mục Tiêu & Kiến Trúc

Đặc tả này quy định cơ chế tìm kiếm, nạp và giải quyết tài liệu Markdown từ các Obsidian Vault cục bộ độc lập phục vụ cho AI Research Copilot mà không làm thay đổi trạng thái Vault toàn cục (`activeVaultId`) của Knowledge OS.

---

## 2. API Contracts & Service Boundaries

### 2.1. Scoped Search Endpoint
`GET /api/obsidian/vault/search`

#### Query Parameters:
- `vaultId` (string, optional): ID của Vault cụ thể cần tìm kiếm (`phat-hoc`, `dong-y`, `huyen-hoc`, `default`). Nếu không truyền, dùng default/active vault.
- `q` (string, optional): Từ khóa tìm kiếm.
- `all` (boolean, optional): Nếu `true` hoặc `q=*`, trả về toàn bộ tài liệu trong Vault.

#### Response DTO:
```typescript
export interface ObsidianSearchResponse {
  query: string;
  count: number;
  results: Array<{
    title: string;
    path: string; // Relative path from target vault root
    snippet?: string;
    score?: number;
  }>;
}
```

### 2.2. File Resolver Service
`src/server/services/obsidianFileResolver.ts`

```typescript
export async function resolveScopedObsidianFiles(
  vaultId: string,
  relativePaths: string[],
  getVaultRoot: (vaultId?: string) => string | null | undefined
): Promise<ObsidianResolutionResult>;
```

#### Xử lý ngoại lệ:
- `400 BAD_REQUEST`: Khi `vaultId` không hợp lệ hoặc `relativePaths` rỗng / vượt quá 3 files.
- `422 UNPROCESSABLE_ENTITY`: Khi tất cả các tệp yêu cầu đều không tồn tại trong Vault đó (không gọi Gemini API).
- `503 SERVICE_UNAVAILABLE`: Khi Vault root chưa được cấu hình trên máy chủ.

---

## 3. UI Component: `ObsidianSourcePickerModal.tsx`

### 3.1. Các Trạng Thái Giao Diện (UI States)
1. **Loading State**: Hiển thị spinner và thông báo nạp danh sách tài liệu.
2. **Empty State**: Hiển thị khi Vault không có tài liệu Markdown nào hoặc không tìm thấy kết quả khớp từ khóa.
3. **Error State**: Hiển thị khi không kết nối được API, có nút `Thử lại`.
4. **Active Selection List**:
   - Danh sách tệp kèm checkbox, tiêu đề giải quyết chuẩn mực và relative path.
   - Giới hạn tối đa 3 tài liệu: khi đã chọn 3, các checkbox còn lại bị vô hiệu hóa (`disabled`).
   - Cảnh báo các tệp thiếu (Missing warning banner) nếu selection cũ có tệp không còn tồn tại trên đĩa.

### 3.2. Chống Đua Lệnh (Stale Response Race Guard)
- Sử dụng `AbortController` để hủy bỏ request HTTP của Vault trước đó ngay khi người dùng chọn Vault mới trong dropdown.
- Sử dụng `requestIdRef` tăng dần để loại bỏ các kết quả bất đồng bộ về trễ.
- Reset ngay lập tức danh sách tài liệu (`docs = []`) và lựa chọn (`selectedPaths = []`) khi đổi Vault để không rò rỉ dữ liệu.
