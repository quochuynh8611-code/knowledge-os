# P12.0: Multilingual Term Identity & Language Profile Field Checklist & Specification

**Tài liệu tham chiếu chuẩn cho Modeling Dữ liệu Đa Ngôn ngữ & Miền Tri Thức Mở Rộng**  
**Gắn kết kiến trúc**: [ADR-058: Multilingual Term Identity & Language-aware Knowledge Foundation](../adr/ADR-058-multilingual-term-identity-and-language-profile-foundation.md)  
**Trạng thái**: SPECIFICATION DRAFT / CHECKLIST BASELINE  
**Ngày lập**: 2026-08-30  

---

## 1. Tổng Quan Kiến Trúc Dữ Liệu Đa Ngôn Ngữ

Tài liệu này cung cấp bảng danh mục (checklist) chi tiết về toàn bộ các trường dữ liệu (fields), quy tắc kiểm định (validation rules), và yêu cầu lập chỉ mục tra cứu (search indexing) phục vụ mở rộng kho thuật ngữ học thuật sang 4 hệ thống ngôn ngữ & chuyên ngành:
1. **Tiếng Trung (Cổ văn, Hán học, Dịch học)**
2. **Tiếng Anh (Học thuật, Triết học, Đối chiếu quốc tế)**
3. **Tiếng Phạn / Sanskrit & Pāli (Kinh văn gốc, Ngữ pháp học, Chuyển tự IAST)**
4. **Đông Y / Y Học Cổ Truyền (TCM - Kinh huyệt, Tạng tượng, Dược tính, Trị pháp)**

---

## 2. Danh Mục Trường Toàn Diện (Comprehensive Field Checklist)

### A. Core Identity Fields (Nhận diện Cốt lõi)
- [ ] `conceptId` *(string, bắt buộc)*: Định danh trừu tượng cho ý niệm học thuật xuyên ngôn ngữ (e.g. `concept:buddhism:citta`, `concept:tcm:zangfu:xin`).
- [ ] `entryId` *(string, bắt buộc)*: Khóa chính của bản ghi vật lý trong registry cụ thể (e.g. `lex-pali-citta`, `sys-tcm-lu09`).
- [ ] `sourceType` *(string enum, bắt buộc)*: Nguồn dữ liệu gốc (`lexicon` | `system_node` | `tcm_registry` | `custom_glossary`).
- [ ] `canonicalLabel` *(string, bắt buộc)*: Nhãn hiển thị học thuật mặc định (e.g. `Citta`, `Thái Uyên`, `Càn Vi Thiên`).
- [ ] `isCanonical` *(boolean, tùy chọn, mặc định true)*: Xác định mục từ có phải định nghĩa chính thống được xác minh hay không.
- [ ] `reviewStatus` *(enum, bắt buộc)*: Trạng thái thẩm định (`draft` | `verified` | `canonical`).

### B. Language & Script Fields (Ngôn ngữ & Chữ viết)
- [ ] `languageCode` *(BCP-47 string, bắt buộc)*: Mã ngôn ngữ chuẩn (`vi`, `zh-Hant`, `zh-Hans`, `sa`, `pi`, `en`).
- [ ] `scriptCode` *(ISO-15924 string, bắt buộc)*: Mã hệ chữ viết (`Latn`, `Hani`, `Deva`, `Brah`).
- [ ] `surfaceForm` *(string, bắt buộc)*: Mặt chữ nguyên bản (e.g. `心`, `चित्त`, `Tâm`, `Mind`).
- [ ] `traditionalChinese` *(string, tùy chọn)*: Chữ Hán Phồn thể chuẩn (e.g. `乾`, `心所`, `太淵`).
- [ ] `simplifiedChinese` *(string, tùy chọn)*: Chữ Hán Giản thể tương ứng (e.g. `乾`, `心所`, `太渊`).
- [ ] `devanagari` *(string, tùy chọn)*: Chữ Devanagari gốc cho thuật ngữ Phạn (e.g. `चित्त`, `शमथ`).

### C. Transliteration Fields (Chuyển tự & Phiên âm)
- [ ] `iast` *(string, bắt buộc cho Sa/Pi)*: Phiên âm học thuật chuẩn quốc tế có ký tự đặc biệt (e.g. `citta`, `prajñā`, `samatha`).
- [ ] `pinyin` *(string, bắt buộc cho Zh)*: Bính âm chuẩn có dấu thanh điệu (e.g. `xīn`, `tài yuān`, `qì`).
- [ ] `pinyinPlain` *(string, tạo tự động)*: Bính âm không dấu thanh để tra cứu nhanh (e.g. `xin`, `taiyuan`, `qi`).
- [ ] `hanViet` *(string, bắt buộc cho Zh/TCM)*: Âm đọc Hán Việt truyền thống (e.g. `Tâm`, `Thái Uyên`, `Khí`, `Âm Dương`).
- [ ] `wadeGiles` *(string, tùy chọn)*: Phiên âm Wade-Giles trong các ấn bản phương Tây cũ (e.g. `ch'i`, `I Ching`).
- [ ] `plainAscii` *(string, tạo tự động)*: Dạng chuỗi thuần ASCII sau khi bỏ mọi loại dấu phục vụ indexing.

### D. Gloss & Translation Fields (Nghĩa dịch thuật)
- [ ] `preferredGloss` *(string, bắt buộc)*: Bản dịch ngữ nghĩa được khuyến nghị sử dụng chính thức.
- [ ] `alternateGlosses` *(string[], nên có)*: Danh sách các bản dịch học thuật tương đương từ các dịch giả uy tín.
- [ ] `literalMeaning` *(string, tùy chọn)*: Nghĩa đen chiết tự/nguyên nghĩa từ nguyên học.
- [ ] `semanticNuance` *(string, tùy chọn)*: Ghi chú về sự khác biệt tinh tế giữa các bản dịch.

### E. Domain & Tradition Fields (Miền Tri Thức & Trường Phái)
- [ ] `semanticDomain` *(KnowledgeDomain, bắt buộc)*: Miền tri thức (`phat-hoc` | `huyen-hoc` | `dong-y` | `triet-hoc` | `da-nganh`).
- [ ] `school` *(string, nên có)*: Tông phái hoặc trường phái lý luận (e.g. `Theravāda`, `Yogācāra`, `Huyền Không`, `Nội Kinh`).
- [ ] `tradition` *(string, tùy chọn)*: Truyền thống tri thức (e.g. `Nam Truyền`, `Bắc Truyền`, `Đạo Gia Y Đạo`).
- [ ] `philosophicalFramework` *(string, tùy chọn)*: Hệ quy chiếu triết học áp dụng.

### F. Provenance & Source Fields (Xuất xứ & Trích dẫn)
- [ ] `sourceTitle` *(string, bắt buộc khi verified/canonical)*: Tên văn bản cổ điển hoặc ấn bản học thuật.
- [ ] `sectionRef` *(string, bắt buộc khi verified/canonical)*: Đoạn, hào, chương, mục kinh điển.
- [ ] `taishoRef` *(string, tùy chọn)*: Chỉ số mục trong Đại Tạng Kinh Taishō (e.g. `T01n0001_p0001a01`).
- [ ] `ptsRef` *(string, tùy chọn)*: Chỉ số mục trích dẫn Pali Text Society (e.g. `D. i. 111`, `Dhsa. 12`).
- [ ] `tcmClassicRef` *(string, tùy chọn)*: Định danh y điển cổ (e.g. `Hoàng Đế Nội Kinh - Tố Vấn Thiên 08`).
- [ ] `provenanceNote` *(string, bắt buộc khi stub/partial)*: Ghi chú nguồn gốc tạm thời khi chưa có nguồn kinh điển chuẩn.

### G. Search & Indexing Fields (Chỉ mục Tìm kiếm)
- [ ] `searchTokens` *(string[], tạo tự động)*: Mảng token chuẩn hóa gom từ tất cả các dạng viết và chuyển tự.
- [ ] `rankingWeight` *(number, tùy chọn, mặc định 1.0)*: Trọng số ưu tiên xuất hiện khi tìm kiếm.
- [ ] `synonymConceptIds` *(string[], tùy chọn)*: Liên kết tới các Concept đồng nghĩa hoặc gần nghĩa.

### H. UI Presentation Fields (Trình bày Giao diện)
- [ ] `displayScript` *(string, bắt buộc)*: Mặt chữ hiển thị nổi bật trên thẻ UI.
- [ ] `displayTransliteration` *(string, bắt buộc)*: Chuỗi phiên âm kèm theo (e.g. `xīn / Tâm` hoặc `citta`).
- [ ] `badgeStyle` *(string, tùy chọn)*: Định dạng màu sắc nhận diện theo miền tri thức.

### I. Validation Rules (Quy tắc Kiểm Định Bất Biến)
1. **Invariant 1 (Language Profile Surface)**: Mỗi `LanguageProfile` bắt buộc phải có `surfaceForm` không rỗng và mã `languageCode` hợp lệ theo chuẩn BCP-47.
2. **Invariant 2 (Attribution Completeness)**: Nếu mục từ có `reviewStatus` là `verified` hoặc `canonical`, danh sách `sources` phải có ít nhất 1 nguồn với đầy đủ `sourceTitle` và `sectionRef`.
3. **Invariant 3 (Sanskrit / Pāli Transliteration)**: Bất kỳ mục từ nào có `languageCode` là `sa` hoặc `pi` bắt buộc phải cung cấp chuỗi `iast`.
4. **Invariant 4 (Chinese Pronunciation)**: Bất kỳ mục từ nào có `languageCode` là `zh-Hant` hoặc `zh-Hans` bắt buộc phải có `pinyin` và `hanViet`.

---

## 3. Bảng Phân Định Chi Tiết Theo Từng Nhóm Ngôn Ngữ / Domain

```markdown
### 3.1. Nhóm Tiếng Trung (Classical & Modern Chinese)

| Trường (Field) | Mức độ bắt buộc | Mục đích & Ví dụ | Rủi ro Ambiguity | Chuẩn hóa Indexing |
| :--- | :--- | :--- | :--- | :--- |
| `traditionalChinese` | **Bắt buộc** | Chữ Hán Phồn thể (`乾`, `太淵`, `心所`) | Đồng âm dị nghĩa rất lớn giữa các quẻ và tạng phủ | Giữ nguyên UTF-8 Hani |
| `simplifiedChinese` | *Nên có* | Chữ Hán Giản thể (`太渊`, `气`) | Một chữ giản thể có thể đại diện cho nhiều chữ phồn thể | Map song song về Hani |
| `pinyin` | **Bắt buộc** | Phiên âm có thanh điệu (`xīn`, `tài yuān`) | Trùng pinyin khi bỏ dấu thanh | Tạo `pinyinPlain` |
| `hanViet` | **Bắt buộc** | Âm Hán Việt chuẩn (`Tâm`, `Thái Uyên`, `Khí`) | Nhiều âm Hán Việt khác nhau tùy văn cảnh | Normalize bỏ dấu tiếng Việt |
| `wadeGiles` | *Tùy chọn* | Phiên âm kiểu cũ (`T'ai Yuan`, `Ch'i`) | Dễ nhầm với pinyin hiện đại | Bỏ dấu nháy đơn khi search |
```

```markdown
### 3.2. Nhóm Tiếng Anh (Academic English)

| Trường (Field) | Mức độ bắt buộc | Mục đích & Ví dụ | Rủi ro Ambiguity | Chuẩn hóa Indexing |
| :--- | :--- | :--- | :--- | :--- |
| `preferredGloss` | **Bắt buộc** | Dịch thuật chuẩn học thuật (`Consciousness`, `Supreme Ultimate`) | Bất đồng trường phái dịch thuật phương Tây | Lowercase + Trim whitespace |
| `alternateGlosses` | *Nên có* | Danh sách từ đồng nghĩa học thuật (`Mind`, `Heart-Mind`, `Citta-State`) | Trùng từ vựng thông tục hàng ngày | Multi-token phrase matching |
| `targetAudience` | *Tùy chọn* | Đối tượng sử dụng (`academic` \| `practitioner` \| `general`) | Không ảnh hưởng ngữ nghĩa | Không index |
```

```markdown
### 3.3. Nhóm Sanskrit & Pāli (Phạn ngữ & Pāli cổ điển)

| Trường (Field) | Mức độ bắt buộc | Mục đích & Ví dụ | Rủi ro Ambiguity | Chuẩn hóa Indexing |
| :--- | :--- | :--- | :--- | :--- |
| `iast` | **Bắt buộc** | Chuyển tự chuẩn có dấu phụ (`citta`, `prajñā`, `samatha`, `dukkha`) | Nhầm lẫn giữa nguyên âm dài/ngắn ($\bar{a}/a, \bar{\imath}/i$) | Normalize qua `normalizeScholarText` |
| `devanagari` | *Nên có* | Chữ viết gốc Devanagari (`चित्त`, `प्रज्ञा`) | Phức tạp trong hiển thị font | Exact match UTF-8 Devanagari |
| `rootDhatu` | *Nên có* | Căn ngữ ngữ pháp học (`√cit`, `√jñā`) | Khó tra cứu cho người dùng phổ thông | Index dạng tiền tố/hậu tố |
| `morphology` | *Tùy chọn* | Phân tích tiếp vĩ ngữ, tiếp đầu ngữ, hợp tự (Compound/Sandhi) | Độ dài chuỗi lớn | Search theo token con |
```

```markdown
### 3.4. Nhóm Đông Y (TCM - Traditional Chinese Medicine)

| Trường (Field) | Mức độ bắt buộc | Mục đích & Ví dụ | Rủi ro Ambiguity | Chuẩn hóa Indexing |
| :--- | :--- | :--- | :--- | :--- |
| `tcmCategory` | **Bắt buộc** | Phân loại Đông Y (`kinh-huyet` \| `tang-tuong` \| `duoc-tinh` \| `bat-cuong`) | Trùng tên giữa Tạng phủ và Huyệt đạo (e.g. *Tâm* vs *Tâm Du*) | Phân biệt qua `tcmCategory` |
| `meridianCode` | *Bắt buộc nếu là huyệt* | Mã hiệu chuẩn quốc tế WHO (`LU-9`, `ST-36`, `GV-20`, `CV-4`) | Nhầm lẫn giữa các hệ quy chiếu mã hiệu cũ/mới | Normalize chữ hoa viết liền |
| `natureFlavor` | *Bắt buộc nếu là dược* | Tứ khí ngũ vị (`Hàn / Nhiệt / Ôn / Lương`, `Tân / Cam / Khổ...`) | Nhiều tài liệu y điển ghi nhận tính vị dị biệt | Facet search lọc theo thuộc tính |
| `channelTropism` | *Bắt buộc nếu là dược* | Quy kinh tạng phủ (`Quy kinh Phế, Vị, Đại Trường`) | Trùng tên tạng phủ | Array token matching |
| `primaryAction` | *Nên có* | Công năng chủ trị chính (`Bổ khí kiện tỳ`, `Thanh nhiệt giải độc`) | Văn phong y học cổ biểu đạt đa dạng | Word-boundary matching |
```

---

## 4. Kịch Bản Kiểm Thử Đỏ (RED Scenarios Direction cho Phase Implementation)

Dưới đây là danh sách các kịch bản kiểm thử mẫu (Test Scenarios) sẽ được hiện thực hóa ở phase coding tiếp theo (P12.1+):

### Kịch bản 1: Đa diện mạo Script cho cùng một Concept (Multi-script Surface Parity)
- **Đầu vào**: Khái niệm `concept:buddhism:citta`.
- **Kỳ vọng**:
  - Truy vấn `sa` trả về Devanagari `चित्त` và IAST `citta`.
  - Truy vấn `zh-Hant` trả về Hán tự `心` và Pinyin `xīn`.
  - Truy vấn `vi` trả về `Tâm` và âm Hán Việt `Tâm`.
  - Truy vấn `en` trả về preferred gloss `Mind / Consciousness`.

### Kịch bản 2: Tra cứu đa dạng biến thể (Multi-transliteration Deterministic Search)
- **Đầu vào query**:
  - `"citta"` $\rightarrow$ Match chính xác `lex-pali-citta` (Top 1, điểm cao nhất).
  - `"xin"` hoặc `"xīn"` $\rightarrow$ Match chính xác mục từ chữ Hán `心`.
  - `"tam"` (không dấu) $\rightarrow$ Match `Tâm` mà không làm nhiễu loạn các kết quả khác.
  - `"चित्त"` (Devanagari) $\rightarrow$ Match ngay lập tức `lex-pali-citta`.

### Kịch bản 3: Không sáp nhập sai lệch giữa Lexicon và System Node (Registry Boundary Preservation)
- **Đầu vào**: `lex-pali-citta` (Từ nguyên học) và `sys-citta-01` (Tâm Vương thứ 1 trong 89 Tâm Abhidhamma).
- **Kỳ vọng**:
  - Cả 2 đều có `conceptId` tương thích hoặc liên kết.
  - Nhưng mỗi entry giữ nguyên `id` độc lập, thuộc tính phân loại riêng biệt (`systemType: 'citta_89_121'` của SystemNode không bị mất).
  - Xuất citation cho `sys-citta-01` trích dẫn đúng *Dhammasaṅgaṇī*, trong khi `lex-pali-citta` trích dẫn *PTS Pali-English Dictionary*.

### Kịch bản 4: Cô lập Domain Đông Y (TCM Domain Isolation)
- **Đầu vào**: Thêm mục từ Huyệt vị `sys-tcm-lu09` (Thái Uyên - 太淵).
- **Kỳ vọng**:
  - Bộ lọc `domain: 'dong-y'` hoặc `category: 'kinh-huyet'` hiển thị đầy đủ thuộc tính `meridianCode: 'LU-9'`, `nature: 'Thổ huyệt - Nguyên huyệt'`.
  - Không làm ảnh hưởng đến các bài test kiểm tra số lượng của Scholar Suite (35 Topics baseline, 64 quẻ Dịch, 89 Tâm, 52 Tâm sở).
  - Citation xuất ra định dạng trích dẫn Y điển chuẩn (*Châm Cứu Giáp Ất Kinh* hoặc *Linh Khu - Cửu Châm Thập Nhị Nguyên*).
