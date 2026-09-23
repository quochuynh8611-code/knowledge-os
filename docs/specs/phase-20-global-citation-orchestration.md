# Spec Phase 20: Global Citation Navigation & Reader Orchestration Wiring

## 1. Bối Cảnh & Mục Tiêu (Context & Objectives)

Trong Phase 19, hệ thống đã xây dựng thành công:
- Bộ phân tích cú pháp trích dẫn chuẩn: `parseArchiveCitation` (`archive://{documentId}?loc={locator}`).
- Bộ giải mã và ánh xạ tài liệu 5 phân tầng: `resolveCitationTargetDocument`.
- Cơ chế điều hướng nội bộ cùng tài liệu (same-document jump) và prop callback `onNavigateToDocument` bên trong `UnifiedResearchReader`.

Tuy nhiên, việc tích hợp toàn hệ thống còn các khoảng trống kiến trúc:
1. **Chưa kết nối `onNavigateToDocument` trên các bề mặt cấp cao**: Tại `Navbar.tsx`, `NotesManager.tsx`, và `TopicDetail.tsx`, component `UnifiedResearchReader` được render nhưng chưa truyền `onNavigateToDocument`, khiến việc bấm citation cross-document trong Reader Sidebar bị rơi vào chế độ graceful degradation (toast) thay vì thực sự chuyển tài liệu.
2. **Sự không đồng nhất khi mở citation từ bên ngoài Reader**: `handleOpenArchiveLink` trong `TopicDetail.tsx` và `NotesManager.tsx` vẫn dùng helper cũ `resolveArchiveLinkToReaderDoc` thay vì engine phân giải 5 cấp bậc mới, gây thiếu sót trong việc định vị locator hoặc phân giải các alias phức tạp.
3. **Mã tàn dư EPUB cũ trong `TopicDetail.tsx`**: `TopicDetail.tsx` vẫn giữ state `activeEpubFile` mở qua `FileViewer` khi chọn file `.epub` từ Vault Browser Modal, thay vì chuyển sang `setActiveReaderDoc` đồng bộ với Phase 18/19.

**Mục tiêu Phase 20**: Hoàn thiện vòng tròn điều hướng toàn diện (Global Orchestration Loop) cho liên kết trích dẫn trên mọi bề mặt ứng dụng, đồng thời dọn sạch mã tàn dư legacy EPUB viewer.

---

## 2. Phạm Vi & Ranh Giới (Scope & Blast Radius)

### In-Scope:
- Truyền `onNavigateToDocument` handler cho `UnifiedResearchReader` trong `Navbar.tsx`, `NotesManager.tsx`, `TopicDetail.tsx`.
- Cập nhật `handleOpenArchiveLink` trong `TopicDetail.tsx` và `NotesManager.tsx` để sử dụng bộ phân giải chuẩn `resolveCitationTargetDocument`.
- Dọn dẹp `activeEpubFile` trong `TopicDetail.tsx`, định tuyến toàn bộ file EPUB sang `setActiveReaderDoc`.
- Đảm bảo hiển thị Toast lịch sự khi citation không thể resolve (`ERR_DOC_UNRESOLVED`) hoặc không hợp lệ (`ERR_MALFORMED_URI`).

### Non-Goals (Ngoài Phạm Vi):
- Không thay đổi cấu trúc URI `archive://{documentId}?loc={locator}`.
- Không thay đổi logic phân giải cốt lõi của `resolveCitationTargetDocument`.
- Không tạo, sửa đổi hoặc ghi bất kỳ file nào vào Obsidian Vault (giữ vững Read-Only Invariant).
- Không sửa đổi schema cơ sở dữ liệu Prisma hoặc REST endpoints.

---

## 3. Kiến Trúc Điều Phối (Orchestration Architecture)

```
[Bề mặt hiển thị Note]
(NoteReaderModal / TopicDetail / NotesManager / ReaderSidebar)
         │
         ▼ (User clicks citation: archive://docId?loc=locator)
[handleOpenArchiveLink(docId, locator)]
         │
         ▼
[resolveCitationTargetDocument(docId, locator, currentDoc, resources)]
         ├── Same Document ──► cuộn/nhảy vị trí in-reader
         ├── Cross Document ──► setActiveReaderDoc(resolvedDoc + locator)
         └── Unresolved ──► Toast cảnh báo nhẹ nhàng (no-op)
```

---

## 4. Ma Trận Xử Lý Lỗi (Failure Taxonomy)

| Tình Huống | Hành Vi Hệ Thống | Thông Báo Người Dùng |
|---|---|---|
| Citation trỏ tới doc hợp lệ + locator | Mở `UnifiedResearchReader` với `initialPosition=locator` | `"Đã mở tài liệu: {title}"` |
| Citation trỏ tới doc hợp lệ, không có locator | Mở `UnifiedResearchReader` ở vị trí đầu tài liệu | `"Đã mở tài liệu: {title}"` |
| Citation trỏ tới doc không tồn tại | Giữ nguyên view hiện tại, không crash | `"Không tìm thấy tài liệu nguồn tương ứng"` |
| URI malformed | Giữ nguyên view hiện tại, không crash | `"Định dạng liên kết trích dẫn không hợp lệ"` |
