# ADR-105: Vault ArchivedDocument Source Identity for Persistent Reading History & Position

## Status
Accepted (Đã triển khai & kiểm chứng qua test integration)

## Context
Trước đây, tab Thư Viện Sách (Docs/Books Explorer) và Navbar mở tệp từ Obsidian Vault bằng chuỗi pseudo-id:
`documentId = "vault:${filePath}"`
Do `vault:${filePath}` không phải là một bản ghi thực sự trong cơ sở dữ liệu `ArchivedDocument`:
1. Vị trí đọc (`lastPosition`: CFI cho EPUB, headingId cho Markdown) chỉ được lưu tạm thời trên RAM store (`globalReadingPositionStore`).
2. Khi đóng ứng dụng, tải lại trang (reload) hoặc component bị unmount/remount, toàn bộ vị trí đọc và lịch sử đọc của tài liệu Vault bị mất.
3. Dải "Đọc gần đây" (`recentDocs` shelf) không thể khôi phục tài liệu Vault từ cơ sở dữ liệu bền vững `archivedDocs`.

## Decision
Áp dụng **Phương án A: Vault ArchivedDocument Source Identity**:
- Coi bảng `ArchivedDocument` là nguồn chân lý duy nhất (Single Source of Truth) lưu trữ metadata tài liệu và trạng thái đọc.
- Bổ sung định danh nguồn (`sourceType`, `sourcePath`, `sourceKey`) vào `ArchivedDocument`.
- Khi người dùng chọn tệp từ Obsidian Vault (ở DocsExplorerView hoặc Navbar), client gọi endpoint `POST /api/archive/vault/register` để đăng ký hoặc lấy UUID thực tế của tài liệu.
- `UnifiedResearchReader` nhận UUID thực tế làm `documentId`, từ đó tự động tái sử dụng toàn bộ cơ chế hydrate vị trí (`GET /api/archive/document/:id`) và persist vị trí (`PATCH /api/archive/document/:id/position`) đã có sẵn.

## Data Model Changes (Additive Only)
Cập nhật model `ArchivedDocument` trong `prisma/schema.prisma` và `src/types/index.ts`:

```prisma
model ArchivedDocument {
  id             String            @id @default(uuid())
  resourceId     String?           @unique
  resource       Resource?         @relation(fields: [resourceId], references: [id], onDelete: SetNull)
  fileName       String
  fileSize       Int
  mimeType       String
  fileFormat     String            // 'pdf' | 'epub' | 'md'
  contentHash    String            // SHA-256 hash (synthetic hash cho Vault)
  storageRelPath String            // 'vault://${sourcePath}' cho Vault
  lastPosition   Json?             // { cfi?, headingId?, pageNumber?, percentage? }
  lastReadAt     DateTime?
  readCount      Int               @default(0)
  sourceType     String?           // 'archive' | 'vault'
  sourcePath     String?           // relative path trong Obsidian Vault
  sourceKey      String?           @unique // Khóa idempotent duy nhất: 'vault:${sourcePath}'
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
  excerpts       ResearchExcerpt[]

  @@index([contentHash])
  @@index([fileFormat])
  @@index([lastReadAt])
  @@index([sourceType, sourcePath])
}
```

## API Contract

### 1. `POST /api/archive/vault/register`
- **Mục đích**: Đăng ký hoặc tra cứu bản ghi `ArchivedDocument` cho tệp Obsidian Vault một cách idempotent.
- **Request Body**:
  ```json
  {
    "path": "05_EPUB_Export/thien_dinh.epub",
    "fileName": "thien_dinh.epub",
    "fileFormat": "epub",
    "fileSize": 1048576
  }
  ```
- **Xử lý Idempotency**:
  - Tra cứu theo `sourceKey = "vault:" + cleanPath`.
  - Nếu đã tồn tại bản ghi: trả về ngay mã HTTP 200 kèm document đã có (không tạo duplicate record).
  - Nếu chưa có: tạo mới bản ghi với `sourceType: "vault"`, `storageRelPath: "vault://" + cleanPath`, `contentHash` là synthetic hash.
- **Response**:
  ```json
  {
    "success": true,
    "document": {
      "id": "c1f7a0b2-...",
      "sourceType": "vault",
      "sourcePath": "05_EPUB_Export/thien_dinh.epub",
      "sourceKey": "vault:05_EPUB_Export/thien_dinh.epub",
      "lastPosition": { "cfi": "epubcfi(/6/8...)" },
      "lastReadAt": "2026-10-18T14:00:00.000Z"
    }
  }
  ```

### 2. `GET /api/archive/file/:id` (Guard Protection)
- Nếu tài liệu có `sourceType === "vault"` hoặc `storageRelPath.startsWith("vault://")`:
  - Trả về HTTP 400 kèm mã lỗi `VAULT_FILE_STREAMING_NOT_SUPPORTED`.
  - Không cho phép `LocalArchiveStorage` cố đọc tệp ảo của Vault.

## Rationale for Architectural Choices

### Vì sao `contentHash` của Vault là Synthetic Deterministic Hash?
- Trường `contentHash` trong Prisma Schema là chuỗi bắt buộc 64 hex (`@index([contentHash])`) được thiết kế cho các tệp tải lên archive nội bộ.
- Với tệp Obsidian Vault, tệp nhị phân có thể rất lớn và nằm ở hệ thống tệp cục bộ bên ngoài. Việc đọc toàn bộ tệp nhị phân qua stream chỉ để tính checksum SHA-256 ngay khi người dùng click vào một cuốn sách là lãng phí tài nguyên IO và làm trễ UI.
- Do đó, hệ thống sử dụng:
  `contentHash = SHA-256("vault:" + cleanPath)`
  Đây là một synthetic hash mang tính định danh và tương thích 100% với schema, **không dùng cho mục đích dedup nhị phân**.

### Vì sao `storageRelPath` của Vault là Virtual Reference?
- Quy ước `storageRelPath = "vault://${cleanPath}"` phục vụ mục đích đánh dấu rõ ràng loại lưu trữ ảo.
- Tệp Vault **không bao giờ** được lưu trữ hay phục vụ bởi `LocalArchiveStorage`. Tệp Markdown được đọc trực tiếp qua `/api/obsidian/vault/file`, và tệp EPUB/PDF được stream qua `/api/obsidian/vault/attachment`.

## Degraded Mode (Graceful Degradation)
Nếu request `POST /api/archive/vault/register` gặp sự cố (mất mạng, server bận hoặc lỗi 500):
- UI không chặn người dùng và không làm vỡ giao diện đọc.
- Client tự động fallback về mã giả `vault:${cleanPath}` để mở trình đọc bình thường.
- Ở chế độ degraded, vị trí đọc chỉ được lưu trong RAM session mà không persist vào cơ sở dữ liệu.

## Non-Goals
1. Không mở rộng tầng trừu tượng repository (`IDataRepository`, `LocalStorageDataRepository`, `ApiDataRepository`, `researchRepositoryV2`).
2. Không thay đổi semantics của `readCount` (mỗi lần `PATCH position` thành công vẫn tăng `readCount` theo quy ước hiện có của dự án).
3. Không thực hiện dedup chéo giữa tệp Vault và tệp upload archive thông thường.

## Technical Debts & Known Limitations
- **Rename/Move trong Vault chưa migrate history**: Nếu người dùng đổi tên hoặc di chuyển tệp trong ứng dụng Obsidian bên ngoài, đường dẫn thay đổi sẽ khiến hệ thống đăng ký một `sourceKey` mới; lịch sử đọc và vị trí đọc của đường dẫn cũ hiện chưa tự động chuyển sang đường dẫn mới.
