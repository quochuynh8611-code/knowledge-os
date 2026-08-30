# ADR-060: Traditional Chinese Medicine (TCM) Registry Integration & Domain Taxonomy

## Status
PROPOSED (Phase P12.1 Design)

## Context
Sau khi hoàn thành P12.0 (Multilingual Term Identity) và P12.2 Wave 1 (Presentation Badges & Multilingual Surface), hệ thống Knowledge OS đã có nền tảng đa ngữ vững chắc với sự hỗ trợ đầy đủ cho chữ Hán, Bính âm, âm Hán Việt, chữ Phạn Devanagari/IAST và English Academic Glosses.

Hiện tại, hệ thống đã tích hợp 2 mảng tri thức lớn:
1. **Phật Học (Buddhism & Abhidhamma)**: 19 mục từ Lexicon + 52 Tâm sở + 89/121 Tâm + 24 Duyên hệ + 12 Duyên khởi.
2. **Huyền Học & Dịch Lý (I Ching & Qi Men)**: 64 Quẻ Dịch + 9 Cung Kỳ Môn Độn Giáp.

Để hoàn thiện tầm nhìn liên ngành 4 trụ cột tri thức (**Phật Học ↔ Dịch Học ↔ Khoa Học Tâm Thức ↔ Đông Y Học**), hệ thống cần tích hợp mảng tri thức thứ 4: **Y Học Cổ Truyền (Traditional Chinese Medicine - TCM)**.

Trong `src/types/terminology.ts`, hợp đồng P12.0 đã chuẩn bị sẵn:
- `sourceType: 'tcm_registry'`
- `tcmExtension: TcmDomainExtension`
- `category: 'kinh-huyet' | 'tang-tuong' | 'duoc-tinh' | 'bat-cuong' | 'phuong-te'`

## Problem Statement
Nếu tích hợp TCM một cách cảm tính mà không phân định ranh giới taxonomy chặt chẽ:
1. Dễ nhồi nhét tất cả (Huyệt vị, Cây thuốc, Tạng phủ, Bệnh chứng, Bài thuốc) vào một cấu trúc phẳng hỗn loạn.
2. Thiếu quy chuẩn quốc tế (WHO Standard Acupuncture Point Terminology, Dược điển YHCT).
3. Làm loãng cơ chế tìm kiếm đa ngữ nếu không chuẩn hóa Hán tự phồn thể/giản thể, âm Hán Việt và Bính âm.
4. Nguy cơ phá vỡ tính bất biến và tương thích ngược của `TerminologyEntry`.

## Decision

### 1. Phân Lập Taxonomy Rõ Ràng (TCM Domain Taxonomy)
Không gộp chung các thực thể Đông y. Phân lập thành 5 phân nhóm chuyên biệt:
1. **`kinh-huyet` (Acupoints & Meridians)**: Hệ thống 14 đường kinh chính và các huyệt vị chuẩn WHO (e.g. Hợp Cốc LI4, Túc Tam Lý ST36, Bách Hội GV20).
2. **`tang-tuong` (Zang-Fu & Fundamental Theory)**: Học thuyết Tạng Phủ, Khí Huyết Tân Dịch, Ngũ Hành Tương Sinh Tương Khắc (e.g. Tâm Hỏa, Can Mộc, Tỳ Thổ, Thận Thủy, Phế Kim).
3. **`duoc-tinh` (Materia Medica & Herbal Properties)**: Dược tính, Tứ khí, Ngũ vị, Quy kinh của các vị thuốc kinh điển (e.g. Nhân Sâm, Hoàng Kỳ, Đương Quy, Cam Thảo).
4. **`bat-cuong` (Eight Principles & Diagnostic Foundations)**: Âm - Dương, Biểu - Lý, Hàn - Nhiệt, Hư - Thực.
5. **`phuong-te` (Classical Formulas)**: Các bài thuốc kinh điển (Tứ Quân Tử Thang, Lục Vị Địa Hoàng) -> **DEFERRED** sang phase chuyên sâu tiếp theo.

### 2. Định Danh Khái Niệm & ID Policy
- **Source Type**: `'tcm_registry'` (Bất biến).
- **Physical ID Format**: `tcm-${subCategory}-${slug}`
  - Kinh huyệt: `tcm-point-hegu`, `tcm-point-zusanli`, `tcm-point-baihui`
  - Tạng tượng: `tcm-zangfu-xin`, `tcm-zangfu-gan`, `tcm-zangfu-shen`
  - Dược tính: `tcm-herb-renshen`, `tcm-herb-huangqi`, `tcm-herb-danggui`
- **Global Concept ID**: `concept:tcm:${subCategory}:${slug}`
  - e.g. `concept:tcm:point:hegu`, `concept:tcm:herb:renshen`
- **Knowledge Domain**: `'y-hoc-co-truyen'` (chuẩn hóa hiển thị nhãn `[Đông Y]` / `[Y Học Cổ Truyền]`).

### 3. File Architecture & Decoupling
Tạo module dữ liệu và adapter độc lập, **không sửa đổi `lexiconRegistry.ts`**:
- `src/data/scholarSuite/tcmRegistry.ts`: Chứa mảng dữ liệu gốc `TCM_REGISTRY: TcmEntry[]`.
- `src/lib/terminology/tcmDictionary.ts`: Chứa mapper pure function `mapTcmEntryToTerminology(entry: TcmEntry): TerminologyEntry` và factory `createTcmDictionary()`.
- Tích hợp vào `scholarUnifiedDictionary` trong `src/lib/terminology/unifiedDictionary.ts` qua cơ chế composition đa nguồn: `[...lexiconEntries, ...systemNodes, ...tcmEntries]`.

### 4. Data Contract cho TcmEntry
```ts
export interface TcmEntry {
  id: string;
  slug: string;
  nameVi: string;
  nameHanTu: string;
  pinyin: string;
  hanViet: string;
  englishGloss: string;
  category: 'kinh-huyet' | 'tang-tuong' | 'duoc-tinh' | 'bat-cuong';
  summary: string;
  tcmAttributes: {
    meridianCode?: string;       // Cho kinh huyệt: e.g. 'LI4', 'ST36'
    pointLocation?: string;      // Vị trí giải phẫu
    indications?: string[];      // Chủ trị
    nature?: string;             // Tứ khí (Hàn, Nhiệt, Ôn, Lương, Bình)
    flavor?: string[];           // Ngũ vị (Tân, Toan, Cam, Khổ, Hàm)
    channelTropism?: string[];   // Quy kinh (Tâm, Can, Tỳ, Phế, Thận...)
    primaryAction?: string;      // Công năng chính
    contraindications?: string;  // Cấm kỵ
    fiveElements?: string;       // Ngũ hành (Kim, Mộc, Thủy, Hỏa, Thổ)
  };
  sources: SourceAttribution[];  // Hoàng Đế Nội Kinh, Bản Thảo Cương Mục, Châm Cứu Giáp Ất Kinh
  coverage: CompletenessState;
}
```

### 5. Display & Search Policy
- **Giao diện `MultilingualLexicon.tsx`**:
  - Domain Badge: Nhãn `[Đông Y]` màu Teal/Emerald (`bg-teal-100 text-teal-900 border-teal-200`).
  - Source Badge: Nhãn `[Đông Y]` hoặc `[Từ Điển]` (tùy chỉnh tinh gọn).
  - Bảng 4 cột:
    - Cột 1 (Pāli/Sanskrit): Hiển thị mã huyệt quốc tế (e.g. `LI4 - Hợp Cốc`) hoặc Ngũ hành (`Mộc / Wood`).
    - Cột 2 (Hán Tự): Chữ Hán Serif (`合谷`, `人參`).
    - Cột 3 (Pinyin): `Hégǔ`, `Rénshēn`.
    - Cột 4 (English Gloss): `Great Abyss`, `Ginseng Root`.
- **Search Engine**:
  - Tìm kiếm tức thì theo tiếng Việt không dấu (`hop coc`, `nhan sam`), Hán Việt (`Hợp Cốc`), chữ Hán (`合谷`), Bính âm (`hegu`), mã huyệt (`LI4`, `ST36`), hoặc tên tiếng Anh (`Ginseng`).

### 6. Catalog Expansion Contract & Sizing Invariants
- **Backward Compatibility for 2-Source Factory**:
  - Khi gọi `createUnifiedTerminologyDictionary(lexiconEntries, systemNodes)` với 2 tham số, hệ thống bảo toàn 100% contract cũ với đúng **227 mục từ** ($19\text{ Lexicon} + 208\text{ System Nodes}$).
- **Singleton Default Scale (P12.1 Wave 1 Expansion)**:
  - `scholarUnifiedDictionary` là singleton đại diện cho toàn bộ kho tri thức đa ngành của Knowledge OS (`domain: 'da-nganh'`).
  - Ở P12.1 Wave 1, singleton mặc định nạp thêm `TCM_REGISTRY`, chính thức mở rộng từ 227 lên **241 mục từ** ($19\text{ Lexicon} + 208\text{ System Nodes} + 14\text{ TCM}$).
  - Việc mở rộng này là contract chủ đích nhằm hoàn thiện 4 trụ cột tri thức, không phải thay đổi ngẫu nhiên.

### 7. Deterministic Search Precedence & Tie-Breaking Contract
- Khi các mục từ thuộc các nguồn khác nhau có cùng điểm số tìm kiếm (Score Tie, ví dụ: chữ Hán `"心"` khớp 100 điểm trên cả `lex-pali-citta` và `tcm-zangfu-xin`):
  - Hệ thống áp dụng quy tắc phân tầng ngữ nghĩa tất định (Deterministic Semantic Precedence):
    `sourceType: 'lexicon'` > `sourceType: 'system_node'` > `sourceType: 'tcm_registry'`.
  - Mục từ định nghĩa kinh điển gốc (Lexicon Root) luôn được ưu tiên đứng trước các thực thể chuyên ngành hoặc nút đồ hình phụ.
  - Đây là chuẩn mực Information Retrieval nhằm đảm bảo tính ổn định và tất định của kết quả tìm kiếm.

## Staged Rollout Strategy
- **Wave 1 (Baseline Foundation - Scope P12.1)**:
  - Triển khai tập dữ liệu tinh tuyển **14 mục từ hạt nhân** đại diện cho 3 phân nhóm:
    - 5 Huyệt vị đại huyệt: Hợp Cốc (LI4), Túc Tam Lý (ST36), Bách Hội (GV20), Nội Quan (PC6), Tam Âm Giao (SP6).
    - 5 Tạng tượng căn bản: Tâm (Heart), Can (Liver), Tỳ (Spleen), Phế (Lung), Thận (Kidney).
    - 4 Vị thuốc thượng phẩm: Nhân Sâm (Ginseng), Hoàng Kỳ (Astragalus), Đương Quy (Angelica), Cam Thảo (Licorice).
  - Tích hợp adapter và kết nối vào Unified Dictionary.
- **Wave 2 (Full Classical Canon)**:
  - Mở rộng 361 huyệt chính kinh và 100+ vị thuốc Đông y thông dụng.
- **Wave 3 (Advanced Formulations & Syndrome Patterns)**:
  - Bổ sung Phương Tễ Học và Biện Chứng Luận Trị.

## Blast Radius
- **Rất thấp**:
  - Không sửa các file dữ liệu cũ `lexiconRegistry.ts` và `systemRegistry.ts`.
  - Chỉ thêm file mới `tcmRegistry.ts` và `tcmDictionary.ts`, sau đó import vào `unifiedDictionary.ts`.
  - Toàn bộ 175 test files tiếp tục pass 100%.

## Non-goals
- Không xây dựng phần mềm chẩn đoán hoặc kê đơn y khoa tự động.
- Không thay thế phác đồ điều trị y tế hiện đại.
- Đây thuần túy là hệ thống cơ sở tri thức nghiên cứu văn hiến, thuật ngữ và chiết tự Y học cổ truyền phương Đông.
