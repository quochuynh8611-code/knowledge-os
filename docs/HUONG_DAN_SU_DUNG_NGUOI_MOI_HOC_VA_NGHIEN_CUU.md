# Hướng dẫn sử dụng Knowledge OS cho người mới học và nghiên cứu

Tài liệu này dành cho người mới bắt đầu dùng Knowledge OS để học tập, đọc tài liệu, ghi chú, tạo flashcards và làm nghiên cứu cá nhân. Nội dung được tổng hợp từ README, đặc tả tính năng, Gherkin workflow và cấu trúc mã nguồn hiện có để phản ánh cách sử dụng tối ưu nhất theo đúng tinh thần “learning-first” của phần mềm [cite:3][cite:7][cite:10][cite:11].

## 1. Knowledge OS là gì

Knowledge OS là một hệ thống local-first phục vụ học tập và quản lý tri thức đa lĩnh vực, kết hợp cây chủ đề, ghi chú Markdown, liên kết tri thức, flashcards theo spaced repetition, thư viện EPUB, AI Research Studio và dashboard theo dõi tiến độ [cite:3][cite:7]. Dữ liệu được tổ chức theo hướng bền vững với backend Express, Prisma/PostgreSQL, local storage hỗ trợ và các lớp đồng bộ để người dùng có thể vừa học vừa giữ lịch sử nghiên cứu có cấu trúc [cite:4][cite:5][cite:7].

## 2. Phần mềm phù hợp với ai

Phần mềm đặc biệt hợp với người tự học, người làm nghiên cứu cá nhân, người đọc nhiều tài liệu số, và người muốn biến việc học thành một vòng lặp có đo lường thay vì chỉ lưu note rời rạc [cite:7][cite:10]. Đặc tả cũng nêu rõ định hướng thân thiện với người dùng phi kỹ thuật, có command palette, breadcrumbs, empty state, dark mode, bộ lọc đa chiều và hướng điều hướng rõ ràng để giảm ma sát khi sử dụng hằng ngày [cite:10].

## 3. Tư duy sử dụng đúng ngay từ đầu

Cách dùng tốt nhất không phải là mở phần mềm rồi ghi chú mọi thứ lẫn lộn, mà là đi theo chu trình: chọn chủ đề, đọc nguồn, ghi chú có cấu trúc, tạo thẻ ghi nhớ, ôn tập, rồi dùng dashboard và nghiên cứu AI để mở rộng tiếp [cite:3][cite:7][cite:11]. Nếu dùng đúng chu trình này, Knowledge OS trở thành một hệ thống học tập hoàn chỉnh; nếu chỉ dùng như kho lưu văn bản, bạn sẽ mất phần giá trị lớn nhất của nó [cite:3][cite:5][cite:11].

## 4. Chuẩn bị trước khi dùng

Trước khi bắt đầu học thật, cần bảo đảm dự án đã cài dependencies, đẩy schema database, có Prisma client sẵn sàng và chạy được môi trường phát triển tại cổng local mặc định [cite:3][cite:4][cite:5][cite:7]. Các script cốt lõi gồm `dev`, `test`, `typecheck`, `db:push`, `db:generate`, `db:seed`, `build`, `start` và nhóm lệnh snapshot phục vụ sao lưu hoặc bảo trì dữ liệu [cite:4][cite:5].

Trình tự khởi động khuyến nghị:

1. Chạy `npm install` để cài thư viện [cite:3][cite:7].
2. Chạy `npm run db:generate` để sinh Prisma client nếu cần [cite:5].
3. Chạy `npm run db:push` để đồng bộ schema [cite:4][cite:5].
4. Nếu cần dữ liệu mẫu, chạy `npm run db:seed` [cite:5].
5. Chạy `npm run dev` và mở `http://localhost:3000` [cite:3][cite:7].
6. Trước khi dùng lâu dài, nên chạy `npm test` và `npm run typecheck` để chắc rằng môi trường đang ổn định [cite:3][cite:4].

## 5. Bức tranh tổng thể các khu vực chính

Theo README và feature spec, phần mềm xoay quanh sáu năng lực lớn: cây chủ đề, ghi chú liên kết, flashcards SRS, thư viện EPUB, AI Research Studio và dashboard tiến độ [cite:3][cite:7][cite:10]. Từ cấu trúc mã nguồn còn có thể thấy thêm các lớp hỗ trợ như command palette, sync queue, analytics, saved view, citation workflow, Obsidian bridge và vault profile, nghĩa là hệ thống không chỉ để ghi chép mà còn để vận hành một quy trình nghiên cứu hoàn chỉnh [cite:4][cite:5][cite:9].

## 6. Trình tự sử dụng tối ưu cho người mới

Đây là trình tự nên dùng trong 1 đến 2 tuần đầu để không bị ngợp và vẫn tận dụng đúng giá trị hệ thống [cite:3][cite:11].

### Bước 1: Tạo khung lĩnh vực học tập

Hãy bắt đầu bằng việc tạo hoặc chuẩn hóa root categories và topic tree, vì đây là khung xương của toàn bộ hệ thống học tập [cite:3][cite:7]. Feature spec cho thấy category và topic có quan hệ phân cấp, có slug, type, parent-child, trạng thái học, tiến độ và metadata đi kèm; vì vậy bạn nên thiết kế cấu trúc từ trên xuống thay vì tạo topic rời rạc [cite:10].

Cách làm tối ưu:

- Tạo ít domain lớn nhưng rõ nghĩa, ví dụ: Lập trình, Nghiên cứu AI, Đông y, Kế toán.
- Trong mỗi domain, tạo category trước rồi mới tạo topic con.
- Mỗi topic chỉ đại diện cho một chủ đề đủ nhỏ để có thể học trong nhiều phiên ngắn.
- Không tạo topic quá to như “TypeScript” hay “Đông y”; hãy tách thành các chủ đề hẹp hơn.

### Bước 2: Chọn một topic làm điểm khởi đầu

Kịch bản phase 17 cho thấy trang Dashboard hoặc Chi tiết Chủ đề được thiết kế để dẫn người dùng tới “hành động kế tiếp” và bắt đầu phiên học tập trung từ đó [cite:11]. Vì thế, thay vì mở ngẫu nhiên nhiều nơi, bạn nên luôn bắt đầu phiên làm việc bằng topic đang dang dở hoặc topic được hệ thống gợi ý [cite:3][cite:11].

Cách làm tối ưu:

- Ưu tiên topic đang `in_progress` trước topic mới.
- Mỗi phiên chỉ chọn một topic trọng tâm.
- Đặt mục tiêu nhỏ cho phiên học, ví dụ “đọc 1 chương”, “viết 1 note”, hoặc “tạo 10 flashcards”.

### Bước 3: Bắt đầu phiên học tập trung

Gherkin của phase 17 mô tả rất rõ cơ chế “Bắt đầu học”, thanh `ActiveLearningSessionBar`, đồng hồ đếm, khả năng tạm dừng/tiếp tục và wrap-up khi kết thúc phiên [cite:11]. Điều này cho thấy Knowledge OS không chỉ quản lý nội dung mà còn muốn bạn học theo phiên có đo thời gian và có bước đúc kết sau cùng [cite:11].

Cách làm tối ưu:

- Khi vào topic, bấm “Bắt đầu phiên học” thay vì học không ghi nhận thời gian.
- Nếu bị gián đoạn, dùng “Tạm dừng” thay vì đóng phiên.
- Cuối phiên, luôn ghi takeaway hoặc ý đúc kết ngắn; hệ thống có thể biến phần này thành note loại `insight` và cập nhật tiến độ học [cite:11].

### Bước 4: Đọc tài liệu nguồn trước, không ghi chú vội

README cho biết phần mềm có thư viện EPUB local-first, hỗ trợ đọc file từ `docs/books` hoặc từ Obsidian Vault, có lưu vị trí đọc và sanitize nội dung khi mở [cite:3][cite:7]. Gherkin của EPUB library nhấn mạnh giao diện “Thư Viện Sách”, nguồn sách rõ ràng, nút làm mới, hỗ trợ chọn EPUB hợp lệ và mở vào reader hiện tại với khả năng lưu vị trí đọc [cite:11].

Cách làm tối ưu:

- Nếu bạn có thư viện cá nhân ổn định, dùng Obsidian Vault làm nguồn chính.
- Nếu muốn môi trường đọc tách biệt, đặt sách vào `docs/books` rồi làm mới danh sách [cite:3].
- Trong lần đọc đầu, chỉ đánh dấu và hiểu cấu trúc tài liệu; chưa cần ghi quá nhiều note.
- Chia sách hoặc tài liệu thành các đơn vị học ngắn, vì hệ thống có lưu vị trí đọc tự động [cite:3][cite:11].

### Bước 5: Viết note theo cấu trúc nghiên cứu

Knowledge OS hỗ trợ ghi chú Markdown, knowledge linking, tagging, full-text filtering và mở tài liệu liên quan từ Obsidian [cite:3][cite:7]. Feature spec còn định nghĩa entity `Note` với loại như `study`, `insight`, `question`, `summary`, cho thấy note nên được phân vai trò thay vì trộn lẫn tất cả vào một trang [cite:10].

Cách làm tối ưu:

- Tách note theo chức năng: note học bài, note câu hỏi, note đúc kết, note tóm tắt.
- Mỗi note nên trả lời một mục tiêu rõ: “đang học gì”, “hiểu gì”, “còn vướng gì”, “liên hệ với topic nào”.
- Dùng Markdown heading và liên kết nội bộ để nối note với topic, nguồn và khái niệm liên quan [cite:3][cite:4].
- Sau mỗi phiên học, ít nhất phải để lại một note hoặc một takeaway có thể tìm lại được.

### Bước 6: Tạo flashcards ngay sau khi hiểu

README mô tả hệ thống flashcard có thể tạo thẻ thường và cloze từ note, dùng thuật toán SM-2, hỗ trợ phím tắt review và đo retention [cite:3][cite:7]. Feature spec cũng mô tả chi tiết `StudyProgress` gồm interval, easeFactor, repetitions, nextReview, lastStudied và timeSpent, xác nhận rằng logic ôn tập là xương sống của vòng học dài hạn [cite:10].

Cách làm tối ưu:

- Chỉ tạo flashcards cho ý cần nhớ lâu dài hoặc dễ quên.
- Mỗi thẻ chỉ nên có một ý, một câu hỏi, một đáp án.
- Dùng cloze khi kiến thức nằm trong một câu hoặc định nghĩa chuẩn.
- Tạo thẻ ngay sau khi viết note, vì đây là lúc hiểu biết còn mới nhất [cite:3].

### Bước 7: Ôn tập hằng ngày bằng phiên ngắn

Studio review được mô tả là có phím `Space` và `1..4`, theo dõi tiến độ và retention metrics [cite:3]. Vì cơ chế của hệ thống dựa trên spaced repetition, lợi ích lớn nhất đến từ việc ôn đều, ngắn và đúng lịch thay vì nhồi dồn theo cảm hứng [cite:3][cite:10].

Cách làm tối ưu:

- Mỗi ngày mở due review queue trước khi học nội dung mới.
- Giữ phiên review ngắn nhưng đều, ví dụ 10 đến 20 phút.
- Không tạo quá nhiều thẻ trong một ngày nếu chưa có khả năng review đều.
- Khi thấy retention giảm, giảm tốc độ thêm thẻ mới và tăng chất lượng note nguồn.

### Bước 8: Dùng AI Research Studio sau khi đã có nền ghi chú

README mô tả AI Research Studio có khả năng đóng gói nguồn, tạo prompt cho NotebookLM và AI assistants, đồng thời cho phép review artifact trước khi nhập vào tri thức chính [cite:3][cite:7]. Gherkin về AI Research Copilot nhấn mạnh bounded context với nguồn Obsidian cá nhân, mục tiêu tổng hợp có trích dẫn và tránh rò rỉ dữ liệu ngoài ý muốn [cite:11].

Cách làm tối ưu:

- Chỉ dùng AI Research sau khi đã có topic rõ và một lượng note nền tảng.
- Gom nguồn theo một câu hỏi nghiên cứu cụ thể, không trộn nhiều vấn đề trong một gói.
- Review kỹ artifact trước khi chấp nhận, không đưa thẳng nội dung AI vào note chính [cite:3][cite:11].
- Dùng AI để mở rộng, phản biện, tổng hợp và tạo hướng đọc tiếp; không dùng nó thay cho đọc nguồn gốc.

### Bước 9: Dùng NotebookLM hoặc workspace nghiên cứu theo từng đợt

README và các tài liệu về NotebookLM cho thấy hệ thống có workflow tạo study package, sinh prompt và tổ chức không gian nghiên cứu theo hướng progressive disclosure [cite:3][cite:9][cite:11]. Điều này phù hợp nhất khi bạn đã tích lũy đủ nguồn và cần chuyển từ học một topic sang tổng hợp nhiều nguồn cho một câu hỏi lớn [cite:11].

Cách làm tối ưu:

- Chỉ tạo package khi topic đã có note, nguồn và vài câu hỏi nghiên cứu rõ ràng.
- Mỗi package nên phục vụ một đầu ra cụ thể: note tổng hợp, danh sách phản biện, hay bộ flashcards nâng cao.
- Luôn giữ liên kết giữa package, artifact và topic gốc để tránh đứt mạch truy xuất.

### Bước 10: Theo dõi dashboard để điều chỉnh chiến lược học

Dashboard được mô tả là hiển thị topic completion, retention, study time, streak và tìm kiếm BM25 trong bộ nhớ với chuẩn hóa dấu tiếng Việt [cite:3][cite:7]. Gherkin và cấu trúc module analytics cho thấy dashboard không chỉ để xem số đẹp mà để điều chỉnh cadence học tập, ưu tiên và sức bền dài hạn [cite:4][cite:9][cite:11].

Cách làm tối ưu:

- Cuối mỗi ngày hoặc mỗi tuần, xem lại topic nào học nhiều nhưng chưa có note chất lượng.
- Nếu review tăng nhưng hiểu không tăng, quay lại tài liệu nguồn và cải thiện note.
- Nếu topic nhiều note nhưng ít flashcards, chọn lọc ý cốt lõi để chuyển sang SRS.
- Dùng dashboard như gương phản chiếu chiến lược học, không chỉ như bảng báo cáo.

## 7. Quy trình chuẩn cho một buổi học/nghiên cứu hoàn chỉnh

Đây là workflow khuyến nghị nhất cho người mới, vì nó tận dụng trọn vẹn các phần của hệ thống mà không gây quá tải [cite:3][cite:11].

1. Mở Dashboard và chọn topic có hành động kế tiếp rõ ràng [cite:3][cite:11].
2. Bấm bắt đầu phiên học để bật thanh theo dõi thời gian [cite:11].
3. Mở tài liệu nguồn trong EPUB library hoặc qua Obsidian bridge [cite:3][cite:11].
4. Đọc có mục tiêu, đánh dấu ý quan trọng.
5. Viết note Markdown theo loại phù hợp: `study`, `question`, `summary`, hoặc `insight` [cite:10].
6. Tạo flashcards cho các ý cần nhớ lâu [cite:3].
7. Kết thúc phiên, ghi takeaway và cập nhật tiến độ [cite:11].
8. Nếu chủ đề đủ chín, đóng gói nguồn cho AI Research/NotebookLM để phân tích sâu hơn [cite:3][cite:11].
9. Cuối ngày, xem retention và dashboard để chọn chủ đề kế tiếp [cite:3].

## 8. Cách dùng tối ưu theo mục tiêu

| Mục tiêu | Cách dùng tốt nhất |
|---------|--------------------|
| Học kiến thức mới | Topic -> đọc EPUB/tài liệu -> note `study` -> flashcards -> review [cite:3][cite:11] |
| Ghi nhớ dài hạn | Note ngắn, thẻ ít nhưng chất lượng, review đều theo lịch SRS [cite:3][cite:10] |
| Nghiên cứu sâu | Gom nguồn -> note câu hỏi -> AI Research Studio -> review artifact -> note tổng hợp [cite:3][cite:11] |
| Viết tổng hợp | Dùng liên kết tri thức, note `summary`, package nguồn và citation workflow [cite:3][cite:9] |
| Đọc sách dài hạn | Chia nhỏ phiên đọc, dùng reading state persistence, ghi takeaway sau từng phiên [cite:3][cite:11] |

## 9. Sai lầm người mới hay gặp

Các tài liệu và đặc tả hiện có ngầm chỉ ra nhiều bẫy phổ biến khi dùng sai nhịp hệ thống [cite:3][cite:10][cite:11].

- Tạo quá nhiều topic ngay từ đầu làm cây chủ đề rối.
- Ghi note dài nhưng không có tag, link hay phân loại note.
- Tạo hàng loạt flashcards trước khi thật sự hiểu bài.
- Dùng AI quá sớm, trước khi có nguồn và câu hỏi nghiên cứu rõ ràng.
- Không kết thúc phiên học bằng takeaway nên mất cơ hội chuyển hiểu biết thành tri thức có thể tìm lại.
- Không xem dashboard nên học nhiều nhưng không cải thiện chiến lược.

## 10. Lệnh vận hành nên nhớ

| Mục đích | Lệnh |
|---------|------|
| Chạy môi trường dev | `npm run dev` [cite:3][cite:5] |
| Kiểm tra test | `npm test` [cite:4][cite:5] |
| Kiểm tra type | `npm run typecheck` [cite:4][cite:5] |
| Đồng bộ schema DB | `npm run db:push` [cite:4][cite:5] |
| Sinh Prisma client | `npm run db:generate` [cite:5] |
| Nạp dữ liệu mẫu | `npm run db:seed` [cite:5] |
| Build production | `npm run build` [cite:4] |
| Chạy build production | `npm start` [cite:4] |
| Tạo snapshot | `npm run snapshot:create` [cite:4] |
| Xác minh snapshot | `npm run snapshot:verify` [cite:4] |

## 11. Khuyến nghị vận hành an toàn khi học thật

Vì repository có backend thật, Prisma schema, script backup và script bảo trì, đây là ứng dụng có dữ liệu vận hành chứ không chỉ là giao diện demo [cite:2][cite:4][cite:7]. Người mới nên tạo snapshot trước các thay đổi lớn, tránh sửa dữ liệu tay trong database, và nên tách dữ liệu thử nghiệm khỏi dữ liệu học thật nếu vẫn đang tinh chỉnh cấu hình hay schema [cite:4][cite:9].

## 12. Kết luận về cách dùng tối ưu nhất

Cách dùng tối ưu nhất cho người mới là xem Knowledge OS như một vòng lặp học tập có cấu trúc: chọn topic, học theo phiên, đọc nguồn, viết note, tạo flashcards, ôn tập, rồi mới dùng AI để mở rộng và dashboard để điều chỉnh chiến lược [cite:3][cite:10][cite:11]. Khi đi đúng trình tự này, phần mềm trở thành một hệ điều hành học tập và nghiên cứu cá nhân; còn nếu bỏ qua thứ tự đó, bạn sẽ chỉ dùng được một phần nhỏ giá trị của hệ thống [cite:3][cite:11].


## 13. Cách nhận biết giao diện chính khi mới mở app

Từ `DashboardHome.tsx` có thể thấy màn hình chính được tổ chức thành nhiều khối rõ ràng: khu gợi ý học hôm nay, cadence học theo tuần, widget phân tích flashcards, trung tâm lĩnh vực học tập và các mục gần đây như note hay resource [cite:15]. Điều này có nghĩa là khi mới mở app, người dùng không nên cố khám phá mọi tab cùng lúc; cách hiệu quả hơn là đọc giao diện theo thứ tự từ trên xuống để nắm “việc nên làm ngay bây giờ” trước, rồi mới xem các phần còn lại [cite:15].

Trình tự quan sát dashboard nên là:

1. Xem khối gợi ý học hôm nay để biết việc ưu tiên [cite:15].
2. Xem cadence tuần để hiểu nhịp học hiện tại [cite:15].
3. Xem analytics flashcard để biết trí nhớ đang ổn hay giảm [cite:15].
4. Xem “Lĩnh vực học tập” để xác định domain và topic nên tập trung [cite:15].
5. Chỉ sau đó mới xem recent notes hoặc recent resources để quay lại các việc còn dang dở [cite:15].

## 14. Dashboard nên được dùng như thế nào

`DashboardHome.tsx` cho thấy dashboard không chỉ là trang chào mừng mà là trung tâm điều phối học tập: nó có thể mở review modal, mở timer/modal học tập, tạo domain mới và điều hướng sang topic detail hoặc tab topics [cite:15]. Điều này rất quan trọng với người mới, vì nếu hiểu dashboard là “bảng điều khiển hành động” thay vì “nơi xem số liệu”, bạn sẽ dùng phần mềm đúng mục đích hơn [cite:15].

Cách dùng tối ưu:

- Chỉ tạo domain mới ngay từ dashboard khi thực sự cần mở một mảng học mới [cite:15].
- Khi thấy một topic phù hợp, chuyển thẳng vào topic đó thay vì lang thang qua nhiều menu [cite:15].
- Dùng dashboard ở đầu ngày để chọn việc; dùng lại ở cuối ngày để xem vòng học có khép kín hay chưa.

## 15. Chi tiết trang chủ đề nên khai thác ra sao

Danh sách component trong `src/components/topics` cho thấy trang chủ đề không chỉ có nội dung tĩnh mà còn có `NextActionStrip`, `StudyCTA`, `ResearchToolsDropdown`, `TopicTree` và `TopicDetail`, nghĩa là đây là nơi kết hợp học, nghiên cứu và điều hướng hành động kế tiếp trong cùng một màn hình [cite:14]. Gherkin phase 17 cũng xác nhận rằng trong Chi tiết Chủ đề, toolbar được tinh giản để làm nổi bật nút “Bắt đầu phiên học”, trong khi các công cụ nâng cao như Obsidian, NotebookLM và handoff bundle được gom trong menu công cụ nghiên cứu [cite:11].

Cách dùng tối ưu:

- Khi mở topic, hãy đọc `Next Action` trước để biết việc tiếp theo nên làm [cite:11][cite:14].
- Chỉ bấm công cụ nghiên cứu sau khi đã xem note, tài liệu và tiến độ của topic.
- Dùng topic detail như “bàn làm việc chính” cho một chủ đề, không phải chỉ là trang mô tả.

## 16. Phiên học tập trung và wrap-up

Các file `ActiveLearningSessionBar.tsx` và `SessionWrapupModal.tsx` cùng Gherkin phase 17 cho thấy Knowledge OS có một mô hình học theo phiên rất rõ: bắt đầu học, theo dõi thời gian, tạm dừng/tiếp tục, rồi wrap-up bằng takeaway và cập nhật tiến độ [cite:11][cite:14]. Đây là một trong những khác biệt lớn nhất giữa phần mềm này và các ứng dụng ghi chú thông thường, vì tri thức được gắn với thời lượng học và kết quả phiên học chứ không chỉ với văn bản [cite:11].

Cách dùng tối ưu:

- Luôn đóng phiên học bằng wrap-up, kể cả khi takeaway chỉ dài một hoặc hai câu [cite:11].
- Nếu phiên học chỉ là đọc tài liệu, vẫn nên cập nhật takeaway để biến đọc hiểu thành tri thức có thể tìm lại.
- Không nên để nhiều phiên nhỏ bị bỏ dở liên tục, vì điều đó làm suy yếu dữ liệu time-spent và cadence.

## 17. Quản lý note hiệu quả hơn cho người mới

Từ `NotesManager.tsx`, `NoteCardListSection.tsx`, `TextSelectionPopover.tsx` và các modal như `NoteFormModal`, `NoteReaderModal` có thể suy ra hệ thống ghi chú được thiết kế cho cả viết tay chủ động lẫn trích xuất từ quá trình đọc/chọn văn bản [cite:14]. Kết hợp với feature spec định nghĩa loại note và README mô tả knowledge linking, cách dùng tối ưu là tạo note ngắn, có vai trò rõ ràng và tận dụng thao tác chọn văn bản để giảm ma sát khi chuyển từ đọc sang ghi chú [cite:3][cite:10][cite:14].

Cách dùng tối ưu:

- Sau khi đọc xong một đoạn có ý nghĩa, tạo note ngay thay vì để nhớ trong đầu.
- Dùng note `question` để giữ các điểm chưa hiểu thay vì bỏ qua chúng.
- Dùng note `summary` để tổng hợp cuối buổi; dùng note `insight` cho đúc kết cá nhân.
- Nếu có popover khi chọn văn bản, nên tận dụng nó để biến điểm đọc quan trọng thành note hoặc flashcard càng sớm càng tốt [cite:14].

## 18. Flashcards không chỉ là review, mà là cả một khu làm việc

Ngoài `FlashcardReviewStudio`, thư mục flashcard còn có `StudyLauncher`, `CardBrowser`, `FlashcardAnalyticsDashboard`, `DuplicateDetectionDashboard`, `RetentionCurveChart`, `ExamCountdownToolbar` và `SrsVariantComparisonModal`, cho thấy đây là một hệ sinh thái hoàn chỉnh cho học ghi nhớ chứ không chỉ là một cửa sổ lật thẻ đơn giản [cite:13][cite:14]. `FlashcardReviewStudio.tsx` còn cho thấy có session type, cram mode, import/export, lịch sử review, retention curve, A/B testing và smart queue, nghĩa là người dùng có thể đi từ ôn tập cơ bản tới tối ưu hóa chiến lược SRS nâng cao trong cùng hệ thống [cite:13].

Cách dùng tối ưu theo giai đoạn:

- Giai đoạn đầu: chỉ dùng `StudyLauncher` và `FlashcardReviewStudio` để tạo thói quen [cite:14].
- Giai đoạn giữa: mở analytics, retention curve và history để nhìn lại chất lượng ghi nhớ [cite:13][cite:14].
- Giai đoạn nâng cao: dùng smart queue, exam countdown hoặc A/B tuning khi đã có dữ liệu review đủ dày [cite:13].

## 19. Công cụ tìm kiếm và điều hướng nhanh

Sự hiện diện của `CommandPalette.tsx`, `ShortcutsModal.tsx`, `Navbar.tsx`, `Sidebar.tsx`, `Breadcrumbs.tsx` cùng feature spec về `Ctrl/Cmd + K` và bảng phím tắt cho thấy khả năng điều hướng nhanh là một phần quan trọng của trải nghiệm người dùng, nhất là khi kho tri thức lớn dần [cite:10][cite:14][cite:15]. Điều này có nghĩa là người mới nên học phím tắt và command palette sớm, thay vì chỉ dựa vào click chuột, vì đây là cách giảm ma sát rõ rệt khi học lâu dài [cite:10][cite:14].

Cách dùng tối ưu:

- Học ít nhất hai thao tác sớm: mở command palette và mở bảng phím tắt [cite:10].
- Dùng breadcrumbs để hiểu mình đang đứng ở đâu trong cây tri thức [cite:14].
- Khi bắt đầu có nhiều domain và topic, dùng command palette để tìm nhanh thay vì duyệt thủ công qua sidebar [cite:14].

## 20. Khu nghiên cứu và báo cáo

Thư mục `src/components/research` cho thấy ngoài AI search còn có `ResearchTimeline`, `TopicDashboard`, `TopicRecommendations`, `StudyPatternsHeatmap`, `RetentionPredictionChart`, `ExportReportModal` và `NotificationSettingsModal`, chứng tỏ khu nghiên cứu được mở rộng thành không gian phân tích và tổng hợp chứ không chỉ là nơi gọi AI [cite:14]. Kết hợp với các test cho AI research UI và contracts, điều này củng cố rằng luồng nghiên cứu có boundary, persistence và review, phù hợp cho nghiên cứu nghiêm túc hơn là hỏi đáp ngắn hạn [cite:14].

Cách dùng tối ưu:

- Chỉ dùng nghiên cứu AI khi đã có câu hỏi và nguồn đầu vào rõ ràng.
- Dùng timeline và dashboard nghiên cứu để xem quá trình phát triển của chủ đề, không chỉ kết quả cuối.
- Khi có report/export, nên coi đó là sản phẩm trung gian để review tiếp, không phải chân lý cuối cùng.

## 21. Điều hướng theo cấp độ trưởng thành của người dùng

Từ mức độ phong phú của component, test và Gherkin, có thể chia việc dùng Knowledge OS thành ba cấp: làm quen, vận hành ổn định và tối ưu chuyên sâu [cite:11][cite:14][cite:15]. Chia như vậy sẽ giúp người mới không bị ngợp khi thấy quá nhiều công cụ nâng cao ngay từ đầu [cite:14].

| Giai đoạn | Nên dùng | Tạm thời chưa cần dùng nhiều |
|----------|----------|------------------------------|
| Tuần 1 | Dashboard, Topic Detail, Notes, Start Session, Review cơ bản [cite:11][cite:14][cite:15] | Export, advanced citation, smart queue tuning, report nâng cao [cite:13][cite:14] |
| Tuần 2-4 | EPUB workflow, command palette, flashcard analytics, research tools cơ bản [cite:11][cite:14] | A/B SRS, exam countdown, workflow xuất báo cáo phức tạp [cite:13][cite:14] |
| Sau đó | AI Research Studio, timeline, retention prediction, saved views, workflow nghiên cứu sâu [cite:9][cite:14] | Chỉ bỏ qua những gì không phục vụ mục tiêu học hiện tại |

## 22. Quy trình tối ưu nhất cho nghiên cứu và học hỏi dài hạn

Sau khi đối chiếu README, feature spec, Gherkin, dashboard, topic, notes, flashcards và research components, quy trình tối ưu nhất cho người mới nhưng muốn đi đường dài là: bắt đầu từ dashboard, chọn next action, học theo phiên, đọc tài liệu, ghi chú có cấu trúc, tạo flashcards, review ngắn hằng ngày, rồi mới gom nguồn và mở rộng sang nghiên cứu AI [cite:3][cite:10][cite:11][cite:14][cite:15]. Trình tự này phù hợp với cách hệ thống được thiết kế, vì mỗi bước đều tạo dữ liệu đầu vào cho bước tiếp theo thay vì hoạt động rời rạc [cite:10][cite:11][cite:15].

Một chu trình tuần khuyến nghị:

- Hằng ngày: Dashboard -> next action -> phiên học -> note -> flashcards -> review -> wrap-up [cite:11][cite:15].
- Cuối tuần: xem cadence, retention, topic dashboard và điều chỉnh chiến lược học [cite:14][cite:15].
- Theo đợt nghiên cứu: gom nguồn, AI research, review artifact, xuất báo cáo/tổng hợp, rồi đưa kết quả tốt nhất trở lại topic và note [cite:11][cite:14].
