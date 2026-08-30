# Specification: Phase P12.2 — Multilingual Lexicon UI Deep Facets & Presentation Layer

## 1. Mục Tiêu Thiết Kế (UI Objectives)
1. Lộ hóa toàn bộ năng lực ngôn ngữ đa tầng (Multilingual Language Profiles & Concept Identity) đã xây dựng ở P12.0 lên giao diện người dùng `MultilingualLexicon.tsx`.
2. Trình bày song song và rõ ràng các hệ chữ: Pāli (IAST), Sanskrit (Devanagari + IAST), Hán Tự (Hán Cổ + Âm Hán Việt + Bính âm Pinyin), Tiếng Việt và Tiếng Anh học thuật.
3. Cung cấp bộ lọc nguồn gốc (Source Type Facets: `lexicon` vs `system_node`) và bộ lọc hệ chữ/ngôn ngữ (Script/Language Facets).
4. Giữ vững tính trực quan, tốc độ đọc lướt cao (Fast Scanning), chống quá tải thị giác (Zero Visual Clutter) qua cấu trúc phân tầng thông tin rõ rệt.

---

## 2. Ràng Buộc Hiện Tại Của Giao Diện (Current UI Constraints)
- `MultilingualLexicon.tsx` phục vụ hơn 220+ mục từ với 2 chế độ xem: `Detailed` (Lưới 2 cột) và `Compact` (Lưới 3 cột).
- Các selector hiện tại (`mapTerminologyEntryToLexiconItemView`, `getTerminologyLexiconItems`) đang map qua `aliases` dictionary mà chưa lấy các trường cấu trúc trong `languageProfiles`.
- Modal trích dẫn `ScholarCitationModal` đang tiêu thụ `TerminologyEntry` trực tiếp từ `getTerminologyEntryById(id)`.
- 17 test cases trong `scholar-suite-terminology-ui-integration.test.tsx` đang assert các text hiển thị cơ bản, cần đảm bảo không bị gãy khi cập nhật giao diện.

---

## 3. Cấu Trúc Phân Tầng Thông Tin (Information Hierarchy)

```
+-----------------------------------------------------------------------------------------+
| [Category Badge: PHẬT HỌC] [Source Badge: TỪ ĐIỂN]         [Chữ Hán: 心] [Hán Việt: Tâm] |
| TIÊU ĐỀ CHÍNH: Tâm / Thức (Khả năng nhận biết cảnh)                                      |
+-----------------------------------------------------------------------------------------+
| [Pāli (IAST)]           | [Sanskrit (Deva)]       | [Pinyin]            | [English Gloss] |
| Citta                   | Citta (चित्त)           | xīn                 | Mind / Consci.. |
+-----------------------------------------------------------------------------------------+
| ĐỊNH NGHĨA KINH ĐIỂN:                                                                   |
| Thực thể nhận biết đối tượng (cảnh - ārammaṇa), là yếu tố nhận thức thuần túy...       |
+-----------------------------------------------------------------------------------------+
| [Chi tiết ngữ căn ▼]   [concept:buddhism:citta]                  [Nguồn: SN 22.59]      |
|                                                     [Trích Dẫn ❞]  [Sao Chép 📋]        |
+-----------------------------------------------------------------------------------------+
```

---

## 4. Chính Sách Hiển Thị Ngôn Ngữ & Hệ Chữ (Display Policy)

| Ngôn Ngữ / Hệ Chữ | Mã Chuẩn | Quy Tắc Hiển Thị | Vị Trí Trên Card |
| :--- | :---: | :--- | :--- |
| **Tiếng Việt** | `vi` (Latn) | Tiêu đề chính của thẻ (Primary Title). | Header Card |
| **Hán Tự** | `zh-Hant` / `zh-Hans` (Hani) | Font chữ Serif cổ điển trang nhã, kích thước nổi bật. | Header Top Right |
| **Âm Hán Việt** | `zh-Hant` transliteration | Trong ngoặc vuông bên cạnh Hán tự (e.g. `[Tâm]`, `[Càn]`). | Header Top Right |
| **Pāli** | `pi` (Latn) | Ký tự IAST chuẩn quốc tế (e.g. `Anattā`, `Citta`). | Grid Col 1 |
| **Sanskrit** | `sa` (Deva / Latn) | Hiển thị IAST kèm ký tự Devanagari (e.g. `citta (चित्त)`). | Grid Col 2 |
| **Pinyin** | `zh` transliteration | Bính âm có dấu thanh (e.g. `xīn`, `qián`). | Grid Col 3 |
| **English Gloss** | `en` (Latn) | Thuật ngữ học thuật Anh ngữ chuẩn xác. | Grid Col 4 |

---

## 5. Quy Tắc Thu Gọn vs Mở Rộng (When to Collapse vs Expand)
1. **Mặc định (Collapsed)**:
   - Hiển thị 4 ô thuộc tính ngôn ngữ cốt lõi (Pāli, Sanskrit, Pinyin, English).
   - Hiển thị định nghĩa kinh điển tóm tắt (2-3 dòng).
   - Nguồn trích dẫn vắn tắt (Canon Locator: `SN 22.59`).
2. **Khi Mở Rộng Chi Tiết (Expanded Accordion)**:
   - Hiển thị chi tiết ngữ căn: Gốc từ căn (`etymology.root`), Hình thái học (`morphology`), Nghĩa đen căn bản (`literalMeaning`).
   - Hiển thị Concept ID đầy đủ để phục vụ liên kết tri thức ma trận.
   - Hiển thị danh sách các thuật ngữ dịch thay thế (`glosses.alternates`).

---

## 6. Nhãn Nguồn Gốc Mục Từ (Source Labeling Policy)
- `lexicon`: Gắn nhãn `[Từ Điển]` (Màu Amber/Slate, icon `BookOpen`) $\rightarrow$ Khẳng định đây là mục từ nghiên cứu độc lập.
- `system_node`: Gắn nhãn `[Nút Ma Trận]` (Màu Sky/Indigo, icon `Network`) $\rightarrow$ Khẳng định đây là thành tố cấu trúc trong mạng lưới tương quan.
- `tcm_registry`: Gắn nhãn `[Đông Y]` (Màu Emerald/Teal, icon `Stethoscope`) $\rightarrow$ Chuẩn bị cho P12.1.

---

## 7. Mô Hình Bộ Lọc Đa Chiều (Facet & Filter Model)
1. **Thanh Filter Toolbar gồm 3 nhóm điều khiển**:
   - **Nhóm 1: Danh Mục Tri Thức**: `Tất Cả` | `Phật Học` | `Huyền Học` | `Triết Học`
   - **Nhóm 2: Loại Nguồn Dữ Liệu**: `Tất Cả Nguồn` | `Mục Từ Điển (Lexicon)` | `Nút Hệ Thống (System Node)`
   - **Nhóm 3: Bộ Lọc Hệ Chữ (Script Badges)**:
     - `[Devanagari]` (Chỉ hiện các mục từ có chữ Phạn gốc)
     - `[Hán Tự]` (Chỉ hiện các mục từ có chữ Hán)
     - `[English Gloss]` (Chỉ hiện các mục từ có định nghĩa Anh ngữ)
2. **Logic Lọc Kết Hợp (AND/OR Composition)**:
   - `Domain Filter` $\cap$ `Source Type Filter` $\cap$ `Script Facet Filter` $\cap$ `Search Query`.

---

## 8. Khả Năng Truy Cập & Khả Năng Đọc (A11y & Readability)
- Toàn bộ các ký tự Devanagari và chữ Hán có thuộc tính `lang="sa"` và `lang="zh-Hant"` tương ứng trong DOM để screen reader và font renderer hiển thị chuẩn mực.
- Tương phản màu sắc (Color Contrast Ratio) giữa chữ và nền đạt tối thiểu **4.5:1 (WCAG AA)**.
- Các nút tương tác (Sao chép, Trích dẫn, Toggle Xem chi tiết) có đầy đủ `aria-label`, `title`, và trạng thái `focus-visible`.

---

## 9. Phạm Vi Tác Động & Blast Radius (Blast Radius Assessment)
- **Rất Thấp**:
  - Chỉ cập nhật giao diện hiển thị trong `src/components/lexicon/MultilingualLexicon.tsx` và mở rộng `LexiconItemView` trong `src/lib/scholarSuite/selectors.ts`.
  - Không thay đổi schema cơ sở dữ liệu, không sửa store, không phá vỡ hợp đồng của `TerminologyDictionary`.

---

## 10. Chiến Lược Kiểm Thử (Test Strategy)
1. **Unit & Integration Tests**:
   - Kiểm tra `mapTerminologyEntryToLexiconItemView` trích xuất chính xác Devanagari, Hán Việt, English Gloss, Source Type, Concept ID.
   - Kiểm tra giao diện `MultilingualLexicon.tsx` render chính xác các badge mới.
   - Kiểm tra tương tác lọc Facet (Source Type filter, Script toggle).
   - Kiểm tra Accordion mở rộng chi tiết ngữ học.
2. **Regression Guard**:
   - Toàn bộ 17 test cases trong `scholar-suite-terminology-ui-integration.test.tsx` tiếp tục pass 100%.

---

## 11. Ngoài Phạm Vi (Non-Goals)
- Không chỉnh sửa backend routes hay storage schema.
- Không sửa thuật toán `searchTerminologyEntries` (đã hoàn thiện ở P12.0).
- Không thêm form chỉnh sửa/tạo mới mục từ (đây là read-only lexicon explorer).
