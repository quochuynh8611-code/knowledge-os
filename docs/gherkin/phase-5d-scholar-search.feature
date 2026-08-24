# language: vi
Tính năng: Workstream 5D — Scholar Search & Fast Fuzzy Metadata Filter
  Để giúp học giả nhanh chóng định vị và tra cứu chính xác các khái niệm Phật học, Huyền học, ghi chú và tài liệu tham khảo
  Là một Nhà Nghiên Cứu Phật Học & Dịch Học
  Tôi muốn một bộ máy tìm kiếm cục bộ thông minh, hỗ trợ không dấu tiếng Việt, chuẩn hóa IAST Pali/Sanskrit và xếp hạng mức độ liên quan.

  Bối cảnh:
    Cho hệ thống Knowledge OS đang chứa 35 chủ đề canonical, các ghi chú khảo cứu và danh mục tài liệu tham khảo

  # -----------------------------------------------------------------------------
  # SCENARIO 1: VIETNAMESE DIACRITIC-INSENSITIVE FUZZY MATCHING
  # -----------------------------------------------------------------------------
  Kịch bản: Tìm kiếm không dấu tiếng Việt khớp chính xác chủ đề có dấu
    Cho người nghiên cứu nhập từ khóa tìm kiếm "tu dieu de" hoặc "ky mon don giap"
    Khi bộ lọc Scholar Search thực hiện chuẩn hóa và so khớp
    Thì kết quả trả về phải chứa chủ đề "Tứ Diệu Đế" và "Kỳ Môn Độn Giáp"
    Và các ký tự có dấu/không dấu được xử lý tương đương nhau

  # -----------------------------------------------------------------------------
  # SCENARIO 2: PALI & SANSKRIT IAST TRANSLITERATION NORMALIZATION
  # -----------------------------------------------------------------------------
  Kịch bản: Tìm kiếm thuật ngữ Pali/Sanskrit dạng ASCII khớp với ký tự IAST nguyên bản
    Cho người nghiên cứu nhập từ khóa "patthana" hoặc "tipitaka" hoặc "vipassana"
    Khi bộ lọc Scholar Search thực hiện chuẩn hóa ký tự IAST (ṭ, ṭh, ṅ, ñ, ā, ī, ū, ṃ)
    Thì kết quả tìm kiếm phải nhận diện và hiển thị đúng các chủ đề "Paṭṭhāna", "Tipiṭaka", "Vipassanā"
    Và vị trí khớp ký tự trong tiêu đề được đánh dấu nổi bật (highlight snippet)

  # -----------------------------------------------------------------------------
  # SCENARIO 3: UNIFIED MULTI-COLLECTION METADATA SEARCH
  # -----------------------------------------------------------------------------
  Kịch bản: Tìm kiếm hợp nhất trên 3 tập hợp thực thể Topics, Notes và Resources
    Cho hệ thống đang có dữ liệu về "Tâm Sở Biến Hành" trên cả Topic, Note và Resource
    Khi người dùng nhập từ khóa "Biến Hành" vào thanh tìm kiếm
    Thì danh sách kết quả trả về được phân nhóm rõ ràng theo 3 nhóm: "Chủ Đề", "Ghi Chú", "Tài Liệu"
    Và mỗi mục hiển thị đủ metadata để người dùng định vị và mở đúng thực thể

  # -----------------------------------------------------------------------------
  # SCENARIO 4: RELEVANCE RANKING & MATCH SCORING
  # -----------------------------------------------------------------------------
  Kịch bản: Xếp hạng độ liên quan ưu tiên Tiêu đề khớp chính xác trước Nội dung
    Cho người dùng tìm kiếm từ khóa "Vi Diệu Pháp"
    Khi hệ thống tính toán điểm số phù hợp (Relevance Score)
    Thì chủ đề có tiêu đề khớp trực tiếp "Vi Diệu Pháp" được xếp ở vị trí đầu tiên (Hạng 1)
    Và các chủ đề chỉ chứa từ khóa trong mô tả hoặc ghi chú phụ được xếp ở các vị trí tiếp theo

  # -----------------------------------------------------------------------------
  # SCENARIO 5: ZERO BINARY INGESTION SEARCH INVARIANT
  # -----------------------------------------------------------------------------
  Kịch bản: Tìm kiếm tài liệu tham khảo chỉ quét trên metadata an toàn mà không đọc file binary
    Cho tài liệu tham khảo cục bộ có filePath là "/books/kinh-trung-bo.pdf" và title là "Kinh Trung Bộ - Majjhima Nikāya"
    Khi người dùng tìm kiếm "Majjhima" hoặc "kinh-trung-bo"
    Thì kết quả hiển thị thông tin tài liệu dựa trên title và filePath metadata
    Và ứng dụng tuyệt đối không thực hiện đọc byte nhị phân hoặc nạp dữ liệu file vào bộ nhớ

  # -----------------------------------------------------------------------------
  # SCENARIO 6: COMBINED FACETED FILTERING WITH SEARCH QUERY
  # -----------------------------------------------------------------------------
  Kịch bản: Kết hợp tìm kiếm từ khóa cùng bộ lọc lĩnh vực, danh mục và tiến độ ôn tập
    Cho người dùng nhập từ khóa "Tâm" và đồng thời chọn bộ lọc lĩnh vực "phat-hoc", trạng thái "reviewing"
    Khi bộ lọc SearchFilters thực thi
    Thì chỉ các chủ đề thuộc Phật học có tiến độ đang ôn tập (SM-2) và chứa từ khóa "Tâm" mới được hiển thị
    Và số lượng kết quả hiển thị trên toolbar được cập nhật chính xác

  # -----------------------------------------------------------------------------
  # SCENARIO 7: EMPTY QUERY & RESET BEHAVIOR
  # -----------------------------------------------------------------------------
  Kịch bản: Trả về danh sách đầy đủ khi chuỗi tìm kiếm rỗng hoặc sau khi bấm Xóa bộ lọc
    Cho người nghiên cứu xóa chuỗi tìm kiếm hoặc bấm nút "Xóa tất cả bộ lọc"
    Khi trạng thái tìm kiếm được đặt lại
    Thì toàn bộ 35 chủ đề canonical được hiển thị đầy đủ
    Và không xảy ra bất kỳ lỗi runtime nào
