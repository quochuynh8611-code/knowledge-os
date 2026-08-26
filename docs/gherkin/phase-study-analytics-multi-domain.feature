# language: vi
Tính năng: Phân Tích Tiến Độ Học Tập Đa Lĩnh Vực Động (Phase Study Analytics Multi-Domain Alignment)

  Bối cảnh:
    Cho hệ thống Spaced Repetition SM-2 và Phân Tích Tiến Độ Học Tập chứa các chủ đề thuộc nhiều lĩnh vực gốc khác nhau

  Kịch bản: 1. Gom nhóm dự báo hàng đợi ôn tập theo root domain động
    Cho người dùng có danh mục chứa từ 3 lĩnh vực gốc trở lên (Phật Học, Huyền Học, Triết Học, Khoa Học...)
    Và các chủ đề có lịch ôn tập nextReview trong vòng 7 ngày tới
    Khi hệ thống tính toán dự báo hàng đợi ôn tập calculateReviewForecast
    Thì mỗi ngày trong dự báo chứa bản đồ domainCounts phản ánh số lượng chính xác cho từng lĩnh vực
    Và mảng domains được sắp xếp tất định theo thứ tự từ điển A-Z
    Và không xảy ra hiện tượng đếm trùng vào tổng số lượng totalCount

  Kịch bản: 2. Bảo toàn tương thích ngược cho các trường legacy
    Cho các chủ đề thuộc Phật Học và Huyền Học
    Khi hệ thống tính toán dự báo hàng đợi ôn tập
    Thì trường phatHocCount và huyenHocCount vẫn được tính toán chuẩn xác song song với domainCounts
    Và các thành phần UI cũ tiêu thụ 2 trường này tiếp tục hoạt động mà không bị gián đoạn

  Kịch bản: 3. Xử lý an toàn khi dữ liệu rỗng hoặc chủ đề không gán danh mục
    Cho danh sách chủ đề rỗng hoặc chủ đề không có danh mục hợp lệ
    Khi hệ thống tính toán dự báo hàng đợi hoặc tỷ lệ duy trì tri thức
    Thì đối với dữ liệu rỗng trả về mảng 7 ngày dự báo với domainCounts rỗng và totalCount = 0 mà không crash
    Và đối với chủ đề không gán nhóm được tự động xếp vào domain 'other' mà không bị gán nhầm vào Phật Học hay Huyền Học

  Kịch bản: 4. Hiển thị cột biểu đồ và chú giải động trên giao diện Dự Báo 7 Ngày
    Cho giao diện Bảng Điều Khiển Tiến Độ Học Tập StudyProgressView
    Và hệ thống chứa các chủ đề đến hạn thuộc 3 lĩnh vực gốc trở lên
    Khi người dùng xem khối Dự Báo Hàng Đợi Ôn Tập 7 Ngày
    Thì biểu đồ BarChart hiển thị các cột màu phân biệt cho từng lĩnh vực đang có hàng đợi
    Và khối chú giải Legend hiển thị đầy đủ tên và màu sắc của tất cả các lĩnh vực gốc đó

  Kịch bản: 5. Cân bằng lĩnh vực và trình bày thẻ chủ đề trung tính
    Cho các chủ đề thuộc lĩnh vực mới ngoài Phật Học và Huyền Học
    Khi người dùng kiểm tra biểu đồ Cân Bằng Lĩnh Vực và danh sách thẻ tiến độ chủ đề
    Thì biểu đồ PieChart phản ánh đúng tỷ lệ phân bổ của các lĩnh vực mới
    Và thẻ chủ đề hiển thị huy hiệu danh mục và thanh tiến độ màu ngọc bích / trung tính (emerald/neutral), không bị phân nhánh nhầm sang màu của Huyền Học
