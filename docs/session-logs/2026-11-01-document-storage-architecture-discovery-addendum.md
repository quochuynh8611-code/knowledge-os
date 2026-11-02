# Đính Chính & Bổ Sung Báo Cáo Khảo Sát Kiến Trúc Lưu Trữ Tài Liệu (Discovery Addendum)

**Ngày ghi nhận**: 2026-11-01 (Cập nhật: 2026-11-02)
**Phạm vi**: Hiệu chỉnh các diễn đạt, phân định tính chất bằng chứng và bổ sung phát hiện tầng validator/fallback/migration từ phiên điều tra ban đầu.
**Trạng thái**: Đã chuẩn hóa (Read-Only Baseline Preserved).

---

## 1. Mục Đích Bản Đính Chính
Bản đính chính này làm rõ các kết luận từ báo cáo khảo sát kỹ thuật trước đó, nhằm đảm bảo:
- Phân biệt rõ giữa phát hiện qua phân tích mã nguồn tĩnh (static code analysis) và lỗi đã được tái hiện trong môi trường kiểm thử/runtime thực tế.
- Chuẩn hóa thuật ngữ quan hệ dữ liệu theo đúng mô hình cơ sở dữ liệu.
- Tránh các khẳng định mang tính phỏng đoán nguyên nhân khi chưa có bằng chứng lịch sử ghi chép.
- Loại bỏ các từ ngữ tuyệt đối hóa (“rủi ro = 0”, “không ảnh hưởng”) chưa qua nghiệm chứng.
- Bổ sung phát hiện chính xác về sự khác biệt giữa fallback mở ngoài và fallback Reader, hành vi của Zod validator với `null`, và hiện trạng schema drift trong PostgreSQL.

---

## 2. Các Điểm Đính Chính & Bổ Sung Cụ Thể

### 2.1. Quan hệ giữa Resource và Topic
- **Diễn đạt cũ**: "Resource.topicId là 1-1 với Topic".
- **Hiệu chỉnh chuẩn xác**: Quan hệ giữa `Resource` và `Topic` trong cơ sở dữ liệu là **Nhiều - Một (Many-to-One)**. Một `Topic` có thể sở hữu nhiều `Resource` (`Topic.resources: Resource[]`), nhưng mỗi `Resource` chỉ thuộc về duy nhất một `Topic` (`Resource.topicId` trỏ trực tiếp tới khóa chính của `Topic` với ràng buộc khóa ngoại `onDelete: Cascade`).
- **Hệ quả kiến trúc**: Hiện tại chưa có bảng liên kết Many-to-Many (`TopicResourceLink`), do đó một tài liệu không thể gán trực tiếp cho nhiều chủ đề mà không tạo nhiều bản ghi `Resource`.

### 2.2. Phân biệt Static Code Finding vs Runtime Verified Issue
- **Vấn đề `POST /resources` ném lỗi P2002 khi edit**:
  - *Bản chất*: Phát hiện qua phân tích mã nguồn tĩnh (Static Analysis) tại [resourceRoutes.ts:POST /resources](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/server/routes/resourceRoutes.ts#L20) khi thấy handler gọi thẳng `prisma.resource.create` mà không có nhánh `findUnique`/`update` hay `PUT /resources/:id`.
  - *Mức độ*: Khi client gửi payload có `id` đã tồn tại trong DB, Prisma sẽ từ chối tạo mới với mã `P2002`. Cần được xác nhận bằng test tích hợp hermetic trước khi khẳng định tần suất xảy ra trên giao diện người dùng.
- **Vấn đề `openTarget` không lưu vào PostgreSQL**:
  - *Bản chất*: Đã xác nhận trên cả hai phương diện:
    1. Schema tĩnh: `prisma/schema.prisma` và bảng `Resource` trong DB không có cột `openTarget`.
    2. Route tĩnh: `resourceRoutes.ts` không truyền trường này vào `data` của Prisma.
    3. Trạng thái DB thực tế: Cả 3 record `Resource` trong DB hiện tại đều không chứa `openTarget`.

### 2.3. Trạng thái của 12 tệp nhị phân trong `data/archive`
- **Diễn đạt cũ**: "File mồ côi do upload lỗi hoặc DB reset".
- **Hiệu chỉnh chuẩn xác**: 12 tệp nhị phân (6 PDF, 3 EPUB, 3 MD với tổng dung lượng ~16.2 MB) hiện có mặt trên filesystem tại `data/archive/` nhưng **chưa xác định được bản ghi tham chiếu từ bảng `ArchivedDocument` của cơ sở dữ liệu hiện hành**.
- **Nguyên nhân**: Chưa thể kết luận nguyên nhân chính xác dẫn đến trạng thái này (có thể do các phiên kiểm thử trước đó, do các lần chạy reset/seed database, hoặc do luồng upload bị ngắt). **Không được coi đây là rác cần xóa và không tự ý dọn dẹp khi chưa có chỉ định rõ ràng**.

### 2.4. Bản chất của Backup Snapshot đối với `ResearchExcerpt`
- **Diễn đạt cũ**: "Toàn bộ highlight, ghi chú trích đoạn của người dùng bị mất 100% khi backup/restore".
- **Hiệu chỉnh chuẩn xác**: Bảng `ResearchExcerpt` hiện tại **không nằm trong danh sách các thực thể được xuất ra (exported) bởi `buildBackupSnapshotFromDb`** trong [backupService.ts](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/server/services/backupService.ts).
- **Hệ quả thực tế**: Dữ liệu highlight/trích đoạn trong cơ sở dữ liệu đang chạy **không bị mất** trong quá trình vận hành bình thường. Tuy nhiên, nếu người dùng tạo file JSON Backup Snapshot rồi khôi phục (restore) sang một cơ sở dữ liệu trống, dữ liệu `ResearchExcerpt` sẽ không được tái tạo từ file snapshot đó.

### 2.5. Phân định giữa suy đoán sai định dạng (Format Mismatch) và đổi phần mở rộng
- **Hiệu chỉnh**: Cần phân biệt rõ:
  - *Lỗi suy đoán MIME/Format*: Logic tại [ResourceFormModal.tsx#L248-L255](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/modals/ResourceFormModal.tsx#L248-L255) tự động ép `fileFormat = 'epub'` khi `type === 'book'` hoặc `fileFormat = 'md'` khi `type === 'article'`. Nếu người dùng chọn file `.docx`, `.mobi`, `.pdf`, mã nguồn có thể gửi sai `fileFormat` lên API lưu trữ.
  - *Đổi phần mở rộng file (Extension Change)*: Là hành vi người dùng đổi tên file ngoài hệ điều hành.

### 2.6. Khái niệm bản ghi cũ khi thay đổi đường dẫn (Path Change)
- **Hiệu chỉnh**: Nếu một tài liệu trong Obsidian Vault hoặc tệp cục bộ bị đổi tên hoặc di chuyển đường dẫn trên ổ đĩa, bản ghi `Resource` cũ trong DB **vẫn duy trì tính toàn vẹn khóa ngoại (FK) hợp lệ với `Topic`**. Bản ghi này chỉ bị mất khả năng mở tự động (Broken File Reference), không được gọi là "bản ghi mồ côi" (orphan record) về mặt cơ sở dữ liệu quan hệ.

### 2.7. Phân biệt Thứ Tự Fallback Giữa Mở Ngoài (Viewer) và Trình Đọc (Reader)
Qua kiểm tra source code thực tế tại [resourceOpenResolver.ts](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/resourceOpenResolver.ts):
- **Fallback Mở Ngoài / Trình duyệt (`resolveResourceOpenTarget`)** (dòng 84–140):
  1. `openTarget` (ưu tiên tuyệt đối)
  2. `url` (ưu tiên trang web tham chiếu mở trực tiếp trên tab mới)
  3. `filePath` (tệp cục bộ trên máy, yêu cầu sao chép đường dẫn để mở qua OS)
  4. `none`
- **Fallback Trình Đọc Nội Bộ (`resolveResourceReaderDescriptor`)** (dòng 191–205):
  1. `openTarget` (ưu tiên tuyệt đối)
  2. `filePath` (ưu tiên tệp cục bộ vì Reader có khả năng render trực tiếp PDF/EPUB/MD)
  3. `url` (nếu là HTTP URL thì Reader không render trực tiếp được mà phải mở ngoài)
- **Kết luận**: Hai luồng **không có cùng thứ tự fallback**. Mở ngoài ưu tiên `url` trước `filePath`, còn Reader ưu tiên `filePath` trước `url`.

### 2.8. Phát hiện Khoảng Trống Frontend khi Xóa `openTarget` trên Form
- Kiểm tra [ResourceFormModal.tsx#L225](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/modals/ResourceFormModal.tsx#L225):
  ```ts
  let finalOpenTarget: string | undefined = openTarget.trim() || undefined;
  ```
- **Hiện tượng**: Khi người dùng xóa trắng trường `openTarget` trong form chỉnh sửa, giá trị biến thành `undefined`.
- **Hệ quả**: Trong một hợp đồng update chuẩn (nơi `undefined` nghĩa là "omitted / giữ nguyên giá trị cũ"), việc gửi `undefined` sẽ **không thể xóa giá trị cũ trong DB**. Form phải gửi tường minh `null` khi người dùng xóa nội dung. Đây là thay đổi bắt buộc ở frontend trong scope Slice 1.

### 2.9. Phát hiện Validator Zod Từ Chối `null`
- Kiểm tra [validation.ts#L254-L264](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/validation.ts#L254-L264):
  - `ResourceSchema` khai báo `openTarget: z.string().nullable().optional()`.
  - Nhưng `ResourceCreateBaseSchema` lại khai báo `openTarget: z.string().optional()` (thiếu `.nullable()`).
- **Hệ quả**: Nếu client gửi `{ openTarget: null }`, `ResourceCreateBaseSchema` sẽ ném lỗi validation `Expected string, received null`. Cần bổ sung `.nullable()` để phân biệt rõ giữa `undefined` (omitted) và `null` (explicit delete).

### 2.10. Tình Trạng Schema Drift và Lịch Sử `db push` trong Database
- Prisma Client là phiên bản `^7.9.1`.
- Bảng `_prisma_migrations` trong DB thực tế chỉ có 2 bản ghi migration lịch sử. Toàn bộ các bảng mới (Archive, Excerpt, Flashcard, Session) được tạo qua `prisma db push`.
- Không có `shadowDatabaseUrl` được cấu hình.
- **Rủi ro nghiêm trọng**: Chạy `prisma migrate dev` trực tiếp trên database `knowledge_os` có thể khiến Prisma hiểu lầm có schema drift và yêu cầu reset (DROP) toàn bộ database! Mọi migration bắt buộc phải diễn tập trong môi trường disposable cô lập.
