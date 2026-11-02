# Đặc Tả Kỹ Thuật Slice 1: Resource Persistence & openTarget Contract

- **Phiên bản đặc tả**: 1.2.0 (RED-A Preparation)
- **Trạng thái**: Đã phê duyệt đặc tả — Sẵn sàng cho RED-A Phase
- **Tài liệu tham chiếu**: [ADR-118: Hợp Đồng Lưu Trữ Bền Vững Tài Liệu Resource & Cơ Chế openTarget](../adr/ADR-118-resource-persistence-contract-and-open-target.md)

---

## 1. Bảng Tổng Hợp Semantics Của `openTarget` Theo Từng Write Path

| Đường ghi (Write Path) | Method & Endpoint | Payload `openTarget` | Hành vi DB PostgreSQL | HTTP Status | Diễn giải nghiệp vụ & Bảo vệ dữ liệu |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Create Resource** | `POST /api/resources` | Omitted / `undefined` | Ghi `NULL` | `201 Created` | Tạo mới bản ghi, không có cấu hình đích mở override |
| | | `null` | Ghi `NULL` | `201 Created` | Tường minh không cấu hình override |
| | | `""` (chuỗi rỗng) | Ghi `NULL` | `201 Created` | Chuẩn hóa chuỗi rỗng thành `NULL` |
| | | `"   "` (khoảng trắng) | Ghi `NULL` | `201 Created` | Chuẩn hóa khoảng trắng thành `NULL` |
| | | Chuỗi hợp lệ (VD: `archive://...`) | Trim và lưu giá trị | `201 Created` | Tạo mới có đích mở ưu tiên |
| **2. Edit Resource** | `POST /api/resources` (có `id`) | Omitted / `undefined` | **Giữ nguyên giá trị cũ** | `200 OK` | Cập nhật trường khác (VD: `title`) không làm mất `openTarget` đã lưu |
| | | `null` | **Cập nhật thành `NULL`** | `200 OK` | Người dùng chủ động gỡ bỏ override đích mở |
| | | `""` (chuỗi rỗng) | **Cập nhật thành `NULL`** | `200 OK` | Người dùng xóa trắng ô nhập trên form |
| | | `"   "` (khoảng trắng) | **Cập nhật thành `NULL`** | `200 OK` | Người dùng nhập khoảng trắng trên form |
| | | Chuỗi hợp lệ | Trim và cập nhật giá trị mới | `200 OK` | Đổi sang đích mở ưu tiên mới |
| **3. Queue Replay** | `POST /api/resources` | Khớp mutation payload | Giống Edit Resource | `200 OK` (hoặc `201`) | Phát lại mutation ngoại tuyến từ `SyncQueue`; xử lý idempotent upsert |
| **4. Sync / Merge: ID mới** | `POST /api/sync` hoặc restore merge | Thiếu trường (omitted) | **Ghi `NULL`** | `200 OK` | Bản ghi mới tạo chưa có giá trị override |
| **5. Sync / Merge: ID đã có** | `POST /api/sync` hoặc restore merge | Thiếu trường (omitted) | **Giữ nguyên giá trị cũ** | `200 OK` | Bản ghi đã có được bảo vệ, client/snapshot cũ không làm mất dữ liệu server |
| **6. Replace Restore** | `POST /api/backup/restore` (replace) | Thiếu trường (snapshot cũ) | **Ghi `NULL` trên record mới** | `200 OK` | **Khác biệt cốt lõi với Merge**: Replace xóa sạch DB nên record mới tạo sẽ mang `NULL` |
| | | Có chuỗi hợp lệ | Ghi giá trị từ snapshot | `200 OK` | Tái lập chính xác bản ghi đã backup |

---

## 2. Đặc Tả Hành Vi Chi Tiết Bằng Cú Pháp Gherkin

### Feature: Resource Persistence & openTarget Integrity (Endpoint Duy Nhất: `POST /api/resources`)

```gherkin
Feature: Resource Persistence & openTarget Integrity

  Background:
    Given một chủ đề nghiên cứu "Chủ Đề Test" có id "topic-test-01" đã tồn tại trong cơ sở dữ liệu

  # Scenario 1: Tạo Resource rồi reload từ server vẫn còn openTarget
  Scenario: Tạo mới tài liệu có cấu hình openTarget và tải lại dữ liệu từ máy chủ
    Given người dùng nhập thông tin tài liệu mới:
      | title      | Khảo luận Kim Cang                    |
      | topicId    | topic-test-01                         |
      | type       | pdf                                   |
      | filePath   | 02_PDF_Source/kim_cang.pdf            |
      | openTarget | archive://doc-test-kim-cang-uuid-123  |
    When yêu cầu tạo tài liệu được gửi tới endpoint "POST /api/resources"
    Then máy chủ trả về mã trạng thái 201 Created
    And dữ liệu trả về có trường "openTarget" bằng "archive://doc-test-kim-cang-uuid-123"
    When client thực hiện tải lại toàn bộ tài liệu qua "GET /api/resources"
    Then danh sách tài liệu trả về phải chứa tài liệu "Khảo luận Kim Cang"
    And trường "openTarget" của tài liệu này vẫn giữ nguyên là "archive://doc-test-kim-cang-uuid-123"

  # Scenario 2: Chỉnh sửa Resource hiện có cập nhật đúng record qua POST upsert
  Scenario: Cập nhật thông tin tài liệu hiện có bằng POST upsert không gây lỗi trùng khóa
    Given một tài liệu đã tồn tại với id "res-existing-01" và tiêu đề "Tiêu Đề Cũ"
    When client gửi yêu cầu cập nhật tới "POST /api/resources" với payload chứa id "res-existing-01":
      | id         | res-existing-01                       |
      | topicId    | topic-test-01                         |
      | title      | Tiêu Đề Mới Đã Cập Nhật               |
      | openTarget | obsidian://open?vault=phat-hoc&file=A |
    Then máy chủ phản hồi mã trạng thái 200 OK thành công
    And bản ghi trong cơ sở dữ liệu có id "res-existing-01" được đổi tiêu đề thành "Tiêu Đề Mới Đã Cập Nhật"
    And không có bản ghi trùng lặp nào được tạo ra trong bảng Resource

  # Scenario 3: Update không gửi openTarget không vô tình xóa giá trị đã có
  Scenario: Cập nhật một trường khác mà không truyền openTarget phải giữ nguyên giá trị openTarget cũ
    Given tài liệu "res-preserve-01" có "openTarget" ban đầu là "archive://doc-preserve-999"
    When client gửi yêu cầu cập nhật tiêu đề thành "Tiêu Đề Đổi" mà không kèm trường "openTarget" (omitted)
    Then máy chủ trả về kết quả cập nhật thành công với mã 200 OK
    And trường "openTarget" của "res-preserve-01" trong cơ sở dữ liệu vẫn là "archive://doc-preserve-999"

  # Scenario 4: Người dùng chủ động xóa openTarget và fallback đúng
  Scenario: Người dùng xóa trắng trường openTarget trên form (gửi null hoặc chuỗi rỗng)
    Given tài liệu "res-clear-01" có:
      | openTarget | archive://doc-to-be-cleared |
      | url        | https://suttacentral.net/mn1|
      | filePath   | 01_Notes/kinh_trung_bo.md   |
    When người dùng gửi cập nhật với trường "openTarget" bằng null hoặc chuỗi rỗng ""
    Then cơ sở dữ liệu cập nhật cột "openTarget" thành NULL
    And khi bộ giải quyết đích mở ngoài (resolveResourceOpenTarget) phân giải tài liệu:
      | sourceField     | url                         |
      | canOpenDirectly | true                        |
      | targetUrl       | https://suttacentral.net/mn1|
    And khi bộ giải quyết Reader (resolveResourceReaderDescriptor) phân giải tài liệu:
      | sourceField     | filePath                  |
      | canOpenInReader | true                      |
      | targetUrl       | 01_Notes/kinh_trung_bo.md |

  # Scenario 5: Request lỗi validation không tạo bản ghi rác
  Scenario: Gửi payload sai cấu trúc validation bị từ chối chính xác
    When client gửi yêu cầu tới "POST /api/resources" nhưng bỏ trống trường "title"
    Then máy chủ trả về mã lỗi 400 Bad Request
    And thông điệp lỗi chỉ rõ trường "title" không được để trống
    And không có bản ghi rác nào được ghi vào cơ sở dữ liệu

  # Scenario 6: Replay mutation từ SyncQueue không tạo Resource trùng
  Scenario: Phát lại mutation ngoại tuyến từ SyncQueue khi mạng kết nối lại
    Given một mutation loại "save" cho resource "res-queue-01" đang chờ trong SyncQueue
    And resource "res-queue-01" đã được tạo thành công trên máy chủ trước khi rớt mạng
    When SyncQueue phát lại mutation bằng "POST /api/resources"
    Then máy chủ xử lý theo cơ chế idempotent update và trả về 200 OK
    And tổng số bản ghi Resource trong cơ sở dữ liệu không bị tăng lên
    And mutation được đánh dấu hoàn thành và gỡ bỏ khỏi SyncQueue

  # Scenario 7: Snapshot/client cũ không làm mất giá trị mới ngoài hợp đồng
  Scenario: Đồng bộ từ client phiên bản cũ không làm xóa mất openTarget
    Given tài liệu "res-compat-01" trong cơ sở dữ liệu có "openTarget" là "archive://active-doc"
    When client thực hiện hydration sync "POST /api/sync" với payload từ snapshot cũ không chứa thuộc tính "openTarget"
    Then quá trình đồng bộ hoàn tất thành công
    And bản ghi "res-compat-01" trong DB vẫn bảo tồn giá trị "openTarget" là "archive://active-doc"

  # Scenario 8: Concurrent Stable-ID Race Gate (Phương án 1 đã triển khai & xác minh)
  Scenario: Hai request POST đồng thời cùng stable ID đều thành công
    Given chưa có bản ghi Resource mang stable ID "res-race-01" trong cơ sở dữ liệu
    When client gửi đồng thời hai yêu cầu POST tới "/api/resources" với cùng ID "res-race-01"
    Then cả hai yêu cầu đều hoàn thành thành công và không ném lỗi 500
    And một yêu cầu hoàn thành việc tạo mới và trả về mã HTTP 201 Created
    And yêu cầu kia nhận lỗi P2002 conflict trên Resource.id, kích hoạt cơ chế fallback update ngoài transaction và trả về mã HTTP 200 OK
    And trong cơ sở dữ liệu chỉ tồn tại chính xác 1 bản ghi Resource mang ID "res-race-01"
    And giá trị "openTarget" cuối cùng của bản ghi là một trong hai giá trị hợp lệ được gửi lên
    And hạn chế được công bố rõ: cơ chế này không bảo vệ chống stale overwrite khi replay muộn (LWW)
```

---

## 3. Kế Hoạch Test-First Toàn Diện (RED Phase Plan)

Tuân thủ nghiêm ngặt **Quy tắc Bất Biến 2 (Test Hermeticity)**: CẤM gọi live mutation ra database thực tế `knowledge_os` hay server `localhost:3000`.

### Các Lớp Kiểm Thử
1. **Lớp Route Testing (`tests/unit/resource-routes-persistence.test.ts`)** (Trọng tâm RED-A):
   - `POST /api/resources` tạo mới: trả về `201 Created` và lưu `openTarget`.
   - `POST /api/resources` cập nhật theo ID: trả về `200 OK`, cập nhật đúng bản ghi.
   - Xử lý các trạng thái của `openTarget`: omitted (giữ nguyên), `null`/`""`/whitespace (xóa thành NULL), chuỗi (trim và lưu).
   - Xử lý lỗi validation: trả về `400 Bad Request` khi thiếu `title`/`topicId`.
   - Kiểm tra xử lý lỗi DB: không trả response thành công khi DB ném lỗi.
2. **Lớp Form Testing (`tests/unit/resource-form-modal-open-target.test.tsx`)** (Trọng tâm RED-A):
   - Khi sửa resource đã có và xóa trắng input `openTarget`: form phải gửi `openTarget: null` (thay vì `undefined`).
   - Khi đổi sang chuỗi mới có khoảng trắng: payload chứa chuỗi đã trim.
   - Khi chỉ sửa title: giá trị `openTarget` đang có không bị mất.
3. **Lớp Repository & Queue Testing**: Kiểm tra serialize và replay mutation.
4. **Lớp Sync Testing**: Kiểm tra hydration sync không ghi đè khi omitted.
5. **Lớp Backup Testing**: Kiểm tra export và merge vs replace restore.
6. **Lớp DB Round-Trip Cô Lập & Atomic Race Test**: Kiểm tra với schema PostgreSQL test riêng biệt.

---

## 4. Kế Hoạch Migration & Rollback Đã Hiệu Chỉnh

1. **Cấu hình & Phiên bản**: `prisma: 7.9.1`, `@prisma/client: 7.9.1`. Không có shadow DB. Bảng `_prisma_migrations` chỉ có 2 bản ghi lịch sử, còn lại các bảng sinh ra từ `db push`.
2. **Nguyên tắc**: Tuyệt đối không chạy `prisma migrate dev` trên `knowledge_os` đang sử dụng.
3. **Môi trường diễn tập**: Sử dụng Disposable Test DB riêng biệt.
4. **Rollback**: Ưu tiên 1 là Code Rollback (giữ cột nullable). `DROP COLUMN` chỉ thực hiện khi có phê duyệt và đã xuất `pg_dump`.

---

## 5. Danh Sách Đầy Đủ Các Tệp Thuộc Phạm Vi Thay Đổi (Slice 1 Scope)

1. `prisma/schema.prisma`
2. `prisma/migrations/<timestamp>_add_resource_open_target_column/migration.sql`
3. `src/types/index.ts`
4. `src/lib/validation.ts`
5. `src/server/routes/resourceRoutes.ts`
6. `src/server/routes/syncRoutes.ts`
7. `src/server/services/backupService.ts`
8. `src/components/modals/ResourceFormModal.tsx`
9. Test files: `tests/unit/resource-routes-persistence.test.ts`, `tests/unit/resource-form-modal-open-target.test.tsx`, v.v.
