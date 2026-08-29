# 📋 ĐẶC TẢ KỸ THUẬT: PHASE P8.0
## Scholarly Citation & Multi-Format Export Engine (Scholar Suite Focus)

> **Trạng thái:** 🟢 APPROVED & PHASE B RED IN PROGRESS  
> **Phạm vi v1:** Entity-level citation export cho `LexiconEntry` và `SystemNode` (6 system types)  
> **Phạm vi v1.1:** `MatrixRelation` (Cross-axial relational citation export)  
> **Tài liệu liên quan:** [`docs/adr/ADR-051-scholar-citation-view-model-pipeline.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/adr/ADR-051-scholar-citation-view-model-pipeline.md) · [`docs/PROJECT_STATUS.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/PROJECT_STATUS.md)

---

## 🎯 1. BỐI CẢNH & MỤC TIÊU KỸ THUẬT

Scholar Suite đã thiết lập bộ khung dữ liệu tri thức học thuật đa ngữ và các hệ thống kinh điển cổ điển. Để phục vụ việc nghiên cứu chuyên sâu, trích dẫn văn bản và đồng bộ với các công cụ quản lý thư mục nghiên cứu (Zotero, LaTeX/Overleaf, Obsidian), Phase P8.0 xây dựng một engine trích dẫn độc lập, tất định, thuần túy (pure functions, zero runtime dependencies) với các mục tiêu:

1. **Chuẩn hóa Intermediate Representation (`ScholarCitationViewModel`)**: Tách biệt hoàn toàn mô hình hoàn thiện nội bộ (`Ontology Coverage`) khỏi mô hình đủ điều kiện trích dẫn (`Citation Sufficiency`).
2. **Khóa cổng Trích dẫn Học thuật Liêm chính (Scholarly Anti-Hallucination Gate)**: Thực thể chỉ có `provenanceNote` (ghi chú biên tập nội bộ) mà không có nguồn xác minh (`sources: []`) bị phân loại là `internal_note_only` và bị chặn xuất trích dẫn học thuật.
3. **Đa định dạng Chuẩn hóa**:
   - **Machine-readable**: BibTeX (có escape LaTeX và bảo toàn Unicode), CSL JSON (chuẩn CSL 1.0.2).
   - **Human-readable**: APA 7th, Chicago 17th Notes, MLA 9th, Harvard.

---

## 🛡️ 2. PHẠM VI (SCOPE DEFINITION)

### ✅ Scope IN (v1):
- **Thực thể hỗ trợ**:
  - `LexiconEntry`: Mục từ từ điển tri thức học thuật đa ngữ (Pāli, Sanskrit, Hán tự, Pinyin, Việt, Anh).
  - `SystemNode`: 6 hệ thống kinh điển (`iching_64`, `citta_89_121`, `cetasika_52`, `patthana_24`, `paticcasamuppada_12`, `qimen_9`).
- **Core Engine Modules (`src/lib/scholarCitation/`)**:
  - `key.ts`: Thuật toán sinh `citationKey` tất định, ASCII-safe, chống va chạm.
  - `escaping.ts`: Bộ lọc escape ký tự đặc biệt LaTeX cho BibTeX (`&`, `%`, `_`, `#`, `{`, `}`, `~`, `^`).
  - `normalizer.ts`: Adapter chuẩn hóa thực thể thành `ScholarCitationViewModel` và phân định `sufficiency`.
  - `formatters/bibtex.ts`: Formatter BibTeX chuẩn (@misc / @book).
  - `formatters/csl.ts`: Formatter CSL JSON chuẩn CSL 1.0.2 (`entry-dictionary` và `chapter`).
- **Test-First Red Suite**: Bộ kiểm thử cô lập cho toàn bộ các module trên.

### ⏳ Scope IN (v1.1):
- `MatrixRelation`: Trích dẫn quan hệ ma trận chéo (Citta × Cetasika, Paṭṭhāna, Cross-domain) sau khi hoàn tất quy chuẩn Precedence Merge Policy cho multi-source hydration.
- Human-style pure formatters: APA 7th, Chicago 17th Notes, MLA 9th, Harvard.

### ❌ Scope OUT (Non-Goals):
- KHÔNG sửa đổi hoặc mở rộng `SourceAttribution` trong `src/types/scholarSuite.ts`.
- KHÔNG sửa đổi các file dữ liệu registry (`lexiconRegistry.ts`, `systemRegistry.ts`, `matrixRegistry.ts`).
- KHÔNG cài đặt external CSL runtime (như `citeproc-js`).
- KHÔNG xuất trích dẫn cho các thực thể `internal_note_only`.

---

## 📐 3. CITATION SUFFICIENCY & FIELD PRESENCE MATRIX

### 3.1. Phân định 3 Cấp bậc Dữ liệu (Sufficiency Tiers)
1. **`internal_note_only`**: `sources.length === 0`. Chỉ có `provenanceNote`. Bị chặn xuất trích dẫn học thuật.
2. **`canonical_minimal`**: `sources.length >= 1`, có `sourceTitle` và `sectionRef`. Đủ điều kiện xuất BibTeX, CSL JSON và các format khuyết danh kinh điển.
3. **`canonical_complete`**: Có thêm `ptsRef`, `taishoRef` hoặc `standardEdition`.

### 3.2. Ma trận Hiện diện Trường & Quy tắc Fallback (v1)

| Trường | BibTeX | CSL JSON (CSL 1.0.2) | Quy tắc Fallback v1 |
| :--- | :---: | :---: | :--- |
| `citationKey` | **BẮT BUỘC** | Optional (`id`) | Sinh tự động theo `generateCitationKey()` |
| `title` | **BẮT BUỘC** | **BẮT BUỘC** | Tiêu đề chính + thuật ngữ gốc |
| `sourceTitle` | **BẮT BUỘC** | **BẮT BUỘC** | `sources[0].sourceTitle` |
| `sectionRef` | **BẮT BUỘC** | Optional (`section`) | `sources[0].sectionRef` |
| `ptsRef` | Optional | Optional (`number`) | Đưa vào trường `note = {PTS: ...}` trong BibTeX |
| `taishoRef` | Optional | Optional (`number`) | Đưa vào trường `note = {Taishō: ...}` trong BibTeX |
| `type` | `@misc` | `entry-dictionary` / `chapter` | Lexicon $\rightarrow$ `entry-dictionary`; SystemNode $\rightarrow$ `chapter` |

---

## 🔒 4. INVARIANTS & POLICIES

1. **Unicode Preservation**: 100% giữ nguyên dấu Pāli IAST (`ā, ī, ū, ṃ, ṇ, ṅ, ñ, ṭ, ḍ`), Sanskrit Devanagari (`चित्त`), Hán tự (`心, 識, 乾, 坤`).
2. **Deterministic Key**: ASCII lowercase `[a-z0-9_]`, tối đa 48 ký tự, cấu trúc: `${domainPrefix}_${entityType}_${cleanSlug}_${cleanSource}_${cleanRef}`.
3. **Pure Function**: Tất cả formatters và normalizers là pure functions, không có side-effects, không có I/O.
