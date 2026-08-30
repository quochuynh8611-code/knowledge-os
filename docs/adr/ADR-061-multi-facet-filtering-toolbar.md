# ADR-061: Multi-Facet Filtering Toolbar for Multilingual Lexicon

## Status
ACCEPTED (Phase P12.2 Wave 3 Implemented & Verified)

## Context
Sau khi hoàn thành P12.0 (Multilingual Term Identity), P12.2 Wave 1 (Presentation Badges & Multilingual Surface) và P12.1 (TCM Registry Integration), kho tri thức thuật ngữ hợp nhất (`scholarUnifiedDictionary`) đã đạt quy mô **241 mục từ** chuẩn hóa, phân định rõ ràng trên hai trục phân loại trực giao (Orthogonal Taxonomy Axes):

1. **Trục Miền Tri Thức (Domain Axis - 241 mục từ)**:
   - `phat-hoc` (Phật Học): **154** mục từ (gồm 19 mục từ Lexicon chuyên sâu + 135 System Nodes về Tâm Pháp, Tâm Sở và Duyên Khởi).
   - `huyen-hoc` (Huyền Học & Dịch Lý): **73** mục từ (gồm 64 Quẻ Kinh Dịch + 9 Cung Đồ Hình Kỳ Môn Độn Giáp).
   - `y-hoc-co-truyen` (Y Học Cổ Truyền / Đông Y): **14** mục từ (5 Đại huyệt, 5 Tạng tượng, 4 Dược liệu).
2. **Trục Nguồn Cấu Trúc (Source Type Axis - 241 mục từ)**:
   - `lexicon` (Từ Điển Nghiên Cứu Chuyên Sâu): **19** mục từ (`sourceType: 'lexicon'`).
   - `system_node` (Ma Trận Đồ Hình Hệ Thống): **208** mục từ (`sourceType: 'system_node'`: 135 Phật học + 73 Huyền học).
   - `tcm_registry` (Kho Thực Thể Y Học Cổ Truyền): **14** mục từ (`sourceType: 'tcm_registry'`).
3. **Trục Phân Nhóm Đông Y Chuyên Sâu (`tcmCategory` - 14 mục từ)**:
   - `kinh-huyet` (Kinh Lạc & Huyệt Vị): **5** đại huyệt (LI4, ST36, GV20, PC6, SP6).
   - `tang-tuong` (Tạng Tượng & Học Thuyết): **5** tạng cơ bản (Tâm, Can, Tỳ, Phế, Thận).
   - `duoc-tinh` (Dược Tính & Bản Thảo): **4** vị thuốc thượng phẩm (Nhân Sâm, Hoàng Kỳ, Đương Quy, Cam Thảo).

Trước P12.2 Wave 3, thanh công cụ lọc của `MultilingualLexicon.tsx` chỉ có 3 nút lọc đơn giản, chưa tách bạch giữa Domain và Source Type, thiếu bộ lọc Đông Y, thiếu phân nhóm chuyên sâu TCM và không có dynamic counts.

## Problem Statement
Khi số lượng mục từ tăng lên 241, người dùng cần điều hướng đa chiều mà không bị nhầm lẫn giữa **Nội dung tri thức** (Domain) và **Hình thức cấu trúc dữ liệu** (Source Type):
1. **Tránh nhầm lẫn taxonomy**: Domain và Source Type là hai trục trực giao độc lập; không được gộp phẳng thành một danh sách gây sai lệch ngữ nghĩa (ví dụ: không thể coi "Từ Điển" là một Domain, hay coi "Phật Học" là một Source Type).
2. **Zero Hardcoding**: Tuyệt đối không hardcode số đếm trên giao diện; toàn bộ count badge phải được tính toán động tại runtime từ kho dữ liệu thực tế.
3. **Giao tập hợp nhất quán**: Cần mô hình lọc giao tập hợp (AND intersection) kết hợp chặt chẽ giữa Search Query và các nhóm Facets.
4. **Trải nghiệm tiếp cận (A11y)**: Phải đáp ứng đầy đủ tiêu chuẩn ARIA (`role="group"`, `aria-label`, `aria-pressed`), hỗ trợ điều hướng bàn phím và tính năng Reset bộ lọc tức thì.

## Decision

### 1. Phân Tầng Hệ Thống Facet (Facet Taxonomy Hierarchy)
Tách bạch 3 tầng lọc trực giao:

- **Tầng 1: Domain Facet (Miền Tri Thức - Universal Group)**
  - `all`: Tất cả miền tri thức (241).
  - `phat-hoc`: Phật Học (154).
  - `huyen-hoc`: Dịch Học & Huyền Học (73).
  - `y-hoc-co-truyen`: Y Học Cổ Truyền Đông phương (14).

- **Tầng 2: Source Type Facet (Nguồn Cấu Trúc - Universal Group)**
  - `all`: Tất cả nguồn (241).
  - `lexicon`: Mục từ Từ Điển nghiên cứu chuyên sâu (19).
  - `system_node`: Nút cấu trúc Đồ hình Ma trận (208).
  - `tcm_registry`: Kho thực thể Y Học Cổ Truyền (14).

- **Tầng 3: Conditional Subcategory Facet (Phân Nhóm Đông Y Theo Ngữ Cảnh)**
  - *Chỉ kích hoạt hiển thị khi Domain là `y-hoc-co-truyen` hoặc Source Type là `tcm_registry`*:
    - `all`: Tất Cả Đông Y (14).
    - `kinh-huyet`: Kinh Lạc & Huyệt Vị (5).
    - `tang-tuong`: Tạng Tượng & Học Thuyết (5).
    - `duoc-tinh`: Dược Tính & Bản Thảo (4).
    - `bat-cuong`: Bát Cương Chẩn Đoán.

### 2. Selection & Intersection Model (Mô Hình Lọc & Kết Hợp)
- **Single-select per Group**: Trong mỗi nhóm facet, người dùng chọn 1 giá trị duy nhất (mặc định là `all`).
- **AND Logic Intersection**: Kết quả hiển thị cuối cùng là giao tập hợp nghiêm ngặt của:
  $$\text{Result} = \text{Search}(q) \cap \text{Filter}(\text{Domain}) \cap \text{Filter}(\text{SourceType}) \cap \text{Filter}(\text{TcmCategory})$$
- **Deterministic Search Priority**: Khi có `searchTerm`, thứ tự sắp xếp được quyết định bởi Weighted Search Engine của P12.0/P12.1; bộ lọc đóng vai trò thu hẹp không gian kết quả.

### 3. Dynamic Counting Policy (Chính Sách Đếm Động)
- **Zero Hardcoding**: Toàn bộ count badge `(N)` được tính toán runtime qua hàm pure selector `getTerminologyFacetCounts(query?: string)`.
- **Search-Scoped Facet Counts**:
  - Khi `searchTerm` trống: Hiển thị số lượng mục từ trong toàn bộ kho dữ liệu theo từng facet (Total Baseline Counts).
  - Khi `searchTerm` đang hoạt động: Hiển thị số lượng mục từ khớp với từ khóa tìm kiếm trong từng facet (Search-Scoped Active Counts).
- **Summary Bar**: Hiển thị tỷ lệ số mục từ khớp bộ lọc trên tổng số mục từ toàn catalog: `Hiển thị {filteredEntries.length} / {totalCount} thuật ngữ`.

### 4. UI Layout & Accessibility (A11y)
- **Bố cục trực quan**:
  - Nhóm Domain và Source Type hiển thị dưới dạng Filter Chips gọn gàng, có màu sắc nhận diện đặc trưng (Amber cho Phật học, Indigo cho Huyền học, Teal cho Đông y, Sky cho Ma trận).
  - Nhóm Conditional Subcategory hiển thị dưới dạng dải chip phụ có background `bg-teal-50/40` và viền `border-teal-100`.
- **A11y & Phím Tắt**:
  - Sử dụng `role="group"`, `aria-label`, `aria-pressed="true|false"` trên từng nút bấm facet.
  - Hỗ trợ phím `Tab` duyệt tuần tự và `Space`/`Enter` để kích hoạt.
  - Nút "Đặt lại bộ lọc" (`RotateCcw`, `aria-label="Đặt lại bộ lọc"`) xuất hiện nổi bật khi có bất kỳ bộ lọc nào khác `all` hoặc có từ khóa tìm kiếm.

### 5. Architectural Decoupling
- Khóa chặt hợp đồng interface đa chiều trong `src/lib/scholarSuite/selectors.ts`:
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
- Không can thiệp vào các thuật toán search ranking cốt lõi của `lexiconDictionary.ts`.

## Blast Radius
- **Rất thấp & An toàn tuyệt đối**:
  - Thay đổi tập trung hoàn toàn tại tầng trình bày (`MultilingualLexicon.tsx`) và selector view-model (`selectors.ts`).
  - Dữ liệu gốc (`lexiconRegistry.ts`, `systemRegistry.ts`, `tcmRegistry.ts`) và core dictionary (`unifiedDictionary.ts`) được giữ nguyên vẹn.
  - 100% test suite (177 test files, 1091/1091 tests) pass hoàn toàn.

## Non-goals
- Không đưa vào bộ lọc tìm kiếm nâng cao bằng Regex hoặc Boolean logic phức hợp lồng nhau trong đợt này.
- Giữ filter state trong component memory để đảm bảo độ phản hồi tức thì và nhẹ nhàng.
