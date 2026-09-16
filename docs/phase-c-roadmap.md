# ROADMAP CHI TIẾT PHASE C: EXPLORER WORKSPACES

## 1. Mục tiêu Phase C
Chuẩn hóa 4 màn hình Explorer/Manager cốt lõi:
- `src/components/notes/NotesManager.tsx` (Ghi chú & liên kết tri thức)
- `src/components/resources/ResourcesManager.tsx` (Tài liệu & giáo trình)
- `src/components/docs/DocsExplorerView.tsx` (Đặc tả kiến trúc & Thư viện sách EPUB)
- `src/components/search/AdvancedSearch.tsx` (Tra cứu toàn diện & Bộ lọc đa chiều)

---

## 2. Kế hoạch File-by-File

### 1. `src/components/notes/NotesManager.tsx`
- **Archetype**: Explorer / Manager Archetype.
- **Workbench Components áp dụng**:
  - `PageHeader`: Tiêu đề "Quản Lý Ghi Chú & Liên Kết Kiến Thức", category "Ghi Chú Nghiên Cứu", action "Thêm Ghi Chú Mới".
  - `SurfaceCard`: Bọc Filter bar (`variant="subtle"`), và bọc từng thẻ ghi chú (`variant="interactive"`).
  - `StatusPill`: Thẻ phân loại loại ghi chú (`insight`, `question`, `summary`, `study`).
  - `ToolbarButton`: Các thao tác lọc, đọc, sửa, xóa.
- **Invariants bảo toàn**:
  - Lọc theo type (`all`, `study`, `insight`, `question`, `summary`), topic và search query.
  - Preview plain-text an toàn qua `toReadablePlainTextPreview(note.content)`.
  - Hiển thị `sourcePath` cùng nút sao chép đường dẫn (timeout 2s).
  - Nút CTA "Đọc tiếp" và click card mở `NoteReaderModal`.
  - Click topic title gọi `openTopicDetail(note.topicId)` với `stopPropagation`.
  - Xóa ghi chú với dialog xác nhận `window.confirm('Xóa ghi chú này?')`.
  - Modal integrations: `NoteFormModal`, `NoteReaderModal`.

### 2. `src/components/resources/ResourcesManager.tsx`
- **Archetype**: Explorer / Manager Archetype.
- **Workbench Components áp dụng**:
  - `PageHeader`: Tiêu đề "Quản Lý Tài Liệu & Giáo Trình", category "Thư Viện & Nguồn Tư Liệu", action "Thêm Tài Liệu Mới".
  - `SurfaceCard`: Bọc Toolbar/Filter (`variant="subtle"`), và bọc từng tài liệu (`variant="interactive"`).
  - `StatusPill`: Hiển thị định dạng tài liệu (PDF, Sách, Video, Bài viết).
  - `ToolbarButton`: Bộ lọc format, nút xuất danh mục trích dẫn, nút xem trước / trích dẫn.
- **Invariants bảo toàn**:
  - Lọc tài liệu theo type, topic và từ khóa tìm kiếm (tên, tác giả, ghi chú).
  - Mở đích tài liệu an toàn qua `resolveResourceOpenTarget(res)`.
  - Các modal liên quan: `ResourceFormModal`, `ResourceViewerModal`, `CitationModal`, `BatchCitationModal`.
  - Nút "Xuất danh mục (n)" xuất danh mục trích dẫn batch APA/BibTeX/Markdown.

### 3. `src/components/docs/DocsExplorerView.tsx`
- **Archetype**: Split-Pane Explorer Archetype.
- **Workbench Components áp dụng**:
  - `PageHeader`: Thay thế banner gradient cũ bằng header workbench chuẩn mực, có subtitle và action ("Chọn sách từ Vault", "Làm mới").
  - `SurfaceCard`: Khung điều hướng danh mục bên trái và khung đọc tài liệu bên phải.
  - `StatusPill`: Hiển thị status badge (`ACCEPTED`, `PROPOSED`, `EPUB`).
  - `ToolbarButton`: Thao tác chuyển category, sao chép Markdown, duyệt vault.
- **Invariants bảo toàn**:
  - Hỗ trợ cả 2 chế độ `mode="epub-only"` và `mode="full"`.
  - `data-testid="doc-item-${doc.id}"` trên từng tài liệu.
  - Tích hợp `FileViewer` khi chọn tệp EPUB và `ObsidianVaultBrowserModal` khi duyệt vault.
  - Xem tài liệu Markdown đầy đủ với nút sao chép Markdown và thông báo feedback.

### 4. `src/components/search/AdvancedSearch.tsx` & `SearchFilters.tsx`
- **Archetype**: Search & Discovery Explorer Archetype.
- **Workbench Components áp dụng**:
  - `PageHeader`: Tiêu đề "Tra Cứu & Khám Phá Tri Thức", category "Công Cụ Tra Cứu Toàn Diện".
  - `SurfaceCard`: Khung tìm kiếm, panel lưu góc nhìn, danh sách kết quả (Topics, Notes, Resources).
  - `StatusPill`: Badges phân loại kết quả và domain.
  - `ToolbarButton`: Chuyển đổi tab kết quả (Tất cả, Chủ đề, Ghi chú, Tài liệu), lưu góc nhìn, ghim góc nhìn.
  - `SectionHeader`: Tiêu đề phân đoạn từng nhóm kết quả kèm số lượng.
- **Invariants bảo toàn**:
  - Đồng bộ query với `DataContext` (`searchQuery`, `setSearchQuery`).
  - Tìm kiếm học thuật đa chiều qua `searchScholarCollections`.
  - Tính năng lưu góc nhìn nghiên cứu (`SavedSearchView`) kèm chức năng ghim (pin) và xóa.
  - Highlight từ khóa khớp tìm kiếm với `<mark>`.
  - Click vào kết quả mở `openTopicDetail(topicId)`.

---

## 3. Danh mục Test & Verification
1. `npm run typecheck`
2. Chạy test suite:
   - `tests/unit/note-readability-ux.test.tsx`
   - `tests/unit/phase7a-rebrand-and-note-reader.test.tsx`
   - `tests/unit/note-reference-ui.test.tsx`
   - `tests/unit/scholar-citation-modal-ui.test.tsx`
   - `tests/unit/citation-modal-ui.test.tsx`
   - `tests/unit/resource-viewer-path-consistency.test.tsx`
   - `tests/unit/phase7b-resource-open-target-resolution.test.tsx`
   - `tests/unit/FileViewer.test.tsx`
   - `tests/unit/search-filters.test.tsx`
   - `tests/unit/advanced-search-saved-views.test.tsx`
