# ADR-116: Phase 12 — Global Academic Command Palette (⌘K) & Scholarly Workflow Router Engine

## 1. Trạng Thái (Status)
- **Trạng thái:** 🟢 PROPOSED & IN PROGRESS (Phase 12A: Academic Command Palette Engine & Intent Parser; Phase 12B: CommandPalette UI Integration & Router Wiring)
- **Ngày quyết định:** 2026-10-26
- **Tác giả:** Staff Engineer & System Architect
- **Phạm vi:** Trụ cột điều hướng trung tâm và chặng kết thúc của Kế hoạch Nâng cấp Toàn diện Horizon 2 (Horizon 2 Master Upgrade). Xây dựng công cụ phân tích truy vấn có nhận thức tiền tố (Prefix-Aware Intent Parser), định tuyến luồng công việc học thuật (Scholarly Workflow Router), và bảng điều khiển lệnh toàn cục (`⌘K` / `Ctrl+K`) tích hợp tìm kiếm đa thực thể (Omnibox Multi-Entity Search) hỗ trợ tra cứu mã trích dẫn (`@citekey`), phát hiện trực tiếp mã số nhận dạng tài liệu số (`doi:` / `10.xxxx/...`), lọc lệnh hệ thống (`> command`), và truy hồi ngữ nghĩa lai RRF (`? semantic`).

---

## 2. Bối Cảnh (Context)
Trải qua 11 giai đoạn nâng cấp của Horizon 1 và Horizon 2, Knowledge OS đã trở thành một Trạm Làm Việc Nghiên Cứu Học Thuật (Academic Research Workstation) đa năng với hàng loạt phòng thu chuyên sâu:
1. **Horizon 1:** Ký hiệu Toán & Hóa học KaTeX/mhchem (`ADR-105`), Tra cứu DOI & Metadata tự động (`ADR-106`), Thuật toán Lặp lại Ngắt quãng FSRS v5 (`ADR-107`), Bộ Đọc PDF/EPUB/MD Đa Năng (`ADR-108`), Vector Search 128 chiều & Grounded RAG Cục bộ (`ADR-109`), Sao lưu Tự động Guarded Snapshot 7 Ngày (`ADR-110`).
2. **Horizon 2:** Trích đoạn sang Flashcard/Cloze (`ADR-111`), Ma trận Tổng quan Tài liệu Literature Review Matrix (`ADR-112`), Trình Biên dịch Bản thảo Academic Manuscript & Live Citekey (`ADR-113`), Phân tích Đồ thị Graph Centrality & Cầu nối Ngữ nghĩa (`ADR-114`), Cầu nối Hai chiều Obsidian Dataview & Gói đọc E-Ink (`ADR-115`).

**Vấn đề đặt ra:**
- Các phòng thu học thuật trên hiện đang phân tán ở các tab hoặc modal con khác nhau (Resources Manager, Topic Detail, Mindmap, Reader, Settings). Học giả phải dùng chuột click qua nhiều tầng giao diện để chuyển đổi giữa việc đọc, tra cứu citekey, tổng hợp ma trận tài liệu, hoặc kích hoạt sao lưu an toàn.
- `CommandPalette` hiện tại (`src/components/search/CommandPalette.tsx`) mới chỉ cung cấp tìm kiếm từ khóa chuỗi cơ bản cho Chủ đề, Ghi chú và các Tab điều hướng cũ, chưa có nhận thức về các chế độ học thuật chuyên biệt như:
  - Gõ `@vaswani` để tìm nhanh citekey và sao chép mã trích dẫn `[@vaswani2017]`.
  - Dán một chuỗi DOI (ví dụ `10.1038/nature14539`) để kích hoạt ngay tác vụ tra cứu hoặc mở tài liệu tương ứng.
  - Gõ `>` để chỉ hiển thị các lệnh thao tác phòng thu (Workflow Actions) mà không bị lẫn bởi các ghi chú thông thường.
  - Gõ `?` để ép buộc truy hồi ngữ nghĩa sâu (Semantic / Hybrid RRF Search) qua bộ vector 128 chiều thay vì chỉ so khớp chuỗi chữ.

---

## 3. Các Quyết Định Kiến Trúc (Architectural Decisions)

### Quyết định 1: Bộ Phân Tích Ý Định Truy Vấn Có Nhận Thức Tiền Tố (`parseAcademicCommandQuery`)
Xây dựng parser nhận diện tiền tố thời gian thực với độ trễ < 1ms:
- **`mode: 'citekey'`** khi chuỗi bắt đầu bằng `@` (ví dụ: `@vaswani`, `@einstein1935`). Chuỗi tìm kiếm sạch loại bỏ tiền tố `@`.
- **`mode: 'doi'`** khi chuỗi bắt đầu bằng `doi:` hoặc chứa chuỗi chuẩn DOI quốc tế khớp biểu thức chính quy `\b(10\.\d{4,9}/[-._;()/:A-Za-z0-9]+)\b`. Tự động bóc tách và chuẩn hóa mã DOI qua `normalizeDoi`.
- **`mode: 'command'`** khi chuỗi bắt đầu bằng `>` (ví dụ: `> matrix`, `> manuscript`, `> backup`). Lọc riêng danh mục các hành động và lệnh hệ thống.
- **`mode: 'semantic'`** khi chuỗi bắt đầu bằng `?` (ví dụ: `? cơ chế tự chú ý`, `? đường cong quên`). Ép buộc định tuyến sang động cơ `HybridKnowledgeSearchEngine` (Phase 5).
- **`mode: 'general'`** cho tất cả các chuỗi còn lại: Tìm kiếm hỗn hợp kết hợp workflow commands và các thực thể dữ liệu trong workspace.

### Quyết định 2: Tập Hợp Lệnh Thao Tác Phòng Thu Học Thuật Chuẩn Hóa (`buildScholarlyWorkflowActions`)
Đăng ký các lệnh thao tác cấp 1 đại diện cho toàn bộ 12 Phase của hệ thống:
1. `act-literature-matrix`: Mở Ma Trận Tổng Quan Tài Liệu & Luận Điểm Nghiên Cứu (`ADR-112`).
2. `act-manuscript-studio`: Mở Phòng Thu Soạn Thảo Bản Thảo & Citekey Live Registry (`ADR-113`).
3. `act-graph-insights`: Mở Bảng Trí Tuệ Đồ Thị, Xếp Hạng PageRank & Cầu Nối Ngữ Nghĩa (`ADR-114`).
4. `act-obsidian-eink-bridge`: Mở Cầu Nối Đồng Bộ Obsidian Dataview & Xuất Gói Đọc E-Ink (`ADR-115`).
5. `act-guarded-backup-snapshot`: Tạo Snapshot Sao Lưu Toàn Cục Tức Thì Có Bảo Vệ (`ADR-110`).
6. `act-fsrs-review-studio`: Khởi Động Phiên Ôn Tập Thẻ Nhớ FSRS v5 (`ADR-107`).
7. `act-ai-grounded-rag`: Mở Trợ Lý Tri Thức Cục Bộ Grounded RAG Trích Dẫn Minh Bạch (`ADR-109`).
8. Cùng các lệnh điều hướng chuẩn (`nav-dashboard`, `nav-topics`, `nav-notes`, `nav-resources`, `nav-mindmap`, `nav-flashcards`, `nav-settings`).

### Quyết định 3: Tìm Kiếm & Xếp Hạng Đa Thực Thể Tốc Độ Cao (`searchAcademicCommandPalette`)
Hàm tìm kiếm đa thực thể nhận diện dữ liệu đầu vào (`topics`, `notes`, `resources`, `flashcards`, `excerpts`), trả về danh sách `AcademicPaletteResultItem[]` kế thừa từ `CommandPaletteItem`:
- **Độ trễ:** Thực thi < 15ms trong bộ nhớ RAM client.
- **Gắn nhãn nhận diện học thuật (Scholarly Badges):**
  - Thực thể Resource có citekey: gắn badge `@citekey` (ví dụ `@vaswani2017`).
  - Thực thể DOI: gắn badge `DOI: 10.xxxx/...`.
  - Kết quả Semantic RRF: gắn badge `RRF xx%`.
  - Thực thể Flashcard: gắn badge `FSRS` hoặc `Cloze`.
  - Thực thể Trích dẫn: gắn badge `Trang X` hoặc `Excerpt`.
- **Hành động tức thì (Action dispatch):**
  - Chọn resource trong citekey mode -> sao chép mã trích dẫn `[@citekey]` hoặc mở tài liệu.
  - Chọn tác vụ DOI -> gọi callback `onLookupDoi(doi)` để mở modal hoặc tự động import siêu dữ liệu CrossRef.
  - Chọn snapshot -> gọi callback `onTriggerQuickBackup` kích hoạt ngay logic sao lưu an toàn.

---

## 4. Hậu Quả & Đảm Bảo Kiến Trúc (Consequences & Invariants)
- **Zero-Default Universal Baseline (`ADR-076`):** Động cơ không chèn bất kỳ chủ đề hay lĩnh vực mặc định nào. Khi workspace rỗng (0 bản ghi), Command Palette hiển thị an toàn danh mục lệnh workflow và điều hướng mà không gây lỗi.
- **Hermetic Test Guard (`ADR-077`):** Toàn bộ bộ lọc, intent parser, và hybrid search là module TypeScript thuần túy, hoạt động cô lập hoàn toàn không phát sinh live HTTP mutation.
- **Tương thích ngược 100%:** Interface `AcademicPaletteResultItem` mở rộng hoàn toàn từ `CommandPaletteItem` sẵn có, giữ nguyên tương thích cho `CommandPalette.tsx` và `useCommandPalette.ts`.
