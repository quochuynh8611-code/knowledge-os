# Session Log — Commercial Domain Neutralization & Zero-Default Universal Workspace

## 1. Thông Tin Phiên Làm Việc (Session Metadata)

- **Dự án:** Knowledge OS — Bàn Điều Khiển Nghiên Cứu Đa Lĩnh Vực
- **Thư mục dự án:** `/Users/mr.chem/Documents/Lap-trinh/Dashboard-update`
- **Chủ đề:** Trung tính hóa toàn bộ nội dung chuyên biệt, thiết lập trạng thái xuất phát điểm sạch 0 bản ghi (Commercial Zero-Default Baseline), dọn dẹp bộ nhớ đệm và giải quyết hiện tượng Runtime Mismatch trên Chrome PWA Desktop App.
- **Thời gian thực hiện:** 2026-10-16 — 2026-10-17
- **Branch:** `main` (Commit HEAD: `486c6178aea62f62cea055c8276c2f2b1ce7caf0`)
- **Vai trò:** Staff Software Engineer kiêm Technical Architect
- **Trạng thái:** ✅ **HOÀN TẤT XÁC MINH TRÊN RUNTIME THẬT (Build PASS, Test 68/68 PASS, PostgreSQL 0 record, Browser In-Context API `[]`, Screenshot Verified)**.

---

## 2. Bối Cảnh & Mục Tiêu Nghiệp Vụ (Business Objectives)

Hệ thống được phát triển ban đầu phục vụ nghiên cứu chuyên sâu về Phật học, Luận tạng và Huyền học Đông phương. Để chuẩn bị thương mại hóa sản phẩm cho cộng đồng người dùng đa ngành (công nghệ, tài chính, y dược, luật học, ngôn ngữ, quản trị, v.v.), ứng dụng cần đưa về trạng thái trung tính tuyệt đối:

1. **Khởi tạo sạch (Clean Slate / Zero Defaults):**
   - Không áp đặt bất kỳ danh mục hoặc chủ đề nghiên cứu mẫu nào (0 categories, 0 topics, 0 notes, 0 resources, 0 tags, 0 flashcards).
   - Người dùng mới bắt đầu từ giao diện trống tinh tươm và tự tạo lĩnh vực đầu tiên của riêng mình.
2. **Loại bỏ thương hiệu & tiêu đề chuyên biệt:**
   - Thay thế các dòng tiêu đề "Nghiên cứu Phật học & Huyền học" bằng thương hiệu trung tính: **"Nghiên Cứu"** đi kèm subtitle **"Hệ thống hóa tri thức đa lĩnh vực"**.
   - Chuẩn hóa HTML `<title>` thành `Nghiên Cứu`.
   - Chuẩn hóa Vault Obsidian mặc định thành `Knowledge-Vault`.
3. **Trung tính hóa các trường nhập liệu & UI Fallback:**
   - Xóa bỏ các placeholder gợi ý chuyên biệt ("Vi Diệu Pháp", "Tâm Vương", "Cửu Cung", "Quẻ Càn", "Bát Nhã", "Tứ Niệm Xứ", "Dược Học", v.v.).
   - Loại bỏ các logic kiểm tra cứng mã định danh danh mục bất khả xâm phạm (`cat-root-phat-hoc`, `cat-root-huyen-hoc`, `cat-root-dong-y`, `cat-root-ngon-ngu`, `isEconomyMergeSource`).
   - Xóa các ký tự biểu tượng đồ thị `佛` (Phật) và `易` (Dịch) trong component Knowledge Graph.

---

## 3. Điều Tra Kỹ Thuật & Nguyên Nhân Gốc Rễ (Root Cause Analysis)

Trong quá trình thực hiện, kiểm thử tự động báo PASS nhưng kiểm thử trực quan trên giao diện thực tế (Manual QA) ban đầu bị fail 2 lần do dữ liệu cũ vẫn xuất hiện trở lại. Đội ngũ đã thực hiện điều tra sâu và xác định 3 nguyên nhân cốt lõi:

### 3.1. Vòng lặp đồng bộ hai chiều (Bidirectional Sync Loop in DataContext)
- **Hiện tượng:** Khi database PostgreSQL được reset về 0 bản ghi, trình duyệt của người dùng vẫn còn lưu dữ liệu cũ trong `localStorage` (dưới key cũ `phat_hoc_huyen_hoc_clean_v3`).
- **Cơ chế tái sinh:** Hàm `loadInitialData()` của frontend khi thấy server trả về rỗng đã kích hoạt fallback lấy dữ liệu từ `localStorage`. Ngay sau đó, `useEffect` tự động đồng bộ gọi `dataRepository.syncHydrate()` POST toàn bộ dữ liệu từ `localStorage` ngược lên server `/api/sync/hydrate`, khiến database PostgreSQL bị nạp lại toàn bộ dữ liệu mẫu cũ.

### 3.2. Mã nguồn UI bảo vệ cứng các danh mục cũ
- Trong `TopicTree.tsx`, nút xóa danh mục bị chặn bởi điều kiện:
  `!['cat-root-phat-hoc', 'cat-root-huyen-hoc', 'cat-root-dong-y', 'cat-root-ngon-ngu'].includes(cat.id)`
  khiến người dùng không thể xóa bỏ các danh mục mẫu này khỏi giao diện.
- Trong `topicSelector.ts`, `SearchFilters.tsx`, `KnowledgeGraph.tsx`, các nhánh switch-case nhị phân hardcode ép nhãn thành "Phật Học" / "Huyền Học".

### 3.3. Hiện tượng Runtime Mismatch trên Chrome PWA Desktop App
- **Hiện tượng:** Server curl trả `[]`, browser headless chụp ảnh sạch, nhưng người dùng mở ứng dụng trên máy vẫn thấy 10 topics cũ (bao gồm "Kinh 66") và thanh tiêu đề ghi `Nghiên Cứu Phật Học & Huyền Học - Nghiên Cứu`.
- **Nguyên nhân chính xác:**
  - Người dùng đang mở ứng dụng thông qua **Desktop App Shortcut của Chrome**:
    `/Users/mr.chem/Applications/Chrome Apps.localized/Nghiên Cứu Phật Học & Huyền Học.app` (PID `92883`, `app_mode_loader`).
  - Shortcut này được tạo từ trước với metadata `CFBundleName = "Nghiên Cứu Phật Học & Huyền Học"`. Trên macOS, cửa sổ App Mode luôn dùng tên file `.app` làm tiền tố tiêu đề cửa sổ, bất kể thẻ `<title>` HTML là gì.
  - Cửa sổ PWA chạy ngầm lưu cache LevelDB tại `Google/Chrome/Profile 1` và giữ trạng thái RAM của phiên làm việc cũ khi chưa được kích hoạt Hard Reload (`Cmd+Shift+R`).

---

## 4. Các Thay Đổi & Giải Pháp Triển Khai (Implementation)

### 4.1. Backup Dữ Liệu An Toàn
- Trước khi thực hiện reset, toàn bộ dữ liệu cũ đã được kết xuất an toàn thành bản snapshot JSON:
  - File: [`backups/pre_reset_backup_20261016_213525.json`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/backups/pre_reset_backup_20261016_213525.json)
  - Quy mô dữ liệu: 11 categories, 10 topics, 8 notes, 5 resources.

### 4.2. Khắc phục DataContext & Cơ Chế Lưu Trữ
- **Nâng cấp Storage Namespace:**
  - Trong `src/lib/storage.ts`: Đổi `STORAGE_ROOT_KEY = "knowledge_os_v4"`, duy trì `CURRENT_STORAGE_VERSION = 4`.
  - Bổ sung hàm quét và thanh trừng triệt để tất cả key cũ mang tiền tố `phat_hoc_huyen_hoc_clean_v3_*`.
- **Chặn vòng lặp tái sinh dữ liệu trong `src/context/DataContext.tsx`:**
  - Thêm cờ `hasUserMutatedRef` để chặn `syncHydrate()` tự động đẩy dữ liệu lên server trong lần render khởi đầu. Chỉ khi người dùng thực hiện một thao tác chỉnh sửa/thêm mới rõ ràng thì quá trình sync mới được phép chạy.
  - Trong `loadInitialData()`: Thiết lập Server làm **Nguồn chân lý tuyệt đối (SSOT)**. Nếu server trả về `[]`, client lập tức ghi đè `[]` vào `localStorage` và đặt state về rỗng, triệt tiêu hoàn toàn cơ chế tự phục hồi từ cache cũ.
  - Trong `src/data/initialData.ts`: Đặt tất cả `INITIAL_CATEGORIES`, `INITIAL_TOPICS`, `INITIAL_NOTES`, `INITIAL_RESOURCES`, `INITIAL_TAGS` thành mảng rỗng `[]`.

### 4.3. Dọn Dẹp UI & Mapper Chuyên Biệt
- `src/components/topics/TopicTree.tsx`: Xóa bỏ điều kiện bảo vệ bất tử của các ID `cat-root-*` và logic `isEconomyMergeSource`. Giờ đây toàn bộ danh mục đều có thể chỉnh sửa/xóa bình thường.
- `src/lib/topicSelector.ts`: Gỡ bỏ các nhánh switch-case hardcode; lấy nhãn lĩnh vực động dựa trên `category.name`.
- `src/components/search/SearchFilters.tsx`: Trung tính hóa domain chips và iconography.
- `src/components/graph/KnowledgeGraph.tsx`: Xóa glyphs tôn giáo `佛` / `易`, chuẩn hóa bảng màu đồ thị trung tính.
- `src/components/layout/Navbar.tsx`: Chuẩn hóa workspace branding thành `Nghiên Cứu [WORKBENCH] - HỆ THỐNG HÓA TRI THỨC ĐA LĨNH VỰC`.
- `index.html`: Cập nhật `<title>Nghiên Cứu</title>` và meta description trung tính.

### 4.4. Reset Cơ Sở Dữ Liệu PostgreSQL
- Thực thi script bảo trì:
  `npx tsx scripts/maintenance/commercial-reset-db.ts --execute --confirm="XOA TOAN BO DATA CA NHAN"`
- Đã xác minh trực tiếp qua Prisma Client:
  `{ categories: 0, topics: 0, notes: 0, resources: 0 }`.

---

## 5. Bằng Chứng Xác Minh Thực Tế (Verification & Evidence)

### 5.1. Bằng chứng API qua `curl` Terminal
```bash
$ curl -s http://localhost:3000/api/categories
[]
$ curl -s http://localhost:3000/api/topics
[]
$ curl -s http://localhost:3000/api/notes
[]
$ curl -s http://localhost:3000/api/resources
[]
$ curl -s http://localhost:3000/api/health
{"status":"ok","hasApiKey":true,"timestamp":"2026-10-16T14:58:20.247Z"}
```

### 5.2. Bằng chứng in-browser qua Chrome DevTools MCP
Thực thi mã trực tiếp trong context trình duyệt tại `http://localhost:3000/#/`:
```json
{
  "locationHref": "http://localhost:3000/#/",
  "documentTitle": "Nghiên Cứu",
  "scripts": [
    "http://localhost:3000/@vite/client",
    "http://localhost:3000/src/main.tsx"
  ],
  "apiCategories": [],
  "apiTopics": [],
  "apiNotes": [],
  "apiResources": [],
  "localStorageSamples": {
    "knowledge_os_v4_categories": "[]",
    "knowledge_os_v4_topics": "[]",
    "knowledge_os_v4_notes": "[]",
    "knowledge_os_v4_resources": "[]",
    "knowledge_os_v4_tags": "[]",
    "knowledge_os_storage_version": "4"
  },
  "indexedDB": [],
  "cacheStorage": []
}
```

### 5.3. Bằng chứng Build & Test Suite
- **Production Build:**
  `npm run build` $\rightarrow$ Exit Code 0, sinh bundle sạch (`dist/index.html` 1.16 kB, `dist/server.cjs` 408.6 kB).
- **Unit & Regression Tests:**
  `npx vitest run tests/unit/commercial-neutralization.test.tsx ...` $\rightarrow$ **68/68 tests passed across 9 suites (100% GREEN)**.

### 5.4. Bằng chứng Ảnh Chụp Màn Hình (Visual QA)
- File ảnh lưu tại workspace: [`clean_runtime_dashboard_latest.png`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/clean_runtime_dashboard_latest.png)
- Kết quả trực quan xác nhận 6 tiêu chí:
  1. Title tab: `"Nghiên Cứu"`
  2. Sidebar Lĩnh vực nghiên cứu: Trống hoàn toàn, chỉ có nút `+ Thêm lĩnh vực`.
  3. Không còn bất kỳ danh mục mẫu Đông Y / Phật Học / Khoa Học Tự Nhiên / Kinh Tế / Phần Mềm nào.
  4. Số lượng chủ đề: 0, ghi chú: 0, tài liệu: 0. Không còn card topic mẫu.
  5. Không còn placeholder chuyên biệt.
  6. Empty state hiển thị rõ ràng: *"Chưa có lĩnh vực học tập nào. Hãy bấm 'Thêm lĩnh vực' để tạo không gian nghiên cứu đầu tiên của bạn."*

---

## 6. Hướng Dẫn Vận Hành Đối Với PWA Trên MacOS

Đối với máy của người dùng đã cài đặt Desktop PWA trước đây:
1. Đóng ứng dụng PWA cũ bằng tổ hợp phím `Cmd+Q`.
2. Mở trình duyệt Google Chrome thông thường và truy cập: **`http://localhost:3000/#/`**.
3. Nếu muốn tiếp tục sử dụng ứng dụng dưới dạng cửa sổ độc lập:
   - Xóa shortcut cũ tại: `/Users/mr.chem/Applications/Chrome Apps.localized/Nghiên Cứu Phật Học & Huyền Học.app`.
   - Mở `http://localhost:3000/#/` trên Chrome, bấm biểu tượng **Cài đặt ứng dụng** trên thanh địa chỉ để tạo PWA mới với tên chuẩn hóa **"Nghiên Cứu"**.

---

## 7. Kế Hoạch Hoàn Tác (Rollback Plan)

Trong trường hợp muốn khôi phục lại dữ liệu nghiên cứu chuyên biệt mẫu ban đầu:
1. **Khôi phục database:** Sử dụng file backup snapshot tại [`backups/pre_reset_backup_20261016_213525.json`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/backups/pre_reset_backup_20261016_213525.json) để import lại vào PostgreSQL thông qua giao diện Cài đặt (Settings -> Nhập dữ liệu JSON) hoặc qua Prisma seed.
2. **Khôi phục mã nguồn:** Thực hiện `git revert` hoặc `git checkout` các file đã chỉnh sửa.
