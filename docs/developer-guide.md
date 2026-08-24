# 🛠️ Knowledge OS — Developer & Contributor Guide

> **Tài liệu Kỹ thuật, Kiến trúc Hệ thống & Quy chuẩn Phát triển**

---

## 📑 Mục lục
1. [Tổng quan Kiến trúc & Tech Stack](#1-tổng-quan-kiến-trúc--tech-stack)
2. [Dual-Tier Persistence & Cơ chế Phục hồi (Resilience)](#2-dual-tier-persistence--cơ-chế-phục-hồi-resilience)
3. [Ràng buộc Dữ liệu Chuẩn hóa (Dataset Canonical Invariants)](#3-ràng-buộc-dữ-liệu-chuẩn-hóa-dataset-canonical-invariants)
4. [Resource Contract & Ranh giới Bảo mật Trình duyệt (Browser Sandbox)](#4-resource-contract--ranh-giới-bảo-mật-trình-duyệt-browser-sandbox)
5. [Cấu trúc Thư mục Dự án](#5-cấu-trúc-thư-mục-dự-án)
6. [Các Lệnh Thực Thi (Scripts in package.json)](#6-các-lệnh-thực-thi-scripts-in-packagejson)
7. [Quy chuẩn Phát triển (OODA & Test-First Protocol)](#7-quy-chuẩn-phát-triển-ooda--test-first-protocol)
8. [Phân định Roadmap (Phases 1–3 Status)](#8-phân-định-roadmap-phases-13-status)

---

## 1. Tổng quan Kiến trúc & Tech Stack

Knowledge OS được xây dựng dưới dạng **Full-stack Monolith** tinh gọn, kết hợp giao diện React SPA hiện đại và backend Express API phục vụ khảo cứu thông minh:

- **Frontend Core:** React 19, TypeScript ~5.8, Vite 6, TailwindCSS v4.
- **Visuals & Graphs:** Recharts (tiến độ), Lucide React (iconography), Canvas Confetti, D3 force graph.
- **Backend Runtime:** Node.js v22/v26, Express 4, tsx (dev server), esbuild (production bundling).
- **ORM & Database:** Prisma 7.9.1 với `@prisma/adapter-pg` và PostgreSQL (optional).
- **AI Intelligence:** `@google/genai` (Gemini Flash 3.6 / 3.7 / 3.1 Pro Preview) với cơ chế tự phục hồi backoff.
- **Testing Guardrails:** Vitest 4, Testing Library, JSDOM (18 test files, 128+ tests).

---

## 2. Dual-Tier Persistence & Cơ chế Phục hồi (Resilience)

Ứng dụng áp dụng mô hình **Dual-Tier Persistence** độc lập và chịu lỗi cao:

```
                      ┌───────────────────────────┐
                      │    React DataContext      │
                      └─────────────┬─────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
      ┌────────────────────────┐         ┌─────────────────────────┐
      │ Primary: Express / DB  │         │ Fallback: LocalStorage  │
      │  (PostgreSQL + Prisma) │ ──FAIL──▶  (phat_hoc_huyen_hoc_   │
      │   Endpoint /api/health │         │        clean_v3)        │
      └────────────────────────┘         └─────────────────────────┘
```

1. **Khởi tạo (Bootstrap):** 
   - `DataContext` nạp dữ liệu từ `LocalStorageDataRepository` để giao diện hiển thị tức thì (< 50ms).
   - Đồng thời thực hiện `GET /api/health/db`. Nếu backend và PostgreSQL khả dụng, dữ liệu đồng bộ hóa qua API.
2. **Khả năng tự vận hành Offline (Zero-dependency):**
   - Nếu PostgreSQL chưa chạy hoặc database chưa khởi tạo (`database does not exist`), ứng dụng vẫn hoạt động 100% không crash nhờ lớp fallback LocalStorage.
3. **Toàn vẹn Dữ liệu (Checksum Parity):**
   - Mọi bản Backup Snapshot JSON đều chứa mã băm SHA-256 (`calculateBackupChecksum`).
   - Khi Restore, hệ thống xác thực checksum và validate toàn bộ schema trước khi nạp lại state.

---

## 3. Ràng buộc Dữ liệu Chuẩn hóa (Dataset Canonical Invariants)

Mã nguồn dữ liệu hạt nhân tại `src/data/initialData.ts` phải tuân thủ nghiêm ngặt các Invariants:

- **Sĩ số chuẩn hóa:**
  - `INITIAL_CATEGORIES` = 8 danh mục
  - `INITIAL_TOPICS` = 35 chủ đề
  - `INITIAL_NOTES` = 5 ghi chú mẫu
  - `INITIAL_RESOURCES` = 4 tài liệu hạt nhân
  - `INITIAL_TAGS` = 12 thẻ chuẩn
- **8 Categories Canonical:**
  - Phật học: `cat-tam-tang`, `cat-abhidharma`, `cat-thien-dinh`, `cat-triet-hoc-phat-giao`, `cat-tam-thuc`.
  - Huyền học: `cat-dich-hoc`, `cat-phong-thuy`, `cat-tu-vi-tu-tru`.
  - *Tuyệt đối không sử dụng category ID ngoài danh mục này (ví dụ không dùng `cat-menh-ly`).*
- **Tính toàn vẹn quan hệ:**
  - Không có liên kết tự trỏ (no self-links).
  - Không có liên kết trùng lặp đích.
  - Không có orphan notes hay orphan resources (mọi note/resource phải có `topicId` trỏ đúng vào 1 trong 35 topics).

---

## 4. Resource Contract & Ranh giới Bảo mật Trình duyệt (Browser Sandbox)

### 4.1. Resource Schema Contract
Theo ADR-011, `ResourceCreateSchema` trong `src/lib/validation.ts` quy định:
- Bắt buộc phải có **ít nhất một nguồn**: `url` (Web URL) HOẶC `filePath` (Tệp cục bộ).
- Từ chối chuỗi rỗng hoặc toàn khoảng trắng (`"   "`).
- **Zero Binary Ingestion**: Tuyệt đối không đọc binary (`FileReader.readAsArrayBuffer` hay base64). Dung lượng metadata của một Resource payload luôn `< 2KB`.

### 4.2. Giới hạn Web Browser Sandbox đối với File Path
- **Thực tế kỹ thuật:** Trình duyệt Web (Chrome, Safari, Firefox) vì lý do bảo mật **không bao giờ** cung cấp đường dẫn tuyệt đối của hệ điều hành (`/Users/username/...` hoặc `C:\...`) qua đối tượng `File` HTML5.
- **Giải pháp UX**:
  - Người dùng bấm "Duyệt tệp" -> chọn file qua native file dialog.
  - App trích xuất `file.name` tự động điền vào ô `filePath`, tự động nhận diện `type` (PDF, Audio, Video, Sách), và tự gợi ý `title`.
  - Hiển thị thông báo minh bạch giải thích về giới hạn sandbox trình duyệt và cho phép người dùng tùy ý sửa thêm tiền tố thư mục nếu muốn.

---

## 5. Cấu trúc Thư mục Dự án

```
Dashboard-update/
├── docs/                      # Tài liệu kỹ thuật, ADRs, Gherkins, User Guides
│   ├── adr/                   # Architecture Decision Records (ADR-010, ADR-011, ADR-012)
│   ├── gherkin/               # BDD Specifications (.feature files)
│   ├── user-guide.md          # Cẩm nang người dùng
│   ├── developer-guide.md     # Cẩm nang kỹ thuật & contributor
│   └── PROJECT_STATUS.md      # Bảng điều hành tiến độ dự án
├── prisma/                    # Schema cơ sở dữ liệu PostgreSQL & Seed script
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── components/            # React UI components
│   │   ├── integrations/      # ObsidianBridgeModal, NotebookLMStudioModal
│   │   ├── layout/            # Navbar, Sidebar, Breadcrumbs
│   │   ├── modals/            # ResourceFormModal, DataManagementModal, etc.
│   │   ├── resources/         # ResourcesManager
│   │   └── topics/            # TopicTree, TopicDetail
│   ├── context/               # React DataContext & State Management
│   ├── data/                  # initialData.ts (SSOT Canonical Dataset)
│   ├── lib/                   # Validation schemas, Obsidian, NotebookLM helpers
│   ├── services/              # Data repositories (API & LocalStorage)
│   └── types/                 # Domain TypeScript interfaces
├── tests/
│   └── unit/                  # Vitest unit & integration test suites (18 suites)
├── server.ts                  # Backend Express server & Gemini AI API
├── package.json
└── vite.config.ts
```

---

## 6. Các Lệnh Thực Thi (Scripts in package.json)

```bash
# 1. Cài đặt thư viện phụ thuộc
npm install

# 2. Chạy môi trường phát triển (Dev Server tại http://localhost:3000)
npm run dev

# 3. Chạy kiểm thử toàn bộ test suites (Vitest)
npm test

# 4. Kiểm tra kiểu dữ liệu TypeScript (Type checking)
npm run lint

# 5. Build bundle production (Vite client + Esbuild server)
npm run build

# 6. Chạy server production từ bundle đã build
npm run start

# 7. Seed dữ liệu mẫu vào PostgreSQL (khi DB sẵn sàng)
npm run db:seed
```

---

## 7. Quy chuẩn Phát triển (OODA & Test-First Protocol)

Mọi đóng góp mã nguồn trong repository bắt buộc tuân thủ quy trình **OODA 5 bước**:

1. **Observe & Orient:** Đọc mã nguồn thực tế trước khi viết. Không suy đoán schema, không "vibe coding".
2. **Specs & ADR:** Viết/cập nhật ADR và Gherkin feature để khóa chặt thiết kế kiến trúc.
3. **Test-First (Failing Tests):** Viết test kiểm chứng phát hiện lỗ hổng hiện tại (bộ test phải RED trên mã nguồn cũ).
4. **Human Approval:** Dừng lại, báo cáo blast radius và chờ phê duyệt rõ ràng từ người quản lý dự án.
5. **Implement & Verify:** Triển khai thay đổi tối thiểu, chạy `npm test` và `npm run build` để xác nhận 100% GREEN.

---

## 8. Phân định Roadmap (Phases 1–3 Status)

| Phase | Nội dung | Trạng thái kỹ thuật |
| :--- | :--- | :---: |
| **Phase 1** | **Local File Picker UX:** Nút Duyệt tệp, auto-detect type/title, sandbox notice, zero binary. | 🟡 **Spec & Test-First Ready** *(Failing tests đã tạo, CHƯA implement production code, chờ approval)* |
| **Phase 2a** | **Obsidian Open / Export UX:** Tích hợp `obsidian://` deep-links và xuất trọn bộ ZIP Vault. | ⚪ **Scoped / Not Implemented** |
| **Phase 2b** | **NotebookLM Studio UX:** Đóng gói tài liệu nguồn sạch và quản lý Studio Artifacts. | ⚪ **Scoped / Not Implemented** |
| **Phase 3** | **Antigravity Handoff Bundle:** Sinh gói prompt bàn giao nghiên cứu chuyên sâu cho Agent AI. | ⚪ **Scoped / Not Implemented** |
