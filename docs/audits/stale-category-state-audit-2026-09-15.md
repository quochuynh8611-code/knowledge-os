# Báo cáo Audit: Stale Category State & Client Hydration Loop

> **Thời gian thực hiện**: 2026-09-15 09:25:00 (Local Time)  
> **Phạm vi kiểm tra**: Client LocalStorage, DataContext Hydration, ApiDataRepository, Server `/api/sync/hydrate`, PostgreSQL DB.  
> **Mục tiêu**: Xác định nguyên nhân các lĩnh vực cũ ("Kinh Tế", "Khoa Học Tự Nhiên", "Khoa Học Xã Hội", "Kinh Tế Học") xuất hiện trên UI sau khi đã reset PostgreSQL, và lập phương án xử lý triệt để.

---

## 1. Nguồn Dữ Liệu Chân Lý (Source of Truth)

- **PostgreSQL Database (`localhost:5432/knowledge_os`)**: Nguồn chân lý duy nhất cho toàn bộ danh mục, chủ đề, ghi chú và thẻ học.
- **Dữ liệu chuẩn thương mại sau reset**:
  - Category duy nhất: `cat-root-dong-y` ("Đông Y", slug: `dong-y`, type: `dong-y`).
  - Topic duy nhất: `topic-dong-y-co-ban` ("Lý Luận Cơ Bản Đông Y", slug: `ly-luan-co-ban-dong-y`).
  - Note duy nhất: `note-commercial-onboarding` ("Hướng dẫn bắt đầu sử dụng Knowledge OS").
  - Flashcards: 2 thẻ mẫu (`card-commercial-1`, `card-commercial-2`).

---

## 2. Vị Trí Lưu Trữ Client (Storage Locations)

| Vị trí lưu trữ | Tên Key / Database | Mục đích | Hiện trạng |
| :--- | :--- | :--- | :--- |
| **LocalStorage** (Root) | `phat_hoc_huyen_hoc_clean_v3` | Snapshot offline toàn bộ state | Chứa payload cũ trước reset |
| **LocalStorage** (Sub-key) | `phat_hoc_huyen_hoc_clean_v3_categories` | Cache danh sách categories | Chứa 5-22 categories cũ |
| **LocalStorage** (Sub-key) | `phat_hoc_huyen_hoc_clean_v3_topics` | Cache danh sách topics | Chứa topics cũ |
| **LocalStorage** (Sub-key) | `phat_hoc_huyen_hoc_clean_v3_notes` | Cache danh sách notes | Chứa notes cũ |
| **LocalStorage** (Sub-key) | `phat_hoc_huyen_hoc_clean_v3_resources` | Cache danh sách resources | Trống hoặc tài liệu cũ |
| **LocalStorage** (Sub-key) | `phat_hoc_huyen_hoc_clean_v3_tags` | Cache danh sách tags | Chứa tags cũ |
| **LocalStorage** (Focus) | `knowledge_os_focus_domain_id_v1` | Lưu ID lĩnh vực đang focus | Có thể trỏ vào ID cũ |
| **IndexedDB / SessionStorage** | *Không sử dụng cho app state* | N/A | Không có |

---

## 3. Danh Sách Category IDs Phát Hiện Tại Thời Điểm Audit

### A. Category Hợp Lệ Cần Bảo Vệ Tuyệt Đối:
- **`cat-root-dong-y`**:
  - Name: `Đông Y`
  - Slug: `dong-y`
  - Type: `dong-y`
  - ParentId: `null`

### B. Category Rác / Stale Đang Bị Tái Sinh:
1. **`cat-root-kinh-te`** (Kinh Tế, slug: `kinh-te`)
2. **`cat-root-kinh-te-hoc`** (Kinh Tế Học, slug: `kinh-te-hoc`)
3. **`cat-1789397768580`** (Khoa Học Tự Nhiên, slug: `khoa-hoc-tu-nhien`)
4. **`cat-1789397768744`** (Khoa Học Xã Hội, slug: `khoa-hoc-xa-hoi`)

---

## 4. Phân Tích Nguyên Nhân Gốc (Root Cause Analysis)

### Cơ chế lặp phản hồi ngược (Feedback Loop):
1. **Khởi tạo đồng bộ từ cache cũ**:
   - Khi ứng dụng React khởi động tại trình duyệt, `DataContext.tsx` khởi tạo `useState` đồng bộ từ `safeGetLocalStorageItem('phat_hoc_huyen_hoc_clean_v3_categories')`.
   - Do trình duyệt chưa xóa LocalStorage sau Commercial Reset, state `categories` ban đầu nạp các danh mục cũ (`Kinh Tế`, `Khoa Học Tự Nhiên`, v.v.).
2. **Auto-Sync gửi dữ liệu cũ lên Server**:
   - `DataContext.tsx` có `useEffect` theo dõi `[categories, topics, notes, resources, tags]`.
   - Ngay sau mount (hoặc khi state thay đổi), `dataRepository.syncHydrate()` được kích hoạt với payload chứa các categories cũ từ LocalStorage.
3. **Server Upsert mù quáng vào PostgreSQL**:
   - `POST /api/sync/hydrate` tại `src/server/routes/syncRoutes.ts` thực thi `tx.category.upsert({ where: { slug: cat.slug }, ... })` cho từng category trong payload client gửi lên.
   - Do đó, server đã **vô tình re-insert** lại 4 category cũ vào PostgreSQL Database!
4. **Hậu quả**:
   - Khi API `/api/categories` được gọi, PostgreSQL trả về 5 categories thay vì 1.
   - Client tiếp tục lưu 5 categories vào LocalStorage, tạo thành vòng lặp stale state vĩnh viễn.

---

## 5. Đề Xuất Giải Pháp (Proposed Solution)

### Bước 1 — Phá vỡ Feedback Loop & Bảo vệ Server SSOT:
1. **Client State Reconciliation ([src/context/DataContext.tsx](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/context/DataContext.tsx))**:
   - Không tự động sync state ban đầu từ LocalStorage lên server nếu chưa hoàn tất `loadInitialData()` từ server.
   - Khi `loadInitialData()` nhận dữ liệu từ server (chỉ có Đông Y), lập tức ghi đè (`overwrite`) LocalStorage bằng dữ liệu server chuẩn, loại bỏ toàn bộ các key/entity mồ côi không tồn tại trên server.
2. **Repository & Storage Guard ([src/services/dataRepository.ts](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/services/dataRepository.ts))**:
   - Thêm cờ nhận diện nguồn dữ liệu canonical. Khi server trực tuyến, server là Single Source of Truth (SSOT).
   - Thêm cơ chế state versioning (`STORAGE_VERSION_KEY`): nếu cache client mang phiên bản cũ, tự động dọn sạch và nạp `INITIAL_CATEGORIES`.

### Bước 2 — Re-execute Commercial Reset trên PostgreSQL:
- Chạy lại script dọn sạch 4 categories mồ côi (`cat-root-kinh-te`, `cat-root-kinh-te-hoc`, `cat-1789397768580`, `cat-1789397768744`) và 1 topic mồ côi (`topic-1789398103951`) trên PostgreSQL để database quay về đúng 1 Category "Đông Y", 1 Topic, 1 Note, 2 Flashcards.

---

## 6. Blast Radius & Đánh Giá Rủi Ro

- **Rủi ro mất dữ liệu Đông Y**: Không (được bảo vệ qua guard checks và invariant verification).
- **Rủi ro mất tài liệu EPUB/Library**: Không (dữ liệu EPUB lưu trong `public/docs/epubs` và Obsidian vault, không bị ảnh hưởng).
- **Khả năng Rollback**:
  - Đã có snapshot backup an toàn tại `backups/commercial-reset-2026-09-14T143438/`.
  - Mọi thao tác đều có audit trước và sau thực thi.
