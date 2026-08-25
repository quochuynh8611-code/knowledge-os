# language: vi
Tính năng: Quản Lý Lĩnh Vực Động Tầng 1 và Ẩn / Khôi Phục Chủ Đề Nghiên Cứu
  Để mở rộng tri thức không giới hạn và giữ gìn dữ liệu khi dọn dẹp không gian nghiên cứu
  Là một học giả sử dụng Knowledge OS
  Tôi muốn có thể tạo thêm lĩnh vực gốc mới và ẩn/khôi phục chủ đề mà không làm mất dữ liệu

  Quy tắc:
    - Root Category là Category có parentId = null hoặc undefined
    - Child Category có parentId trỏ tới Root Category
    - Không hardcode thêm danh mục nào trong code
    - Topic bị ẩn (visibility = 'hidden') phải giữ nguyên notes, resources, studyProgress, links, timestamps
    - Dữ liệu cũ không có trường visibility phải được tự động backfill thành 'active'

  Kịch bản: Thêm lĩnh vực gốc mới động từ giao diện
    Cho dù hệ thống đang có dữ liệu khởi tạo
    Khi người dùng nhấn "Thêm lĩnh vực" và nhập tên "Khoa Học Dữ Liệu"
    Thì một Root Category mới được tạo với parentId là null
    Và Sidebar cập nhật hiển thị lĩnh vực "Khoa Học Dữ Liệu" ngay lập tức

  Kịch bản: Tạo chủ đề thuộc lĩnh vực gốc động mới
    Cho dù đã có Root Category "Khoa Học Dữ Liệu"
    Khi người dùng mở form tạo chủ đề và chọn lĩnh vực "Khoa Học Dữ Liệu"
    Thì chủ đề mới được tạo với categoryId và categoryName tương ứng
    Và chủ đề xuất hiện trong cây phân cấp của lĩnh vực đó

  Kịch bản: Ẩn chủ đề ít sử dụng mà không làm mất dữ liệu
    Cho dù đang có chủ đề "Tứ Niệm Xứ" chứa 3 ghi chú và 2 tài liệu
    Khi người dùng nhấn "Ẩn chủ đề" trên "Tứ Niệm Xứ"
    Thì trạng thái visibility của chủ đề chuyển thành "hidden"
    Và chủ đề không xuất hiện trong danh sách chủ đề hoạt động mặc định
    Và 3 ghi chú cùng 2 tài liệu của chủ đề vẫn tồn tại nguyên vẹn trong hệ thống

  Kịch bản: Khôi phục chủ đề đã bị ẩn
    Cho dù chủ đề "Tứ Niệm Xứ" đang ở trạng thái "hidden"
    Khi người dùng bật bộ lọc "Chủ đề đã ẩn" và nhấn "Khôi phục"
    Thì trạng thái visibility của "Tứ Niệm Xứ" chuyển lại thành "active"
    Và chủ đề xuất hiện trở lại trong danh sách nghiên cứu chính

  Kịch bản: Tương thích ngược với dữ liệu cũ không có trường visibility
    Cho dù nạp một snapshot dữ liệu cũ từ LocalStorage không có trường visibility
    Khi hệ thống khởi tạo và nạp dữ liệu
    Thì tất cả các chủ đề cũ được gán tự động visibility là "active"
    Và ứng dụng không phát sinh bất kỳ lỗi runtime nào
