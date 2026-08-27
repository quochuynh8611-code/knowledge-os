# ADR-016: Ranh Giới Lớp Dữ Liệu & Nguồn Chân Lý Thống Nhất (Data Layer Boundary & Single Source of Truth)

- **Mã ADR:** ADR-016
- **Trạng thái:** PROPOSED (DRAFT FOR APPROVAL)
- **Ngày tạo:** 2026-08-27
- **Tác giả:** Staff Software Engineer / Technical Architect
- **Phạm vi:** `src/services/dataRepository.ts`, `src/context/DataContext.tsx`, `src/lib/storage.ts`, `server.ts`, `prisma/schema.prisma`

---

## 1. Bối Cảnh (Context)

Hệ thống Knowledge OS hiện tại sử dụng kiến trúc lưu trữ 2 tầng (Dual-Tier Persistence):
1. Tầng ưu tiên: REST API Express kết nối PostgreSQL thông qua Prisma ORM.
2. Tầng dự phòng: `LocalStorageDataRepository` lưu trữ offline trên trình duyệt với key `phat_hoc_huyen_hoc_clean_v3`.

Tuy nhiên, `DataContext.tsx` đang tự thực hiện đọc/ghi trực tiếp vào `localStorage` ở 6 key con (`${STORAGE_KEY}_categories`, `${STORAGE_KEY}_topics`, ...) song song với việc gọi `dataRepository.save*()`. Đồng thời, `server.ts` chứa toàn bộ 1486 dòng code bao gồm HTTP routing, Prisma transaction, backup/restore logic, và AI resilience.

---

## 2. Vấn Đề (Problem Statement)

1. **Phân mảnh Nguồn chân lý (Split Source of Truth):**
   - `DataContext` vừa trực tiếp đọc/ghi `localStorage` trong `useState` và `useEffect`, vừa gọi `IDataRepository`.
   - Khi `dataRepository.loadInitialData()` trả về dữ liệu mới từ PostgreSQL, `DataContext` có nguy cơ ghi đè ngược dữ liệu cũ từ state khởi tạo `localStorage` nếu chu kỳ re-render xảy ra không đồng bộ.
2. **Dual-Write Divergence & Hybrid Schema:**
   - Dữ liệu tags hiện tại lưu ở 2 dạng: `tags: String[]` (denormalized trên bảng `Topic`) và `TopicTag` (normalized join table). Nếu không có repository trung tâm điều phối, hai cấu trúc này dễ bị lệch pha.
3. **Monolithic Server Endpoint:**
   - `server.ts` ôm toàn bộ trách nhiệm: routing, CORS, DB transaction, backup checksum calculation, AI streaming, rate limiting, và Vite dev middleware.

---

## 3. Ràng Buộc Bất Biến (Invariants & Constraints)

- **Bảo toàn tính hoạt động 100% khi Offline:** App phải chạy bình thường khi không có kết nối backend / PostgreSQL.
- **Không đổi Storage Key hiện hành:** `phat_hoc_huyen_hoc_clean_v3` là key chính thức, không phá vỡ dữ liệu người dùng cũ.
- **Bảo toàn Zero Binary Ingestion:** Không lưu trữ nội dung file vật lý (PDF/audio) trong state hay DB; chỉ lưu đường dẫn `filePath` / `url`.
- **Zero Regression:** 561 tests hiện có phải tiếp tục PASS.

---

## 4. Các Phương Án Lựa Chọn (Decision Options)

### Phương án A: Giữ nguyên cơ chế kép trong DataContext
- *Mô tả:* Tiếp tục để `DataContext` tự sync `localStorage` và gọi `IDataRepository`.
- *Ưu điểm:* Không cần sửa code DataContext.
- *Nhược điểm:* Technical debt tích tụ, khó viết test độc lập, dễ xung đột dữ liệu khi chuyển đổi online/offline.

### Phương án B (Recommended): Chuyển toàn bộ trách nhiệm Persistence cho `IDataRepository`
- *Mô tả:*
  1. `DataContext` chỉ giữ in-memory state và giao tiếp duy nhất qua `IDataRepository`.
  2. `LocalStorageDataRepository` chịu trách nhiệm toàn bộ việc đọc/ghi `localStorage` (cả key tổng và sub-keys nếu cần tương thích).
  3. `ApiDataRepository` bọc `LocalStorageDataRepository` làm fallback offline và write-through cache chuẩn mực.
  4. Chuẩn hóa routing của `server.ts` thành các module controllers riêng biệt: `topicController`, `noteController`, `backupController`, `healthController`.
- *Ưu điểm:* Phân định ranh giới rõ ràng, dễ mock/test, loại bỏ hoàn toàn dual-write bất nhất, mở đường cho offline-sync nâng cao.
- *Nhược điểm:* Cần refactor có kiểm soát lớp `DataContext` và `dataRepository.ts`.

---

## 5. Đánh Giá Trade-offs & Rủi Ro

| Tiêu chí | Phương án A | Phương án B (Khuyến nghị) |
|---|---|---|
| **Độ rõ ràng nguồn chân lý (SSOT)** | 🔴 Kém (2 nơi cùng ghi) | 🟢 Rất tốt (1 nơi duy nhất điều phối) |
| **Khả năng kiểm thử độc lập (Testability)** | 🟡 Trung bình | 🟢 Rất cao (Mock repo đơn giản) |
| **Blast Radius** | 🟢 Không thay đổi | 🟡 Trung bình (Được bảo vệ bởi 561 tests) |
| **Khả năng đảo ngược (Reversibility)** | 2-way door | 2-way door (Giao diện IDataRepository giữ nguyên) |

---

## 6. Lộ Trình Triển Khai (Rollout Plan)

1. **Giai đoạn 1 (Lớp Repository):** Gia cố `LocalStorageDataRepository` và `ApiDataRepository` để bao trọn việc lưu trữ sub-keys và cache consistency.
2. **Giai đoạn 2 (Tách Server Modularity):** Tách `server.ts` thành các routers con: `src/server/routes/{topics,notes,resources,backup,health}.ts`.
3. **Giai đoạn 3 (Đơn giản hóa DataContext persistence):** Loại bỏ các lệnh gọi `localStorage.getItem/setItem` rải rác trong `DataContext`, chuyển sang repository methods.
4. **Giai đoạn 4 (Tag Normalization Sync):** Đảm bảo API server tự động đồng bộ giữa `Topic.tags` và `TopicTag` thông qua Prisma transaction.

---

## 7. Open Questions (Câu hỏi cần phê duyệt)

1. Có đồng ý tách `server.ts` thành cấu trúc module `src/server/routes/*` để chuẩn hóa backend không?
2. Có đồng ý chuyển toàn bộ logic `localStorage` trong `DataContext` vào bên trong `LocalStorageDataRepository` để DataContext trở thành pure state layer không?
