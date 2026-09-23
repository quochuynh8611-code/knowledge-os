# ADR-078: Global Citation Navigation & Reader Orchestration Wiring (Phase 20)

## Status
**Proposed** (Target: Phase 20 / Global Reader Integration)

## Context & Problem Statement
Sau Phase 19, hệ thống Knowledge OS đã có đầy đủ logic phân giải và điều hướng trích dẫn hai chiều trong phạm vi component `UnifiedResearchReader`. Tuy nhiên, ở cấp độ toàn cục (Global Application Scope):
1. Các container cấp cao (`Navbar`, `NotesManager`, `TopicDetail`) khi render `UnifiedResearchReader` chưa cung cấp callback `onNavigateToDocument`. Do đó, khi người dùng nhấp vào trích dẫn trỏ tới tài liệu khác trong Sidebar, hệ thống chỉ hiển thị toast thông báo mà chưa chuyển đổi tài liệu đang đọc.
2. Việc mở trích dẫn từ các modal bên ngoài (như `NoteReaderModal` trong `NotesManager` hoặc `TopicDetail`) vẫn đang sử dụng hàm phân giải cũ `resolveArchiveLinkToReaderDoc`, chưa tận dụng 5-tier resolution engine hoàn chỉnh của `resolveCitationTargetDocument`.
3. `TopicDetail.tsx` vẫn duy trì state tàn dư `activeEpubFile` và mở `FileViewer` khi người dùng chọn sách EPUB từ Vault Browser, đi ngược lại thiết kế hợp nhất của Phase 18 và Phase 19.

## Decision Drivers
1. **Trải nghiệm liền mạch toàn hệ thống**: Nhấp vào liên kết trích dẫn ở bất cứ đâu (Sidebar, NoteReaderModal, Topic Detail Notes) đều mở đúng tài liệu nguồn và nhảy tới chính xác vị trí locator.
2. **Loại bỏ phân mảnh mã nguồn (De-duplication)**: Sử dụng một bộ phân giải duy nhất `resolveCitationTargetDocument` cho tất cả các luồng mở tài liệu từ citation.
3. **Tuân thủ Kiến trúc Unified Reader**: 100% tài liệu EPUB, PDF, Markdown đều mở qua `UnifiedResearchReader`.
4. **Bảo tồn Bất biến Read-Only**: Không thực hiện bất kỳ thao tác ghi nào vào Obsidian Vault khi điều hướng.

## Architectural Decisions

### 1. Wiring Callback `onNavigateToDocument`
Tại mọi nơi hiển thị `UnifiedResearchReader` (`Navbar`, `NotesManager`, `TopicDetail`), bổ sung prop:
```tsx
<UnifiedResearchReader
  documentId={activeReaderDoc.documentId}
  title={activeReaderDoc.title}
  format={activeReaderDoc.format}
  fileUrl={activeReaderDoc.fileUrl}
  content={activeReaderDoc.content}
  initialPosition={activeReaderDoc.initialPosition}
  onNavigateToDocument={(doc, locator) => {
    setActiveReaderDoc({
      documentId: doc.documentId,
      title: doc.title,
      format: doc.format,
      fileUrl: doc.fileUrl,
      content: doc.content,
      initialPosition: locator,
    });
  }}
  onClose={() => setActiveReaderDoc(null)}
/>
```

### 2. Chuẩn Hóa `handleOpenArchiveLink`
Thay thế logic phân giải trong `handleOpenArchiveLink` bằng `resolveCitationTargetDocument`:
```tsx
const handleOpenArchiveLink = (documentId: string, locator?: string) => {
  const result = resolveCitationTargetDocument(documentId, locator, activeReaderDoc, resources);
  if (result) {
    setActiveReaderDoc({
      ...result.document,
      initialPosition: result.locator,
    });
  } else {
    // Hiển thị toast thông báo tài liệu không tìm thấy
  }
};
```

### 3. Dọn Dẹp Legacy EPUB Handler trong `TopicDetail.tsx`
Xóa bỏ `activeEpubFile` state và các import/render `FileViewer` liên quan, hợp nhất luồng chọn file `.epub` từ Vault Browser vào `setActiveReaderDoc`.

## Consequences & Mitigations
- **Tích cực**: Trải nghiệm điều hướng trích dẫn trở nên nhất quán 100% trên toàn ứng dụng.
- **Rủi ro kiểm soát**: Việc chuyển tài liệu đột ngột có thể làm mất highlight/note tạm thời nếu state không được lưu trữ; giải pháp là toàn bộ note/highlight đều được lưu trong storage/context nên khi re-scope sẽ tự động hiển thị đầy đủ.
