# ADR-106: Phase 2 — Multi-Style Reference & Citation Hub, Universal Parsers (BibTeX/RIS/Zotero CSL-JSON) & DOI Resolver

## 1. Trạng Thái (Status)
- **Trạng thái:** ✅ ACCEPTED & READY FOR IMPLEMENTATION
- **Ngày quyết định:** 2026-10-25
- **Tác giả:** Staff Engineer & System Architect
- **Phạm vi:** Core Reference Engine, Multi-Style Citation Formatter (APA7, MLA9, Chicago17, IEEE, Harvard, BibTeX, RIS, Markdown), Universal Reference Parsers, Deduplication, CrossRef DOI Resolver, Zero DB Migration Adapter

---

## 2. Bối Cảnh (Context)
Knowledge OS đang phát triển thành trạm làm việc nghiên cứu chuyên nghiệp (**Academic Research Workstation**). Trong quy trình nghiên cứu học thuật thực tế:
1. Nhà nghiên cứu thu thập tài liệu từ nhiều nguồn: cơ sở dữ liệu học thuật (PubMed, IEEE Xplore, ScienceDirect, arXiv), trình quản lý thư mục (Zotero, Mendeley, EndNote) và các bài báo xuất bản có mã định danh số (DOI).
2. Việc nhập tài liệu thủ công từng đầu mục rất mất thời gian và dễ sai sót. Cần hỗ trợ nhập hàng loạt từ các định dạng trao đổi học thuật chuẩn: BibTeX (`.bib`), Research Information Systems (`.ris`), và Zotero CSL-JSON (`.json`).
3. Khả năng tra cứu tức thời metadata của bài báo qua mã DOI (CrossRef REST API) giúp tự động điền tiêu đề, tác giả, năm, tạp chí, tập, số, số trang mà người dùng không cần gõ phím.
4. Đầu ra trích dẫn cần đáp ứng các chuẩn quốc tế đa dạng của các tạp chí và hội nghị:
   - **APA 7th** (Tâm lý, Khoa học Xã hội, Giáo dục)
   - **MLA 9th** (Nhân văn, Văn học, Nghệ thuật)
   - **Chicago 17th (Notes & Bibliography / Author-Date)** (Lịch sử, Khoa học Xã hội)
   - **IEEE** (Kỹ thuật điện, Khoa học Máy tính, Công nghệ thông tin)
   - **Harvard** (Kinh tế, Quản trị, Y sinh)
   - **BibTeX** (LaTeX / Overleaf)
   - **RIS** (Zotero / EndNote / Mendeley)
   - **Markdown Footnote** (Obsidian / Knowledge OS Notes)
5. **Ràng buộc kiến trúc:** Không được làm gãy cấu trúc database Prisma hiện hành (Zero DB Migration) và phải bảo toàn 100% các API hàm trích dẫn đã có sẵn trong hệ thống (`generateAPACitation`, `generateBibTeXCitation`, `generateMarkdownFootnote`, `generateAllCitations`, `generateBatchCitations`, `getBatchCitationDownloadFilename`).

---

## 3. Các Quyết Định Kiến Trúc (Architectural Decisions)

### Quyết định 1: Mở Rộng Academic Metadata Với Zero DB Migration Contract
- Mở rộng interface `Resource` trong `src/types/index.ts` với các trường học thuật tùy chọn:
  - `doi?: string` (Mã số định danh số bài báo)
  - `year?: string` (Năm xuất bản 4 chữ số)
  - `journal?: string` (Tên tạp chí khoa học / hội thảo)
  - `publisher?: string` (Nhà xuất bản sách)
  - `volume?: string` (Tập tạp chí)
  - `issue?: string` (Số tạp chí / kỳ phát hành)
  - `pages?: string` (Dải trang, ví dụ: "105-120")
  - `isbn?: string` (Mã số sách tiêu chuẩn quốc tế)
- Cung cấp cặp hàm pure helper:
  - `embedAcademicMetadataInNotes(notes: string | undefined, meta: AcademicMetadata): string`: Đóng gói các trường học thuật vào khối siêu dữ liệu ẩn `<!-- academic-metadata: {...} -->` đính kèm trong trường `notes`.
  - `extractAcademicMetadataFromResource(resource: Resource): AcademicMetadata`: Khôi phục siêu dữ liệu học thuật kết hợp ưu tiên từ trường trực tiếp trên `resource` và khối nhúng trong `resource.notes`.
- **Hệ quả:** Dù cơ sở dữ liệu hiện tại chưa sửa đổi Prisma schema, dữ liệu học thuật vẫn được lưu trữ và khôi phục toàn vẹn 100% qua mọi chu trình Save/Load/Sync.

### Quyết định 2: Multi-Style Academic Citation Engine (8 Định Dạng)
- Nâng cấp `CitationFormat` trong `src/lib/citationPreferences.ts`:
  ```ts
  export type CitationFormat =
    | 'apa'
    | 'mla'
    | 'chicago'
    | 'ieee'
    | 'harvard'
    | 'bibtex'
    | 'ris'
    | 'markdown';
  ```
- Nâng cấp `src/lib/citationGenerator.ts` bổ sung các chuẩn trích dẫn quốc tế:
  - `generateMLACitation(resource: Resource): string`
  - `generateChicagoCitation(resource: Resource): string`
  - `generateIEEECitation(resource: Resource, index?: number): string`
  - `generateHarvardCitation(resource: Resource): string`
  - `generateRISCitation(resource: Resource): string`
- Đảm bảo `generateAllCitations` trả về đối tượng chứa đầy đủ 8 định dạng trích dẫn.
- Giữ nguyên chữ ký và hành vi của các hàm hiện hành (`generateAPACitation`, `generateBibTeXCitation`, `generateMarkdownFootnote`, `generateBatchCitations`, `getBatchCitationDownloadFilename`).

### Quyết định 3: Universal Reference Parsers (BibTeX, RIS, Zotero CSL-JSON) & Deduplication
- Xây dựng mô-đun độc lập `src/lib/referenceParser.ts` không phụ thuộc thư viện nặng ngoài:
  - **BibTeX Parser:** Phân tích cú pháp `@article{...}`, `@book{...}`, v.v., bóc tách trường trong `{...}` hoặc `"..."`, làm sạch dấu ngoặc LaTeX lồng nhau và ánh xạ trường chuẩn.
  - **RIS Parser:** Phân tích theo từng dòng thẻ 2 ký tự: `TY  - `, `AU  - `, `TI  - `, `JO  - `, `PY  - `, `DO  - `, `SP  - `, `EP  - `, `VL  - `, `IS  - `, `PB  - `, kết thúc tại `ER  - `.
  - **Zotero CSL-JSON Parser:** Phân tích mảng JSON chuẩn CSL (Citation Style Language), ánh xạ tác giả mảng `{ family, given }`, ngày tháng `issued['date-parts']`, `container-title`, `DOI`, `publisher`.
- Cung cấp hàm khử trùng lặp `deduplicateImportedResources(imported, existing)`:
  - Đối chiếu dựa trên `doi` chuẩn hóa (không phân biệt hoa thường).
  - Hoặc đối chiếu dựa trên cặp `normalize(title) + normalize(author)`.
  - Phân loại rõ: `unique` (chấp nhận nhập) và `duplicates` (trùng lặp cần bỏ qua hoặc cập nhật).

### Quyết định 4: CrossRef DOI Metadata Resolver Tuân Thủ Hermetic Test Guard
- Xây dựng mô-đun `src/lib/doiResolver.ts`:
  - `normalizeDoi(input: string): string | null`: Làm sạch tiền tố URL `https://doi.org/`, `http://dx.doi.org/`, `doi:` để trích xuất chuẩn `10.\d{4,9}/[-._;()/:A-Z0-9]+`.
  - `lookupDoiMetadata(rawDoi: string, fetchImpl = fetch): Promise<DoiLookupResult>`:
    - Gửi request đến `https://api.crossref.org/works/${doi}` kèm Header `Accept: application/json`.
    - Thiết lập timeout tối đa 8 giây qua `AbortController`.
    - Trích xuất dữ liệu thành cấu trúc `Partial<Resource>` chuẩn mực.
    - Xử lý lỗi an toàn: 404 (Không tìm thấy DOI), Network Error, Timeout Error, Invalid DOI syntax.
    - **Hermetic Test Guard Compliance:** Cho phép dependency injection `fetchImpl` để trong môi trường kiểm thử (Vitest), không bao giờ gọi ra ngoài Internet thật mà sử dụng mock hermetic.

---

## 4. Kiểm Thử & Tiêu Chí Nghiệm Thu (Verification Criteria)
1. Unit tests 100% bao phủ 8 định dạng trích dẫn.
2. Unit tests kiểm tra trích xuất chính xác từ file `.bib`, `.ris`, `.json`.
3. Unit tests kiểm tra khả năng khử trùng lặp chính xác.
4. Unit tests kiểm tra `lookupDoiMetadata` với mocked `fetch` trả về đúng metadata, xử lý lỗi 404 và network timeout.
5. Kiểm tra round-trip `embedAcademicMetadataInNotes` và `extractAcademicMetadataFromResource`.
6. Toàn bộ test suite liên quan đến citations/resources hiện hữu tiếp tục PASS 100%.
