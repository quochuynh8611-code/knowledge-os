# ADR-014: Lập Kế Hoạch Tiến Hóa & Mở Rộng Vận Hành (Phase 5 Evolution Planning & Operational Expansion)

- **Mã ADR:** ADR-014
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-24
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi tài liệu:** Lập kế hoạch kiến trúc, phân định ranh giới rủi ro và xác lập các workstreams tiềm năng cho Phase 5.

---

## 1. Bối Cảnh (Context)

Hệ thống **Knowledge OS (Dashboard Nghiên Cứu Phật Học & Huyền Học)** đã hoàn thành xuất sắc 4 Phase nền tảng:
1. **Phase 1:** Quản lý tài liệu tham khảo cục bộ (`filePath`) với giao diện File Picker UX và nguyên tắc bất biến **Zero Binary Ingestion** (metadata < 2KB).
2. **Phase 2a & 2b:** Cầu nối hệ tri thức tam giác tích hợp giao thức `obsidian://open`, xuất Vault ZIP chuẩn và đóng gói tài liệu nguồn sạch cho Google NotebookLM Studio.
3. **Phase 3:** Đóng gói gói bàn giao Antigravity AI Scholar Handoff Bundle chuẩn mực (6 phần cố định, cấu trúc đồ thị 1-hop, System Prompt theo 3 chế độ khảo cứu).
4. **Phase 4:** Gia cố an ninh vận hành sản xuất: In-memory Rate Limiting cho AI/Restore, Fast-fail Validation, Bounded AI Resilience với hàng đợi model dự phòng, chính sách đo độ trễ DB và Structured JSON Logging.

Tại thời điểm hiện tại, hệ thống đã ở trạng thái **Production-Ready & Fully Verified (186/186 tests PASS)**. Bước tiếp theo là bước vào **Phase 5** với mục tiêu: *Lập kế hoạch tiến hóa dài hạn cho trải nghiệm khảo cứu học thuật sâu sắc, trực quan hóa tri thức đa chiều và tối ưu hóa vận hành dữ liệu mà không gây bất kỳ hồi quy hay phá vỡ các rào chắn kiến trúc đã được xác lập.*

---

## 2. Quyết Định Kiến Trúc Đề Xuất (Proposed Architecture Decisions)

Thực hiện **Tiến Hóa Có Ranh Giới (Bounded Evolution Strategy)**:
1. **Chỉ Lập Kế Hoạch (Planning-First):** Không viết runtime code, không thay đổi database schema, không thêm dependency mới khi chưa có sự đồng thuận và phê duyệt chính thức từng phần.
2. **Bảo Tồn Bất Biến (Preserve Core Invariants):**
   - Duy trì nghiêm ngặt **Zero Binary Ingestion** trên toàn bộ hệ thống.
   - Duy trì tính toàn vẹn Bit-for-Bit của **SHA-256 Checksum** và khả năng tương thích ngược của **BackupSnapshotSchema Semver 2.x**.
   - Duy trì kiến trúc **Dual-Tier Resilience Layer** (PostgreSQL/Prisma ưu tiên, LocalStorage offline fallback tự động).
3. **Tách Biệt Quyết Định Một Chiều (One-Way Decision Isolation):** Mọi thay đổi có tính chất không thể đảo ngược (như Schema Migration, Cloud Auth, Dynamic Sync Protocol) phải được tách thành ADR độc lập và có bằng chứng test-first riêng biệt.

---

## 3. Phạm Vi Triển Khai Đề Xuất (Scope Definition)

### 3.1. Phạm Vi Bao Hàm (In Scope - Candidate Workstreams)

| Workstream | Tên Hạng Mục | Mô Tả Kỹ Thuật Dự Kiến | Tính Chất |
| :--- | :--- | :--- | :---: |
| **5A** | **Advanced Knowledge Graph & Multi-Hop Traversal Explorer** | - Trực quan hóa tương tác đồ thị liên kết sâu giữa các topics.<br>- Bộ lọc liên kết theo loại quan hệ (`prerequisite`, `advanced`, `contradicts`) và trọng số.<br>- Thuật toán tìm đường đi ngắn nhất (Shortest Path) kết nối giữa khái niệm Phật học (ví dụ: *12 Duyên Khởi*) và Huyền học (ví dụ: *Kỳ Môn / Chu Dịch*). | Reversible (UI & Pure Algorithmic) |
| **5B** | **Spaced Repetition (SM-2) Study Session Analytics** | - Bảng điều khiển phân tích tiến độ học tập chuyên sâu.<br>- Trực quan hóa đường cong lãng quên Ebbinghaus và tỷ lệ duy trì trí nhớ.<br>- Heatmap lịch sử ôn tập theo ngày và dự báo hàng đợi ôn tập tối ưu (Due Queue Forecast). | Reversible (UI & Analytical Views) |
| **5C** | **Automated Snapshot Maintenance & Headless Backup Script** | - Kịch bản dòng lệnh độc lập (CLI script) hỗ trợ tự động xuất và kiểm tra tính toàn vẹn snapshot định kỳ.<br>- Cảnh báo sớm khi snapshot vượt kích thước an toàn hoặc phát hiện hỏng hóc dữ liệu. | Reversible (Tooling & Operational) |
| **5D** | **Scholar Search & Fast Fuzzy Metadata Filter** | - Tối ưu hóa bộ lọc tìm kiếm tức thời trên 35 topics canonical, ghi chú và tài liệu tham khảo.<br>- Hỗ trợ tìm kiếm theo thuật ngữ gốc IAST / Hán Việt không dấu mà không cần external search cluster. | Reversible (Client-side Search Utilities) |

---

### 3.2. Phạm Vi Loại Trừ Tuyệt Đối (Out of Scope / Non-Goals)

Để bảo vệ sự an toàn và tính tinh gọn của hệ thống Knowledge OS, các hạng mục sau **tuyệt đối không thực hiện trong Phase 5**:
1. ❌ **Không triển khai Two-Way Sync với Obsidian:** Chỉ giữ luồng xuất 1 chiều an toàn (`obsidian://` và ZIP export). Không can thiệp filesystem hoặc đọc ngược file từ máy người dùng.
2. ❌ **Không gọi Private/Unofficial API:** Không gọi các endpoint nội bộ không được công bố của Google NotebookLM hoặc Antigravity.
3. ❌ **Không nhúng Binary vào Database/State:** Tuyệt đối không lưu file binary/PDF/Audio/Video hay chuỗi Base64 vào database, localStorage, backup snapshot hay handoff bundle.
4. ❌ **Không triển khai Multi-Tenancy / Cloud Auth phức tạp:** Không thêm các dịch vụ xác thực đám mây làm mất đi tính độc lập offline của người nghiên cứu cá nhân.
5. ❌ **Không phá vỡ Schema Migration & Semver 2.x:** Không xóa bảng, đổi tên cột hay thay đổi cấu trúc snapshot hiện hữu.

---

## 4. Đánh Giá Quyết Định: Một Chiều (One-Way) vs Hai Chiều (Two-Way)

```
                       ┌──────────────────────────────────────────────┐
                       │           PHASE 5 DECISION MATRIX            │
                       └──────────────────────────────────────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
       ┌─────────────────────────────┐                 ┌─────────────────────────────┐
       │   TWO-WAY / REVERSIBLE      │                 │    ONE-WAY / IRREVERSIBLE   │
       │     (Rollback an toàn)      │                 │      (Rủi ro kiến trúc)     │
       ├─────────────────────────────┤                 ├─────────────────────────────┤
       │ • UI Graph Visualizer       │                 │ • Schema Migration (DB)     │
       │ • SM-2 Memory Analytics     │                 │ • Cloud Auth / Multi-tenant │
       │ • Fuzzy Search Metadata     │                 │ • External Search Engine    │
       │ • Headless CLI Backup Tool  │                 │ • Binary Storage Adapter    │
       └─────────────────────────────┘                 └─────────────────────────────┘
```

- **Quyết định Hai Chiều (Reversible):** Các cải tiến về UI, biểu đồ phân tích, thuật toán đồ thị in-memory hoặc script backup độc lập. Có thể bật/tắt hoặc rollback ngay lập tức mà không để lại tác dụng phụ lên dữ liệu.
- **Quyết định Một Chiều (Irreversible):** Mọi thay đổi về Prisma Schema DDL, thay đổi cấu trúc bảng hoặc cấu hình bảo mật bên ngoài. **Bắt buộc phải có ADR riêng, migration script idempotent và kế hoạch rollback trước khi chạm vào mã nguồn.**

---

## 5. Rủi Ro Bảo Mật & Dữ Liệu (Security & Data Risks)

| Rủi ro tiềm ẩn | Mức độ | Biện pháp kiểm soát & Ngăn chặn |
| :--- | :---: | :--- |
| **Phình to bộ nhớ trình duyệt khi render đồ thị lớn** | Trung bình | Sử dụng canvas-based rendering hoặc WebGL có cơ chế giới hạn số node/edge hiển thị đồng thời (viewport culling). |
| **Lỗi tính toán ngày ôn tập khi lệch múi giờ (Timezone Drift)** | Thấp | Luôn chuẩn hóa ngày giờ sang chuỗi ISO-8601 UTC và sử dụng thời điểm 00:00:00 UTC làm mốc tính toán chu kỳ SM-2. |
| **Lạm dụng tài nguyên khi chạy Fuzzy Search** | Thấp | Giới hạn tìm kiếm trên metadata có cấu trúc (tiêu đề, slug, tags, author) thay vì quét toàn bộ văn bản lớn cùng lúc. |

---

## 6. Tiêu Chuẩn Bằng Chứng Bắt Buộc Trước Khi Triển Khai (Required Evidence Trail)

Trước khi chuyển bất kỳ Workstream nào từ **PLANNING** sang **IMPLEMENTATION**, phải thỏa mãn 4 tiêu chuẩn:
1. **Spec & ADR Approval:** Có tài liệu đặc tả chi tiết và ADR con (nếu liên quan tới quyết định một chiều) được phê duyệt thủ công.
2. **Gherkin Scenarios:** Khai báo đầy đủ các kịch bản hành vi mong muốn dưới dạng `.feature`.
3. **Failing Tests Evidence:** Tạo test suite kiểm thử và chạy chứng minh thất bại trước khi viết production code.
4. **Zero Regression Baseline:** Đảm bảo toàn bộ 186 tests hiện có duy trì 100% PASS sau khi hoàn tất.

---

## 7. Các Câu Hỏi Mở Cần Người Dùng Định Hướng (Open Questions)

> [!IMPORTANT]
> 1. **Thứ tự ưu tiên Workstream:** Trong 4 luồng ứng viên (5A Graph Explorer, 5B SM-2 Analytics, 5C Headless Backup CLI, 5D Scholar Search), bạn muốn ưu tiên tập trung vào hạng mục nào trước?
> 2. **Trải nghiệm Đồ thị tri thức (Graph Explorer):** Bạn có mong muốn hiển thị bộ lọc phân biệt rõ ràng giữa các nhánh Phật học (Nguyên Thủy Pali, Vi Diệu Pháp, Duy Thức) và Huyền học (Kỳ Môn, Chu Dịch, Bát Tự) trên đồ thị không?
> 3. **Phân tích Trí nhớ (SM-2 Analytics):** Bảng phân tích ôn tập nên tích hợp trực tiếp vào component `StudyProgressView.tsx` hiện tại hay tạo một View phân tích chuyên sâu riêng biệt?
