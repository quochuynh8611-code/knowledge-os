# Technical Specification: Phase P5.2 — Command Palette Result Ranking, Deduplication & Relevance

## 1. Problem Statement & Motivation
Tại Phase P5.0 và P5.1, `useCommandPalette` đã được trang bị **Hardened Recent History** và kết nối đầy đủ **Deep Actions** từ caller (`App.tsx`). Tuy nhiên, thuật toán lọc tìm kiếm hiện tại gặp 3 hạn chế về trải nghiệm người dùng:
1. **Thiếu Trọng Số Khớp Lệnh (No Match Scoring)**: Lệnh khớp chính xác tiêu đề (`title === query`) có thứ tự ngang bằng với lệnh chỉ khớp phụ trong `description`, khiến kết quả ít liên quan xuất hiện trước kết quả chính xác do phụ thuộc thứ tự chèn tĩnh.
2. **Nguy Cơ Trùng Lặp ID Khi Inject Custom Items**: Khi caller truyền `customItems`, hook hiện tại chỉ ghép mảng thô sơ mà chưa khử trùng lặp theo `item.id`, gây nguy cơ duplicate key và sai lệch `selectedIndex`.
3. **Thiếu Ưu Tiên Ngữ Cảnh Gần Đây (Recency Affinity)**: Lệnh mà người dùng vừa sử dụng gần đây không được ưu tiên tăng hạng khi tìm kiếm từ khóa tương ứng.

Phase P5.2 triển khai mô hình chấm điểm trọng số trong bộ nhớ (In-memory Relevance Scoring), cơ chế khử trùng lặp theo ID với quyền ghi đè cho custom items (Custom-item Override), điểm cộng tương tác gần đây (Recency Boost) và chuỗi phân xử hòa điểm chặt chẽ (Deterministic Tie-Break Chain).

---

## 2. Architecture & Design Specification

### 2.1. In-Memory Scoring Model
Mỗi `CommandPaletteItem` khi đối soát với chuỗi truy vấn đã chuẩn hóa (`normQ = normalizeScholarText(query)`) sẽ được tính điểm theo thang đo:

| Tiêu chí khớp (Match Criterion) | Điểm cơ sở (Base Score) |
| :--- | :---: |
| **Khớp chính xác Tiêu đề** (`normTitle === normQ`) | **100** |
| **Tiêu đề bắt đầu bằng từ khóa** (`normTitle.startsWith(normQ)`) | **80** |
| **Tiêu đề chứa từ khóa** (`normTitle.includes(normQ)`) | **60** |
| **Từ khóa chứa khớp chính xác / tiền tố** (`keywords.some(...)`) | **40** |
| **Mô tả chứa từ khóa** (`normDesc.includes(normQ)`) | **20** |
| **Danh mục chứa từ khóa** (`normCategory.includes(normQ)`) | **10** |
| Không khớp trường nào | **0** (bị loại khỏi kết quả) |

### 2.2. Recency Boost (+5 Điểm)
- Nếu item khớp từ khóa (Base Score > 0) và nằm trong danh sách `recentIds`:
  - `Total Score = Base Score + 5`
- Recency boost giúp các lệnh quen thuộc vừa dùng được đẩy lên trên các lệnh cùng hạng mà không lấn át các kết quả khớp tiêu đề chính xác hơn.

### 2.3. ID-Based Deduplication with Custom-Item Override
- Khi hợp nhất danh sách lệnh cơ sở và danh sách mở rộng (`options.customItems`):
  ```typescript
  const itemMap = new Map<string, CommandPaletteItem>();
  // 1. Nạp base items
  baseItems.forEach((item) => itemMap.set(item.id, item));
  // 2. Nạp custom items (ghi đè nếu trùng id)
  (options.customItems || []).forEach((item) => itemMap.set(item.id, item));
  const mergedItems = Array.from(itemMap.values());
  ```

### 2.4. Explicit Deterministic Tie-Break Chain
Khi sắp xếp các mục kết quả tìm kiếm, thứ tự ưu tiên được xác định theo 3 cấp độ liên hoàn:
1. **Cấp 1: Điểm tổng giảm dần (`score desc`)**: Item có điểm cao hơn luôn đứng trước.
2. **Cấp 2: Thứ tự danh mục chuẩn (`category order asc`)**: Nếu cùng điểm, sắp xếp theo chỉ số vị trí trong `CATEGORY_ORDER` (`Hành động nhanh` $\rightarrow$ `Điều hướng` $\rightarrow$ `Chủ đề` $\rightarrow$ `Ghi chú`).
3. **Cấp 3: Thứ tự chèn ổn định gốc (`original stable index asc`)**: Nếu cùng điểm và cùng danh mục, bảo lưu vị trí xuất hiện ban đầu trong danh sách `mergedItems`.

---

## 3. Boundaries & Invariants

| Thành phần | Trách nhiệm (Scope) | Ranh giới cấm (Out of Scope) |
| :--- | :--- | :--- |
| `useCommandPalette.ts` | Khử trùng lặp ID, tính điểm trọng số khớp, áp dụng recency boost và tie-break chain. | Không thêm external search engine dependencies (FlexSearch, Lunr, etc.). |
| `CommandPalette.tsx` | Hiển thị kết quả đã được sắp xếp tối ưu, giữ nguyên layout và accessibility. | Không can thiệp thay đổi điểm số tính từ hook. |
| `src/lib/scholarSearch.ts` | Cung cấp hàm chuẩn hóa tiếng Việt `normalizeScholarText`. | Không thay đổi hàm chuẩn hóa cốt lõi. |

---

## 4. File Changes Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `docs/specs/phase-p5-2-command-palette-ranking-and-relevance.md` | **NEW** | Đặc tả kỹ thuật Phase P5.2. |
| `docs/adr/ADR-046-command-palette-ranking-and-relevance.md` | **NEW** | Quyết định kiến trúc chấm điểm in-memory và tie-break chain. |
| `docs/gherkin/phase-p5-2-command-palette-ranking-and-relevance.feature` | **NEW** | Kịch bản BDD kiểm thử xếp hạng, khử trùng lặp và recency boost. |
| `src/hooks/useCommandPalette.ts` | **MODIFY** | Triển khai deduplicate by ID, tiered scoring function và multi-tier sorting. |
| `tests/unit/command-palette.test.tsx` | **MODIFY** | Thêm test cases kiểm thử xếp hạng trọng số, ghi đè custom item và recency boost. |
