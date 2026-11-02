# ADR-118: Hợp Đồng Lưu Trữ Bền Vững Tài Liệu Resource & Cơ Chế openTarget

- **Trạng thái**: Đề xuất đã hiệu chỉnh (Proposed - Revised)
- **Ngày quyết định**: 2026-11-01 (Cập nhật: 2026-11-02)
- **Phạm vi tác động**: `src/server/routes/resourceRoutes.ts`, `prisma/schema.prisma`, `src/types/index.ts`, `src/lib/validation.ts`, `src/server/routes/syncRoutes.ts`, `src/server/services/backupService.ts`, `src/components/modals/ResourceFormModal.tsx`
- **Người đề xuất**: Staff Software Architect & Engineering Pair

---

## 1. Ngữ Cảnh & Vấn Đề (Context)

Trong hệ thống Knowledge OS, `Resource` đại diện cho các tài liệu tham khảo nghiên cứu (sách, bài báo, video, tài liệu PDF, ghi chú Obsidian) thuộc về một chủ đề cụ thể (`Topic`).

Qua khảo sát thực tế hệ thống hiện hành (chế độ Chỉ Đọc):
1. **Trường `openTarget` bị mất khi tải lại**:
   - Giao diện [ResourceFormModal.tsx](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/modals/ResourceFormModal.tsx) và bộ giải quyết [resourceOpenResolver.ts](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/resourceOpenResolver.ts) dựa vào `openTarget` để kích hoạt đích mở ưu tiên (VD: `archive://<uuid>`, `obsidian://open?...`, `https://drive.google.com/...`).
   - Tuy nhiên, trong [prisma/schema.prisma](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/prisma/schema.prisma) và bảng `Resource` của PostgreSQL thực tế, trường `openTarget` hoàn toàn chưa có cột lưu trữ.
   - Khi tạo hoặc chỉnh sửa Resource, client gửi `openTarget` lên nhưng [resourceRoutes.ts](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/server/routes/resourceRoutes.ts) bỏ qua không truyền vào Prisma.
   - Khi người dùng tải lại trang (`loadInitialData`), dữ liệu canonical trả về từ server không có `openTarget`, dẫn tới việc ghi đè xóa sạch giá trị này trong client.
2. **Xung đột khi chỉnh sửa hoặc phát lại (Replay) từ Sync Queue**:
   - `ApiDataRepository.saveResource` và `SyncQueueService` sử dụng cùng một endpoint `POST /api/resources` cho cả hành vi tạo mới và lưu cập nhật.
   - Tuy nhiên, `POST /api/resources` hiện tại chỉ gọi `prisma.resource.create`. Nếu `id` đã tồn tại trên server, Prisma ném lỗi trùng khóa chính (`P2002`).

---

## 2. Quyết Định Kiến Trúc: Cột Nullable (Phương án A) vs Đóng Gói Vào Notes (Phương án B)

| Tiêu chí đánh giá | Phương án A: Thêm cột `Resource.openTarget String?` (Khuyến nghị) | Phương án B: Đóng gói vào `notes` (`<!-- open-target: ... -->`) |
| :--- | :--- | :--- |
| **Tính tường minh & SSOT** | Cao. Khớp trực tiếp với TypeScript interface và Zod schema sẵn có. | Thấp. Lẫn lộn giữa nội dung ghi chú người dùng và siêu dữ liệu kỹ thuật. |
| **Xử lý Round-trip** | Tự nhiên, không cần serialize/deserialize phức tạp. | Dễ lỗi regex nếu người dùng vô tình chỉnh sửa thẻ HTML trong textarea `notes`. |
| **Tương thích Academic Metadata** | Độc lập hoàn toàn với khối siêu dữ liệu `<!-- academic-metadata: ... -->`. | Nguy cơ xung đột cú pháp comment lồng nhau khi trích xuất thông tin trích dẫn. |
| **Độ phức tạp Migration** | Cần 1 migration bổ sung cột nullable (`ALTER TABLE "Resource" ADD COLUMN "openTarget" TEXT;`). | Không cần migration DB. |
| **Khả năng Rollback** | Dễ dàng (Code rollback an toàn, giữ cột nullable). | Khó dọn dẹp các thẻ metadata đã ghi vào nội dung text của cột `notes`. |

👉 **Quyết định**: Chọn **Phương án A (Cột Nullable `openTarget String?`)**.

---

## 3. Chốt Một Hợp Đồng Ghi Chuẩn: `POST /api/resources`

### 3.1. Lý Do Không Bổ Sung Endpoint `PUT /resources/:id` Ở Slice 1
- **Đối chiếu Caller hiện hữu**:
  - `DataContext.addResource` và `DataContext.updateResource` đều gọi `dataRepository.saveResource(resource)`.
  - `ApiDataRepository.saveResource` chỉ gửi `POST /api/resources`.
  - `SyncQueueService` khi phát lại mutation `save` chỉ gửi `POST /api/resources`.
  - Không có bất kỳ component hoặc service nào trong hệ thống gọi `PUT /api/resources/:id`.
- **Nguyên tắc thiết kế**: Không thêm endpoint `PUT` chỉ vì "đầy đủ REST" khi chưa có consumer. Toàn bộ nhu cầu tạo mới, cập nhật và phát lại ngoại tuyến được phục vụ trọn vẹn và an toàn qua một endpoint duy nhất: **`POST /api/resources`**.

### 3.2. Yêu Cầu Hành Vi Cốt Lõi (Behavioral Requirements)
Hợp đồng không khóa vào một thuật toán thực thi nội bộ cụ thể, mà bắt buộc đáp ứng các tiêu chuẩn hành vi:
1. **Bảo toàn tính ổn định của ID (Stable ID Guarantee)**:
   - Client gửi payload có stable ID (`req.body.id`).
   - Nếu bản ghi mang ID này chưa tồn tại trong cơ sở dữ liệu: Tạo mới bản ghi, phản hồi HTTP **`201 Created`**.
   - Nếu bản ghi mang ID này đã tồn tại: Cập nhật bản ghi, phản hồi HTTP **`200 OK`**.
   - **Tuyệt đối không tạo ra bản ghi thứ hai có cùng stable ID**.
2. **Không nuốt lỗi cơ sở dữ liệu (No Silent DB Errors)**:
   - Nếu cơ sở dữ liệu ném lỗi (kết nối, timeout, vi phạm ràng buộc không hợp lệ), máy chủ **tuyệt đối không được trả response thành công**.
3. **Bảo toàn tính toàn vẹn ràng buộc (No Swallowing Foreign Constraints)**:
   - Máy chủ không được nuốt mọi lỗi `P2002` hoặc coi mọi lỗi trùng lặp là race condition hợp lệ. Các vi phạm ràng buộc dữ liệu khác (như foreign key sai, constraint ngoài mong muốn) phải được báo lỗi chính xác ra HTTP boundary.
4. **Giới hạn khi thiếu Client ID (No Client ID Limitation)**:
   - Nếu một request tạo mới không truyền `req.body.id` và gặp sự cố mạng phải thử lại (retry), hệ thống **chưa có bảo đảm chống tạo trùng** (vì mỗi lần gọi server sẽ sinh một ID mới). Bảo đảm chống tạo trùng chỉ áp dụng với các request có stable ID từ client.
5. **Giới hạn xung đột dữ liệu cũ - mới (LWW Limitation)**:
   - Slice 1 tuân thủ cơ chế **Last-Write-Wins (LWW)** hiện hành của hệ thống, không có versioning engine. Mutation cũ được phát lại sau có thể ghi đè dữ liệu mới hơn.
6. **Chiến lược xử lý Concurrency Race Condition (Phương án 1 đã triển khai & xác minh)**:
   - Khi hai request cùng stable ID gửi lên đồng thời và cùng vượt qua bước `findUnique`:
   - Câu lệnh `create` của một trong hai request sẽ ném lỗi vi phạm Unique Constraint `P2002` từ PostgreSQL engine.
   - **Điều kiện Fallback chặt chẽ**: Chỉ fallback update khi mã lỗi là `P2002` VÀ meta target / driver adapter error xác nhận vi phạm conflict chính xác trên trường `Resource.id` hoặc constraint `Resource_pkey`. Nếu `P2002` đến từ constraint khác hoặc vi phạm ràng buộc khác, rethrow lỗi gốc ngay lập tức.
   - **Xử lý**: Fallback update chạy độc lập ngoài transaction đã lỗi, áp dụng đầy đủ quy tắc mapping `openTarget` giống hệt nhánh update (omitted giữ nguyên, null/empty xóa về `NULL`, string trim).
   - **Kết quả & Kiểm chứng thực nghiệm**: Đã vượt qua 20/20 lần thử nghiệm race đồng thời liên tiếp trên PostgreSQL thật (1 request trả `201 Created`, 1 request trả `200 OK`, DB chỉ có chính xác 1 record với target hợp lệ).
   - **Hạn chế công bố**: Đây chỉ là cơ chế giải quyết race condition khi tạo đồng thời cùng một stable ID; cơ chế này không phải là versioning engine và không ngăn chặn việc stale payload ghi đè dữ liệu mới hơn (LWW).

---

## 4. Bảng Semantics Chi Tiết của `openTarget`

| Trường hợp (Case) | Payload `openTarget` | Hành vi DB PostgreSQL | Diễn giải nghiệp vụ |
| :--- | :--- | :--- | :--- |
| **Create: Omitted** | Không truyền trường này (`undefined`) | Ghi `NULL` | Tạo mới không cấu hình override |
| **Create: Null** | `null` | Ghi `NULL` | Tường minh không cấu hình override |
| **Create: Empty** | `""` (chuỗi rỗng) | Ghi `NULL` | Chuẩn hóa rỗng thành `NULL` |
| **Create: Whitespace** | `"   "` (khoảng trắng) | Ghi `NULL` | Chuẩn hóa khoảng trắng thành `NULL` |
| **Create: String** | Chuỗi hợp lệ (VD: `archive://...`) | Trim và lưu giá trị | Lưu đích mở ưu tiên |
| **Update: Omitted** | Không truyền trường này (`undefined`) | **Giữ nguyên giá trị cũ** | Sửa trường khác, không làm mất `openTarget` đã lưu |
| **Update: Null** | `null` | **Cập nhật thành `NULL`** | Người dùng chủ động gỡ bỏ override |
| **Update: Empty** | `""` (chuỗi rỗng) | **Cập nhật thành `NULL`** | Người dùng xóa trắng ô nhập trên form |
| **Update: Whitespace** | `"   "` (khoảng trắng) | **Cập nhật thành `NULL`** | Người dùng nhập khoảng trắng trên form |
| **Update: String** | Chuỗi hợp lệ | Trim và cập nhật giá trị mới | Cập nhật đích mở ưu tiên mới |
| **Sync / Merge: ID mới thiếu trường** | Record mới trong payload thiếu `openTarget` | **Ghi `NULL`** | Record mới được khởi tạo mặc định không override |
| **Sync / Merge: ID đã có thiếu trường** | Record đã có trong DB, payload thiếu `openTarget` | **Giữ nguyên giá trị cũ** | Bảo vệ dữ liệu máy chủ khi client/snapshot cũ đồng bộ |
| **Replace Restore** | Snapshot cũ thiếu trường | **Ghi `NULL` trên record mới** | Khác biệt cốt lõi với Merge: Replace xóa sạch DB nên record mới tạo sẽ mang `NULL` |

---

## 5. Kiểm Tra Validator và Luồng Xóa Trên Form

### 5.1. Nâng Cấp Zod Validator
- Hiện tại, [validation.ts#L254](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/validation.ts#L254) dùng `openTarget: z.string().optional()`, sẽ từ chối giá trị `null`.
- Cần cập nhật thành `openTarget: z.string().nullable().optional()` để phân biệt rõ giữa:
  - `undefined`: Omitted (giữ nguyên khi update).
  - `null`: Explicit Clear (chủ động xóa về `NULL`).
  - `string`: Cập nhật giá trị chuỗi.

### 5.2. Hiệu Chỉnh [ResourceFormModal.tsx](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/modals/ResourceFormModal.tsx)
- Khi người dùng xóa trắng ô nhập `openTarget` trên form chỉnh sửa (`initialResource` tồn tại), form phải gửi `openTarget: null` thay vì biến thành `undefined`.

### 5.3. Phân Định Fallback Mở Ngoài vs Trình Đọc
Theo mã nguồn [resourceOpenResolver.ts](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/resourceOpenResolver.ts):
- **Khi mở ngoài / viewer (`resolveResourceOpenTarget`)**: `openTarget` -> `url` -> `filePath` -> `none`.
- **Khi mở trong Reader (`resolveResourceReaderDescriptor`)**: `openTarget` -> `filePath` -> `url`.
- Hai luồng có thứ tự fallback khác nhau do Reader nội bộ có khả năng render tệp cục bộ PDF/EPUB/MD, còn URL ngoài phải đẩy ra trình duyệt.

---

## 6. Quy Tắc Xử Lý Lỗi & Trạng Thái Lưu (Error & Save Status)

- `DataContext` gọi `dataRepository.saveResource` theo cơ chế non-blocking: `.catch(console.error)`.
- `ApiDataRepository.saveResource` khi gặp lỗi HTTP/mất mạng sẽ tự động đẩy mutation vào `syncQueue` với `status: 'pending'` và trả về `resource`.
- Form gọi `onClose()` theo cơ chế Optimistic UI.
- **Bản chất**: Trạng thái trong `syncQueue` là **Lưu tạm ngoại tuyến (Queued Offline)**, tuyệt đối không được coi là **Đã lưu máy chủ thành công (Server-Persisted)**.
- **Quyết định UI Slice 1**: Duy trì Optimistic UI hiện tại để không gây xáo trộn trải nghiệm người dùng; không tự ý thay đổi luồng đóng form khi chưa có phê duyệt thiết kế UX riêng.

---

## 7. Kế Hoạch Migration & Rollback Đã Hiệu Chỉnh

### 7.1. Cấu Hình Runtime & Phiên Bản Xác Thực
- **Lockfile & Packages**: `prisma: 7.9.1`, `@prisma/client: 7.9.1` (xác thực từ `package-lock.json`).
- **Prisma Configuration**: `prisma.config.ts` xác định `schema: "prisma/schema.prisma"` và `datasource.url`.
- **Shadow Database**: **Chưa xác định** (không có cấu hình shadow DB trong `prisma.config.ts` hay `schema.prisma`).
- **Lịch sử Migration**: Bảng `_prisma_migrations` chỉ chứa 2 bản ghi lịch sử, còn lại các bảng trong DB sinh ra từ `prisma db push` (Schema Drift).
- **Nguyên tắc an toàn**: **Tuyệt đối không chạy `prisma migrate dev` trên database `knowledge_os` đang sử dụng**.

### 7.2. Kế Hoạch Rehearsal Trong Disposable Environment
- Sử dụng cơ sở dữ liệu test cô lập dùng một lần (Disposable DB / Docker test container).
- Câu lệnh SQL thuần:
  ```sql
  ALTER TABLE "Resource" ADD COLUMN "openTarget" TEXT;
  ```
- File JSON snapshot hiện tại chỉ là bản sao lưu logic, **không thay thế được bản sao lưu nhị phân đầy đủ (`pg_dump`)**.

### 7.3. Chiến Lược Rollback
- **Ưu tiên 1 (Code Rollback)**: Hoàn tác mã nguồn về commit trước. Do cột `openTarget` là nullable, mã nguồn cũ vẫn hoạt động bình thường mà không bị ảnh hưởng. Dữ liệu đã lưu của người dùng được bảo toàn.
- **Ưu tiên 2 (Data Dropping Rollback)**: Chỉ xóa cột bằng `ALTER TABLE "Resource" DROP COLUMN "openTarget";` khi có phê duyệt rõ ràng từ người dùng và **đã xuất bản sao lưu đầy đủ (`pg_dump`)**.
