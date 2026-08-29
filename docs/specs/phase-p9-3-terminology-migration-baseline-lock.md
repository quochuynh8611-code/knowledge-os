# Phase P9.3: Terminology Migration Baseline Lock & Roadmap

**Status**: PROPOSED (Awaiting Human Sign-off)  
**Author**: Staff Software Engineer / Technical Architect  
**Domain**: Terminology Subsystem / Migration Baseline & Architecture Roadmap  
**Baseline Hash**: `498e603` (Working tree uncommitted, ready for audit)

---

## 1. Chuẩn Hóa Timeline & Phân Vùng Giai Đoạn (Timeline & Phase Mapping)

Để đảm bảo tính nhất quán tuyệt đối giữa mã nguồn, các bài kiểm thử và hệ thống tài liệu kiến trúc, toàn bộ chuỗi tiến hóa **Phase P9 — Universal Terminology Subsystem** được chuẩn hóa như sau:

| Phase Mã Hiệu | Tên Giai Đoạn | Trọng Tâm Kỹ Thuật | Artifacts Chính | Trạng Thái |
|---|---|---|---|---|
| **P9.0** | Universal Terminology Contract | Định nghĩa kiểu dữ liệu tổng quát cho Terminology và KnowledgeDomain | `src/types/terminology.ts`<br>`tests/unit/terminology-contract.test.ts` | **ĐÃ HOÀN TẤT** |
| **P9.1** | Terminology Citation Normalizer Bridge | Adapter chuyển đổi `TerminologyEntry` $\rightarrow$ `ScholarCitationViewModel` | `src/lib/scholarCitation/normalizer.ts`<br>`tests/unit/scholar-citation-terminology-normalizer.test.ts` | **ĐÃ HOÀN TẤT** |
| **P9.2** | Type Alignment Cleanup | Bổ sung `CitationEntityType = 'term' \| 'lex' \| 'sys' \| 'rel'`, triệt tiêu ép kiểu `as` | `src/lib/scholarCitation/key.ts`<br>`tests/unit/scholar-citation-key.test.ts` | **ĐÃ HOÀN TẤT** |
| **P9.3** | Read-Only Lexicon Dictionary Adapter | Adapter một chiều biến đổi `LEXICON_REGISTRY` $\rightarrow$ `TerminologyDictionary` | `src/lib/terminology/lexiconDictionary.ts`<br>`tests/unit/terminology-lexicon-dictionary.test.ts` | **ĐÃ HOÀN TẤT** |
| **P9.4+** | Future Roadmap (Giai đoạn tiếp theo) | Mở rộng Adapter cho System Nodes, Search Indexing & UI Integration | *Xem chi tiết tại Mục 4* | **ĐỀ XUẤT** |

---

## 2. Tổng Hợp Các Khối Tính Năng Đã Khóa (Locked Baseline Deliverables)

### A. Tầng Kiểu Dữ Liệu (`src/types/terminology.ts`)
- `CoreKnowledgeDomain`: `'phat-hoc' | 'huyen-hoc' | 'triet-hoc' | 'khoa-hoc-tam-thuc' | 'da-nganh'`.
- `KnowledgeDomain`: Open Union `CoreKnowledgeDomain | (string & {})` (duy trì autocomplete cho core domains, mở rộng tùy biến an toàn).
- `TerminologySource`: Chuẩn hóa nguồn bao gồm cả `ptsRef`, `taishoRef`, `standardEdition`, `doi`, `url`.
- `TerminologyEntry`: Data contract bất biến (`readonly`) cho mục từ thuật ngữ.
- `TerminologyDictionary`: Interface chuẩn hóa gồm `getEntry`, `search`, `listAll`.

### B. Tầng Trích Dẫn & Normalizer (`src/lib/scholarCitation/`)
- `normalizeTerminologyEntry(entry, options)`: Tích hợp đầy đủ mô hình phân loại nguồn 3 bậc (`internal_note_only`, `canonical_minimal`, `canonical_complete`).
- `CitationEntityType`: Chuẩn hóa kiểu định danh mục từ `'term' | 'lex' | 'sys' | 'rel'`, xóa bỏ hoàn toàn ép kiểu `as`.
- `ScholarCitationViewModel.domain`: Đồng bộ sang kiểu `KnowledgeDomain`.

### C. Tầng Adapter Từ Điển (`src/lib/terminology/lexiconDictionary.ts`)
- `mapLexiconEntryToTerminology(entry)`: Chuyển đổi một chiều, bảo toàn 100% các bí danh đa ngữ (`pali`, `sanskrit`, `hanTu`, `pinyin`, `vietnamese`, `english`).
- `createLexiconDictionary(entries)`: Tạo instance `TerminologyDictionary` chỉ đọc, tra cứu O(1) qua hash map, tìm kiếm thuần túy không mutate mảng gốc.
- `scholarLexiconDictionary`: Singleton instance sẵn sàng sử dụng.

---

## 3. Các Hạng Mục Chủ Đích Chưa Triển Khai (Explicitly Deferred Scope)

1. **Reverse Adapter (`TerminologyEntry -> LexiconEntry`)**:
   - *Lý do*: Tránh ngụy tạo dữ liệu khi `TerminologyEntry` thiếu các trường nội bộ của Scholar Suite (`etymology`, `coverage`).
2. **Thay đổi cấu trúc UI hiện tại**:
   - *Lý do*: Giao diện Scholar Suite (`MultilingualLexicon`, `AbhidharmaMatrix`, `DivinationMatrix`) đang vận hành ổn định trên nền `LexiconEntry` và `SystemNode`. Chưa cần thiết làm xáo trộn UI khi chưa có yêu cầu nghiệp vụ mới.
3. **Refactor cấu trúc file `LEXICON_REGISTRY`**:
   - *Lý do*: Giữ nguyên registry gốc làm Single Source of Truth, chỉ đọc dữ liệu qua tầng adapter.

---

## 4. Lộ Trình Triển Khai Tiếp Theo Theo Mức Độ Rủi Ro (Risk-Tiered Roadmap)

| Giai Đoạn | Tên Tính Năng Đề Xuất | Mô Tả & Bán Kính Ảnh Hưởng | Mức Độ Rủi Ro |
|---|---|---|---|
| **Phase P10.0** | System Nodes Terminology Adapter | Ánh xạ các `SystemNode` (I Ching, Citta, Cetasika, Patthana, Nidana) sang `TerminologyEntry` để tra cứu đồng nhất | **Thấp** (Chỉ thêm pure adapter & unit tests) |
| **Phase P10.1** | Inverted Index / Trie Search Optimization | Tối ưu hóa hiệu năng tìm kiếm tiền tố và mờ (Fuzzy/Prefix Search) cho `TerminologyDictionary` khi quy mô dữ liệu vượt 10,000 mục từ | **Thấp** (Nâng cấp bên trong adapter, giữ nguyên interface) |
| **Phase P11.0** | Terminology-Powered Command Palette Actions | Tích hợp tra cứu thuật ngữ đa miền tri thức trực tiếp vào Command Palette (`Cmd+K`) | **Trung bình** (Chạm vào UI Command Palette) |
| **Phase P12.0** | Multi-Domain Dictionary Registration API | Cho phép nạp thêm các từ điển ngoại vi (Y học cổ truyền, Triết học Tây phương) vào Runtime Registry | **Trung bình - Cao** (Cần thiết kế lifecycle nạp dữ liệu động) |
