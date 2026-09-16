# Hướng dẫn sử dụng Knowledge OS

Tài liệu này mô tả cách sử dụng phần mềm dựa trên mã nguồn và tài liệu hiện có trong repository `Dashboard-update`. Ứng dụng được mô tả là một hệ thống local-first để học tập và quản lý tri thức, gồm cây chủ đề, ghi chú Markdown, flashcards SRS, thư viện EPUB, khu nghiên cứu AI, dashboard tiến độ và tìm kiếm nhanh [cite:3].

## Mục đích phần mềm

Knowledge OS được thiết kế cho quy trình học tập và nghiên cứu nhiều lĩnh vực, với dữ liệu cục bộ là trung tâm và có khả năng đồng bộ với cơ sở dữ liệu thông qua Prisma/PostgreSQL [cite:3][cite:5]. Theo cấu trúc mã nguồn, hệ thống có cả frontend React/TypeScript, backend Express/Node, lớp repository dữ liệu, các context điều hướng và timer học tập, cùng nhiều thư viện nghiệp vụ cho đọc sách, tạo thẻ, nghiên cứu AI và theo dõi tiến độ [cite:4][cite:5].

## Cách khởi động phần mềm

README chỉ ra quy trình khởi động cơ bản gồm cài dependencies, cập nhật schema cơ sở dữ liệu, chạy server phát triển, chạy test và type-check trước khi sử dụng lâu dài [cite:3]. Các script khả dụng trong `package.json` gồm `dev`, `build`, `start`, `test`, `typecheck`, `db:push`, `db:generate`, `db:seed` và các lệnh snapshot bảo trì dữ liệu [cite:4][cite:5].

Quy trình đề xuất:

1. Cài thư viện: `npm install` [cite:3].
2. Sinh Prisma client nếu cần: `npm run db:generate` [cite:5].
3. Áp schema vào cơ sở dữ liệu: `npm run db:push` [cite:5].
4. Nếu dự án cần dữ liệu mẫu, chạy seed: `npm run db:seed` [cite:5].
5. Chạy môi trường phát triển: `npm run dev` [cite:3][cite:5].
6. Mở ứng dụng tại `http://localhost:3000` hoặc cổng Vite được chỉ định [cite:3].

## Các khu chức năng chính

### 1. Cây chủ đề và phân loại học tập

README cho biết phần mềm cho phép tạo nhóm gốc, cây chủ đề phân cấp, cập nhật trạng thái học (`not_started`, `in_progress`, `completed`) và nhận gợi ý hành động tiếp theo cho phiên học hằng ngày [cite:3]. Từ mã nguồn có thể thấy phần dữ liệu này được hỗ trợ bởi các module như `DataContext.tsx`, `topicSelector.ts`, `studyRecommendationEngine.ts`, `learningStateSelectors.ts` và `studySessionLogic.ts`, cho thấy đây là lõi điều phối nội dung học và ưu tiên hành động [cite:4][cite:5].

Cách dùng tối ưu:

- Tạo ít root category nhưng rõ nghĩa, ví dụ: Lập trình, Kế toán, Đông y, Nghiên cứu.
- Dùng cây phân cấp thay vì tạo quá nhiều nhãn ngang hàng; điều này giúp truy vết tiến độ theo từng nhánh.
- Chỉ đánh dấu `completed` khi đã có ghi chú, flashcards hoặc tài liệu tham chiếu tương ứng; như vậy dashboard tiến độ sẽ phản ánh đúng thực chất học tập.
- Dùng gợi ý “next action” làm điểm bắt đầu phiên học mỗi ngày để giảm ma sát ra quyết định [cite:3].

### 2. Ghi chú Markdown và liên kết tri thức

Phần mềm hỗ trợ ghi chú Markdown có liên kết hai chiều, gắn thẻ, lọc toàn văn và hỗ trợ mở file tham chiếu từ Obsidian vault [cite:3]. Mã nguồn còn có các module như `knowledgeGraph.ts`, `headingSlugger.ts`, `markdownReadability.tsx`, `obsidian.ts`, `obsidianParser.ts`, `obsidianWikiLinkResolver.ts` và `obsidianTransclusionResolver.ts`, cho thấy hệ thống được tối ưu cho viết ghi chú có cấu trúc, liên kết nội dung và giải quyết tham chiếu nội bộ [cite:4][cite:5].

Cách dùng tối ưu:

- Mỗi note chỉ nên bám một ý chính hoặc một khái niệm.
- Tạo liên kết giữa note khái niệm, note nguồn và note ứng dụng để hình thành mạng tri thức có thể duyệt lại.
- Gắn tag theo mục đích truy xuất, ví dụ `#formula`, `#case-study`, `#todo-reading`, thay vì gắn tag quá chung chung.
- Khi dùng với Obsidian, nên giữ cấu trúc thư mục ổn định để resolver và cơ chế mở file hoạt động nhất quán [cite:3][cite:4].

### 3. Flashcards SRS

README mô tả module flashcards gồm tạo thẻ thường và cloze từ ghi chú, áp dụng thuật toán SM-2, có studio ôn tập với phím tắt `Space` và `1..4`, đồng thời theo dõi tiến độ và độ nhớ [cite:3]. Hệ thống này được củng cố bởi nhiều module chuyên biệt như `clozeParser.ts`, `csvFlashcardParser.ts`, `flashcardScheduler.ts`, `spaced-repetition.ts`, `srsAlgorithmTuning.ts`, `flashcardAnalyticsLogic.ts`, `retentionPredictionEngine.ts` và `studyAnalytics.ts`, cho thấy flashcard là một năng lực lõi chứ không phải tính năng phụ [cite:4][cite:5].

Cách dùng tối ưu:

- Chỉ tạo thẻ cho kiến thức cần nhớ lâu dài hoặc hay bị quên.
- Ưu tiên thẻ ngắn, một ý, một đáp án; tránh nhồi nhiều mệnh đề vào một thẻ.
- Tạo cloze trực tiếp từ note sau khi học xong một chủ đề nhỏ để giảm độ trễ giữa đọc và ghi nhớ.
- Ôn hằng ngày với phiên ngắn, đều, thay vì dồn nhiều thẻ một lúc; cách này phù hợp với cơ chế lên lịch SRS [cite:3].
- Dùng phím tắt khi review để tăng tốc độ phản hồi và giữ nhịp học tập [cite:3].

### 4. Thư viện sách EPUB

Ứng dụng có thư viện đọc EPUB local-first, đọc sách từ `docs/books` hoặc từ Obsidian vault, có cơ chế sanitize XHTML/XML trong bộ nhớ và lưu vị trí đọc CFI cùng tùy chọn font/hiển thị [cite:3]. Mã nguồn liên quan gồm `epubXhtmlSanitizer.ts`, `readingPosition.ts`, `fileLibraryAudit.ts`, `resourceOpenResolver.ts`, `vault-manager.ts`, `obsidianFileWatcher.ts` và các module preference cho vault, cho thấy luồng đọc sách được thiết kế để bền vững với file local và ít phá hỏng nguồn dữ liệu gốc [cite:4][cite:5].

Cách dùng tối ưu:

- Nếu đọc sách nghiên cứu dài hạn, nên đặt EPUB vào `docs/books` để danh sách sách ổn định và dễ làm mới [cite:3].
- Nếu đã tổ chức thư viện trong Obsidian, dùng luôn vault để tránh nhân bản file.
- Đọc sách song song với việc tạo note và flashcards; đây là cách tận dụng tốt nhất mối liên kết giữa reader, ghi chú và SRS.
- Tận dụng trạng thái đọc được lưu tự động để chia sách thành nhiều phiên ngắn thay vì cố đọc hết trong một lần [cite:3].

### 5. AI Research Studio và NotebookLM

README nêu rõ hệ thống có chức năng gom nguồn nghiên cứu, đóng gói study package theo phiên bản, sinh prompt cho NotebookLM và AI assistants, đồng thời xem xét artifact trước khi đưa vào note [cite:3]. Trong mã nguồn xuất hiện nhiều module như `aiResearchStorage.ts`, `researchAggregationService.ts`, `researchReportGenerator.ts`, `researchTimelineService.ts`, `researchSearchEngine.ts`, `notebooklm.ts`, `citationGenerator.ts` và `citationPreferences.ts`, cho thấy khu vực này hỗ trợ quy trình nghiên cứu có kiểm soát và khả năng truy xuất nguồn [cite:4][cite:5].

Cách dùng tối ưu:

- Không đưa kết quả AI vào note chính ngay lập tức; hãy để qua bước review artifact trước.
- Gom nguồn theo từng câu hỏi nghiên cứu riêng thay vì trộn nhiều chủ đề trong một package.
- Dùng prompt sinh tự động như điểm khởi đầu, sau đó chỉnh tay cho mục tiêu cụ thể như tóm tắt, phản biện hay tạo flashcards.
- Giữ citation preference nhất quán để kết quả nghiên cứu dễ tái sử dụng về sau [cite:4].

### 6. Dashboard và tìm kiếm

README mô tả dashboard cung cấp KPI về hoàn thành chủ đề, retention, study time, streak và có tìm kiếm BM25 trong bộ nhớ với chuẩn hóa dấu tiếng Việt [cite:3]. Mã nguồn có các thành phần `studyAnalytics.ts`, `studyPatternEngine.ts`, `smartNotificationService.ts`, `recentSearchStorage.ts`, `savedViewStorage.ts` và `researchSearchEngine.ts`, cho thấy hệ thống không chỉ hiển thị số liệu mà còn phục vụ phân tích hành vi học tập và truy xuất nhanh [cite:4][cite:5].

Cách dùng tối ưu:

- Dùng dashboard để phát hiện tắc nghẽn, ví dụ học nhiều nhưng không chuyển thành note hoặc flashcards.
- Theo dõi retention để biết chủ đề nào đang quên nhanh, từ đó ưu tiên review.
- Lưu các truy vấn tìm kiếm hay dùng thành saved views nếu giao diện hỗ trợ, vì mã nguồn có lớp lưu trữ cho recent search và saved view [cite:5].
- Với tiếng Việt, nên nhập từ khóa theo cụm khái niệm chính; cơ chế chuẩn hóa dấu giúp việc tìm kiếm linh hoạt hơn [cite:3].

## Quy trình sử dụng tối ưu theo ngày

Một vòng sử dụng hiệu quả có thể đi theo chuỗi sau, vì đây là hướng phù hợp nhất với cách các module trong hệ thống liên kết với nhau [cite:3][cite:4][cite:5].

1. Mở dashboard để xem gợi ý hành động tiếp theo và các chủ đề đang dang dở [cite:3].
2. Chọn một topic cụ thể trong cây chủ đề, đọc note cũ trước khi học mới [cite:3].
3. Nếu cần, mở tài liệu EPUB hoặc tài liệu từ Obsidian vault để đọc nguồn [cite:3].
4. Viết note Markdown ngắn, có liên kết tới topic liên quan và nguồn tham chiếu [cite:3][cite:4].
5. Trích các ý cốt lõi thành flashcards hoặc cloze ngay sau khi ghi chú [cite:3].
6. Chạy phiên review ngắn bằng phím tắt để củng cố trí nhớ [cite:3].
7. Nếu đang làm nghiên cứu sâu, gom note thành package và gửi sang luồng AI Research/NotebookLM để phân tích tiếp [cite:3][cite:4].
8. Cuối ngày, xem lại dashboard và retention để quyết định chủ đề kế tiếp [cite:3].

## Các lệnh nên biết để vận hành ổn định

| Mục đích | Lệnh | Ghi chú |
|---------|------|--------|
| Chạy dev | `npm run dev` | Khởi động server phát triển [cite:3][cite:5] |
| Chạy test | `npm test -- --run` hoặc `npm test` | README và `package.json` đều có chỉ dẫn test [cite:3][cite:4] |
| Kiểm tra type | `npx tsc --noEmit` hoặc `npm run typecheck` | Dùng trước khi build hoặc nâng cấp [cite:3][cite:4] |
| Đẩy schema DB | `npm run db:push` | Đồng bộ schema Prisma [cite:4][cite:5] |
| Sinh Prisma client | `npm run db:generate` | Nên chạy sau khi đổi schema [cite:5] |
| Seed dữ liệu | `npm run db:seed` | Phù hợp khi cần dữ liệu khởi tạo [cite:5] |
| Build production | `npm run build` | Build cả Vite frontend và server bundle [cite:4] |
| Chạy production | `npm start` | Chạy từ `dist/server.cjs` [cite:4] |
| Tạo snapshot | `npm run snapshot:create` | Hữu ích trước các thay đổi lớn [cite:4] |
| Kiểm tra snapshot | `npm run snapshot:verify` | Dùng để xác thực backup [cite:4] |

## Khuyến nghị vận hành an toàn

Vì repository có thư mục `.env`, Prisma, scripts snapshot và các thành phần backend thật, phần mềm này không chỉ là prototype giao diện mà là ứng dụng có dữ liệu và vòng đời vận hành thực tế [cite:2][cite:4]. Trước khi dùng nghiêm túc, nên kiểm tra file môi trường, xác nhận cấu hình database, chạy test, rồi mới nhập dữ liệu thật hoặc thực hiện bảo trì [cite:3][cite:4].

Các thực hành nên áp dụng:

- Tạo snapshot trước khi chạy script bảo trì hoặc làm sạch dữ liệu [cite:4].
- Không chỉnh tay dữ liệu trong database khi chưa hiểu ràng buộc Prisma.
- Tách dữ liệu nghiên cứu thật với dữ liệu thử nghiệm nếu đang tinh chỉnh schema.
- Chạy `npm run typecheck` và `npm test` sau mỗi thay đổi đáng kể trong dự án [cite:3][cite:4].

## Diễn giải ngắn về các thư mục quan trọng

| Thư mục / file | Vai trò suy ra từ mã nguồn |
|---------------|----------------------------|
| `src/` | Frontend, context, hooks, business logic và service lớp ứng dụng [cite:4][cite:5] |
| `server.ts` | Điểm vào backend/dev server [cite:2][cite:4] |
| `prisma/` | Schema, generate client và seed dữ liệu [cite:2][cite:4] |
| `docs/` | Tài liệu trạng thái dự án, ADR, specs và release notes [cite:4] |
| `tests/` | Bộ test để xác thực hành vi hệ thống [cite:2] |
| `dist/` | Output build production [cite:2][cite:4] |
| `scripts/` | Backup snapshot và tác vụ bảo trì [cite:4] |
| `assets/` | Tài nguyên giao diện hoặc tệp phục vụ ứng dụng [cite:2] |

## Kết luận sử dụng thực tế

Cách khai thác tốt nhất Knowledge OS là dùng nó như một vòng lặp học tập hoàn chỉnh: tổ chức topic, đọc nguồn, viết note, tạo flashcards, ôn SRS, rồi dùng dashboard và AI Research để tinh chỉnh vòng học tiếp theo [cite:3][cite:4][cite:5]. Nếu chỉ dùng từng tính năng rời rạc, giá trị của hệ thống sẽ giảm; điểm mạnh thực sự nằm ở việc kết nối cây chủ đề, ghi chú, reader, flashcards và phân tích tiến độ trong cùng một quy trình local-first [cite:3][cite:5].
