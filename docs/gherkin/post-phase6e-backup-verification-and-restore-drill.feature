# language: vi
Tính năng: Xác minh sao lưu và diễn tập khôi phục (Backup verification and restore drill)

  Là một người vận hành hệ thống Knowledge OS
  Tôi muốn kiểm tra độ đầy đủ của bộ sao lưu qua 3 lớp và chạy diễn tập khôi phục trong bộ nhớ
  Để đảm bảo dữ liệu có thể phục hồi an toàn mà không làm hỏng hay ghi đè dữ liệu đang hoạt động.

  Bối cảnh:
    Cho hệ thống quản lý tri thức hoạt động theo mô hình 3 lớp sao lưu
    Và diễn tập khôi phục là tiến trình mô phỏng thuần túy trong bộ nhớ

  Kịch bản: Bản sao lưu App Snapshot chứa dữ liệu logic hoàn chỉnh
    Cho người dùng có ghi chú, tài liệu và chủ đề trong ứng dụng
    Khi xuất bản sao lưu App Snapshot JSON
    Thì snapshot được xác nhận chứa đầy đủ dữ liệu logic ứng dụng
    Và snapshot ghi rõ không chứa các byte tệp vật lý

  Kịch bản: Bảng kê Manifest chỉ lưu danh mục tham chiếu
    Cho các tài liệu và ghi chú có đường dẫn nguồn đã chuẩn hóa
    Khi xuất Bảng Kê File Library Manifest JSON
    Thì manifest chứa đầy đủ các tham chiếu đã chuẩn hóa
    Và manifest ghi rõ không chứa nội dung tệp

  Kịch bản: Báo cáo mức độ sẵn sàng yêu cầu sao lưu tệp vật lý riêng
    Cho người dùng đã xuất snapshot và manifest
    Khi tính toán Báo Cáo Sẵn Sàng Sao Lưu
    Thì báo cáo khẳng định rõ tệp vật lý vẫn bắt buộc phải sao chép riêng từ ổ đĩa

  Kịch bản: Môi trường trình duyệt không báo thành công giả mạo cho tệp chưa xác minh
    Cho ứng dụng chạy trong môi trường trình duyệt không thể quét ổ cứng trực tiếp
    Khi tính toán Báo Cáo Sẵn Sàng Sao Lưu
    Thì các tệp tham chiếu được giữ nguyên trạng thái "unverified"
    Và báo cáo không được đánh dấu là đã xác minh trên đĩa

  Kịch bản: Phát hiện tệp thất lạc hoặc nằm ngoài thư viện gốc
    Cho bảng kê manifest chứa tham chiếu tệp thất lạc hoặc ngoài thư mục gốc
    Khi tính toán Báo Cáo Sẵn Sàng Sao Lưu
    Thì báo cáo nêu rõ cảnh báo rủi ro
    Và cung cấp hành động khắc phục cụ thể cho người vận hành

  Kịch bản: Diễn tập khôi phục thẩm định snapshot mà không làm biến đổi dữ liệu thật
    Cho người dùng chọn một tệp snapshot hợp lệ
    Khi thực hiện Diễn Tập Khôi Phục (Restore Drill)
    Thì snapshot được kiểm tra tính hợp lệ trong bộ nhớ
    Và dữ liệu thật trong ứng dụng được bảo toàn nguyên vẹn 100%

  Kịch bản: Từ chối an toàn khi snapshot bị lỗi định dạng
    Cho người dùng chọn tệp JSON bị hỏng cấu trúc hoặc sai mã băm
    Khi tiến trình thẩm định diễn tập chạy
    Thì diễn tập báo lỗi cụ thể
    Và dữ liệu thật trong ứng dụng không bị ảnh hưởng

  Kịch bản: Xem trước tác động khôi phục trước khi xác nhận
    Cho một tệp snapshot hợp lệ được chọn
    Khi mở màn hình xem trước khôi phục
    Thì giao diện hiển thị số lượng chủ đề, ghi chú, tài liệu sẽ được phục hồi
    Và chưa có dữ liệu nào được ghi vào cơ sở dữ liệu

  Kịch bản: Yêu cầu xác nhận tường minh trước khi nạp dữ liệu thật
    Cho người dùng đang xem trước bản khôi phục
    Khi người dùng chưa bấm nút xác nhận tường minh
    Thì không có thao tác nhập dữ liệu nào diễn ra

  Kịch bản: Snapshot phiên bản cũ vẫn tương thích với diễn tập khôi phục
    Cho một tệp snapshot định dạng cũ (Legacy payload)
    Khi chạy diễn tập khôi phục
    Thì các trường tương thích vẫn được nạp thành công trong bộ nhớ
    Và các trường không hỗ trợ được báo cáo mà không gây crash ứng dụng
