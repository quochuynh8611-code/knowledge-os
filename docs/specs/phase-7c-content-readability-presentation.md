# Technical Specification: Phase 7C — Note Content Readability Presentation Upgrade

## 1. Problem Statement
Hiện tại trong ứng dụng, nội dung ghi chú (`note.content`) và nội dung chủ đề (`topic.content`) được hiển thị bằng cách gắn `renderWikiLinks(content)` cùng với `whitespace-pre-wrap` hoặc `line-clamp`:
- **Ở chế độ đọc chi tiết (NoteReaderModal, TopicDetail overview)**: Người dùng phải nhìn thấy các ký tự cú pháp markdown thô như `#`, `##`, `###`, `**bold**`, `*italic*`, `> trích dẫn`, `---` (đường kẻ ngang), `- ` (danh sách).
- **Ở chế độ xem rút gọn / thẻ ghi chú (NotesManager cards, TopicDetail note items, AdvancedSearch snippets)**: Đoạn trích dẫn ngắn (preview) bị phân mảnh bởi các ký tự markup markdown control thừa, làm giảm thẩm mỹ và tính dễ đọc của giao diện.
- **Trùng lặp mã nguồn**: Hàm `renderWikiLinks` bị sao chép ở 3 file độc lập (`NoteReaderModal.tsx`, `NotesManager.tsx`, `TopicDetail.tsx`), gây phân mảnh logic điều hướng và styling.

## 2. Readability Goals & Presentation Contracts

### 2.1. Phân Tách Rõ Ràng 2 Chế Độ Trình Bày (Presentation Modes)

```
                       ┌──────────────────────────────────────────────┐
                       │  Raw Content in DB/Model (100% Unmodified)   │
                       └──────────────────────┬───────────────────────┘
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     ▼                                                 ▼
     ┌───────────────────────────────┐                 ┌───────────────────────────────┐
     │ 1. Focus Read Mode (Detail)   │                 │ 2. Compact Preview Mode       │
     │ MarkdownReadabilityRenderer   │                 │ toReadablePlainTextPreview()  │
     ├───────────────────────────────┤                 ├───────────────────────────────┤
     │ • Headings: H1, H2, H3 UI     │                 │ • Flatten headings & quotes   │
     │ • Bold / Italic styled        │                 │ • Strip #, **, _, >, ---, ``` │
     │ • Blockquotes with left border│                 │ • [[Wiki]] -> "Wiki"          │
     │ • Clean list items & divider  │                 │ • Single line / normalized    │
     │ • Interactive [[Wiki Links]]  │                 │ • Ready for line-clamp        │
     └───────────────────────────────┘                 └───────────────────────────────┘
```

### 2.2. Chi Tiết Read Mode / Detail Mode (`MarkdownReadabilityRenderer`)
- **Headings**: Chuyển đổi `# Heading 1`, `## Heading 2`, `### Heading 3` thành các thẻ heading/div có cỡ chữ, trọng số font và khoảng cách phân cấp rõ ràng.
- **Blockquote**: Dòng bắt đầu bằng `> ` được render trong khối trích dẫn có viền trái nổi bật, nền nhẹ và chữ nghiêng/êm mắt.
- **Bold & Italic**: `**text**` hoặc `__text__` hiển thị font đậm (`font-bold`); `*text*` hoặc `_text_` hiển thị chữ nghiêng (`italic`).
- **Horizontal Rule**: Dòng `---`, `***`, `___` hiển thị thành đường phân cách `<hr />` thẩm mỹ.
- **Lists**: Dòng `- item`, `* item`, `1. item` hiển thị dạng danh sách gọn gàng.
- **Inline Code & Code Block**: `` `code` `` và ```` ```code``` ```` hiển thị trong khung font mono cách điệu.
- **Wiki Links**: Cú pháp `[[Tên Chủ Đề]]` hiển thị thành button tương tác có icon `Sparkles`, nhấp vào điều hướng ngay đến chủ đề tương ứng (hoặc span mono nếu không khớp).

### 2.3. Chi Tiết Compact / Preview Mode (`toReadablePlainTextPreview`)
- Loại bỏ toàn bộ ký tự điều khiển markdown:
  - Bỏ `#`, `##`, `###` ở đầu dòng.
  - Bỏ dấu `> ` của blockquote.
  - Bỏ marker `**`, `__`, `*`, `_`, `~~`.
  - Bỏ cú pháp `[[` và `]]`, chỉ giữ lại tiêu đề bên trong.
  - Bỏ đường kẻ ngang `---`, `***`.
  - Bỏ backticks `` ` `` và code fence ```` ``` ````.
- Chuẩn hóa khoảng trắng và dấu xuống dòng thành khoảng trắng đơn liền mạch, hỗ trợ `line-clamp` hoạt động mượt mà không bị ngắt quãng vô lý.
- Tùy chọn cắt ngắn an toàn `maxLength` với ellipsis `...`.

### 2.4. Non-Goals
1. **Không sửa đổi dữ liệu gốc**: Trường `content` trong cơ sở dữ liệu/state giữ nguyên vẹn 100% cú pháp markdown của người dùng.
2. **Không thay đổi trình biên tập (Editor)**: Khi người dùng mở `NoteFormModal` để tạo hoặc chỉnh sửa ghi chú, textarea vẫn nhận và chỉnh sửa chuỗi markdown gốc đầy đủ.
3. **Không dùng thư viện bên ngoài nặng**: Triển khai giải pháp React thuần gọn nhẹ, không thêm dependencies, không dùng `dangerouslySetInnerHTML` để phòng ngừa triệt để rủi ro XSS.

## 3. Blast Radius & Affected Files
- `src/lib/markdownReadability.tsx` [NEW]: Module chứa `MarkdownReadabilityRenderer`, `renderInlineMarkdownWithWikiLinks`, và `toReadablePlainTextPreview`.
- `src/components/modals/NoteReaderModal.tsx` [MODIFY]: Sử dụng `MarkdownReadabilityRenderer` cho khu vực đọc tập trung.
- `src/components/notes/NotesManager.tsx` [MODIFY]: Sử dụng `toReadablePlainTextPreview` cho thẻ card preview.
- `src/components/topics/TopicDetail.tsx` [MODIFY]: Sử dụng `MarkdownReadabilityRenderer` cho topic content và `toReadablePlainTextPreview` cho note items preview.
- `src/components/search/AdvancedSearch.tsx` [MODIFY]: Sử dụng `toReadablePlainTextPreview` trước khi highlight snippet.

## 4. Rollback Strategy
Nếu có bất kỳ vấn đề phát sinh:
- Logic renderer hoàn toàn độc lập và thuần túy ở tầng view, không tác động đến schema hay database. Có thể hoàn tác tức thì bằng cách chuyển các component về lại `renderWikiLinks` ban đầu mà không làm sai lệch dữ liệu.
