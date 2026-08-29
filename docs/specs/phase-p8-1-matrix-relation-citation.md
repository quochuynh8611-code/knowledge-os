# Phase P8.1 Mini-Spec: Relational Citation & Matrix Export Engine

**Status**: PROPOSED (Awaiting Human Sign-off)  
**Author**: Staff Software Engineer / Technical Architect  
**Domain**: Scholar Suite / Citation Subsystem  
**Baseline**: Phase P8.0 Complete (Commit `dd6b34f`)

---

## 1. Executive Summary & Problem Statement

Phase P8.0 đã thiết lập thành công Citation & Export Engine cho các thực thể nguyên tử (`LexiconEntry`, `SystemNode`).
Phase P8.1 mở rộng pipeline này để hỗ trợ **`MatrixRelation`** (quan hệ liên đới giữa 2 SystemNodes trên ma trận tri thức giao thoa).

Khác với thực thể đơn lẻ, một `MatrixRelation` biểu diễn:
- Node Hàng (`rowNodeId` $\rightarrow$ SystemNode)
- Node Cột (`colNodeId` $\rightarrow$ SystemNode)
- Loại quan hệ (`relationType`: `associates`, `governs`, `conditions`, `corresponds`, `opposes`)
- Mức độ chứng cứ học thuật (`evidenceLevel`: `canonical`, `commentary`, `scholarly_conjecture`)
- Bằng chứng văn bản kinh điển (`canonicalEvidence`)
- Chú giải phân tích diễn dịch (`interpretiveNote`)
- Nguồn trích dẫn (`sources: SourceAttribution[]`)

---

## 2. Entity Scope v1

1. **Thực thể mục tiêu**: `MatrixRelation` thuộc `MATRIX_RELATION_REGISTRY`.
2. **Loại ma trận hỗ trợ**:
   - `citta_cetasika` (Vi Diệu Pháp: Tâm × Tâm Sở phối hợp)
   - `patthana_condition` (Duyên Hệ Vị Trí × Tâm)
   - `cross_domain_synthesis` (Đối chiếu Dịch Lý & A-Tỳ-Đàm)
3. **Phân giải định danh liên kết (Link Resolution)**:
   - `rowNodeId` và `colNodeId` được tự động tra cứu từ `SYSTEM_NODE_REGISTRY` để trích xuất Title / Code nguyên bản của 2 nút đầu mối.
   - Nếu không tìm thấy node trong registry, sử dụng fallback chính là `rowNodeId` và `colNodeId`.

---

## 3. Citation Semantics & Attribution Integrity

### A. Title Construction Policy:
Tiêu đề học thuật của một quan hệ liên đới được cấu trúc mang tính xác định (Deterministic):
```
[Row Node Title] ──([Relation Type])──> [Col Node Title]
Ví dụ: Tâm Tham 1 (Lobha-mūla Citta 1) ──(associates)──> Tâm sở Xúc (Phassa)
```

### B. Canonical Evidence vs. Interpretive Note Separation:
- **`canonicalEvidence`**: Bằng chứng xuất xứ trong văn bản gốc $\rightarrow$ Được đưa vào trường `note` học thuật.
- **`interpretiveNote`**: Chú giải diễn dịch của học giả $\rightarrow$ Giữ nguyên vị trí chú giải, **tuyệt đối không nâng cấp thành nguồn sự thật nguyên bản (factual source)**.
- **`evidenceLevel`**:
  - `canonical`: Nguồn kinh điển nguyên văn.
  - `commentary`: Chú giải sớ giải truyền thống.
  - `scholarly_conjecture`: Giả thuyết đối chiếu học thuật hiện đại $\rightarrow$ Được đánh dấu rõ ràng `[Evidence: Scholarly Conjecture]` để chống ngụy tạo thẩm quyền học thuật (Scholarly False Confidence).

---

## 4. Anti-Hallucination & Blocking Policy

1. **Điều kiện chặn (`internal_note_only` $\rightarrow$ `isBlocked = true`)**:
   - `relation.sources` rỗng (`sources.length === 0`).
   - Thực thể chỉ có `provenanceNote` mà không có văn bản nguồn thẩm tra.
   - $\rightarrow$ Formatters trả về `null`, UI hiển thị thông báo giải thích trạng thái draft/stub, vô hiệu hóa nút xuất học thuật.
2. **Không bịa đặt metadata**:
   - Tuyệt đối không tự suy diễn tác giả (`author`), nhà xuất bản (`publisher`), năm xuất bản (`date`), số hiệu nếu không có trong metadata.

---

## 5. Deterministic Key Generation Policy

Cú pháp sinh citation key cho MatrixRelation:
```
${domainPrefix}_rel_${cleanRow}_${cleanCol}_${cleanRelationType}_${cleanSource}_${cleanRef}
```
- **Directed Relation Collision Avoidance**: Vì quan hệ có hướng (Directed: Row $\rightarrow$ Col), thứ tự `cleanRow` và `cleanCol` đảm bảo quan hệ A $\rightarrow$ B và B $\rightarrow$ A sinh ra 2 keys hoàn toàn khác biệt.
- **Ký tự**: ASCII an toàn `[a-z0-9_]`, độ dài tối đa 64 ký tự.

---

## 6. Output Formats Scope (v1)

1. **BibTeX (`@misc`)**:
   - Escape 8 ký tự LaTeX đặc biệt (`&`, `%`, `_`, `#`, `{`, `}`, `~`, `^`).
   - Bảo toàn 100% Unicode Pāli IAST, Sanskrit Devanagari, Hán tự.
2. **CSL JSON (CSL 1.0.2)**:
   - `type: 'chapter'`.
   - `container-title: sourceTitle`.
   - `note`: Chứa canonical evidence, evidence level và section reference.
3. **Human-Style (APA 7, Chicago Notes, MLA 9, Harvard)**:
   - Hoạt động tự động qua Adapter `ScholarCitationViewModel` đã hoàn thiện ở Phase P8.0.
