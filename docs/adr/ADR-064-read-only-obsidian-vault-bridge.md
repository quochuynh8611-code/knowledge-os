# ADR-064: Cầu Nối Đọc-Chỉ-Xem Obsidian Vault (Read-Only Obsidian Vault Bridge) & Phân Định Quyền Sở Hữu Hệ Thống Tệp

- **Mã ADR:** ADR-064
- **Trạng thái:** ACCEPTED (Phase P4.1B Symlink Policy Hardened)
- **Ngày tạo:** 2026-09-04
- **Tác giả:** Staff Software Engineer / Technical Architect
- **Phạm vi tài liệu:**
  - `docs/adr/ADR-064-read-only-obsidian-vault-bridge.md`
  - `docs/specs/phase-p4-1-read-only-obsidian-vault-bridge.md`
  - `docs/gherkin/phase-p4-1-read-only-obsidian-vault-bridge.feature`

---

## 1. Bối Cảnh (Context)

Knowledge OS đã hoàn thành các giai đoạn nền tảng:
- Quản lý Topics, Notes, Study Progress (SM-2 Spaced Repetition).
- Hỗ trợ xuất một chiều sang Obsidian Vault dưới dạng gói ZIP (ADR-012 Phase 2a) và mở deep-link `obsidian://open`.
- Củng cố tính bất biến và ổn định của sync queue tại Phase P3.3 (commit `58bc1b3`).

Tuy nhiên, người dùng có nhu cầu **xem trước trực tiếp (read-only preview)** nội dung các ghi chú nghiên cứu được soạn thảo và liên kết trong Obsidian Vault ngay tại Knowledge OS mà không cần mở song song ứng dụng Obsidian Desktop hoặc copy-paste nội dung thủ công.

### Rủi ro Kỹ thuật & Bảo mật cốt lõi
1. **Ranh giới dữ liệu (Data Boundary)**: Nếu Knowledge OS sao chép toàn bộ nội dung Markdown của Obsidian vào database PostgreSQL, hệ thống sẽ gặp bài toán two-way sync, split-brain, xung đột phiên bản và làm phình cơ sở dữ liệu.
2. **Nguy cơ an ninh tệp cục bộ (Local Filesystem Security)**: Khi backend server đọc file từ đĩa cứng theo yêu cầu từ client, nếu thiết kế lỏng lẻo sẽ dẫn đến lỗ hổng nghiêm trọng: **Directory Traversal** (`../`), **Symlink Escape/TOCTOU** (liên kết mềm), đọc file nhạy cảm hệ thống (`/etc/passwd`, `.env`, `.git`), hoặc DoS bộ nhớ khi đọc file dung lượng khổng lồ.

---

## 2. Quyết Định Kiến Trúc (Architectural Decisions)

### 2.1. Phân chia Quyền sở hữu (Ownership Boundary) & Zero-Body-Mirroring
- **Obsidian Vault là Nguồn Chân Lý Duy Nhất (SSOT) cho Markdown Body**: Mọi thao tác chỉnh sửa, tạo file, di chuyển thư mục và quản lý wikilinks thuộc về Obsidian. Knowledge OS **tuyệt đối không ghi đè (no write-back)**, không làm two-way sync, không auto-merge.
- **Knowledge OS là SSOT cho Metadata & Learning State**: Quản lý Topic, SM-2 Review, Study Sessions, AI Scholar pipelines.
- **Zero-Body-Mirroring**: Knowledge OS **chỉ lưu reference metadata** (Topic ID, relative path, vault identifier, display title). Nội dung Markdown chỉ được đọc on-demand từ filesystem khi người dùng mở giao diện xem trước.

### 2.2. Thu hẹp Phạm vi MVP (P4.1 vs P4.2)
- **Trong phạm vi P4.1**:
  - Chỉ hỗ trợ liên kết giữa **Topic ↔ Obsidian Document**.
  - Không có duyệt cây thư mục (tree browse), không tìm kiếm full-text trong Vault, không transclusion, không parse file attachment nhị phân.
  - Deep-link `obsidian://open` sử dụng hàm dựng URL chuẩn (`URLSearchParams`), tuyệt đối không nối chuỗi thủ công thô sơ.
  - Manual Refresh duy nhất; không sử dụng filesystem watcher trong P4.1.
- **Dời sang Phase P4.2**:
  - Hỗ trợ Symbolic link (nếu cần thiết sau khi đánh giá rủi ro).
  - Liên kết trực tiếp giữa Knowledge OS Note ↔ Obsidian Note (`Note.sourcePath` dynamic viewer).
  - Obsidian Graph visualizer integration.

### 2.3. Quyết định Chính thức về Symlink: TỪ CHỐI TOÀN BỘ SYMLINK (Reject All Symlinks)
**Chính sách chính thức cho Phase P4.1: TỪ CHỐI 100% SYMBOLIC LINK.**
- Bất kể symbolic link trỏ đến tệp bên ngoài Vault hay bên trong Vault, server đều từ chối với mã lỗi máy đọc được:  
  `403 SYMLINK_NOT_ALLOWED`.
- **Lý do**:
  1. MVP không yêu cầu symlink để hoàn thành trải nghiệm xem trước ghi chú.
  2. Triệt để tuân thủ nguyên tắc **Deny-by-default**.
  3. Giảm thiểu tối đa bề mặt tấn công hệ thống tệp (filesystem attack surface) và độ phức tạp do các điều kiện đua TOCTOU (Time-of-Check to Time-of-Use).
  4. Mọi tính năng hỗ trợ symlink được dời sang Phase P4.2 để xem xét độc lập.

### 2.4. Quyết định Data Mapping: Tái sử dụng Model `Resource` Hiện hữu (Lựa chọn A)
Sau khi phân tích đối chiếu `prisma/schema.prisma` (dòng 74-85), `src/types/index.ts` (dòng 49-64), `src/lib/validation.ts` (dòng 227-270) và `src/server/services/backupService.ts` (dòng 89-100):

**Quyết định: Chọn Phương án A (Tái sử dụng bảng `Resource`)**.
- **Cơ sở thực chứng**:
  - Bảng `Resource` đã có sẵn các trường: `id`, `topicId` (FK liên kết với Topic), `title`, `type` (chuỗi), `url` (nullable), `filePath` (nullable String), `notes` (nullable String).
  - Không cần chạy Prisma migration (`prisma db push` / `prisma migrate`), bảo toàn 100% database hiện tại và tính tương thích với commit `58bc1b3`.
  - Tương thích 100% với subsystem Backup & Restore hiện hành (`backupService.ts` đã sao lưu và khôi phục đầy đủ bảng `Resource`).
  - Phân tách rõ ràng với bảng `Note`: Bảng `Note` chỉ lưu ghi chú nội bộ của Knowledge OS; tài liệu ngoài hoặc liên kết file thuộc về `Resource`.
- **Đặc tả ánh xạ trường (Field Mapping)**:
  - `Resource.id`: UUID do client/server cấp.
  - `Resource.topicId`: ID của Topic trong Knowledge OS.
  - `Resource.title`: Tên hiển thị của tài liệu (mặc định lấy theo tên file `.md` hoặc trích xuất từ frontmatter `title`).
  - `Resource.type`: Lưu giá trị định danh `"md"` hoặc `"obsidian"` (được mở rộng trong `ResourceTypeEnum` ở layer validation, schema Prisma kiểu `String` nhận trực tiếp).
  - `Resource.filePath`: Lưu **đường dẫn tương đối (relative path)** bên trong Vault (ví dụ: `Phat-Hoc/Bat-Chanh-Dao.md`). Tuyệt đối không lưu absolute OS path.
  - `Resource.url`: Lưu deep-link `obsidian://open?vault=...&file=...` được sinh chuẩn bằng `URLSearchParams` để mở nhanh bằng Obsidian Desktop.
  - `Resource.notes`: Lưu JSON metadata phụ nếu cần (ví dụ: `{"vaultName":"Khao-Cuu-Phat-Hoc","lastKnownMtime":"2026-08-25T14:30:00.000Z"}`).
- **Nguyên tắc Unlink**: Xóa record `Resource` trong database Knowledge OS chỉ xóa liên kết metadata; **tuyệt đối không xóa file vật lý trong Obsidian Vault**.

---

## 3. Kiến Trúc Bảo Mật Sandbox Filesystem (Deny-by-default)

Phương thức `startsWith()` **không bao giờ được xem là chốt chặn bảo mật duy nhất**.

### Thuật toán 12 bước Path Guard (`obsidianPathSanitizer`)
Mọi yêu cầu đọc tệp phải đi qua tuần tự 12 bước xác thực nghiêm ngặt:

1. **Reject Input Rỗng & Ký tự Điều khiển**: Từ chối ngay lập tức nếu input không phải chuỗi, chuỗi rỗng, chứa null byte (`\0`), hoặc là absolute path (`/Users/...`, `C:\...`).
2. **Chuẩn hóa Phân cách (Separators)**: Thay thế toàn bộ dấu gạch chéo ngược `\` thành `/`, loại bỏ các dấu gạch chéo thừa liên tiếp (`//+`).
3. **Phân tích Từng Phân đoạn (Segment Analysis)**: Tách đường dẫn thành các segments qua `/` và từ chối ngay lập tức nếu bất kỳ segment nào:
   - Là `.` hoặc `..`.
   - Bắt đầu bằng dấu chấm `.` (file/thư mục ẩn).
   - Trùng với thư mục cấm: `.obsidian`, `.git`, `.trash`, `node_modules`, `.env`.
4. **Lexical Target Resolution**: Tạo đường dẫn từ vựng ứng viên:  
   `lexicalCandidate = path.resolve(vaultRoot, relativePath)`.
5. **Lexical Relative Derivation**: Tính toán đường dẫn tương đối giữa root và candidate:  
   `lexicalRelative = path.relative(vaultRoot, lexicalCandidate)`.
6. **Lexical Containment Check**: Từ chối nếu `lexicalRelative === '..'`, `lexicalRelative.startsWith('..' + path.sep)`, hoặc `path.isAbsolute(lexicalRelative)`.
7. **Lstat & Kiểm tra Symlink / Loại Tệp**:  
   - Thực thi `fs.promises.lstat(lexicalCandidate)` (hoặc `fs.lstatSync`).
   - Nếu `ENOENT` → trả mã lỗi `404 FILE_NOT_FOUND`.
   - **Chốt chặn Symlink**: Nếu `stat.isSymbolicLink()` là `true` → **Lập tức từ chối với mã lỗi `403 SYMLINK_NOT_ALLOWED`** (bất kể trỏ vào trong hay ra ngoài Vault).
   - Nếu không phải regular file (`!stat.isFile()`) (ví dụ là thư mục, socket, device FIFO) → từ chối `403 INVALID_FILE_TYPE`.
8. **Realpath Resolution**:  
   - Phân giải đường dẫn thực tế của Vault root: `realVaultRoot = fs.realpathSync(vaultRoot)`.
   - Phân giải đường dẫn thực tế của ứng viên: `realTarget = fs.realpathSync(lexicalCandidate)`.
9. **Real Relative Containment Check (Defense-in-depth)**:  
   - Tính toán `realRelative = path.relative(realVaultRoot, realTarget)`.
   - Nếu `realRelative === '..'`, `realRelative.startsWith('..' + path.sep)`, hoặc `path.isAbsolute(realRelative)` → Lập tức chặn với mã lỗi `403 PATH_OUTSIDE_VAULT`.
10. **Defense-in-depth Prefix Boundary Check**:  
    Xác minh bổ sung `realTarget.startsWith(realVaultRoot + path.sep)`.
11. **Extension Whitelist & Size Limit**:  
    - Phần mở rộng phải nằm trong whitelist: `['.md', '.markdown']`.
    - Kiểm tra `stat.size <= MAX_MARKDOWN_BYTES (2 MiB)`. Nếu vượt quá → trả mã lỗi `413 FILE_TOO_LARGE` và **tuyệt đối không đọc body vào bộ nhớ**.
12. **Safe Read & Data Masking**:  
    Đọc tệp bằng UTF-8. Response trả về chỉ bao gồm `relativePath`, `fileName`, `frontmatter`, `outline`, `content`. Tuyệt đối không bao giờ để lộ absolute system path ra response body hay UI toast.

---

## 4. Giới Hạn Vận Hành (Operational Bounds)

- **`MAX_MARKDOWN_BYTES` = 2,097,152 bytes (2 MiB)**:
  - *Lý do*: Một ghi chú văn bản thuần dài 50.000 từ cũng chỉ chiếm khoảng 300-500 KB. Ngưỡng 2 MiB đáp ứng hoàn toàn các ghi chú học thuật đồ sộ nhất, đồng thời triệt tiêu nguy cơ Node.js Event Loop bị nghẽn do phân tích chuỗi khổng lồ hoặc gây cạn kiệt bộ nhớ (OOM DoS).
- **Không Scan Toàn bộ Vault**: Endpoint `/api/obsidian/vault/status` chỉ kiểm tra tính hợp lệ của `vaultRoot` và quyền truy cập (`fs.access`). Nếu đếm file, phải áp dụng time budget tối đa 200ms hoặc cap ở 500 files để không làm chậm server.
- **Manual Refresh Only**: Người dùng chủ động bấm nút "Làm mới từ Vault"; không chạy file watcher ngầm (như `chokidar`) ở P4.1 để bảo toàn tài nguyên CPU/pin của máy local.

---

## 5. Chính Sách Bảo Mật Markdown (Markdown Security Policy)

- **Renderer Dự kiến**: Sử dụng `MarkdownReadabilityRenderer` hiện hữu của ứng dụng (`src/lib/markdownReadability.tsx`), xử lý dựa trên token hóa React Native-friendly/DOM-safe.
- **Chính sách HTML thô**: Mặc định loại bỏ hoặc encode an toàn (`escapeHtml`), không render thẻ HTML nguy hiểm.
- **Cấm Tuyệt đối**: Thẻ `<script>`, `<iframe>`, `<style>`, `<object>`, `<embed>`, và toàn bộ các thuộc tính event handler inline (`onload`, `onerror`, `onclick`, ...).
- **Liên kết Ngoài**: Chỉ chấp nhận giao thức `http://` và `https://`. Mọi liên kết ngoài luôn được đính kèm thuộc tính `target="_blank"` và `rel="noopener noreferrer"`.
- **Cú pháp Plugin (Dataview, Templater, Code blocks)**: Không thực thi code. Hiển thị dạng khối code (plaintext/preformatted code block) an toàn.

---

## 6. Hậu Quả & Đánh Giá (Consequences)

- **Ưu điểm**:
  - Loại bỏ hoàn toàn nguy cơ symlink attack/TOCTOU bằng cơ chế từ chối 100% symlink.
  - Không thay đổi schema database, an toàn tuyệt đối với production data hiện có.
  - Khả năng chống tấn công leo thang thư mục (Path Traversal) đạt cấp độ Enterprise qua 12 bước kiểm định.
  - Trải nghiệm liền mạch giữa hai ứng dụng độc lập.
- **Hạn chế**:
  - Không hỗ trợ symbolic links trong P4.1 (dời P4.2).
  - Chưa hỗ trợ liên kết trực tiếp cấp độ Note (dành cho P4.2).
  - Chưa hỗ trợ hiển thị ảnh đính kèm nội bộ (attachments) trong Markdown của Obsidian ở P4.1.
