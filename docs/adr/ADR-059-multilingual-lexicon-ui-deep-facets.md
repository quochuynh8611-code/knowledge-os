# ADR-059: Multilingual Lexicon UI Deep Facets & Script-aware Presentation Layer

## Status
PROPOSED (Phase P12.2 Design)

## Context
Sau khi hoàn thành P12.0 (Commit `eb5cf9a`), tầng dữ liệu (`TerminologyEntry`) và bộ tìm kiếm trọng số (`searchTerminologyEntries`) đã hỗ trợ toàn diện các thuộc tính:
- `conceptId`: Mã định danh khái niệm toàn cầu (e.g. `concept:buddhism:citta`, `concept:iching:qian`).
- `sourceType`: Phân loại nguồn gốc mục từ (`lexicon`, `system_node`, `tcm_registry`, `custom_glossary`).
- `sourceEntryId`: Khóa gốc nguồn dữ liệu.
- `languageProfiles`: Bộ thông tin ngôn ngữ và hệ chữ có cấu trúc (Devanagari, Hán tự phồn thể/giản thể, Hán Việt, Pinyin có dấu, Pāli IAST, English academic glosses).

Tuy nhiên, giao diện `MultilingualLexicon.tsx` hiện tại vẫn đang dùng mô hình hiển thị cũ của P10.1:
- Bảng cố định 3 cột: `Pāli (IAST)`, `Sanskrit`, `Pinyin`.
- Chưa hiển thị chữ Phạn Devanagari nguyên bản (`चित्त`).
- Chưa hiển thị âm Hán Việt chuẩn mực (`Tâm`, `Càn`).
- Chưa hiển thị bản dịch tiếng Anh học thuật (`Mind / Consciousness`).
- Chưa có nhãn phân biệt nguồn `sourceType` giữa Từ điển chuyên sâu (`lexicon`) và Nút tri thức trong ma trận (`system_node`).
- Chưa có bộ lọc đa chiều (Facets) theo loại nguồn và theo sự hiện diện của các hệ chữ/ngôn ngữ.

## Decision
Thiết kế tầng trình diễn và lọc đa chiều cho `MultilingualLexicon` theo nguyên tắc: **Fast Scanning First, Deep Reading on Demand, Zero Visual Clutter**.

### 1. Information Hierarchy & Visual Design Policy
1. **Tier 1: Fast Scan Header (Thẻ xem nhanh)**:
   - **Tên chính (Primary Surface)**: Ưu tiên tiếng Việt (`vi.surfaceForm`) hoặc Pāli canonical.
   - **Chữ Hán & Hán Việt**: Hiển thị chữ Hán font Serif cổ điển kèm âm Hán Việt in đậm nhẹ (`心 [Tâm]`, `乾為天 [Càn]`).
   - **Pāli & Phạn**: Hiển thị IAST kèm script Devanagari nếu có (`citta (चित्त)`).
   - **Source Type & Domain Badges**:
     - Domain: Phật Học (Amber), Huyền Học (Indigo), Y Học Cổ Truyền (Teal), v.v.
     - Source Type Badge: `[Từ Điển]` (Lexicon - Slate/Amber) vs `[Ma Trận]` (System Node - Cyan/Sky).
2. **Tier 2: Multilingual Language Matrix (Bảng ngôn ngữ song song)**:
   - 4 ô thẻ mini phân tách rõ:
     - **Pāli / Sanskrit**: IAST + Devanagari (`citta • चित्त`)
     - **Hán Tự / Pinyin**: Hán tự + Pinyin có dấu (`心 • xīn`)
     - **Âm Hán Việt**: Chuẩn hóa tra cứu (`Tâm / Thức`)
     - **English Academic Gloss**: Bản dịch học thuật (`Mind / Consciousness`)
3. **Tier 3: Expandable Deep Etymology & Morphology Accordion (Khi mở rộng)**:
   - Chiết tự và gốc từ ngữ căn (`etymology.root`, `morphology`, `literalMeaning`).
   - Concept ID toàn cầu (`concept:buddhism:citta`).
   - Các biến thể dịch nghĩa khác (`glosses.alternates`).
4. **Tier 4: Provenance & Citation Action**:
   - Chỉ mục Tam Tạng PTS / Taishō.
   - Nút mở `ScholarCitationModal` và Sao chép nhanh.

### 2. Deep Facet Filter Architecture
Bổ sung thanh lọc phân cấp tinh tế bên dưới thanh tìm kiếm:
1. **Source Type Filter**:
   - `Tất cả` (All)
   - `Từ Điển Chuyên Sâu` (`lexicon`)
   - `Nút Ma Trận Tri Thức` (`system_node`)
2. **Script & Language Facets (Tags toggle nhanh)**:
   - `[Devanagari]` (Lọc các mục từ có chữ Phạn bản tự)
   - `[Hán Cổ]` (Lọc các mục từ có Hán tự)
   - `[English Gloss]` (Lọc các mục từ có bản dịch tiếng Anh)

### 3. Selector & View Model Projection
Cập nhật `LexiconItemView` trong `src/lib/scholarSuite/selectors.ts` để chuyển tải an toàn các trường P12.0:
```ts
export interface LexiconItemView {
  id: string;
  pali: string;
  sanskrit: string;
  devanagari?: string;
  hanTu: string;
  hanViet?: string;
  pinyin: string;
  vietnamese: string;
  englishGloss?: string;
  category: KnowledgeDomain;
  sourceType?: 'lexicon' | 'system_node' | 'tcm_registry' | 'custom_glossary';
  conceptId?: string;
  definition: string;
  canonicalRef: string;
  tags: string[];
  code?: string;
}
```

## Consequences

### Positive
- **Trải nghiệm trực quan vượt bậc**: Học giả và người nghiên cứu nhìn thấy ngay chữ Phạn Devanagari, âm Hán Việt và bản dịch tiếng Anh chuẩn mực mà không cần mở modal tra cứu riêng.
- **Minh bạch xuất xứ**: Phân định rõ ràng giữa mục từ định nghĩa gốc (`lexicon`) và khái niệm cấu trúc mạng lưới (`system_node`).
- **Khả năng tra cứu đa chiều**: Bộ lọc Facet giúp thu hẹp danh sách theo nguồn và hệ chữ cực kỳ tiện lợi.
- **Bảo toàn hiệu năng**: Pure selector ánh xạ trực tiếp từ bộ nhớ Ram, không phát sinh network request hay re-computation nặng.

### Negative / Trade-offs
- Thẻ Detailed View cần tăng chiều cao khoảng 20-30px để chứa thêm ô English Gloss và Devanagari; tuy nhiên Compact View vẫn giữ nguyên tính năng hiển thị mật độ cao.

## Staged Rollout Strategy
- **Wave 1**: Mở rộng `LexiconItemView` + Hiển thị Source Type Badge, Devanagari, Hán Việt, English Gloss trên Detailed & Compact card.
- **Wave 2**: Tích hợp khối Deep Etymology / Concept ID Accordion khi click xem chi tiết.
- **Wave 3**: Tích hợp thanh lọc Source Type & Script Facets Toolbar.
