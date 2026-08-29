# ADR-051: Kiến Trúc Pipeline Trích Dẫn & Xuất Dữ Liệu Học Thuật Qua Citation View Model

- **Mã ADR:** ADR-051
- **Trạng thái:** APPROVED (PHASE B RED PREPARATION)
- **Ngày tạo:** 2026-08-29
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi:** `src/lib/scholarCitation/`, `src/types/scholarCitation.ts`

---

## 1. Bối Cảnh & Ranh Giới Thực Tế (Context & Boundary Truths)

Scholar Suite sở hữu lượng dữ liệu lớn bao gồm 617+ mục từ từ điển (`LexiconEntry`) và 4.480+ nút kinh điển (`SystemNode`). Khi trích xuất dữ liệu ra hệ thống ngoài (Zotero, LaTeX, Obsidian):
- Kiểu `SourceAttribution` hiện tại trong `src/types/scholarSuite.ts` được thiết kế tối giản phục vụ kiểm tra tính toàn vẹn (`CompletenessState`), không chứa các trường xuất bản hiện đại.
- Dữ liệu registry đang ổn định và được bảo vệ bởi hàng loạt test case invariant.
- Một số thực thể ở trạng thái phác thảo (`stub`/`partial`) chỉ có `provenanceNote` mà không có văn bản nguồn (`sources: []`).

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

### Quyết định 1: Đóng băng (Freeze) Registry Schema — Không sửa `SourceAttribution`
- Tuyệt đối không can thiệp vào `src/types/scholarSuite.ts` hay các file registry.
- Cách ly hoàn toàn module trích dẫn mới để giữ nguyên 100% độ tin cậy của codebase hiện tại.

### Quyết định 2: Tách biệt hoàn toàn Coverage khỏi Citation Sufficiency qua View Model
- Giới thiệu `ScholarCitationViewModel` đóng vai trò Intermediate Representation.
- Phân định rõ 3 cấp độ:
  1. `internal_note_only`: Bị chặn xuất trích dẫn học thuật để tránh **Scholarly False Confidence**.
  2. `canonical_minimal`: Đủ điều kiện xuất trích dẫn kinh điển khuyết danh.
  3. `canonical_complete`: Đầy đủ thông số định danh học thuật quốc tế (PTS/Taishō).

### Quyết định 3: Giới hạn Scope v1 cho `LexiconEntry` & `SystemNode` — Hoãn `MatrixRelation` sang v1.1
- `MatrixRelation` thiếu tính định danh độc lập (cần hydrate từ 2 nút liên kết) và chưa có chính sách hợp nhất nguồn (Attribution Merge Policy) tất định. Hoãn sang v1.1 để kiểm soát bán kính ảnh hưởng.

### Quyết định 4: Sử dụng 100% CSL Item Types chuẩn CSL 1.0.2
- `LexiconEntry` $\rightarrow$ `type: "entry-dictionary"`
- `SystemNode` $\rightarrow$ `type: "chapter"`
- Không sử dụng các extension type không chính thống như `classic` (CSL-M).

### Quyết định 5: Khóa Quy chuẩn Citation Key Tất định (One-Way Door)
- Khóa thuật toán sinh key ASCII an toàn cho LaTeX: `${domainPrefix}_${entityType}_${cleanSlug}_${cleanSource}_${cleanRef}` (tối đa 48 ký tự).

---

## 3. Đánh Giá Trade-offs & Ranh Giới

| Tiêu chí | Quyết định chọn | Lựa chọn thay thế bị bác bỏ | Lý do |
| :--- | :--- | :--- | :--- |
| **Cơ chế Adapter** | Adapter qua `ScholarCitationViewModel` | Sửa trực tiếp `SourceAttribution` | Tránh làm vỡ hàng trăm test suite và 5.300+ dòng registry. |
| **Xử lý `provenanceNote`** | Chặn xuất (`internal_note_only`) | Tự format thành trích dẫn đại diện | Tránh tạo ảo tưởng về độ xác thực của nguồn chưa kiểm chứng. |
| **Phạm vi v1** | Chỉ `LexiconEntry` & `SystemNode` | Bao gồm cả `MatrixRelation` | Tránh rủi ro do chưa có Source Precedence Merge Policy cho quan hệ ma trận. |
| **CSL Schema Target** | Chuẩn CSL 1.0.2 (`entry-dictionary`/`chapter`) | CSL-M `type: "classic"` | Đảm bảo tương thích 100% với Zotero và các trình xử lý chuẩn. |
