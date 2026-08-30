# Specification: Phase P12.2 Wave 3 — Multi-Facet Filtering Toolbar

## 1. Tổng Quan Mục Tiêu & Kiến Trúc Bố Cục (Overview & Layout Wireframe)
- Nâng cấp thanh công cụ của `MultilingualLexicon.tsx` thành **Multi-Facet Filtering Toolbar** 3 tầng chuyên nghiệp, hỗ trợ lọc đa chiều trực giao.
- Cho phép người dùng chuyển đổi ngữ cảnh nghiên cứu tức thì qua 3 tầng lọc:
  1. **Domain Facets (Miền Tri Thức)**: `Tất Cả (241)` | `Phật Học (154)` | `Huyền Học (73)` | `Đông Y Học (14)`.
  2. **Source Type Facets (Nguồn Cấu Trúc)**: `Tất Cả Nguồn (241)` | `Từ Điển (19)` | `Ma Trận (208)` | `Kho Đông Y (14)`.
  3. **Conditional TCM Sub-facets (Phân Nhóm Đông Y)**: `Tất Cả Đông Y (14)` | `Kinh Huyệt (5)` | `Tạng Tượng (5)` | `Dược Tính (4)`.
- Tự động đếm số lượng mục từ động (Zero Hardcoding) và kết hợp chặt chẽ với công cụ tìm kiếm đa ngữ.

### Wireframe Phác Thảo
```
+----------------------------------------------------------------------------------------------------+
|  [Search Input: Tra cứu Citta, Hợp Cốc, Nhân Sâm, 心, LI4...]                  [Chi tiết | Thu gọn]|
|                                                                                                    |
|  [Miền Tri Thức]:  [ Tất Cả (241) ]  [ Phật Học (154) ]  [ Huyền Học (73) ]  [ Đông Y Học (14) ]   |
|  [Nguồn Cấu Trúc]: [ Tất Cả Nguồn (241) ] [ Từ Điển (19) ] [ Ma Trận (208) ] [ Kho Đông Y (14) ]  |
|                                                                                                    |
|  (Khi chọn Đông Y Học hoặc Kho Đông Y):                                                            |
|  [Phân Nhóm TCM]:  [ Tất Cả Đông Y (14) ] [ Kinh Huyệt (5) ] [ Tạng Tượng (5) ] [ Dược Tính (4) ]  |
|                                                                                                    |
|  Hiển thị 14 / 241 thuật ngữ                                            [ Đặt lại bộ lọc (↻) ]     |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Đặc Tả Dữ Liệu Facet & Taxonomy Matrix

| Tầng Lọc | Khóa Facet (`key`) | Nhãn Hiển Thị (`label`) | Số Lượng Baseline | Màu Sắc / Badge Theme | Điều Kiện Hiển Thị |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **Domain** | `all` | `Tất Cả` | `241` | `bg-stone-800 text-white` | Luôn hiển thị |
| **Domain** | `phat-hoc` | `Phật Học` | `154` | `bg-amber-800 text-white` | Luôn hiển thị |
| **Domain** | `huyen-hoc` | `Huyền Học` | `73` | `bg-indigo-800 text-white` | Luôn hiển thị |
| **Domain** | `y-hoc-co-truyen` | `Đông Y Học` | `14` | `bg-teal-800 text-white` | Luôn hiển thị |
| **Source** | `all` | `Tất Cả Nguồn` | `241` | `bg-stone-700 text-white` | Luôn hiển thị |
| **Source** | `lexicon` | `Từ Điển` | `19` | `bg-stone-700 text-white` | Luôn hiển thị |
| **Source** | `system_node` | `Ma Trận` | `208` | `bg-sky-800 text-white` | Luôn hiển thị |
| **Source** | `tcm_registry` | `Kho Đông Y` | `14` | `bg-teal-800 text-white` | Luôn hiển thị |
| **TCM Sub** | `all` | `Tất Cả Đông Y` | `14` | `bg-teal-800 text-white` | Khi Domain=`y-hoc-co-truyen` hoặc Source=`tcm_registry` |
| **TCM Sub** | `kinh-huyet` | `Kinh Huyệt` | `5` | `bg-teal-800 text-white` | Khi Domain=`y-hoc-co-truyen` hoặc Source=`tcm_registry` |
| **TCM Sub** | `tang-tuong` | `Tạng Tượng` | `5` | `bg-teal-800 text-white` | Khi Domain=`y-hoc-co-truyen` hoặc Source=`tcm_registry` |
| **TCM Sub** | `duoc-tinh` | `Dược Tính` | `4` | `bg-teal-800 text-white` | Khi Domain=`y-hoc-co-truyen` hoặc Source=`tcm_registry` |

---

## 3. Selector Contract & TypeScript Interfaces

### Interface Mở Rộng trong `src/lib/scholarSuite/selectors.ts`
```ts
export interface TerminologyFilterParams {
  domain?: string;
  sourceType?: 'lexicon' | 'system_node' | 'tcm_registry' | 'custom_glossary' | 'all';
  tcmCategory?: 'kinh-huyet' | 'tang-tuong' | 'duoc-tinh' | 'bat-cuong' | 'all';
  query?: string;
}

export interface TerminologyFacetCounts {
  total: number;
  byDomain: Record<string, number>;
  bySourceType: Record<string, number>;
  byTcmCategory: Record<string, number>;
}
```

### Hàm Selector Thuần (Pure Selectors)
1. `getTerminologyEntries(filter?: TerminologyFilterParams): TerminologyEntry[]`
2. `getTerminologyLexiconItems(filter?: TerminologyFilterParams): LexiconItemView[]`
3. `getTerminologyFacetCounts(query?: string): TerminologyFacetCounts`
   - Tính toán runtime số lượng mục từ theo từng Domain, SourceType, và TcmCategory.

---

## 4. Selection Model, Intersection Logic & Dynamic Counting

1. **Intersection Logic (Giao tập hợp AND)**:
   - Một mục từ `entry` được hiển thị khi và chỉ khi thỏa mãn đồng thời tất cả các tiêu chí đang được chọn khác `all`:
     - Nếu `domain !== 'all'`: `entry.domain === domain`
     - Nếu `sourceType !== 'all'`: `entry.sourceType === sourceType`
     - Nếu `tcmCategory !== 'all'`: `entry.tcmExtension?.category === tcmCategory`
     - Nếu `query !== ''`: `entry` nằm trong danh sách trả về của `scholarUnifiedDictionary.search(query)`
2. **Dynamic Counting Policy**:
   - Các badge số lượng `(N)` được render từ kết quả của `getTerminologyFacetCounts(searchTerm)`.
   - Khi `searchTerm` thay đổi, số lượng trên từng chip cập nhật phản ánh đúng số mục từ khớp với từ khóa trong nhóm đó.
   - Summary bar hiển thị `Hiển thị {filteredEntries.length} / {totalCount} thuật ngữ`.

---

## 5. Accessibility (A11y) & Reset Semantics

1. **Accessibility Rules**:
   - Mỗi dải nút lọc được bao bọc trong thẻ có `role="group"` và `aria-label` mô tả rõ ràng:
     - `aria-label="Bộ lọc miền tri thức"`
     - `aria-label="Bộ lọc nguồn cấu trúc"`
     - `aria-label="Phân nhóm Đông Y"`
   - Nút được chọn có thuộc tính `aria-pressed="true"`, nút chưa chọn có `aria-pressed="false"`.
   - Sử dụng phím `Tab` để di chuyển tiêu điểm và `Enter`/`Space` để kích hoạt bộ lọc.
2. **Reset Semantics**:
   - Trạng thái hoạt động `isFilterActive`:
     $$\text{isFilterActive} = (\text{searchTerm} \neq '') \lor (\text{domain} \neq 'all') \lor (\text{sourceType} \neq 'all') \lor (\text{tcmCategory} \neq 'all')$$
   - Nút "Đặt lại bộ lọc" (`RotateCcw`, `aria-label="Đặt lại bộ lọc"`) xuất hiện khi `isFilterActive === true`, khi click sẽ đưa toàn bộ state về `all`, xóa `searchTerm` và khôi phục hiển thị đầy đủ danh mục.

---

## 6. Kịch Bản Kiểm Thử Đã Được Xác Minh (Verified Scenarios)

1. `Scenario 1`: `getTerminologyFacetCounts()` tính toán chính xác tổng 241 mục từ:
   - `byDomain`: `{ 'phat-hoc': 154, 'huyen-hoc': 73, 'y-hoc-co-truyen': 14 }`
   - `bySourceType`: `{ 'lexicon': 19, 'system_node': 208, 'tcm_registry': 14 }`
   - `byTcmCategory`: `{ 'kinh-huyet': 5, 'tang-tuong': 5, 'duoc-tinh': 4 }`
2. `Scenario 2`: Lọc theo `domain = 'y-hoc-co-truyen'` trả về chính xác 14 mục từ Đông y (`sourceType = 'tcm_registry'`).
3. `Scenario 3`: Lọc theo `sourceType = 'lexicon'` trả về chính xác 19 mục từ từ điển độc lập.
4. `Scenario 4`: Lọc theo `tcmCategory = 'kinh-huyet'` trả về chính xác 5 đại huyệt (LI4, ST36, GV20, PC6, SP6).
5. `Scenario 5`: Kết hợp tìm kiếm `query = "Tâm Tạng"` VÀ `domain = 'y-hoc-co-truyen'` trả về `tcm-zangfu-xin` (Tâm tạng).
6. `Scenario 6`: Kết hợp tìm kiếm `query = "Citta"` VÀ `domain = 'phat-hoc'` trả về top result là `lex-pali-citta` (Citta / Tâm).
7. `Scenario 7`: Giao diện tự động ẩn dải chip TCM Subcategory khi người dùng đang chọn domain `phat-hoc` hoặc `huyen-hoc` và tự động hiển thị khi chọn `y-hoc-co-truyen` hoặc `tcm_registry`.
8. `Scenario 8`: Nút Reset khôi phục toàn bộ trạng thái mặc định của thanh công cụ.
