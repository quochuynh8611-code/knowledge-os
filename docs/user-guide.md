# Cẩm Nang Hướng Dẫn Sử Dụng

Knowledge OS là hệ thống quản lý, cấu trúc hóa và hỗ trợ khảo cứu chuyên sâu dành cho hai kho tàng tư tưởng: **Phật Học Học Thuật** (Tam Tạng Pali, Vi Diệu Pháp Abhidhamma, Duy Thức, Thiền Định) và **Huyền Học Phương Đông** (Chu Dịch, Kỳ Môn Độn Giáp, Phong Thủy, Bát Tự). Hệ thống đóng vai trò như một "bộ não thứ hai" (Second Brain), tích hợp thuật toán ôn tập lặp lại ngắt quãng SuperMemo-2 (SM-2) và cầu nối tương thích với Obsidian và Google NotebookLM.

---

## Bắt đầu nhanh

### Mục đích của Knowledge OS
Knowledge OS giúp người học và nhà nghiên cứu:
- Hệ thống hóa các khái niệm học thuật thành mạng lưới tri thức liên kết đa chiều thay vì các ghi chép rời rạc.
- Theo dõi tiến trình học tập và duy trì trí nhớ dài hạn nhờ thuật toán lặp lại ngắt quãng SM-2.
- Chuẩn hóa tài liệu để xuất bản sang hệ thống ghi chú cá nhân (Obsidian Vault) hoặc đóng gói dữ liệu nguồn nạp vào Google NotebookLM để tạo Audio Overview và Study Guides.

### Người mới nên mở màn hình nào trước?
Khi khởi động ứng dụng lần đầu, bạn nên thực hiện theo thứ tự sau:
1. Mở màn hình **Tổng quan** để quan sát bức tranh chung về các chủ đề và danh mục hiện có.
2. Mở màn hình **Chủ đề** để chọn một chủ đề cơ bản bạn quan tâm (ví dụ: *Tam Tạng Kinh Điển Pali* trong Phật học hoặc *Kinh Dịch - Đạo Biến Dịch* trong Huyền học).
3. Đọc nội dung trong màn hình **Chi tiết Chủ đề** và thử tạo một ghi chú hoặc liên kết tài nguyên đầu tiên.

### Lộ trình 10 phút làm quen ứng dụng
1. **Phút 1–2:** Xem bảng số liệu tại màn hình **Tổng quan** (số lượng chủ đề, phân bổ danh mục, hàng chờ ôn tập).
2. **Phút 3–4:** Chọn thẻ **Chủ đề** trên thanh điều hướng, mở danh mục *Tam Tạng Kinh Điển* hoặc *Dịch Học Ứng Dụng*.
3. **Phút 5–7:** Bấm vào một chủ đề để mở **Chi tiết Chủ đề**. Đọc phần tóm tắt định vị, nội dung luận thuyết và quan sát các liên kết tri thức chéo.
4. **Phút 8–9:** Bấm nút **Thêm Ghi chú** để viết một đoạn đúc kết ngắn hoặc câu hỏi nghiên cứu của riêng bạn.
5. **Phút 10:** Bấm **Chấm điểm ôn tập** (đánh giá từ 0 đến 5) để trải nghiệm cách thuật toán SM-2 tự động lên lịch nhắc ôn tập cho chủ đề đó.

### Các khái niệm cơ bản trong hệ thống
- `Topic` (Chủ đề): Đơn vị tri thức trung tâm của hệ thống (mặc định gồm 35 chủ đề chuẩn hóa). Mỗi chủ đề chứa định vị khái niệm, luận thuyết chuyên sâu, các mối liên kết tri thức, danh sách ghi chú và tài nguyên đính kèm.
- `Category` (Danh mục): Phân nhóm cấp cao gồm 8 nhóm (5 danh mục Phật học và 3 danh mục Huyền học), giúp phân loại chủ đề theo hệ thống mạch lạc.
- `Note` (Ghi chú): Bản ghi chép của người học gắn liền với một chủ đề cụ thể, được phân loại theo 4 dạng: `insight` (trực cảm/giác ngộ), `study` (học tập), `question` (nghi vấn), `summary` (tóm lược). Ghi chú hỗ trợ cú pháp `[[Tên Chủ Đề]]` để tạo liên kết wiki hai chiều.
- `Resource` (Tài nguyên): Nguồn tài liệu tham khảo bổ trợ cho chủ đề, hỗ trợ hai hình thức: liên kết Web (`url`) hoặc đường dẫn tệp cục bộ trên máy (`filePath`).
- `Study Progress` (Tiến độ học tập): Thông tin định lượng về việc học một chủ đề, gồm trạng thái (`not_started`, `in_progress`, `completed`, `reviewing`), số phút học, số lần ôn tập, hệ số dễ nhớ (`easeFactor`) và ngày đến hạn ôn tập tiếp theo (`nextReview`).

### Bắt đầu phiên học đầu tiên
1. Nhấp vào nút **Bắt đầu tính giờ** hoặc biểu tượng đồng hồ trên thanh điều hướng để mở bộ đếm thời gian tập trung.
2. Chọn chủ đề bạn chuẩn bị đọc.
3. Đọc kỹ nội dung khảo cứu trong màn hình **Chi tiết Chủ đề** và các tài liệu tham khảo đính kèm.
4. Ghi lại các phát hiện mới vào mục **Ghi chú**.
5. Kết thúc buổi học, dừng bộ đếm thời gian và thực hiện đánh giá độ nhớ để cập nhật trạng thái ôn tập.

---

## Giải thích từng màn hình

### 1. Tổng quan (Dashboard)
- **Mục đích:** Cung cấp trung tâm điều hành toàn diện về hiện trạng học tập, phân bổ thời gian, thống kê số lượng bản ghi và thông báo các chủ đề đến hạn ôn tập trong ngày.
- **Khi nào nên dùng:** Mở đầu mỗi phiên làm việc để định hình khối lượng công việc và xác định các chủ đề ưu tiên cần ôn tập.
- **Thao tác chính:** Quan sát biểu đồ tiến độ, bấm nút "Ôn ngay" nếu có chủ đề trong hàng chờ SM-2, hoặc bấm trực tiếp vào các chủ đề đang học dở dang để tiếp tục.
- **Kết quả mong đợi:** Nắm rõ tình trạng nghiên cứu tổng thể và biết chính xác hôm nay cần ôn hay học chủ đề nào.

### 2. Quản lý & Cây Chủ Đề (Topic Tree)
- **Mục đích:** Hiển thị toàn bộ 35 chủ đề canonical được tổ chức phân tầng theo 8 danh mục lớn thuộc hai lĩnh vực Phật học và Huyền học.
- **Khi nào nên dùng:** Khi bạn muốn duyệt cây tri thức theo cấu trúc logic, tìm kiếm chủ đề theo danh mục hoặc lọc theo thẻ (tags) và trạng thái học.
- **Thao tác chính:** Mở rộng/thu gọn danh mục, lọc theo trạng thái (`Chưa học`, `Đang học`, `Đã xong`), tìm kiếm theo tên hoặc bấm nút "Tạo Mới" để thêm chủ đề tự biên soạn.
- **Kết quả mong đợi:** Dễ dàng định vị và mở nhanh không gian nghiên cứu chi tiết của từng chủ đề.

### 3. Chi tiết Chủ đề (Topic Detail)
- **Mục đích:** Không gian làm việc chuyên sâu cho từng chủ đề đơn lẻ, tích hợp toàn bộ nội dung luận thuyết, liên kết tri thức, ghi chú, tài nguyên tham khảo và bảng điều khiển SM-2.
- **Khi nào nên dùng:** Khi bạn đang trực tiếp đọc, nghiên cứu, ghi chép hoặc chuẩn bị đóng gói xuất bản một chủ đề.
- **Thao tác chính:** 
  - Đọc nội dung luận thuyết tại tab "Nội Dung".
  - Thêm, sửa, xóa các ghi chú nghiên cứu tại tab "Ghi Chú".
  - Xem và thiết lập liên kết tri thức (Tương hỗ, Tiền đề, Nâng cao, Tương phản) tại tab "Liên Kết".
  - Quản lý danh mục tài liệu tham khảo tại tab "Tài Liệu".
  - Chấm điểm chất lượng ghi nhớ (0–5 điểm) tại tab "Ôn Tập SM-2".
  - Bấm các nút "Obsidian" hoặc "NotebookLM" trên thanh công cụ để mở các modal tích hợp tương ứng.
- **Kết quả mong đợi:** Toàn bộ dữ liệu xoay quanh chủ đề được hiển thị tập trung, giúp việc nghiên cứu diễn ra liền mạch.

### 4. Biểu Đồ Tri Thức (Knowledge Graph)
- **Mục đích:** Trực quan hóa toàn bộ mạng lưới tri thức dưới dạng đồ thị tương tác (Force-directed Graph), thể hiện các nút chủ đề, ghi chú, tài nguyên và các mối liên kết đa chiều.
- **Khi nào nên dùng:** Khi bạn muốn nhìn thấy mối tương quan liên ngành giữa các trường phái Phật học và thuật số Huyền học, phát hiện các chủ đề trung tâm (hub) hoặc các mắt xích tri thức quan trọng.
- **Thao tác chính:** Phóng to/thu nhỏ, kéo thả các nút mạng, lọc theo lĩnh vực (Phật học / Huyền học), lọc theo loại nút (Topic, Note, Resource) và nhấp vào một nút để xem thông tin vắn tắt cùng nút chuyển tiếp đến chi tiết.
- **Kết quả mong đợi:** Có cái nhìn trực quan về bức tranh toàn cảnh của hệ tri thức và mối quan hệ chéo giữa các khái niệm.

### 5. Tiến Độ & Ôn Tập (Study Progress & Review Queue)
- **Mục đích:** Quản lý vòng đời học tập, hiển thị biểu đồ phân bổ thời gian học theo tuần, thống kê tỷ lệ hoàn thành từng lĩnh vực và quản lý hàng chờ ôn tập lặp lại ngắt quãng SM-2.
- **Khi nào nên dùng:** Dùng để rà soát hiệu suất học tập định kỳ và thực hiện các phiên ôn tập tập trung cho các chủ đề đã đến hạn.
- **Thao tác chính:** Xem danh sách "Hàng chờ ôn tập hôm nay", bấm "Ôn tập ngay" để mở modal chấm điểm ghi nhớ cho từng chủ đề trong hàng đợi.
- **Kết quả mong đợi:** Duy trì lịch ôn tập đều đặn, không để kiến thức bị mai một theo đường cong quên lãng Ebbinghaus.

### 6. Ghi Chú & Wiki Link (Notes Manager)
- **Mục đích:** Quản lý tập trung toàn bộ các ghi chú cá nhân trong hệ thống, hỗ trợ tìm kiếm toàn văn và tự động nhận diện cú pháp liên kết hai chiều `[[Tên Chủ Đề]]`.
- **Khi nào nên dùng:** Khi muốn tìm lại các suy nghĩ, phát hiện, câu hỏi đã ghi chép trước đây hoặc tạo các ghi chú liên kết chéo giữa nhiều chủ đề.
- **Thao tác chính:** Tìm kiếm theo từ khóa nội dung, lọc theo loại ghi chú (`insight`, `study`, `question`, `summary`), lọc theo chủ đề, nhấp vào các liên kết `[[...]]` màu tím để nhảy thẳng tới chủ đề được trỏ tới.
- **Kết quả mong đợi:** Dễ dàng tra cứu và kết nối các mảnh ghép tư duy cá nhân vào hệ thống tri thức chung.

### 7. Tài Liệu & Thư Viện (Resources Manager)
- **Mục đích:** Quản lý kho tư liệu nghiên cứu gồm sách, kinh văn số hóa, tệp PDF, video bài giảng và bài viết học thuật.
- **Khi nào nên dùng:** Khi cần tra cứu thư mục tham khảo, mở tài liệu web hoặc truy cập vị trí tệp sách cục bộ trên máy tính.
- **Thao tác chính:** Lọc theo định dạng (`pdf`, `book`, `video`, `article`), tìm kiếm theo tên sách hoặc tác giả, bấm "Xem" để mở tài liệu web hoặc mở modal hướng dẫn vị trí tệp trên máy.
- **Kết quả mong đợi:** Quản lý danh mục tài liệu trật tự, bảo đảm không lưu trữ dữ liệu nhị phân nặng trong trình duyệt (Zero Binary Ingestion).

### 8. Tra Cứu Chuyên Sâu (Advanced Search & Command Palette)
- **Mục đích:** Công cụ tìm kiếm đa tiêu chí mạnh mẽ, cho phép quét đồng thời qua Chủ đề, Ghi chú và Tài nguyên.
- **Khi nào nên dùng:** Khi cần tìm kiếm một thuật ngữ, câu kinh hoặc khái niệm cụ thể nhưng không nhớ rõ nằm ở chủ đề hay ghi chú nào.
- **Thao tác chính:** 
  - Mở thanh tìm kiếm tại màn hình "Tra Cứu" hoặc nhấn phím tắt `Ctrl + K` (trên Windows/Linux) hoặc `Cmd + K` (trên macOS) để mở **Command Palette** từ bất kỳ vị trí nào trong app.
  - Kết hợp lọc theo Lĩnh vực, Danh mục, Thẻ và Trạng thái học.
- **Kết quả mong đợi:** Kết quả tìm kiếm trả về tức thì và phân loại rõ ràng theo từng nhóm đối tượng.

### 9. Khảo Cứu Antigravity AI Scholar (AI Studio)
- **Mục đích:** Trợ lý học giả AI hỗ trợ phân tích chuyên sâu liên ngành Phật học và Dịch học, giải nghĩa nguyên ngữ Pali/Sanskrit/Hán và chiết tự kinh văn.
- **Khi nào nên dùng:** Khi bạn gặp các đoạn luận thuyết khó hiểu, cần đối chiếu thuật ngữ qua nhiều ngôn ngữ cổ, hoặc muốn tìm mối liên hệ giữa lý thuyết tâm sở Abhidhamma và 64 Quẻ Dịch.
- **Thao tác chính:** Chọn chủ đề cần phân tích, chọn mẫu câu hỏi gợi ý hoặc tự nhập câu hỏi nghiên cứu, bấm "Gửi yêu cầu", sau đó bấm "Lưu thành ghi chú" để đính kết quả vào chủ đề.
- **Kết quả mong đợi:** Nhận được các luận giải học thuật có cấu trúc rõ ràng và dễ dàng lưu vết vào hệ thống ghi chú.

### 10. Google NotebookLM Research Hub (NotebookLM Studio)
- **Mục đích:** Đóng gói tài liệu nguồn sạch của chủ đề chuẩn 5 phần và quản lý kho kết quả (Artifacts) được trích xuất từ Google NotebookLM.
- **Khi nào nên dùng:** Khi bạn muốn chuẩn bị dữ liệu nguồn để tải lên NotebookLM tạo podcast thảo luận (Audio Overview) hoặc lưu trữ bản tóm lược giáo trình (Study Guide) sau khi làm việc trên NotebookLM.
- **Thao tác chính:** 
  - Chọn chủ đề cần đóng gói.
  - Bấm "Sao chép nguồn" hoặc "Tải File Nguồn (.md)" để lấy tài liệu Markdown chuẩn hóa 5 phần.
  - Bấm "Mở Google NotebookLM" để chuyển sang giao diện NotebookLM và nạp tài liệu vào Source.
  - Thêm các bản tóm tắt Audio Overview hoặc Study Guide vào "Kho Kết Quả" để lưu trữ cục bộ.
- **Kết quả mong đợi:** Dữ liệu nguồn được tổng hợp đầy đủ chỉ bằng 1 thao tác mà không cần copy thủ công từng phần, đồng thời lưu giữ an toàn các kết quả AI đã sinh ra.

### 11. Ma Trận Vi Diệu Pháp (Abhidharma Matrix)
- **Mục đích:** Bảng tra cứu hệ thống hóa toàn diện về 89/121 Tâm (Citta), 52 Tâm Sở (Cetasika), Thọ (Vedanā), Nhân (Hetu) và số lượng tâm sở tương ưng theo Luận Tạng Thắng Pháp.
- **Khi nào nên dùng:** Khi nghiên cứu chi tiết về cơ chế vận hành của tâm thức, phân tích tâm thiện/bất thiện và cấu trúc danh sắc trong thiền quán.
- **Thao tác chính:** Lọc theo nhóm tâm (Dục giới, Sắc giới, Vô sắc giới, Siêu thế), tìm kiếm theo tên tiếng Việt hoặc nguyên ngữ Pāli, nhấp vào từng tâm để xem bảng phân tích chi tiết.
- **Kết quả mong đợi:** Tra cứu nhanh chóng và chính xác các chi pháp phức tạp của Vi Diệu Pháp mà không phải lật tìm qua nhiều tài liệu giấy.

### 12. Dịch Học & Kỳ Môn (Divination Matrix)
- **Mục đích:** Bảng tra cứu cấu trúc 64 Quẻ Chu Dịch, Thượng quái, Hạ quái, Thoán từ, Ý nghĩa tượng quẻ và luận điểm đối chiếu triết học phương Đông với Phật học.
- **Khi nào nên dùng:** Khi nghiên cứu Dịch lý, tra cứu ý nghĩa biến dịch của các quẻ hoặc tìm hiểu sự tương đồng giữa quy luật Âm Dương Ngũ Hành với luật Vô Thường, Duyên Khởi.
- **Thao tác chính:** Tìm kiếm quẻ theo số thứ tự, tên tiếng Việt hoặc tên chữ Hán; lọc theo quái đơn; bấm xem chi tiết phần đối chiếu triết học.
- **Kết quả mong đợi:** Nắm bắt nhanh chóng cấu trúc nội tại của quẻ Dịch và góc nhìn học thuật đối chiếu liên ngành.

### 13. Từ Điển Đa Ngữ (Multilingual Lexicon)
- **Mục đích:** Tra cứu thuật ngữ chuyên ngành đối chiếu 4 ngữ hệ: Pāli (IAST), Sanskrit (Devanagari), Chữ Hán (Phồn thể/Giản thể + Pinyin) và Thuật ngữ Phật học/Dịch học tiếng Việt kèm trích dẫn xuất xứ kinh điển.
- **Khi nào nên dùng:** Khi đọc kinh điển nguyên bản cần tra cứu nghĩa gốc, xuất xứ đoạn kinh hoặc chiết tự thuật ngữ.
- **Thao tác chính:** Tìm kiếm theo bất kỳ ngôn ngữ nào (gõ tiếng Việt, Pāli, Sanskrit hoặc chữ Hán), sao chép thuật ngữ định dạng chuẩn, lọc theo lĩnh vực.
- **Kết quả mong đợi:** Hiểu chính xác nghĩa gốc của thuật ngữ, tránh các hiểu lầm do dịch thuật trung gian.

---

## Quy trình học hằng ngày

Để việc nghiên cứu đạt hiệu quả cao và duy trì bền vững, người dùng nên thực hiện theo các quy trình tiêu chuẩn dưới đây:

### Quy trình học 15–30 phút hằng ngày
1. **Bước 1 (2 phút):** Mở ứng dụng, kiểm tra thông báo tại mục **Tiến độ** hoặc góc trên thanh điều hướng để xem có chủ đề nào trong *Hàng chờ ôn tập hôm nay (Due for Review)* không.
2. **Bước 2 (8 phút):** Nếu có chủ đề đến hạn, mở màn hình **Chi tiết Chủ đề**, đọc lướt lại phần tóm tắt định vị và các ghi chú cũ, sau đó bấm chấm điểm ghi nhớ (từ 0 đến 5 điểm) để hệ thống tự động tính toán chu kỳ ôn tập tiếp theo.
3. **Bước 3 (10 phút):** Chọn 1 chủ đề mới từ **Cây Chủ Đề**, bấm bộ đếm thời gian học tập trên thanh điều hướng và đọc kỹ phần luận thuyết học thuật cùng các liên kết tri thức.
4. **Bước 4 (5 phút):** Viết ít nhất 1 ghi chú mới (loại `insight` nếu đúc kết được ý tưởng sâu sắc, hoặc `question` nếu có nghi vấn cần đào sâu thêm).
5. **Bước 5 (3 phút):** Nếu có tài liệu tham khảo mới, bấm "Thêm Tài Liệu" để gắn đường dẫn Web hoặc tham chiếu tệp cục bộ vào chủ đề.
6. **Bước 6 (2 phút):** Đánh giá mức độ hiểu bài của chủ đề vừa học trên tab SM-2, dừng bộ đếm thời gian và kiểm tra lại biểu đồ tiến độ.

### Quy trình tối thiểu cho người bận rộn (5–10 phút)
1. **Bước 1 (1 phút):** Mở app và xem hàng chờ ôn tập SM-2.
2. **Bước 2 (5 phút):** Ôn tập nhanh 1 chủ đề đến hạn bằng cách đọc phần Tóm tắt định vị và các ghi chú quan trọng nhất.
3. **Bước 3 (1 phút):** Chấm điểm nhớ bài (0–5) để hoàn thành nghĩa vụ ôn tập trong ngày và giữ vững chuỗi học tập (streak).

### Quy trình nghiên cứu chuyên sâu cuối tuần (45–60 phút)
1. **Bước 1 (10 phút):** Hoàn thành toàn bộ hàng chờ ôn tập SM-2 trong tuần.
2. **Bước 2 (20 phút):** Mở màn hình **Biểu Đồ Tri Thức (Knowledge Graph)**, quan sát các cụm chủ đề kết nối chéo giữa Phật học và Huyền học để chọn hướng nghiên cứu mở rộng.
3. **Bước 3 (15 phút):** Đọc sâu chủ đề đã chọn, sử dụng **Từ Điển Đa Ngữ** tra cứu thuật ngữ nguyên bản và dùng **Ma Trận Vi Diệu Pháp** hoặc **Ma Trận Dịch Học** để kiểm chứng chi pháp.
4. **Bước 4 (10 phút):** Mở **NotebookLM Studio**, đóng gói tài liệu nguồn sạch 5 phần và nạp vào Google NotebookLM để lắng nghe Audio Overview podcast tóm lược góc nhìn mới.
5. **Bước 5 (5 phút):** Mở modal **Quản Lý Dữ Liệu** trên thanh điều hướng, bấm "Tải Bản Sao Lưu JSON" để lưu trữ dự phòng toàn bộ cơ sở dữ liệu học tập ra máy tính.

### Cách tạo ghi chú chuẩn sau khi đọc
1. Mở chủ đề đang đọc, chọn tab **Ghi Chú** và bấm **Thêm Ghi Chú**.
2. Chọn đúng loại ghi chú:
   - Chọn `insight` cho những chiêm nghiệm cá nhân, sự thông suốt về giáo lý.
   - Chọn `study` cho nội dung trích lược hoặc phân tích bài học.
   - Chọn `question` cho các câu hỏi mở cần thời gian kiểm chứng thêm.
   - Chọn `summary` cho phần tóm tắt ngắn gọn toàn bộ chủ đề.
3. Sử dụng cú pháp `[[Tên Chủ Đề Khác]]` trong nội dung ghi chú để tạo liên kết wiki hai chiều sang các chủ đề liên quan.
4. Nhập các thẻ phân loại (tags) phân tách bằng dấu phẩy và bấm **Lưu Ghi Chú**.

### Cách cập nhật tiến độ học tập và Spaced Repetition (SM-2)
1. Trong màn hình **Chi tiết Chủ đề**, chọn tab **Ôn Tập SM-2**.
2. Đánh giá độ nhớ của bạn theo thang điểm khoa học từ 0 đến 5:
   - **Điểm 0–2 (Quên hoàn toàn / Rất khó khăn):** Hệ thống sẽ đưa chủ đề vào hàng chờ ôn tập lại ngay trong ngày mai (chu kỳ reset về 1 ngày).
   - **Điểm 3 (Nhớ được nhưng phải suy nghĩ vất vả):** Hệ thống giữ chu kỳ ôn ngắn để tiếp tục củng cố.
   - **Điểm 4 (Nhớ tốt sau một thoáng ngẫm nghĩ):** Chu kỳ ôn tập được nhân lên theo hệ số dễ nhớ `easeFactor`.
   - **Điểm 5 (Nhớ hoàn hảo và tức thì):** Tăng hệ số `easeFactor`, chu kỳ ôn tập được kéo dài tối ưu (vài tuần hoặc vài tháng).
3. Hệ thống tự động tính ngày ôn tập tiếp theo (`nextReview`) và hiển thị lời nhắc khi đến hạn.

### Cách lưu tài nguyên tham khảo (Resource)
1. Trong chủ đề, chọn tab **Tài Liệu** và bấm **Thêm Tài Liệu**.
2. Chọn hình thức nguồn:
   - **Nguồn Web (`url`):** Nhập địa chỉ trang web hoặc bài báo nghiên cứu (ví dụ: `https://suttacentral.net/...`).
   - **Nguồn Tệp Cục Bộ (`filePath`):** Bấm nút "Duyệt tệp trên máy" để chọn file PDF, sách số hoặc video có sẵn trên ổ cứng. Trình duyệt sẽ tự động điền tên tệp và gợi ý định dạng.
3. Ứng dụng chỉ lưu đường dẫn tham chiếu dạng chuỗi ký tự, hoàn toàn không sao chép hay tải nội dung nhị phân vào cơ sở dữ liệu, giữ cho ứng dụng luôn nhẹ và an toàn bảo mật.

### Checklist cuối buổi học
1. [ ] Đã dừng bộ đếm thời gian học tập.
2. [ ] Đã hoàn thành chấm điểm các chủ đề trong hàng chờ ôn tập hôm nay.
3. [ ] Đã ghi lại ít nhất một ý tưởng hoặc câu hỏi mới vào mục Ghi chú.
4. [ ] Đã cập nhật trạng thái học tập của chủ đề vừa nghiên cứu.
5. [ ] Đã kiểm tra lại mức độ hoàn thành trên bảng điều khiển Tổng quan.

---

## FAQ

### Tôi nên bắt đầu từ đâu?
Bạn nên bắt đầu từ màn hình **Tổng quan** để nắm cấu trúc tổng thể, sau đó vào màn hình **Chủ đề**, chọn một chủ đề nhập môn cơ bản (như *Tam Tạng Kinh Điển* hoặc *Kinh Dịch*), đọc kỹ phần tóm tắt định vị và tạo ghi chú đầu tiên.

### Tôi có cần dùng hết mọi màn hình không?
Không bắt buộc. Với nhu cầu học tập hằng ngày, bạn chỉ cần sử dụng thường xuyên 4 màn hình: **Tổng quan**, **Chủ đề**, **Chi tiết Chủ đề** và **Tiến độ**. Các màn hình chuyên biệt như *Ma Trận Vi Diệu Pháp*, *Dịch Học & Kỳ Môn*, *Từ Điển Đa Ngữ* hay *Biểu Đồ Tri Thức* phục vụ khi bạn cần tra cứu sâu hoặc nghiên cứu mở rộng.

### Topic, Note và Resource khác nhau thế nào?
- **Topic (Chủ đề):** Là đơn vị cấu trúc chính của hệ thống, đóng vai trò như một "chương sách" chuẩn hóa chứa nội dung luận thuyết hoàn chỉnh.
- **Note (Ghi chú):** Là bản ghi chép cá nhân của bạn nảy sinh trong quá trình đọc, gắn trực tiếp vào một chủ đề.
- **Resource (Tài nguyên):** Là tài liệu tham khảo bên ngoài (sách, liên kết web, file PDF cục bộ) hỗ trợ tư liệu cho chủ đề.

### Khi nào nên tạo Note?
Bạn nên tạo note ngay khi bắt gặp một ý tưởng tâm đắc (`insight`), cần tóm lược một đoạn luận thuyết phức tạp (`study`/`summary`), hoặc nảy sinh một nghi vấn học thuật cần đào sâu thêm trong tương lai (`question`).

### Khi nào nên dùng Knowledge Graph?
Bạn nên dùng Knowledge Graph khi muốn tìm kiếm mối liên hệ gián tiếp giữa các khái niệm, khám phá sự giao thoa triết học giữa Phật giáo và Dịch học phương Đông, hoặc tìm các chủ đề liên quan để lập lộ trình học tập tiếp theo.

### Tiến độ học được cập nhật như thế nào?
Tiến độ được cập nhật qua hai hình thức:
1. **Thủ công:** Bạn có thể tự chuyển trạng thái chủ đề (`Chưa học` → `Đang học` → `Đã hoàn thành` → `Đang ôn tập`) và điều chỉnh tỷ lệ phần trăm hoàn thành.
2. **Tự động qua SM-2:** Mỗi khi bạn chấm điểm ghi nhớ (từ 0 đến 5 điểm), thuật toán SM-2 sẽ tự động tính toán lại số lần ôn tập, hệ số dễ nhớ và ngày đến hạn ôn tập kế tiếp.

### Tôi có cần database để sử dụng không?
Không bắt buộc. Knowledge OS hỗ trợ kiến trúc lưu trữ hai tầng (**Dual-Tier Persistence**). Ứng dụng ưu tiên kết nối cơ sở dữ liệu máy chủ nếu có, nhưng nếu bạn chạy trên máy cá nhân không có database, ứng dụng sẽ tự động chuyển sang lưu trữ cục bộ trong **LocalStorage** của trình duyệt mà không làm gián đoạn bất kỳ tính năng nào.

### LocalStorage fallback có ý nghĩa gì?
Điều này có nghĩa là mọi thay đổi về ghi chú, tiến độ học, tài nguyên và cấu hình của bạn đều được tự động lưu vào bộ nhớ cục bộ của trình duyệt. Ứng dụng có thể chạy hoàn toàn độc lập, ổn định và bảo mật mà không phụ thuộc vào kết nối mạng hay dịch vụ máy chủ bên ngoài.

### Khi nào nên dùng NotebookLM?
Bạn nên dùng **NotebookLM Studio** khi đã hoàn tất việc học một chủ đề và muốn:
- Đóng gói toàn bộ luận thuyết, ghi chú, liên kết và nguồn trích dẫn thành một tài liệu Markdown chuẩn 5 phần.
- Nạp vào Google NotebookLM để lắng nghe Audio Overview podcast tóm lược, hoặc đặt câu hỏi chất vấn tài liệu với AI.
- Lưu lại các bản tóm tắt Audio Overview hoặc giáo trình Study Guide vào Kho kết quả (Artifacts Locker) của ứng dụng.

### Khi nào nên dùng Obsidian?
Bạn nên dùng **Obsidian Bridge** khi muốn chuyển toàn bộ cơ sở dữ liệu tri thức sang phần mềm Obsidian để xây dựng mạng lưới ghi chú cá nhân (PKM) dạng Markdown tĩnh trên máy tính, tận dụng khả năng liên kết `[[Wiki Links]]` và trang tổng quan `00_Map_Of_Content.md` được sinh tự động.

### Tôi phải làm gì nếu không thấy dữ liệu?
1. Kiểm tra xem bạn có đang mở đúng trình duyệt đã sử dụng trước đó hay không (vì dữ liệu LocalStorage lưu theo từng trình duyệt).
2. Mở modal **Quản Lý Dữ Liệu** trên thanh điều hướng, kiểm tra số lượng bản ghi hiển thị.
3. Nếu trước đó bạn đã sao lưu dữ liệu ra file JSON, hãy bấm nút "Nhập Bản Sao Lưu JSON" để phục hồi lại toàn bộ 35 chủ đề và các ghi chú của bạn.

### Tôi phải làm gì nếu thao tác lưu không thành công?
1. Kiểm tra xem bộ nhớ trình duyệt có đang ở chế độ Ẩn danh (Incognito/Private) hay không (chế độ ẩn danh có thể chặn lưu trữ dài hạn).
2. Đảm bảo các trường bắt buộc (như tiêu đề ghi chú, tên tài nguyên) không bị bỏ trống.
3. Nếu ứng dụng có kết nối máy chủ, hệ thống sẽ tự động chuyển về lưu LocalStorage khi kết nối gặp sự cố để bảo đảm an toàn dữ liệu.

### Tôi phải làm gì nếu ứng dụng báo lỗi?
1. Làm mới trang trình duyệt (`F5` hoặc `Ctrl + R` / `Cmd + R`).
2. Mở bảng điều khiển phím tắt (nhấn phím `?`) hoặc Command Palette (`Ctrl + K` / `Cmd + K`) để chuyển nhanh sang màn hình khác.
3. Định kỳ xuất file sao lưu JSON thông qua nút **Sao lưu dữ liệu** trên thanh điều hướng để đảm bảo cơ sở dữ liệu nghiên cứu của bạn luôn được bảo vệ an toàn tuyệt đối.
