# Specification & Field Checklist: Phase P12.1 — Traditional Chinese Medicine (TCM) Registry Integration

## 1. Tổng Quan Mục Tiêu (Overview & Objectives)
- Xây dựng kho dữ liệu thuật ngữ Y Học Cổ Truyền độc lập (`TCM_REGISTRY`), kết nối vào `scholarUnifiedDictionary` của hệ điều hành Knowledge OS.
- Hỗ trợ chuẩn hóa ngôn ngữ đa tầng: Tên tiếng Việt, Chữ Hán (Phồn thể / Giản thể), Âm Hán Việt, Bính âm Pinyin có dấu, và Thuật ngữ dịch tiếng Anh học thuật.
- Cung cấp các thuộc tính chuyên ngành theo phân nhóm thực thể: Mã huyệt vị quốc tế (WHO Code), Vị trí & Chủ trị huyệt, Tứ khí - Ngũ vị - Quy kinh của Dược tính, và Tạng tượng - Ngũ hành.
- Đảm bảo tính mở rộng cao, dữ liệu được kiểm định xuất xứ từ các cổ thư y điển: *Hoàng Đế Nội Kinh (Tố Vấn, Linh Khu)*, *Bản Thảo Cương Mục*, *Châm Cứu Giáp Ất Kinh*, *Thần Nông Bản Thảo Kinh*.

---

## 2. Phân Nhóm Thực Thể (Taxonomy Categories)

| Mã Danh Mục | Tên Phân Nhóm | Ví Dụ Điển Hình | Chuẩn Tham Chiếu |
| :--- | :--- | :--- | :--- |
| **`kinh-huyet`** | Kinh Lạc & Huyệt Vị | Hợp Cốc (LI4), Túc Tam Lý (ST36), Bách Hội (GV20) | WHO Standard Acupuncture Point |
| **`tang-tuong`** | Tạng Tượng & Học Thuyết | Tâm (Heart), Can (Liver), Tỳ (Spleen), Khí Huyết | Hoàng Đế Nội Kinh - Tố Vấn |
| **`duoc-tinh`** | Dược Tính & Bản Thảo | Nhân Sâm, Hoàng Kỳ, Đương Quy, Cam Thảo | Bản Thảo Cương Mục, Dược Điển YHCT |
| **`bat-cuong`** | Bát Cương & Biện Chứng | Âm - Dương, Biểu - Lý, Hàn - Nhiệt, Hư - Thực | Cảnh Nhạc Toàn Thư |
| **`phuong-te`** *(Deferred)* | Phương Tễ Học | Lục Vị Địa Hoàng Hoàn, Bát Trân Thang | *Tạm hoãn sang Phase chuyên sâu* |

---

## 3. Danh Mục Các Nhóm Trường (Field Checklist by Category)

### A. Core Identity Fields (Nhận dạng cốt lõi)
| Tên Trường | Kiểu Dữ Liệu | Mức Độ | Áp Dụng | Mô Tả & Ví Dụ |
| :--- | :--- | :---: | :---: | :--- |
| `id` | `string` | **Bắt buộc** | Tất cả | Format: `tcm-${category}-${slug}` (e.g. `tcm-point-hegu`, `tcm-herb-renshen`) |
| `slug` | `string` | **Bắt buộc** | Tất cả | e.g. `hegu`, `zusanli`, `renshen`, `xin` |
| `conceptId` | `string` | **Bắt buộc** | Tất cả | Format: `concept:tcm:${category}:${slug}` (e.g. `concept:tcm:point:hegu`) |
| `sourceType` | `'tcm_registry'` | **Bắt buộc** | Tất cả | Luôn cố định là `'tcm_registry'` |
| `domain` | `'y-hoc-co-truyen'` | **Bắt buộc** | Tất cả | Nhận diện domain Y Học Cổ Truyền |
| `coverage` | `CompletenessState` | **Bắt buộc** | Tất cả | `'canonical'` \| `'verified'` \| `'partial'` \| `'stub'` |

---

### B. Common Multilingual Fields (Ngôn ngữ đa tầng)
| Tên Trường | Kiểu Dữ Liệu | Mức Độ | Áp Dụng | Mô Tả & Ví Dụ |
| :--- | :--- | :---: | :---: | :--- |
| `nameVi` | `string` | **Bắt buộc** | Tất cả | Tên gọi tiếng Việt chuẩn y học (e.g. `"Hợp Cốc"`, `"Nhân Sâm"`) |
| `nameHanTu` | `string` | **Bắt buộc** | Tất cả | Chữ Hán phồn thể/nguyên bản (e.g. `"合谷"`, `"人參"`) |
| `pinyin` | `string` | **Bắt buộc** | Tất cả | Bính âm có dấu thanh (e.g. `"Hégǔ"`, `"Rénshēn"`) |
| `hanViet` | `string` | **Bắt buộc** | Tất cả | Âm đọc Hán Việt chuẩn mực (e.g. `"Hợp Cốc"`, `"Nhân Sâm"`) |
| `englishGloss` | `string` | **Nên có** | Tất cả | Thuật ngữ tiếng Anh học thuật (e.g. `"Joining Valleys"`, `"Ginseng Root"`) |
| `latinPharmaName` | `string` | **Tùy chọn** | `duoc-tinh` | Tên khoa học dược liệu (e.g. `"Radix Ginseng"`, `"Radix Astragali"`) |

---

### C. TCM Taxonomy Fields (Phân loại & Định nghĩa)
| Tên Trường | Kiểu Dữ Liệu | Mức Độ | Áp Dụng | Mô Tả & Ví Dụ |
| :--- | :--- | :---: | :---: | :--- |
| `category` | `enum` | **Bắt buộc** | Tất cả | `'kinh-huyet'` \| `'tang-tuong'` \| `'duoc-tinh'` \| `'bat-cuong'` |
| `subCategory` | `string` | **Nên có** | Tất cả | e.g. `"Thủ Dương Minh Đại Trường Kinh"`, `"Thuốc Bổ Khí"`, `"Ngũ Tạng"` |
| `summary` | `string` | **Bắt buộc** | Tất cả | Định nghĩa tóm lược chức năng, công năng cốt lõi |
| `detailedNotes` | `string` | **Tùy chọn** | Tất cả | Chú giải chuyên sâu, phân tích cơ chế âm dương |

---

### D. Acupoint-Specific Fields (Thuộc tính chuyên biệt Kinh Huyệt)
| Tên Trường | Kiểu Dữ Liệu | Mức Độ | Áp Dụng | Mô Tả & Ví Dụ |
| :--- | :--- | :---: | :---: | :--- |
| `meridianCode` | `string` | **Bắt buộc** | `kinh-huyet` | Mã kinh huyệt chuẩn WHO (e.g. `"LI4"`, `"ST36"`, `"GV20"`, `"PC6"`) |
| `pointLocation` | `string` | **Bắt buộc** | `kinh-huyet` | Mô tả vị trí giải phẫu định vị huyệt |
| `indications` | `string[]` | **Bắt buộc** | `kinh-huyet` | Danh sách các chứng bệnh chủ trị (e.g. `["Đau đầu", "Liệt mặt"]`) |
| `needlingNotes` | `string` | **Nên có** | `kinh-huyet` | Độ sâu châm, hướng kim, cấm kỵ (e.g. `"Cấm châm sâu cho phụ nữ mang thai"`) |

---

### E. Herbal-Specific Fields (Thuộc tính chuyên biệt Dược Tính Bản Thảo)
| Tên Trường | Kiểu Dữ Liệu | Mức Độ | Áp Dụng | Mô Tả & Ví Dụ |
| :--- | :--- | :---: | :---: | :--- |
| `nature` | `string` | **Bắt buộc** | `duoc-tinh` | Tứ khí: `"Đại nhiệt"`, `"Ôn"`, `"Bình"`, `"Lương"`, `"Hàn"` |
| `flavor` | `string[]` | **Bắt buộc** | `duoc-tinh` | Ngũ vị: `["Ngọt (Cam)", "Đắng (Khổ)", "Cay (Tân)"]` |
| `channelTropism` | `string[]` | **Bắt buộc** | `duoc-tinh` | Quy kinh: `["Tỳ", "Phế", "Tâm"]` |
| `primaryAction` | `string` | **Bắt buộc** | `duoc-tinh` | Công năng chủ yếu (e.g. `"Đại bổ nguyên khí, ích huyết sinh tân"`) |
| `contraindications` | `string` | **Nên có** | `duoc-tinh` | Tương tác kỵ thuốc, cấm kỵ (e.g. `"Phản Lê lô, kỵ Ngũ linh chi"`) |

---

### F. Zang-Fu & Theory-Specific Fields (Thuộc tính chuyên biệt Tạng Tượng)
| Tên Trường | Kiểu Dữ Liệu | Mức Độ | Áp Dụng | Mô Tả & Ví Dụ |
| :--- | :--- | :---: | :---: | :--- |
| `fiveElements` | `string` | **Bắt buộc** | `tang-tuong` | Ngũ hành: `"Kim"` \| `"Mộc"` \| `"Thủy"` \| `"Hỏa"` \| `"Thổ"` |
| `yinYangPolarity` | `'Âm (Tạng)'` \| `'Dương (Phủ)'` | **Bắt buộc** | `tang-tuong` | Phân cực Âm Tạng vs Dương Phủ |
| `pairedOrgan` | `string` | **Nên có** | `tang-tuong` | Tạng phủ biểu lý (e.g. Tâm biểu lý với Tiểu trường) |
| `governingAspect` | `string` | **Bắt buộc** | `tang-tuong` | Chủ quản sinh lý (e.g. `"Tâm chủ huyết mạch, tàng thần"`) |

---

### G. Provenance & Source Fields (Xuất xứ thư tịch & Trích dẫn)
| Tên Trường | Kiểu Dữ Liệu | Mức Độ | Áp Dụng | Mô Tả & Ví Dụ |
| :--- | :--- | :---: | :---: | :--- |
| `sources` | `SourceAttribution[]` | **Bắt buộc (>=1)** | Tất cả | Thư tịch gốc: *Hoàng Đế Nội Kinh*, *Bản Thảo Cương Mục* |
| `sectionRef` | `string` | **Bắt buộc** | Tất cả | Thiên/Quyển (e.g. `"Tố Vấn - Thiên 4"`, `"Quyển 12 - Thảo bộ"`) |
| `standardEdition` | `string` | **Nên có** | Tất cả | Bản dịch/Hiệu đính chuẩn học thuật |

---

### H. Validation Rules (Quy tắc kiểm định dữ liệu)
1. **Rule 1 (Acupoint WHO Code Invariant)**: Mọi mục từ thuộc `category === 'kinh-huyet'` BẮT BUỘC phải có `meridianCode` hợp lệ (Khớp regex `^[A-Z]{1,2}[0-9]{1,2}$`, e.g. `LI4`, `ST36`, `GV20`).
2. **Rule 2 (Herbal Quadrant Invariant)**: Mọi mục từ thuộc `category === 'duoc-tinh'` BẮT BUỘC phải có đầy đủ: `nature`, `flavor` ($\ge 1$ vị), `channelTropism` ($\ge 1$ kinh), và `primaryAction`.
3. **Rule 3 (Zang-Fu Element Invariant)**: Mọi mục từ thuộc `category === 'tang-tuong'` BẮT BUỘC phải xác định rõ `fiveElements` (Kim/Mộc/Thủy/Hỏa/Thổ) và `governingAspect`.
4. **Rule 4 (Multilingual Completeness)**: `nameVi`, `nameHanTu`, `pinyin`, `hanViet` KHÔNG ĐƯỢC để trống hoặc chứa ký tự rác.

---

### I. Deferred Fields (Các trường tạm hoãn cho các phase sau)
- **`formulaComponents`**: Tỷ lệ phân lượng quân - thần - tá - sứ trong bài thuốc phương tễ.
- **`syndromeDifferentiationLogic`**: Sơ đồ cây phân nhánh chẩn đoán bát cương biện chứng.
- **`acupunctureAngleDiagram`**: Vector đồ họa góc nghiêng châm kim 3D.

---

## 4. Dataset Mẫu Đề Xuất Cho Wave 1 (14 Mục Từ Hạt Nhân)

```
[Kinh Huyệt - 5 Đại Huyệt]
1. tcm-point-hegu      : Hợp Cốc (合谷 - Hégǔ - LI4)       [Thủ Dương Minh Đại Trường Kinh]
2. tcm-point-zusanli   : Túc Tam Lý (足三里 - Zúsānlǐ - ST36) [Túc Dương Minh Vị Kinh]
3. tcm-point-baihui    : Bách Hội (百會 - Bǎihuì - GV20)    [Đốc Mạch]
4. tcm-point-neiguan   : Nội Quan (內關 - Nèiguān - PC6)    [Thủ Quyết Âm Tâm Bào Kinh]
5. tcm-point-sanyinjiao: Tam Âm Giao (三陰交 - Sānyīnjiāo - SP6) [Túc Thái Âm Tỳ Kinh]

[Tạng Tượng - 5 Tạng Căn Bản]
6. tcm-zangfu-xin      : Tâm Tạng (心 - Xīn)               [Hành Hỏa - Chủ huyết mạch, tàng thần]
7. tcm-zangfu-gan      : Can Tạng (肝 - Gān)               [Hành Mộc - Chủ sơ tiết, tàng huyết]
8. tcm-zangfu-pi       : Tỳ Tạng (脾 - Pí)                 [Hành Thổ - Chủ vận hóa, thống nhiếp huyết]
9. tcm-zangfu-fei      : Phế Tạng (肺 - Fèi)               [Hành Kim - Chủ khí, chủ tuyên phát túc giáng]
10. tcm-zangfu-shen    : Thận Tạng (腎 - Shèn)             [Hành Thủy - Chủ tàng tinh, chủ thủy cốt tủy]

[Dược Tính - 4 Vị Thượng Phẩm]
11. tcm-herb-renshen   : Nhân Sâm (人參 - Rénshēn)         [Đại bổ nguyên khí - Vị ngọt hơi đắng, tính bình/ôn]
12. tcm-herb-huangqi   : Hoàng Kỳ (黃芪 - Huángqí)         [Bổ khí thăng dương, cố biểu - Vị ngọt, tính ấm]
13. tcm-herb-danggui   : Đương Quy (當歸 - Dāngguī)         [Bổ huyết hoạt huyết - Vị ngọt cay, tính ấm]
14. tcm-herb-gancao    : Cam Thảo (甘草 - Gāncǎo)           [Bổ tỳ ích khí, điều hòa chư dược - Vị ngọt, tính bình]
```

---

## 5. Catalog Sizing Invariants & Search Precedence Rules
- **2-Source Factory Invariant**: `createUnifiedTerminologyDictionary(lexiconEntries, systemNodes)` khi chỉ nhận 2 nguồn bắt buộc phải giữ kích thước chính xác **227 mục từ** (19 Lexicon + 208 System Nodes).
- **Unified Singleton Catalog Invariant**: `scholarUnifiedDictionary` singleton nạp cả 3 nguồn (Lexicon, System Nodes, TCM), có tổng quy mô chính xác **241 mục từ** (227 + 14 TCM Wave 1).
- **Deterministic Search Precedence Rule**: Khi điểm số so khớp tìm kiếm bằng nhau, áp dụng thứ bậc ưu tiên ngữ nghĩa tất định: `lexicon` > `system_node` > `tcm_registry`.
