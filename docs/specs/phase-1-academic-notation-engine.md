# BDD Feature Specification: Academic Notation Engine & Collision Guards

## Feature: Academic Notation Engine (KaTeX, mhchem, Mermaid) & Collision Guards
  Là một học giả, nhà nghiên cứu và người học chuyên sâu sử dụng Knowledge OS
  Tôi muốn viết và xem các công thức Toán học, phương trình Hóa học và Sơ đồ Mermaid trong Ghi chú và Flashcards
  Đồng thời không bị xung đột với ký hiệu tiền tệ, typography tiếng Việt và cú pháp thẻ Cloze Deletion

  Background:
    Given Knowledge OS đang chạy với phiên bản lưu trữ chuẩn
    And Academic Notation Engine đã được nạp sẵn sàng trong hệ thống

  # ----------------------------------------------------------------------------
  # Rule 1: Toán học (Math LaTeX) Rendering & Safety
  # ----------------------------------------------------------------------------
  Scenario: Render inline math hợp lệ
    Given người dùng nhập đoạn văn bản chứa "Năng lượng nghỉ $E = mc^2$ của Einstein"
    When engine bóc tách và chuyển đổi qua KaTeX
    Then phần "$E = mc^2$" được chuyển thành HTML span có class "katex"
    And văn bản "Năng lượng nghỉ " và " của Einstein" được bảo toàn nguyên vẹn

  Scenario: Render block math độc lập
    Given người dùng nhập khối toán học:
      """
      $$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$$
      """
    When engine render biểu thức sang HTML
    Then kết quả hiển thị ở chế độ displayMode (block container)
    And thẻ chứa có cấu trúc "katex-display"

  Scenario: Fallback an toàn khi cú pháp TeX không hợp lệ
    Given người dùng nhập công thức gõ dở hoặc sai cú pháp "$\frac{1}{$"
    When engine xử lý chuỗi này
    Then hệ thống không ném ngoại lệ làm crash ứng dụng
    And trả về nội dung lỗi được định dạng an toàn kèm class cảnh báo

  Scenario: Chống tấn công XSS trong công thức Toán
    Given kẻ tấn công cố tình tiêm mã độc "$\href{javascript:alert(1)}{click}$" hoặc "$<script>alert(1)</script>$"
    When engine render công thức với cờ trust bằng false
    Then không có bất kỳ thẻ <script> nào được sinh ra trong DOM
    And không có thuộc tính href chứa giao thức "javascript:"

  # ----------------------------------------------------------------------------
  # Rule 2: Hóa học & Vật lý với mhchem
  # ----------------------------------------------------------------------------
  Scenario: Render phương trình phản ứng hóa học có mũi tên
    Given người dùng nhập phương trình "$\ce{H2SO4 + 2NaOH -> Na2SO4 + 2H2O}$"
    When engine render qua KaTeX với extension mhchem
    Then phương trình hóa học được render với các chỉ số dưới đúng chuẩn
    And mũi tên phản ứng "->" được chuyển đổi thành ký hiệu mũi tên hóa học chuẩn KaTeX

  Scenario: Render phản ứng thuận nghịch và electron
    Given người dùng nhập "$\ce{Fe^{2+} + e- <=> Fe^{3+}}$"
    When engine render qua KaTeX với extension mhchem
    Then các ion mang điện tích và mũi tên thuận nghịch "<=>" hiển thị chuẩn xác

  Scenario: Render đại lượng và đơn vị đo lường với \pu
    Given người dùng nhập "Nhiệt lượng $\pu{123 kJ/mol}$"
    When engine render qua mhchem
    Then đại lượng số và đơn vị đo lường được định dạng theo tiêu chuẩn vật lý/hóa học

  # ----------------------------------------------------------------------------
  # Rule 3: Chốt chặn va chạm 1 (Currency vs Inline Math)
  # ----------------------------------------------------------------------------
  Scenario: Phân biệt ký hiệu tiền tệ không biến thành inline math
    Given người dùng nhập văn bản "Giá sách tham khảo từ $50 đến $100 cho 1 bộ"
    When tokenizer quét chuỗi văn bản
    Then chuỗi "$50 đến $100" không được nhận diện là inline math
    And các số tiền "$50" và "$100" hiển thị dưới dạng văn bản bình thường

  Scenario: Hỗ trợ escape ký tự đô la \$
    Given người dùng nhập văn bản "Chi phí là \$100 và công thức là $x = 10$"
    When engine xử lý chuỗi
    Then "\$100" được hiển thị thành "$100" dạng text
    And "$x = 10$" được render thành công thức KaTeX

  # ----------------------------------------------------------------------------
  # Rule 4: Chốt chặn va chạm 2 (Bảo vệ trong normalizeMarkdownForDisplay)
  # ----------------------------------------------------------------------------
  Scenario: Bảo vệ mũi tên hóa học và toán tử không bị Unicode hóa trong normalizeMarkdownForDisplay
    Given một tài liệu nghiên cứu có đoạn:
      """
      Phản ứng hóa học: $\ce{2H2 + O2 -> 2H2O}$.
      Chiều suy luận: A -> B trong thực tế.
      """
    When hàm normalizeMarkdownForDisplay xử lý tài liệu này
    Then mũi tên "->" bên trong "$\ce{2H2 + O2 -> 2H2O}$" giữ nguyên là "->"
    And mũi tên "->" ở ngoài văn bản thường được chuyển thành "→"

  Scenario: Bảo vệ toán tử so sánh <=, >=, +- trong công thức toán
    Given chuỗi văn bản "$x <= 10$ và $y >= 5 \pm 1$" kết hợp câu thường "a <= b"
    When hàm normalizeMarkdownForDisplay xử lý
    Then các toán tử bên trong cặp dấu $ được bảo toàn cho KaTeX
    And toán tử ngoài câu thường được chuyển đổi thành "≤"

  # ----------------------------------------------------------------------------
  # Rule 5: Chốt chặn va chạm 3 (Cloze Deletion + Nested LaTeX Braces)
  # ----------------------------------------------------------------------------
  Scenario: Bóc tách thẻ Cloze chứa công thức phân số lồng nhau
    Given một câu hỏi ôn tập thẻ flashcard:
      """
      Công thức phân số liên tục: {{c1::$\frac{1}{1 + \frac{a}{b}}$::Phân số liên tục}}
      """
    When hàm parseClozeDeletions phân tích chuỗi
    Then trích xuất được 1 ClozeItem có index là 1
    And câu trả lời answer là "$\frac{1}{1 + \frac{a}{b}}$"
    And gợi ý hint là "Phân số liên tục"
    And không bị cắt cụt tại dấu "}}" của biểu thức LaTeX

  Scenario: Bóc tách thẻ Cloze chứa công thức nghiệm bậc 2 phức tạp
    Given chuỗi thẻ flashcard:
      """
      Nghiệm phương trình bậc 2: {{c1::$\frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$::Công thức nghiệm}}
      """
    When hàm parseClozeDeletions phân tích
    Then answer nhận trọn vẹn toàn bộ công thức LaTeX
    And prompt che giấu chính xác phần công thức thành "[...]" (hoặc "[...Công thức nghiệm]")
