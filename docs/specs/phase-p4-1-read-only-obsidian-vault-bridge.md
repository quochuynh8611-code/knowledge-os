# Phase P4.1 Technical Specification: Read-Only Obsidian Vault Bridge

- **Feature Code:** P4.1
- **Status:** SPEC HARDENING COMPLETED (Phase P4.1B Symlink Policy Hardened)
- **Target Release:** Knowledge OS Local Enterprise
- **Associated ADR:** [`ADR-064`](../adr/ADR-064-read-only-obsidian-vault-bridge.md)
- **Associated Feature File:** [`phase-p4-1-read-only-obsidian-vault-bridge.feature`](../gherkin/phase-p4-1-read-only-obsidian-vault-bridge.feature)

---

## 1. Executive Summary & Ownership Boundaries

Tính năng **Read-Only Obsidian Vault Bridge** mang lại trải nghiệm xem trước tài liệu nghiên cứu từ Obsidian Vault ngay trong giao diện Knowledge OS mà không biến Knowledge OS thành Markdown editor và không tạo rủi ro phân mảnh dữ liệu.

### Ownership Matrix
| Thành phần | Source of Truth (SSOT) | Knowledge OS Role | Obsidian Role |
| :--- | :--- | :--- | :--- |
| **Markdown Notes & Files** | **Obsidian Vault** | Read-Only On-Demand Reader | Tạo, sửa, đổi tên, xóa, tổ chức folder |
| **Topics & Learning Progress** | **Knowledge OS** | Quản lý tiến độ, SM-2, study sessions | Không can thiệp |
| **Knowledge OS Notes** | **Knowledge OS** | Ghi chú nội bộ, insight, questions | Không mirror sang Obsidian (P4.1) |
| **Reference Link Metadata** | **Knowledge OS (`Resource`)** | Lưu relative path, vault name, deep-link | Không can thiệp |

---

## 2. Path Traversal & Symlink Defense (12-Step Jail Warden Algorithm)

Mọi yêu cầu đọc tệp qua API hoặc helper phải thực thi thuật toán 12 bước sau đây:

```
[User Relative Path Input]
   │
   ▼
1. Reject empty, null byte (\0), absolute path (/ or C:\)
   │
   ▼
2. Normalize platform separators (\ -> /) and strip leading/redundant slashes
   │
   ▼
3. Segment Analysis: Reject if any segment is '.', '..', starts with '.', 
   or matches ['.obsidian', '.git', '.trash', 'node_modules', '.env']
   │
   ▼
4. lexicalCandidate = path.resolve(vaultRoot, relativePath)
   │
   ▼
5. lexicalRelative = path.relative(vaultRoot, lexicalCandidate)
   │
   ▼
6. Reject if lexicalRelative === '..' OR starts with '../' OR path.isAbsolute(lexicalRelative)
   │
   ▼
7. fs.promises.lstat(lexicalCandidate)
   ├─ ENOENT -> 404 FILE_NOT_FOUND
   ├─ stat.isSymbolicLink() === true -> 403 SYMLINK_NOT_ALLOWED (REJECT ALL SYMLINKS)
   └─ !stat.isFile() -> 403 INVALID_FILE_TYPE
   │
   ▼
8. Resolve real physical paths via fs.realpathSync:
   realVaultRoot = realpath(vaultRoot)
   realTarget = realpath(lexicalCandidate)
   │
   ▼
9. realRelative = path.relative(realVaultRoot, realTarget)
   Reject if realRelative === '..' OR starts with '../' OR path.isAbsolute(realRelative)
   (Chốt chặn defense-in-depth)
   │
   ▼
10. Defense-in-depth: realTarget.startsWith(realVaultRoot + path.sep)
   │
   ▼
11. Check Extension Whitelist (['.md', '.markdown']) AND 
    Check lstat.size <= MAX_MARKDOWN_BYTES (2,097,152 bytes / 2 MiB)
    ├─ Invalid Extension -> 403 FORBIDDEN_EXTENSION
    └─ Size > 2 MiB -> 413 FILE_TOO_LARGE (Không đọc body vào bộ nhớ)
   │
   ▼
12. Read File via fs.readFile(realTarget, 'utf8')
    Sanitize Frontmatter/Markdown & Mask all absolute paths before returning
```

---

## 3. Data Mapping & Schema Decision (Option A: Resource Model Reuse)

### 3.1. Quyết định Kỹ thuật
Tái sử dụng bảng `Resource` hiện hữu (`prisma.resource`). **Không tạo bảng mới, không chạy Prisma migration**.

### 3.2. Ánh xạ trường chi tiết (Data Field Mapping)
```typescript
interface ObsidianResourceReference {
  id: string;             // UUID
  topicId: string;        // ID Topic trong Knowledge OS
  title: string;          // Tên hiển thị (tên file hoặc title trích từ frontmatter)
  type: 'md';             // Định danh loại tài liệu Markdown
  author?: string;        // Tùy chọn (ví dụ: tác giả ghi chú)
  filePath: string;       // Relative path bên trong Vault (vd: "Phat-Hoc/Bat-Chanh-Dao.md")
  url?: string;           // obsidian://open?vault=...&file=... (sinh qua URLSearchParams)
  notes?: string;         // JSON string: {"vaultName":"...","lastKnownMtime":"..."}
}
```

### 3.3. Quy tắc Unlink
- Thao tác gỡ bỏ (Unlink) trong Knowledge OS chỉ thực thi `DELETE /api/resources/:id`.
- Thao tác này **chỉ xóa metadata liên kết trong DB**, hoàn toàn **không chạm vào file trên đĩa cứng của Obsidian Vault**.
- Modal / confirmation dialog của UI phải giải thích minh bạch: *"Thao tác này chỉ gỡ liên kết khỏi Knowledge OS, tệp ghi chú gốc trong Obsidian Vault hoàn toàn không bị ảnh hưởng."*

### 3.4. Preflight Validation Contract (Phase P4.1D)
Trước khi gửi `POST /api/resources` để lưu metadata:
1. Client gọi preflight `GET /api/obsidian/vault/file?path=${encodeURIComponent(trimmedRelativePath)}`.
2. Nếu API trả 200 OK:
   - Metadata cơ bản được trích xuất: `frontmatter.title` (hoặc fileName làm display title fallback), relative path, lastModified.
   - Resource payload được tạo với `type: 'md'`, `topicId: currentTopic.id`, `filePath: relativePath`, `url: obsidian://open?vault=...&file=...`, `notes: JSON.stringify({ vaultName, lastKnownMtime })`.
   - Lưu vào DB qua `DataContext.addResource()` / `dataRepository.saveResource()`.
3. Nếu API trả lỗi (400, 403, 404, 413, 503):
   - Không thực hiện tạo `Resource` trong DB.
   - Hiển thị inline error badge với mã lỗi rõ ràng (`FILE_NOT_FOUND`, `SYMLINK_NOT_ALLOWED`, `FILE_TOO_LARGE`, v.v.), che giấu toàn bộ absolute path hệ thống.

---

## 4. API Endpoints Specification

### 4.1. `GET /api/obsidian/vault/status`
- **Mục tiêu**: Kiểm tra trạng thái cấu hình Vault root và quyền đọc của hệ thống.
- **Headers**: Không yêu cầu đặc thù.
- **Operational Bound**: Không quét đệ quy toàn bộ thư mục; chỉ kiểm tra accessibility qua `fs.access(vaultRoot, fs.constants.R_OK)`.
- **Response 200 OK**:
  ```json
  {
    "configured": true,
    "vaultName": "Khao-Cuu-Phat-Hoc-Huyen-Hoc",
    "accessible": true
  }
  ```
- **Response 200 OK (Chưa cấu hình)**:
  ```json
  {
    "configured": false,
    "vaultName": null,
    "accessible": false
  }
  ```

### 4.2. `GET /api/obsidian/vault/file`
- **Query Params**:
  - `path` (bắt buộc, string): Đường dẫn tương đối từ Vault root.
- **Operational Bound**:
  - Tối đa 2 MiB (`MAX_MARKDOWN_BYTES = 2097152`).
  - Nếu `lstat.size > 2097152`, trả về `413 Payload Too Large` kèm `sizeBytes`, không đọc nội dung vào RAM.
- **Success Response (200 OK)**:
  ```json
  {
    "relativePath": "Phat-Hoc/Bat-Chanh-Dao.md",
    "fileName": "Bat-Chanh-Dao.md",
    "frontmatter": {
      "title": "Bát Chánh Đạo Toàn Thư",
      "tags": ["phat-hoc", "dao-de"],
      "aliases": ["Eightfold Path"]
    },
    "outline": [
      { "level": 1, "text": "Bát Chánh Đạo Toàn Thư", "id": "bat-chanh-dao-toan-thu" },
      { "level": 2, "text": "1. Chánh Kiến", "id": "1-chanh-kien" }
    ],
    "content": "# Bát Chánh Đạo Toàn Thư\n\nNội dung...",
    "sizeBytes": 4096,
    "lastModified": "2026-08-25T14:30:00.000Z"
  }
  ```
- **Error Responses (Structured & Safe - Không lộ absolute OS path)**:
  - `400 Bad Request`: `{"error": "MISSING_PATH", "message": "Tham số path không được để trống"}`
  - `403 Forbidden`: `{"error": "SYMLINK_NOT_ALLOWED", "message": "Liên kết mềm (symbolic link) không được phép truy cập trong phiên bản này"}`
  - `403 Forbidden`: `{"error": "PATH_TRAVERSAL_DETECTED", "message": "Truy cập bị từ chối do vi phạm ranh giới bảo mật"}`
  - `403 Forbidden`: `{"error": "ACCESS_DENIED_SENSITIVE_DIR", "message": "Không được phép truy cập thư mục hệ thống hoặc cấu hình ẩn"}`
  - `403 Forbidden`: `{"error": "INVALID_FILE_TYPE", "message": "Đường dẫn không phải là tệp tin thông thường"}`
  - `403 Forbidden`: `{"error": "FORBIDDEN_EXTENSION", "message": "Chỉ hỗ trợ xem trước tệp .md hoặc .markdown"}`
  - `404 Not Found`: `{"error": "FILE_NOT_FOUND", "message": "Tệp tin không tồn tại hoặc đã bị di chuyển khỏi Obsidian Vault"}`
  - `413 Payload Too Large`: `{"error": "FILE_TOO_LARGE", "message": "Tệp tin vượt quá dung lượng tối đa cho phép (2 MiB)", "sizeBytes": 3145728, "maxAllowedBytes": 2097152}`
  - `503 Service Unavailable`: `{"error": "VAULT_NOT_CONFIGURED", "message": "Obsidian Vault root chưa được thiết lập trên máy chủ local"}`

---

## 5. Markdown Security & Rendering Policy

1. **Parser & Renderer Integration**:
   - Sử dụng `MarkdownReadabilityRenderer` (`src/lib/markdownReadability.tsx`) hoặc wrapper chuyên dụng `ObsidianDocumentViewer`.
   - Viewer bao gồm:
     - Header: Title, Tags, Last Modified badge, Nút "Làm mới từ Vault", Nút "Mở trong Obsidian", Nút "Gỡ liên kết".
     - Table of Contents / Outline Drawer: clickable navigation theo headings trích xuất từ server.
     - Body: Render các block elements theo design system Knowledge OS.
2. **HTML Sanitization & Safety Hardening**:
   - Kiến trúc `MarkdownReadabilityRenderer` render React Virtual DOM nodes (`<p>`, `<span>`, `<strong>`, `<em>`), do đó không parse thẻ HTML thông qua `dangerouslySetInnerHTML`.
   - **Quy tắc bảo mật bổ sung (P4.1D Hardening)**:
     - Toàn bộ raw HTML tags như `<script>`, `<iframe>`, `<object>`, `<embed>`, `<style>`, `<link>` xuất hiện trong text phải được escape thành plain text hoặc strip hoàn toàn trước khi xử lý inline regex.
     - Markdown links dạng `[text](url)` chỉ chấp nhận scheme an toàn (`http://`, `https://`, `mailto:`, `obsidian://`). Toàn bộ URL bắt đầu bằng `javascript:`, `data:`, `vbscript:` phải bị chặn và render thành plain text.
     - External links bắt buộc gắn `rel="noopener noreferrer" target="_blank"`.
3. **Plugin Syntax Fallback**:
   - Cú pháp Dataview (`dataview ...`), Templater (`<% ... %>`), plugin tags không được thực thi.
   - Render dưới dạng mã nguồn thuần (code block) hoặc plain text để người dùng dễ đọc.

---

## 6. Phân Chia Phạm Vi (Scope Boundary: P4.1 vs P4.2)

### Có trong P4.1 (MVP Scope):
- Cấu hình Vault Root an toàn.
- Backend Path Guard 12 bước bảo mật cao; từ chối 100% symlinks (`SYMLINK_NOT_ALLOWED`).
- Đọc file Markdown on-demand, trích xuất YAML frontmatter, outline headings.
- Hiển thị Read-Only Markdown Preview trong Topic Detail thông qua liên kết `Resource`.
- Nút "Làm mới từ Vault" (Manual refresh).
- Nút "Mở trong Obsidian" qua deep-link chuẩn `obsidian://open`.
- Xử lý mượt mà trạng thái file bị xóa/di chuyển (`FILE_NOT_FOUND`).
- Xóa liên kết (Unlink) không xóa file thực tế.

### Cố ý Dời sang P4.2 (Deferred to P4.2):
- Đánh giá và hỗ trợ Symbolic links (nếu có chính sách kiểm định an toàn).
- Liên kết trực tiếp giữa Knowledge OS Note ↔ Obsidian Note (`Note.sourcePath` dynamic viewer).
- Trình duyệt cây thư mục Vault (Vault Tree Browser).
- Tìm kiếm toàn văn (Full-text search) trong Vault từ Knowledge OS.
- Xử lý ảnh/tệp đính kèm nội bộ (Local attachments / Wikilink embedded images).
- Transclusion (`![[Note]]`).
- Tích hợp đồ thị liên kết Obsidian Graph.
