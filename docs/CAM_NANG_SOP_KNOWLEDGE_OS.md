# Cẩm nang SOP sử dụng Knowledge OS cho học tập và nghiên cứu

Tài liệu này là cẩm nang thao tác chuẩn (SOP) dành cho người mới và người dùng vận hành thường xuyên Knowledge OS. Nội dung được xây dựng từ README, feature spec, Gherkin, cấu trúc thành phần giao diện, modal thao tác, khu nghiên cứu, test UI và các tín hiệu vận hành dữ liệu để phản ánh cách dùng sát thực tế phần mềm nhất có thể tại thời điểm hiện tại [cite:3][cite:7][cite:10][cite:11][cite:14][cite:15][cite:17].

## 1. Mục tiêu của SOP

Knowledge OS không chỉ là nơi lưu note, mà là hệ thống học tập và nghiên cứu local-first với cây chủ đề, note Markdown, flashcards SRS, thư viện tài liệu, AI research, dashboard và các công cụ điều hướng nhanh [cite:3][cite:7]. SOP này chuẩn hóa cách dùng để bạn học hiệu quả hơn, giảm thao tác thừa, giữ dữ liệu sạch và biến từng phiên học thành đầu ra có thể truy xuất lại về sau [cite:10][cite:11][cite:15].

## 2. Nguyên tắc vận hành

Nguyên tắc cốt lõi khi dùng Knowledge OS là: mọi hoạt động nên xoay quanh một topic cụ thể, diễn ra trong một phiên học có bắt đầu và kết thúc rõ ràng, và để lại ít nhất một đầu ra như note, takeaway, resource liên kết hoặc flashcard [cite:11][cite:15]. Nếu thao tác nào không gắn với topic, không có wrap-up và không để lại cấu trúc dữ liệu rõ, dữ liệu trong hệ thống sẽ nhanh chóng trở nên rời rạc và khó tái sử dụng [cite:10][cite:17].

Nguyên tắc thực hành:

- Một phiên làm việc chỉ tập trung vào một mục tiêu học chính.
- Đọc trước, ghi chú sau, tạo flashcards sau khi đã hiểu.
- Dùng AI để mở rộng hoặc phản biện, không thay thế việc đọc nguồn.
- Kết thúc phiên bằng wrap-up để hệ thống ghi nhận thời gian và tiến độ [cite:11].
- Bảo vệ dữ liệu bằng snapshot khi thực hiện thay đổi lớn [cite:4][cite:17].

## 3. Chuẩn bị môi trường trước khi học thật

Theo README và scripts hiện có, môi trường chuẩn gồm cài thư viện, sinh Prisma client, đẩy schema database, chạy dev server, rồi xác minh test và typecheck [cite:3][cite:4][cite:5][cite:7]. Repository cũng có script build, start, seed và snapshot, cho thấy dự án đã được tổ chức như một ứng dụng có dữ liệu thực chứ không chỉ là demo giao diện [cite:4][cite:5].

Checklist chuẩn bị:

1. `npm install` [cite:3][cite:7]
2. `npm run db:generate` [cite:5]
3. `npm run db:push` [cite:4][cite:5]
4. `npm run db:seed` nếu cần dữ liệu khởi tạo [cite:5]
5. `npm run dev` rồi mở `http://localhost:3000` [cite:3][cite:7]
6. `npm test` và `npm run typecheck` trước khi dùng lâu dài hoặc trước khi nâng cấp [cite:3][cite:4]

## 4. Nhận diện các khu vực giao diện chính

Dashboard là trung tâm điều phối, với các phần như gợi ý học hôm nay, cadence học theo tuần, analytics flashcards, hub lĩnh vực học tập và vùng recent items [cite:15]. Các component khác cho thấy hệ thống còn có topic detail, topic tree, notes manager, flashcard studio, sidebar, navbar, breadcrumbs, command palette, modal form, research dashboard và workflow vault/Obsidian [cite:14][cite:15][cite:17].

Cách đọc giao diện khi mới mở app:

- Từ dashboard, xác định việc nên làm trước.
- Vào topic detail để làm việc sâu trên một chủ đề.
- Mở note hoặc resource khi cần ghi nhận hoặc tham chiếu.
- Chuyển sang flashcard/research khi đã có dữ liệu nền.
- Dùng navbar, sidebar, breadcrumbs và command palette để giảm thời gian điều hướng [cite:10][cite:14][cite:15].

## 5. SOP khởi động một ngày học chuẩn

Đây là trình tự mở máy và bắt đầu học được khuyến nghị nhất cho người dùng thường xuyên [cite:11][cite:15].

1. Mở Dashboard.
2. Xem Today Learning Hero hoặc khu hành động ưu tiên để chọn topic [cite:15].
3. Kiểm tra nhanh cadence tuần và analytics để biết hôm nay nên học mới hay ôn cũ [cite:15].
4. Chuyển vào topic detail phù hợp.
5. Bấm “Bắt đầu phiên học” để bật cơ chế theo dõi thời gian [cite:11].
6. Chỉ sau khi phiên học bắt đầu mới mở note, tài liệu hoặc công cụ nghiên cứu.

## 6. SOP tổ chức domain, category và topic

Feature spec xác nhận hệ thống có quan hệ Category cha-con, Topic cha-con, slug, type, tags, study progress và metadata học tập đi kèm [cite:10]. Dashboard còn hỗ trợ tạo domain mới ngay trong luồng sử dụng, vì vậy phần cấu trúc kiến thức nên được thiết kế có chủ đích từ đầu [cite:15].

Quy tắc chuẩn:

- Domain là lĩnh vực lớn, ví dụ Lập trình, Y học cổ truyền, Nghiên cứu AI.
- Category là nhóm nội dung trong domain.
- Topic là đơn vị học tập thực tế, đủ nhỏ để học theo phiên.
- Mỗi topic nên có mô tả ngắn, ít tags nhưng chính xác, và có tiến độ học đi kèm [cite:10].

SOP tạo topic:

1. Vào đúng domain/category trước.
2. Tạo topic mới bằng tên ngắn, rõ, không đa nghĩa.
3. Viết mô tả 1 đến 3 câu về mục tiêu topic.
4. Chỉ gắn các tag phục vụ tìm kiếm thật sự.
5. Không tạo topic nếu chưa biết mình sẽ học nó trong vài tuần tới.

## 7. SOP làm việc trong Topic Detail

Các component `TopicDetail`, `NextActionStrip`, `StudyCTA` và `ResearchToolsDropdown` cùng Gherkin phase 17 cho thấy topic detail là bàn làm việc trung tâm cho một chủ đề cụ thể [cite:11][cite:14]. Ở đây, hệ thống ưu tiên nút bắt đầu phiên học, hiển thị hành động kế tiếp và gom các công cụ nghiên cứu nâng cao vào menu riêng để tránh rối [cite:11].

SOP tại topic detail:

1. Đọc `Next Action` trước khi làm bất cứ việc gì [cite:11].
2. Xem topic đã có note, resource, flashcard hay chưa.
3. Bấm bắt đầu phiên học nếu chuẩn bị đọc hoặc nghiên cứu sâu [cite:11].
4. Chỉ mở công cụ nghiên cứu khi đã có nội dung nền trong topic.
5. Không nhảy sang topic khác giữa phiên, trừ khi đó là topic tham chiếu bắt buộc.

## 8. SOP sử dụng phiên học tập trung

Gherkin phase 17 mô tả rõ luồng `ActiveLearningSessionBar`, tạm dừng/tiếp tục, wrap-up modal, cập nhật thời gian và tạo note `insight` từ takeaway [cite:11]. Điều này xác nhận phiên học là một quy trình first-class trong hệ thống chứ không chỉ là timer trang trí [cite:11][cite:15].

SOP phiên học:

1. Từ dashboard hoặc topic detail, bấm bắt đầu học [cite:11].
2. Trong lúc học, để thanh session bar chạy nền.
3. Nếu bị gián đoạn, dùng tạm dừng thay vì đóng phiên [cite:11].
4. Khi kết thúc, mở wrap-up và điền takeaway.
5. Cập nhật phần trăm tiến độ thực tế, không tô hồng kết quả [cite:11].
6. Lưu thành quả để tăng time-spent, cập nhật progress và tạo insight note khi có nội dung takeaway [cite:11].

Quy tắc chất lượng takeaway:

- Viết điều bạn đã hiểu, không chỉ ghi “đã học xong”.
- Một takeaway tốt có thể tái dùng làm insight note hoặc flashcard nguồn.
- Nếu chưa hiểu đủ, takeaway có thể là câu hỏi cần nghiên cứu tiếp.

## 9. SOP đọc tài liệu và thư viện sách

README và Gherkin EPUB library chỉ ra rằng thư viện sách ưu tiên nguồn rõ ràng, hỗ trợ EPUB từ thư mục local hoặc Obsidian Vault, có làm mới danh sách, mở reader hiện có và giữ trạng thái vị trí đọc [cite:3][cite:7][cite:11]. Giao diện cũng tránh đánh lừa người dùng rằng upload server-side đã thành công khi thực tế tính năng đó chưa được hỗ trợ [cite:11].

SOP đọc tài liệu:

1. Quyết định nguồn sách: `docs/books` hoặc Obsidian Vault [cite:3][cite:11].
2. Làm mới danh sách nếu vừa thêm EPUB [cite:3][cite:11].
3. Chọn đúng sách và vào reader.
4. Đọc theo đơn vị nhỏ: mục, chương, đoạn.
5. Sau mỗi đơn vị đọc, tạo note hoặc takeaway thay vì đọc liên tục quá dài.
6. Khi quay lại, tận dụng reading state persistence để tiếp tục đúng vị trí [cite:3].

## 10. SOP tạo và quản lý note

`NoteFormModal.tsx` cho thấy note có topic liên kết, title, content, sourcePath, type, tags, cờ private và hỗ trợ wiki link `[[Tên chủ đề]]`, đồng thời có kiểm tra path tài liệu theo library root [cite:17]. Kết hợp với feature spec về `Note` và hệ thống knowledge linking, note trong Knowledge OS nên được xem là đơn vị tri thức chuẩn hóa chứ không phải ghi nháp vô tổ chức [cite:3][cite:10][cite:17].

SOP tạo note mới:

1. Tạo note từ trong đúng topic hoặc gán đúng topic ngay khi mở modal [cite:17].
2. Đặt tiêu đề theo một ý rõ ràng.
3. Chọn loại note phù hợp: `study`, `insight`, `question`, `summary` [cite:10][cite:17].
4. Viết nội dung Markdown ngắn gọn, có heading nếu cần.
5. Thêm source path nếu note gắn với file/tài liệu cụ thể [cite:17].
6. Dùng tag tiết kiệm và có chủ đích.
7. Chỉ bật `private` khi nội dung thật sự mang tính riêng tư [cite:17].

Quy tắc note tốt:

- Một note chỉ nên có một ý chính.
- Luôn liên kết note với topic thực tế.
- Dùng wiki links để nối tri thức thay vì copy-paste lặp lại [cite:17].
- Note `question` là công cụ rất mạnh để lái nghiên cứu tiếp theo.

## 11. SOP quản lý resource và liên kết tài liệu

Sự hiện diện của `ResourceFormModal`, `ResourceViewerModal`, `ObsidianTopicResourceLinkModal`, `ObsidianVaultBrowserModal` và các test về topic-resource linking cho thấy hệ thống coi resource là thực thể gắn chặt với topic chứ không phải phần đính kèm phụ [cite:14][cite:17]. Điều này rất quan trọng cho nghiên cứu, vì nguồn tham chiếu cần được neo vào đúng chủ đề để tìm lại và kiểm chứng về sau [cite:17].

SOP resource:

1. Khi gặp nguồn quan trọng, liên kết nó vào topic tương ứng ngay.
2. Ghi title rõ ràng, tránh các tên chung chung như “tài liệu hay”.
3. Nếu là file local hoặc nguồn Obsidian, ưu tiên đường dẫn sạch và ổn định [cite:17].
4. Không biến resources thành bãi chứa hỗn tạp; chỉ giữ các nguồn có vai trò thật trong học tập hoặc nghiên cứu.

## 12. SOP chuyển từ note sang flashcards

README, flashcard studio và các module parser/scheduler cho thấy Knowledge OS hỗ trợ chuyển hóa nội dung từ note sang review workflow một cách có hệ thống [cite:3][cite:4][cite:13]. Đây là cây cầu quan trọng giữa “đã đọc” và “đã nhớ” [cite:13].

SOP chuyển note thành thẻ:

1. Chọn note đã đủ rõ nghĩa.
2. Rút ra mệnh đề, định nghĩa, quy trình hoặc cặp hỏi-đáp ngắn.
3. Tạo flashcard thường hoặc cloze tùy loại kiến thức [cite:3].
4. Không tạo thẻ cho đoạn văn mơ hồ hoặc thứ bạn chưa hiểu.
5. Ưu tiên số lượng ít nhưng chính xác và dễ review.

## 13. SOP review flashcards hằng ngày

`FlashcardReviewStudio.tsx` cho thấy review studio có queue, session stats, create/import/edit/history/export modal, retention curve, smart queue, exam date và các chế độ session khác nhau [cite:13]. Điều này nghĩa là người mới có thể bắt đầu đơn giản, còn người dùng lâu dài có thể nâng dần mức tinh chỉnh mà không cần đổi công cụ [cite:13][cite:14].

SOP review cơ bản:

1. Mở review queue đầu ngày.
2. Hoàn thành due cards trước khi học mới.
3. Dùng rating nhất quán, không tự “ưu ái” thẻ khó.
4. Cuối phiên, nhìn session stats để biết tốc độ và chất lượng học [cite:13].

SOP review nâng cao:

- Dùng retention curve để xem trí nhớ đang lệch ở đâu [cite:13].
- Dùng history để kiểm tra các thẻ lặp lại quá nhiều.
- Dùng duplicate detection để dọn thẻ trùng [cite:14].
- Chỉ dùng cram mode cho mục tiêu ngắn hạn, không thay thế review thường xuyên [cite:13].

## 14. SOP sử dụng command palette và phím tắt

Feature spec và các component/navigation tests cho thấy `Ctrl/Cmd + K`, breadcrumbs, sidebar, navbar và shortcuts modal là nền tảng để duy trì tốc độ điều hướng khi kho tri thức tăng lớn [cite:10][cite:14][cite:17]. Người dùng lâu dài nên xem đây là một phần của SOP, không phải tính năng phụ [cite:10].

SOP điều hướng nhanh:

1. Dùng command palette để mở nhanh topic, hành động hoặc saved view [cite:9][cite:14].
2. Dùng breadcrumbs để không lạc khỏi ngữ cảnh hiện tại [cite:14].
3. Học các phím tắt quan trọng ngay từ tuần đầu [cite:10].
4. Dùng sidebar cho duyệt cấu trúc; dùng command palette cho truy cập đích nhanh.

## 15. SOP dùng AI Research Studio đúng cách

README, Gherkin AI research, NotebookLM workspace và các test persistence/UI cho thấy AI Research Studio được thiết kế có bounded context, review artifact, lưu trạng thái và gắn chặt với nguồn cá nhân như Obsidian Vault [cite:3][cite:9][cite:11][cite:17]. Đây là dấu hiệu cho thấy phần AI trong hệ thống hướng đến nghiên cứu có kiểm soát thay vì hỏi đáp tùy hứng [cite:11][cite:17].

SOP AI research:

1. Chỉ bắt đầu khi topic đã có câu hỏi nghiên cứu rõ.
2. Chọn đúng note và nguồn làm đầu vào.
3. Đóng gói package theo từng câu hỏi nghiên cứu, không trộn chủ đề [cite:3][cite:11].
4. Chạy AI để lấy tóm tắt, phản biện, khung phân tích hoặc hướng đọc tiếp.
5. Review artifact trước khi nhập về hệ tri thức chính [cite:3][cite:11].
6. Chỉ chuyển nội dung đã được kiểm tra thành note `summary` hoặc `insight`.

Quy tắc an toàn:

- Không dùng AI khi chưa có nguồn.
- Không xem output AI là nguồn gốc.
- Không nhập toàn bộ artifact vào note chính mà không biên tập lại [cite:11].

## 16. SOP nghiên cứu theo chu kỳ dài hạn

Từ `TopicDashboard`, `TopicRecommendations`, `ResearchTimeline`, heatmap, retention prediction và analytics components có thể thấy hệ thống hỗ trợ nghiên cứu theo tiến trình thời gian chứ không chỉ theo từng phiên riêng lẻ [cite:14][cite:17]. Vì vậy, nghiên cứu dài hạn nên được tổ chức thành chu kỳ thay vì các lần làm việc rời rạc [cite:14].

SOP chu kỳ nghiên cứu 1 tuần:

- Ngày 1-2: đọc nguồn và tạo note `study` [cite:3][cite:17].
- Ngày 3: viết note `question` và `insight`.
- Ngày 4: tạo flashcards cho ý cốt lõi [cite:3].
- Ngày 5: dùng AI research để tổng hợp hoặc phản biện [cite:11].
- Ngày 6: cập nhật topic summary hoặc report.
- Ngày 7: xem dashboard, cadence, retention và timeline để quyết định hướng tuần sau [cite:14][cite:15].

## 17. SOP sao lưu, xuất nhập và an toàn dữ liệu

Scripts snapshot, `ExportImportModal`, các test backup readiness, backup routes và data-management UI cho thấy sao lưu là một phần nghiêm túc của hệ thống chứ không phải công cụ phụ trợ [cite:4][cite:14][cite:17]. Với một hệ thống học tập lâu dài, đây là phần bắt buộc của SOP vận hành [cite:17].

SOP backup:

1. Tạo snapshot trước khi chạy script bảo trì, nâng schema hoặc dọn dữ liệu [cite:4].
2. Xác minh snapshot bằng lệnh kiểm tra trước khi yên tâm tiếp tục [cite:4].
3. Khi export/import dữ liệu, làm trên bản sao hoặc môi trường an toàn trước nếu dữ liệu đã quan trọng [cite:17].
4. Giữ phân biệt rõ giữa dữ liệu thật và dữ liệu thử nghiệm.

Lệnh nên nhớ:

- `npm run snapshot:create` [cite:4]
- `npm run snapshot:verify` [cite:4]
- `npm run snapshot:dry-run` [cite:4]
- `npm run snapshot:prune` [cite:4]

## 18. SOP onboarding 30 phút cho người mới

Đây là quy trình nhập môn ngắn nhất nhưng vẫn đúng tinh thần hệ thống [cite:11][cite:15][cite:17].

1. Mở app và đọc dashboard 5 phút.
2. Tạo hoặc chọn một domain.
3. Tạo một topic nhỏ, dễ học trong hôm nay.
4. Mở topic detail và bắt đầu phiên học [cite:11].
5. Đọc một tài liệu hoặc đoạn note nền 10 phút.
6. Tạo một note `study` và một note `question` [cite:10][cite:17].
7. Tạo 3 đến 5 flashcards đầu tiên.
8. Kết thúc phiên bằng takeaway và cập nhật tiến độ [cite:11].
9. Quay lại dashboard để xem hôm nay đã khép vòng học chưa [cite:15].

## 19. SOP làm việc hằng ngày

Đây là quy trình chuẩn khi bạn đã dùng app thường xuyên [cite:11][cite:15].

- Bắt đầu từ dashboard.
- Hoàn thành due review trước.
- Chọn một topic chính cho ngày hôm đó.
- Bật phiên học khi đọc hoặc nghiên cứu sâu.
- Tạo note ngay sau khi hiểu.
- Dịch note tốt thành flashcards.
- Dùng AI research nếu topic đã đủ chín.
- Kết thúc bằng wrap-up và xem lại cadence/analytics.

## 20. SOP xử lý các tình huống thường gặp

Dựa trên thiết kế UI và quy trình hiện có, nhiều lỗi sử dụng không phải lỗi kỹ thuật mà là lỗi quy trình [cite:11][cite:14][cite:17]. Một SOP tốt cần nêu rõ cách xử lý những tình huống này trước khi chúng biến thành dữ liệu rác [cite:17].

| Tình huống | Cách xử lý chuẩn |
|-----------|------------------|
| Đọc nhiều nhưng không nhớ | Giảm lượng đọc, tăng note ngắn và chuyển ý cốt lõi sang flashcards [cite:3][cite:13] |
| Có nhiều note nhưng khó tìm lại | Giảm tag rác, tăng liên kết wiki và gắn đúng topic [cite:3][cite:17] |
| Học nhiều topic cùng lúc | Quay về một topic chính cho mỗi phiên học [cite:11] |
| Output AI quá chung chung | Thu hẹp câu hỏi nghiên cứu và đầu vào nguồn [cite:11][cite:17] |
| Flashcards ngày càng nặng | Dọn thẻ trùng, giảm tạo mới, xem retention/history [cite:13][cite:14] |
| Sợ mất dữ liệu | Tạo và xác minh snapshot trước thay đổi lớn [cite:4][cite:17] |

## 21. Sai lầm cần tránh tuyệt đối

Các sai lầm dưới đây đi ngược lại cấu trúc vận hành của hệ thống và làm giảm giá trị Knowledge OS nhanh nhất [cite:10][cite:11][cite:17].

- Tạo quá nhiều topic mà không học cái nào đến nơi đến chốn.
- Ghi note dài nhưng không gắn topic, type hoặc tag.
- Tạo flashcards trước khi hiểu kiến thức.
- Bỏ qua wrap-up sau mỗi phiên học [cite:11].
- Dùng AI khi chưa có câu hỏi nghiên cứu rõ và chưa có nguồn.
- Không backup trước khi thay đổi dữ liệu quan trọng [cite:4][cite:17].

## 22. Quy trình tối ưu nhất cho học tập và nghiên cứu

Sau khi đối chiếu tài liệu tổng quan, feature spec, Gherkin, component UI, modal forms, research area và backup flows, quy trình tối ưu nhất là: dashboard chọn việc, topic detail làm việc sâu, session bar đo thời gian, note chuyển hóa hiểu biết, flashcards chuyển hóa ghi nhớ, AI research mở rộng phân tích, dashboard và timeline dùng để điều chỉnh chiến lược [cite:3][cite:10][cite:11][cite:14][cite:15][cite:17]. Đây là chu trình phù hợp nhất với thiết kế hệ thống vì mỗi bước đều tạo dữ liệu có cấu trúc cho bước tiếp theo, tạo thành vòng học tập khép kín và có thể cải tiến theo thời gian [cite:11][cite:15][cite:17].
