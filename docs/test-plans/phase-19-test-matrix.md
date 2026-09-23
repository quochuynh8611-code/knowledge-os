# Phase 19 Test Matrix: Bidirectional Citation Deep-Link Navigation

## 1. Tổng Quan Ma Trận Kiểm Thử (Test Matrix Overview)

Ma trận kiểm thử cho Phase 19 bao gồm 3 lớp:
1. **Lớp 1: Unit Tests (Parser & Resolution Pipeline)** — Xác thực thuật toán bóc tách URI và 5 bậc phân giải tài liệu nguồn.
2. **Lớp 2: Component & Integration Tests (Reader Navigation & Adapters)** — Xác thực luồng click liên kết, Same-Doc fast path, Cross-Doc transition và re-scoping dữ liệu.
3. **Lớp 3: Security, Safety & Boundary Invariant Tests** — Đảm bảo chống XSS và tính bất biến Read-Only của Obsidian Vault.

---

## 2. Ma Trận Test Cases Chi Tiết (Detailed Test Suite Matrix)

### Suite A: Parser & Resolution Engine (`tests/unit/archive-citation-parser-resolver.test.ts`)

| ID | Test Case Name | Input / Precondition | Expected Result | Gherkin Mapping |
|---|---|---|---|---|
| **A1.1** | `parseArchiveCitation_validUri_withLocator` | `archive://doc-1?loc=heading-1` | Trả về `{ documentId: 'doc-1', locator: 'heading-1' }` | Same-Doc & Cross-Doc |
| **A1.2** | `parseArchiveCitation_validUri_withoutLocator`| `archive://doc-1` | Trả về `{ documentId: 'doc-1', locator: undefined }` | Locator missing |
| **A1.3** | `parseArchiveCitation_encodedLocator` | `archive://doc-1?loc=epubcfi(%2F6%2F2)` | Trả về locator đã decode an toàn | EPUB CFI Navigation |
| **A1.4** | `parseArchiveCitation_malformed_returnsNull` | `archive://` hoặc `archive://?loc=1` | Trả về `null`, không throw error | Malformed URI |
| **A1.5** | `parseArchiveCitation_dangerousScheme_rejected`| `javascript:alert(1)`, `data:...` | Trả về `null`, từ chối phân tích | Security |
| **A2.1** | `resolve_Tier1_SameDocumentFastPath` | `targetDocId === activeDocumentId` | Trả về `{ isSameDocument: true, document: activeDoc }` | Same-Doc Navigation |
| **A2.2** | `resolve_Tier2_DirectDocIdMatch` | `targetDocId = 'doc-y-hoc'` trong `resources` | Phân giải chính xác resource tương ứng | Direct Match |
| **A2.3** | `resolve_Tier3_ResourceAliasFilePathMatch` | `targetDocId = '02_PDF_Source/y-hoc.pdf'` | Khớp chính xác resource có `filePath` đó | Resource Alias |
| **A2.4** | `resolve_Tier4_CanonicalPathMatch` | `targetDocId = 'vault:05_EPUB_Export/book.epub'` | Chuẩn hóa và khớp với resource `book.epub` | Canonical Path |
| **A2.5** | `resolve_Tier5_TitleBaseNameHeuristic` | `targetDocId = 'Triet-Hoc-Khai-Luan'` | Khớp an toàn với tiêu đề không generic (> 3 ký tự) | Title Heuristic |
| **A2.6** | `resolve_Tier6_Unresolved_SafeNoOp` | `targetDocId = 'doc-unknown-xyz'` | Trả về `null`, không ném exception | Unresolved Fallback |

---

### Suite B: Reader Component Integration (`tests/integration/reader-bidirectional-citation.test.tsx`)

| ID | Test Case Name | Component / Adapter | User Action | Expected Behavior |
|---|---|---|---|---|
| **B1.1** | `sameDoc_markdown_heading_scroll` | `MarkdownReaderAdapter` | Click citation `archive://doc-md?loc=sec-2` | Scroll vào phần tử `[id="sec-2"]`, toast thông báo thành công |
| **B1.2** | `sameDoc_epub_cfi_display` | `EpubReaderAdapter` | Click citation `archive://doc-epub?loc=cfi` | Gọi `rendition.display(cfi)`, không reload reader |
| **B1.3** | `sameDoc_pdf_page_change` | `PdfReaderAdapter` | Click citation `archive://doc-pdf?loc=42` | Cập nhật `currentPage = 42`, view đổi trang |
| **B2.1** | `crossDoc_md_to_epub_transition` | `UnifiedResearchReader` | Click citation sang `doc-tam-ly` (EPUB) | Đổi active document sang EPUB, nạp adapter EPUB với `initialPosition=cfi` |
| **B2.2** | `crossDoc_rescope_sidebar_notes_and_toc` | `ReaderSidebar` | Sau khi chuyển tài liệu thành công | `scopedNotes`, `documentHighlights`, `tocItems` được cập nhật theo tài liệu mới |
| **B2.3** | `crossDoc_preserve_active_sidebar_tab` | `ReaderSidebar` | Đang ở tab `notes` $\rightarrow$ chuyển tài liệu | Tab `notes` vẫn được giữ nguyên (không bị reset về `outline`) |
| **B3.1** | `fallback_unresolved_document_keeps_state` | `UnifiedResearchReader` | Click citation tài liệu không tồn tại | Giữ nguyên tài liệu hiện tại, toast "Không tìm thấy tài liệu nguồn tương ứng" |
| **B3.2** | `fallback_missing_locator_navigates_to_start`| `UnifiedResearchReader` | Click citation `archive://doc-md` (no loc) | Mở tài liệu ở đầu trang, toast "Đang ở tài liệu hiện tại" |
| **B3.3** | `fallback_invalid_locator_no_crash` | `MarkdownReaderAdapter` | Click citation `archive://doc-md?loc=invalid`| Không tìm thấy phần tử DOM $\rightarrow$ toast nhẹ, không crash |

---

### Suite C: Security & Boundary Invariants (`tests/unit/citation-navigation-vault-readonly.test.tsx`)

| ID | Test Case Name | Boundary Verification | Expected Contract |
|---|---|---|---|
| **C1.1** | `vault_read_only_on_citation_click` | Kiểm tra mock filesystem & network | 0 lệnh POST/PUT/DELETE, chỉ có GET `/api/obsidian/...` |
| **C1.2** | `xss_sanitization_in_locator_query` | Truyền chuỗi locator chứa payload XSS | Không thực thi mã độc, an toàn trong DOM query selector |

---

## 3. Tiêu Chí Nghiệm Thu (Acceptance Gate / Exit Criteria)

1. **100% Tests Pass**: Toàn bộ test cases trong Suite A, B, C vượt qua thành công trên môi trường Vitest.
2. **0 Regression**: Toàn bộ 339 test files hiện có của repository tiếp tục pass 100%.
3. **Typecheck Clean**: Lệnh `npx tsc --noEmit` hoàn thành với `0 errors`.
4. **No Vault Mutation**: Tuyệt đối không phát sinh ghi tệp vào thư mục Obsidian Vault.
