# ADR-075: Scoped Obsidian Vault Source Resolution & Index Architecture

## Status
**Accepted / Implemented** (Phase 2B)

## Context & Problem Statement
Hệ thống Knowledge OS hỗ trợ quản lý nhiều kho tri thức Obsidian khác nhau (ví dụ: `phat-hoc` với hơn 1.200 file, `dong-y` với 38 file, `huyen-hoc` với 20 file). Trước đây, việc tìm kiếm và nạp tài liệu Obsidian phụ thuộc hoàn toàn vào một biến trạng thái toàn cục `activeVaultId` trên server.

Điều này gây ra các vấn đề nghiêm trọng khi tích hợp vào AI Research Copilot:
1. **Rò rỉ dữ liệu giữa các Vault (Cross-Vault Contamination)**: Khi người dùng đang ở giao diện chọn tài liệu cho một Vault cụ thể (ví dụ: `dong-y`), nếu server chỉ truy vấn theo `activeVaultId` toàn cục (đang là `phat-hoc`), danh sách tài liệu trả về sẽ bị sai lệch hoàn toàn.
2. **Side-effect ngoài ý muốn khi chuyển đổi Vault**: Nếu client gọi endpoint chuyển Vault toàn cục (`/api/obsidian/vault/switch`) chỉ để phục vụ tìm kiếm trong modal chọn tài liệu của AI Studio, nó sẽ làm thay đổi toàn bộ trạng thái của các view khác đang mở (như Docs Explorer, Vault Browser).
3. **Stale Response Race Condition**: Khi người dùng chuyển đổi qua lại nhanh giữa các Vault trong dropdown hoặc gõ phím tìm kiếm liên tục, các phản hồi từ request cũ có thể về muộn hơn request mới, dẫn đến việc danh sách tài liệu bị ghi đè bởi dữ liệu cũ không đúng với Vault đang chọn.
4. **Path Traversal & Absolute Path Leak**: Nguy cơ rò rỉ đường dẫn tệp tuyệt đối trên máy tính người dùng hoặc truy cập trái phép ra ngoài thư mục gốc của Vault.

## Decision Drivers
- **Scoped Read-Only Resolution**: Cho phép tìm kiếm và đọc nội dung tệp thuộc bất kỳ Vault hợp lệ nào được chỉ định bởi `vaultId` mà không làm thay đổi `activeVaultId` toàn cục của server.
- **Path Traversal Defense**: Kiểm tra và chuẩn hóa đường dẫn nghiêm ngặt (chỉ cho phép tệp nằm bên trong thư mục gốc của Vault được quản lý).
- **Stale Response Prevention & UI UX Reset**: Đảm bảo UI modal phản ánh trung thực trạng thái của Vault đang chọn và loại bỏ hoàn toàn các phản hồi cũ về trễ bằng `AbortController` và sequence guard.
- **Contract Khóa Tiêu Đề Tài Liệu (Title Resolution)**: Ưu tiên frontmatter title $\rightarrow$ first H1 heading $\rightarrow$ filename fallback.

## Decision Details

### 1. Scoped Search Endpoint (`/api/obsidian/vault/search`)
- Cập nhật route tìm kiếm nhận tham số truy vấn tùy chọn `vaultId`.
- Khi `vaultId` được cung cấp:
  - Máy chủ giải quyết thư mục gốc của Vault cụ thể đó thông qua hàm `getVaultRoot(vaultId)`.
  - Khởi tạo và xây dựng `ObsidianVaultIndex` riêng cho thư mục gốc của Vault đó mà không tác động đến instance index toàn cục.
  - Hỗ trợ cờ `all=true` để trả về toàn bộ danh sách tài liệu ứng cử viên trong Vault đó.

### 2. File Resolver Service (`src/server/services/obsidianFileResolver.ts`)
- Hàm `resolveScopedObsidianFiles(vaultId, relativePaths, getVaultRoot)`:
  - Xác thực `vaultId` có trong danh sách allowlist được phê duyệt.
  - Duyệt qua từng `relativePath`: chuẩn hóa đường dẫn, ngăn chặn tấn công `..` (path traversal).
  - Đọc nội dung Markdown, trích xuất metadata và tính toán dung lượng.
  - Trả về danh sách tài nguyên đọc được kèm cảnh báo cho các file bị thiếu.
  - Nếu tất cả các file yêu cầu đều không tồn tại, trả về lỗi `422 UNPROCESSABLE_ENTITY` để không gọi Gemini API vô ích.

### 3. Client UI Stale Response Guard & UX Reset
Trong `src/components/ai/ObsidianSourcePickerModal.tsx`:
- Khi người dùng thay đổi dropdown Vault:
  - Ngay lập tức reset state: `setDocs([])`, `setSelectedPaths([])`, `setSearchQuery("")`, `setDocsError(null)`.
  - Hủy request HTTP đang chạy dở của Vault cũ bằng `AbortController.abort()`.
  - Tăng biến đếm chuỗi request `requestIdRef.current += 1` để bỏ qua các response không khớp ID mới nhất.
  - Bắt và bỏ qua lỗi `AbortError` trong catch block để không hiển thị banner lỗi giả.

## Architectural Consequences & Trade-offs

### Positive
- **Cách ly tuyệt đối**: Mỗi Vault hoạt động độc lập, không còn hiện tượng rò rỉ dữ liệu tài liệu Phật Học sang Đông Y hay ngược lại.
- **Không có tác dụng phụ toàn cục**: Việc duyệt tài liệu trong AI Studio không làm gián đoạn các phiên làm việc ở các tab khác của Knowledge OS.
- **UX phản hồi tức thì và chính xác**: Người dùng không gặp hiện tượng giật danh sách (flickering) hoặc hiển thị nhầm dữ liệu của Vault trước đó.
- **Bảo mật hệ thống tệp**: Chỉ đọc các tệp `.md` hợp lệ trong phạm vi Vault được phân quyền.

### Negative & Mitigations
- **Chi phí xây dựng index theo Vault**: Xây dựng index on-demand khi có yêu cầu scoped search cho Vault mới.
  - *Mitigation*: Với các Vault quy mô thông thường (< 5.000 file), quá trình quét thư mục mất dưới 50ms và có thể được tối ưu hóa cache ở các giai đoạn sau nếu cần.
