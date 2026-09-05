# ☸️ Knowledge OS — Hệ Điều Hành Quản Lý & Khảo Cứu Tri Thức Đa Ngành

> **Nền tảng Local-First chuyên sâu phục vụ Cấu trúc hóa Tri thức, Học tập Lặp lại Ngắt quãng (Spaced Repetition SM-2), Khảo cứu AI và Cầu nối Đa Nền tảng (Obsidian, NotebookLM, Antigravity AI).**

---

## 🟢 Trạng Thái Vận Hành Hiện Tại (macOS Local-First)

Ứng dụng đã được triển khai hoàn chỉnh ở chế độ **Local Production** trên MacBook:
* **Địa chỉ truy cập**: **[http://localhost:3000](http://localhost:3000)** (Phục vụ độc lập qua `dist/server.cjs`).
* **Khởi động tự động (Auto-start)**: Đã tích hợp macOS LaunchAgent (`com.knowledgeos.server`), tự động chạy ngầm khi đăng nhập MacBook và tự phục hồi khi crash.
* **Cơ sở dữ liệu**: PostgreSQL 15 local (`localhost:5432/knowledge_os`) với Prisma ORM & 11 bảng quan hệ.
* **Hệ thống Sao lưu**: Cơ chế Snapshot tự động kèm mã băm SHA-256 (`backups/`).
* **Sổ tay Vận hành**: Hướng dẫn chi tiết tại [`docs/runbooks/daily-operations-runbook.md`](docs/runbooks/daily-operations-runbook.md).

---

## 🧭 4 Lĩnh Vực Tri Thức Cốt Lõi (Canonical Knowledge Domains)

Knowledge OS tổ chức dữ liệu theo 4 trụ cột tri thức phương Đông có cấu trúc chuẩn mực:

1. **☸️ Phật Học (Buddhism & Philosophy):**
   * **Tam Tạng Thánh Điển (Tipiṭaka)**: Tạng Kinh (*Sutta*), Tạng Luật (*Vinaya*), Tạng Luận (*Abhidhamma*).
   * **Vi Diệu Pháp (Abhidharma)**: Hệ thống Tâm (*Citta*), Tâm Sở (*Cetasika*), Sắc Pháp (*Rūpa*), Niết Bàn (*Nibbāna*).
   * **Thiền Định (Bhāvanā)**: Thiền Chỉ (*Samatha*) và Thiền Quán Minh Sát (*Vipassanā*).
   * **Triết học Phật giáo**: Bát Nhã Ba La Mật (*Prajñāpāramitā*), Trung Quán Luận (*Mūlamadhyamakakārikā*), Duyên Khởi Luận.
2. **☯️ Huyền Học Phương Đông (Eastern Metaphysics):**
   * **Tam Thức Tối Cao**: Kỳ Môn Độn Giáp, Thái Ất Thần Số, Đại Lục Nhâm (Thiên - Địa - Nhân).
   * **Dịch Học & Bát Quái**: 64 Quẻ Kinh Dịch, Thoán Từ, Hào Từ, Âm Dương Biến Hóa.
   * **Phong Thủy & Môi Trường**: Loan Đầu, Lý Khí, Bát Trạch, Huyền Không Phi Tinh.
   * **Mệnh Lý Học**: Tử Vi Đẩu Số, Bát Tự Hà Lạc (Tứ Trụ).
3. **🌿 Đông Y Học (Traditional Eastern Medicine):**
   * Lý luận cơ bản: Âm Dương, Ngũ Hành, Khí Huyết, Tân Dịch.
   * Học thuyết Tạng Tượng, Bát Cương Biện Chứng, Dược học Cổ truyền và Hệ thống Kinh Lạc Châm Cứu.
4. **📖 Học Ngôn Ngữ & Thuật Ngữ Cổ (Ancient Linguistics):**
   * Ngữ pháp & Văn bản Pāli, Sanskrit (*Phạn ngữ*), Chữ Hán cổ (*Cổ văn / Hán Nôm*), Từ điển đối chiếu thuật ngữ liên ngôn ngữ.

---

## 🚀 Các Không Gian & Tính Năng Trọng Yếu Trong Ứng Dụng

| Không gian / Tính năng | Mô tả chi tiết |
| :--- | :--- |
| **🏠 Tổng Quan (Dashboard)** | Trung tâm điều khiển: Thống kê số lượng chủ đề, biểu đồ tiến độ học tập, hàng đợi ôn tập hôm nay, thanh bấm giờ phiên học (*Active Study Timer*). |
| **🌳 Cây Chủ Đề & Chi Tiết (Topics)** | Cấu trúc phân cấp đa tầng, phân loại theo hệ thống Canonical. Hỗ trợ xem chi tiết nội dung, liên kết hai chiều, ghi chú và tài nguyên đính kèm. |
| **🕸️ Đồ Thị Tri Thức (Knowledge Graph)** | Đồ thị mạng tương tác trực quan (Force-Directed Graph), mô phỏng các mối quan hệ liên ngành giữa Phật học, Huyền học và Đông Y. |
| **📈 Tiến Độ Học & Spaced Repetition** | Thuật toán ôn tập ngắt quãng **SM-2** chuẩn hóa: Đo lường hệ số ghi nhớ (*Ease Factor*), số lần lặp lại (*Repetitions*), tính khoảng cách ôn tập tiếp theo (*Next Review*). |
| **📝 Quản Lý Ghi Chú (Notes Manager)** | Soạn thảo Markdown cá nhân, gắn thẻ (*Tags*), liên kết nhiều chủ đề, phân quyền bảo mật riêng tư. |
| **📚 Quản Lý Tài Nguyên (Resources)** | Lưu trữ tài liệu tham khảo: URL bài viết, tệp cục bộ (PDF, Audio, Video), thông tin tác giả và ghi chú nguồn. |
| **🔍 Tìm Kiếm Nâng Cao (Advanced Search)** | Bộ máy tìm kiếm toàn văn (*Full-text Search*), lọc theo danh mục, thẻ tag, trạng thái học tập và ngày tạo. |
| **🤖 AI Research Studio** | Tích hợp **Google Gemini 2.0 / Flash**: Hỗ trợ nghiên cứu chuyên sâu, tổng hợp luận điểm, phát hiện liên kết liên ngành và quản lý trích dẫn học thuật (*Scholar Citation Engine*). |
| **🧩 Abhidharma Matrix** | Ma trận Vi Diệu Pháp tương tác: Khảo sát 89/121 Tâm, 52 Tâm Sở, 28 Sắc Pháp và mối tương quan duyên sinh. |
| **☯️ Divination Matrix** | Ma trận Huyền học: Khảo cứu 64 Quẻ Kinh Dịch, Bát Quái, Ngũ Hành sinh khắc, Thiên Can, Địa Chi. |
| **📖 Từ Điển Đa Ngữ (Multilingual Lexicon)** | Tra cứu và đối chiếu thuật ngữ chuyên sâu giữa 5 ngôn ngữ: Pāli - Sanskrit - Hán-Việt - Anh ngữ - Tạng ngữ. |
| **📑 Trình Đọc Tài Liệu (Docs Explorer)** | Đọc trực tiếp tài liệu kiến trúc (ADR), đặc tả kỹ thuật (Gherkin specs) và Runbook hệ thống ngay trên giao diện web. |

---

## 🔗 Hệ Thống Cầu Nối Đa Nền Tảng (Cross-Platform Hub)

Knowledge OS không hoạt động như một ốc đảo cô lập mà là trung tâm điều phối dữ liệu cho các công cụ nghiên cứu hàng đầu:

1. **Obsidian Bridge Modal:**
   * Xuất toàn bộ hoặc từng phần tri thức sang Vault **Obsidian** cá nhân.
   * Tự động sinh tệp Markdown chuẩn YAML frontmatter và cú pháp liên kết `[[Wiki-links]]`.
2. **NotebookLM Studio Modal:**
   * Đóng gói tài liệu nguồn sạch có cấu trúc chuẩn để nạp vào **Google NotebookLM**.
   * Hỗ trợ sinh Study Guide, Audio Podcast Briefing, FAQ và Q&A Flashcards có kiểm chứng (*Grounded AI*).
3. **Antigravity AI Handoff Modal:**
   * Đóng gói bối cảnh khảo cứu gửi sang Agentic AI trong thư mục `.agents/handoffs/` để thực thi các tác vụ tự động hóa chuyên sâu.
4. **Active Study Timer & Wrap-up:**
   * Bộ bấm giờ phiên học tập trung, ghi nhận thời gian học thực tế và tự động mở modal tổng kết (*Session Wrapup*) để lưu thành quả học tập.

---

## ⌨️ Phím Tắt Toàn Cục (Global Shortcuts)

| Phím tắt | Chức năng |
| :--- | :--- |
| `Cmd + K` hoặc `Ctrl + K` | Mở **Command Palette** (Tìm kiếm, chuyển tab, đổi theme Dark/Light) |
| `Cmd + /` hoặc `Ctrl + /` | Mở bảng danh mục toàn bộ phím tắt (**Shortcuts Modal**) |
| `Cmd + 1` .. `Cmd + 9` | Chuyển nhanh giữa các không gian làm việc |
| `Esc` | Đóng mọi cửa sổ Modal đang mở |

---

## 🛠️ Vận Hành Hằng Ngày & Quản Trị Hệ Thống

### 1. Mở ứng dụng hằng ngày
Dịch vụ chạy ngầm của Knowledge OS đã tự động bật cùng macOS:
👉 Truy cập ngay tại: **[http://localhost:3000](http://localhost:3000)**

### 2. Các lệnh terminal thường dùng
```bash
# Kiểm tra tình trạng kết nối & API Health
curl -s http://localhost:3000/api/health

# Tạo bản sao lưu Snapshot dữ liệu tức thời (kèm SHA-256 verification)
npm run snapshot:create

# Build lại ứng dụng sau khi cập nhật mã nguồn
npm run build

# Dừng server khẩn cấp / giải phóng cổng 3000
kill $(lsof -ti :3000)
```

### 3. Quản lý macOS LaunchAgent
```bash
# Kiểm tra trạng thái tiến trình LaunchAgent (hiển thị PID nếu đang chạy)
launchctl list | grep com.knowledgeos.server

# Tạm tắt auto-start
launchctl unload ~/Library/LaunchAgents/com.knowledgeos.server.plist

# Bật lại auto-start
launchctl load ~/Library/LaunchAgents/com.knowledgeos.server.plist

# Theo dõi log server trực tiếp
tail -f logs/output.log
```

---

## 📋 Bảng Lệnh Scripts (`package.json`)

| Script | Lệnh thực thi | Mô tả chức năng |
| :--- | :--- | :--- |
| `npm run start` | `node dist/server.cjs` | Chạy production server độc lập hiệu năng cao |
| `npm run dev` | `tsx server.ts` | Chạy môi trường development với Vite HMR |
| `npm run build` | `vite build && esbuild ...` | Đóng gói bundle Frontend và Backend |
| `npm run lint` | `tsc --noEmit` | Kiểm tra tính toàn vẹn kiểu dữ liệu TypeScript |
| `npm run test` | `vitest run` | Chạy toàn bộ Test Suite (129 files, 828+ tests) |
| `npm run db:push` | `prisma db push` | Đồng bộ schema Prisma vào cơ sở dữ liệu PostgreSQL |
| `npm run db:generate` | `prisma generate` | Khởi tạo lại type-safe `@prisma/client` |
| `npm run db:seed` | `tsx prisma/seed.ts` | Nạp dữ liệu mẫu ban đầu (Canonical Seeding) |
| `npm run snapshot:create` | `tsx scripts/backup-snapshot.ts` | Tạo snapshot sao lưu DB kèm kiểm tra dung lượng |
| `npm run snapshot:dry-run`| `tsx scripts/backup-snapshot.ts --dry-run` | Mô phỏng tạo snapshot trong bộ nhớ |
| `npm run snapshot:verify` | `tsx scripts/backup-snapshot.ts --verify <path>` | Xác minh tính toàn vẹn và mã băm SHA-256 |
| `npm run snapshot:prune`  | `tsx scripts/backup-snapshot.ts --prune` | Tự động dọn dẹp các bản snapshot cũ |

---

## 📚 Tài Liệu Kỹ Thuật Tham Khảo Thêm

* 📖 **Sổ tay Vận hành Hằng ngày**: [`docs/runbooks/daily-operations-runbook.md`](docs/runbooks/daily-operations-runbook.md)
* 📖 **Kiến trúc & Quyết định Kỹ thuật (ADR)**: [`docs/architecture-decisions.md`](docs/architecture-decisions.md)
* 📖 **Lộ trình Phát triển & Triển khai**: [`docs/implementation-roadmap.md`](docs/implementation-roadmap.md)
* 📖 **Hướng dẫn Đồng bộ Vault Obsidian**: [`docs/runbooks/offline-sync-subsystem-runbook.md`](docs/runbooks/offline-sync-subsystem-runbook.md)
