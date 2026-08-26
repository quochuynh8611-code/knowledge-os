# Technical Specification: Phase 7D — Information Architecture & Navigation Refactoring (Multi-Discipline Research OS)

## 1. Problem Statement
Ứng dụng đang trong quá trình chuyển hóa từ một công cụ nghiên cứu Phật học & Huyền học chuyên biệt thành **Không Gian Nghiên Cứu Đa Lĩnh Vực (Multi-Discipline Research Workspace)**.
Tuy nhiên, cấu trúc điều hướng hiện tại (Information Architecture - IA) tại Sidebar cấp 1 (`Danh mục chính`) vẫn đặt các module chuyên biệt tôn giáo / huyền thuật (`Ma trận phân tích 89 Tâm`, `Mô hình hệ thống 64 Quẻ`, `Từ điển thuật ngữ`) ngang hàng với các luồng công việc nghiên cứu nền tảng (`Tổng quan`, `AI hỗ trợ`, `Chủ đề`, `Ghi chú`, `Tài liệu`, `Tiến độ`, `Bản đồ tri thức`, `Tìm kiếm`).

Điều này gây ra:
- **Độ lộ diện không cân xứng**: Người dùng nghiên cứu các ngành khoa học, xã hội, lịch sử, kỹ thuật... bị phân tâm bởi các công cụ quá đặc thù của Phật học/Dịch học ngay tại menu chính.
- **Rối loạn phân cấp IA**: Các công cụ mô hình hóa cụ thể (Domain-specific Analysis Tools) bị xếp ngang hàng với các chức năng cốt lõi (Core Workflow Views).

## 2. Goals & Non-Goals

### 2.1. Goals
1. **Tinh giản Main Navigation (Cấp 1)**: Chỉ giữ lại 8 luồng công việc nghiên cứu tổng quát:
   - `dashboard` (Tổng quan)
   - `ai_studio` (AI hỗ trợ)
   - `topics` (Chủ đề)
   - `graph` (Bản đồ tri thức)
   - `progress` (Tiến độ)
   - `notes` (Ghi chú)
   - `resources` (Tài liệu)
   - `search` (Tìm kiếm)
2. **Tái cấu trúc Công Cụ Chuyên Sâu (Advanced / Domain-Specific Tools)**:
   - Gom 3 module chuyên biệt (`abhidharma_matrix`, `divination_matrix`, `lexicon`) vào nhóm điều hướng phụ **"Công cụ chuyên sâu"** (hoặc hiển thị theo ngữ cảnh lĩnh vực nghiên cứu).
   - Tiếp tục hỗ trợ đầy đủ render component, chuyển đổi tab, và đánh dấu active khi người dùng truy cập.
3. **Bảo toàn 100% khả năng tương thích ngược (Backward Compatibility)**:
   - Các giá trị `activeTab` (`abhidharma_matrix`, `divination_matrix`, `lexicon`) trong state, localStorage hoặc Command Palette tiếp tục hoạt động an toàn, không gây crash ứng dụng.
4. **Ngôn ngữ giao diện trung tính**: Giữ vững copywriting trung tính, chuyên nghiệp cho mọi lĩnh vực nghiên cứu.

### 2.2. Non-Goals
1. **Không xóa bỏ code**: Giữ nguyên toàn bộ components `AbhidharmaMatrix.tsx`, `DivinationMatrix.tsx`, `MultilingualLexicon.tsx`.
2. **Không thay đổi Data Schema / DB**: Giữ nguyên vẹn 100% database SQLite, Prisma model, và key lưu trữ localStorage.
3. **Không thay đổi luồng nghiệp vụ bên trong các matrix**: Các chức năng phân tích tâm sở và quẻ dịch vẫn hoạt động hoàn hảo khi được mở từ nhóm công cụ chuyên sâu.

---

## 3. Information Architecture (IA) Comparison

```
[CURRENT IA - Sidebar Flat Level 1]
├── DANH MỤC CHÍNH (Flat 11 items)
│   ├── Tổng quan (dashboard)
│   ├── AI hỗ trợ (ai_studio)
│   ├── Chủ đề (topics)
│   ├── Ma trận phân tích (abhidharma_matrix - 89 Tâm)   <-- Chuyên biệt
│   ├── Mô hình hệ thống (divination_matrix - 64 Quẻ)   <-- Chuyên biệt
│   ├── Từ điển thuật ngữ (lexicon)                     <-- Chuyên biệt
│   ├── Bản đồ tri thức (graph)
│   ├── Tiến độ (progress)
│   ├── Ghi chú (notes)
│   ├── Tài liệu (resources)
│   └── Tìm kiếm (search)
└── LĨNH VỰC NGHIÊN CỨU (Domain filter)

=======================================================

[PROPOSED IA - Structured Multi-Discipline Workspace]
├── DANH MỤC CHÍNH (Core Universal Workflow - 8 items)
│   ├── Tổng quan (dashboard)
│   ├── AI hỗ trợ (ai_studio)
│   ├── Chủ đề nghiên cứu (topics)
│   ├── Bản đồ tri thức (graph)
│   ├── Tiến độ học tập (progress)
│   ├── Ghi chú (notes)
│   ├── Tài liệu tham khảo (resources)
│   └── Tra cứu & Tìm kiếm (search)
├── CÔNG CỤ CHUYÊN SÂU (Advanced Specialized Tools)
│   ├── Ma trận phân tích (abhidharma_matrix)
│   ├── Mô hình hệ thống (divination_matrix)
│   └── Từ điển thuật ngữ (lexicon)
└── LĨNH VỰC NGHIÊN CỨU (Dynamic Root Domain Filter)
```

---

## 4. Blast Radius & Affected Files
- `src/components/layout/Sidebar.tsx` [MODIFY]: Tách danh sách navigation thành 2 nhóm: `coreNavItems` (Danh mục chính) và `specializedNavItems` (Công cụ chuyên sâu).
- `src/components/layout/Navbar.tsx` [INSPECT/MODIFY]: Đồng bộ nhãn nếu có.
- `src/hooks/useCommandPalette.ts` [INSPECT/MODIFY]: Phân loại rõ nhóm lệnh điều hướng.
- `src/App.tsx` [PRESERVE]: Tiếp tục render đầy đủ 100% case trong `renderActiveTab()`.
- `tests/unit/phase7d-information-architecture-navigation.test.tsx` [NEW]: Bộ unit & integration test cho IA mới.

---

## 5. Rollback Strategy
Thay đổi hoàn toàn thuần túy ở tầng layout và navigation presentation. Nếu cần hoàn tác, chỉ cần gộp lại mảng `navItems` trong `Sidebar.tsx` mà không ảnh hưởng bất kỳ dữ liệu nào.
