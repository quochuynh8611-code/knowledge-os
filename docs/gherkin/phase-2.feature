# language: vi
Tính năng: Quản lý Lưu Trữ Bền Vững & Migration (Phase 2 - Persistence, Prisma & Zod Validation)
  Là một học giả nghiên cứu Phật học và Huyền học
  Tôi muốn dữ liệu chủ đề, ghi chú, liên kết và tiến độ ôn tập SM-2 được lưu trữ bền vững trong cơ sở dữ liệu quan hệ
  Để không bao giờ bị mất dữ liệu khi đổi trình duyệt, dọn cache, hoặc nghiên cứu trên nhiều thiết bị.

  Bối cảnh:
    Cho hệ thống có sẵn bộ Zod Schema Validation và dịch vụ Persistence Hydration

  Kịch bản: Xác thực hợp chuẩn khi tạo Chủ đề nghiên cứu mới (Topic Create Payload)
    Khi người dùng gửi payload tạo chủ đề:
      | title       | Khảo Cứu Bát Nhã Ba La Mật Đa Tâm Kinh           |
      | slug        | bat-nha-tam-kinh                                  |
      | categoryId  | cat-tam-tang                                      |
      | type        | phat-hoc                                          |
      | description | Luận giải về Tánh Không (Śūnyatā) và 5 Uẩn       |
      | content     | Chi tiết bản dịch Huyền Trang và đối chiếu Pali   |
      | tags        | ["Bát Nhã", "Tánh Không", "Tam Tạng"]             |
    Thì Zod Schema "TopicCreateSchema" phải parse thành công không có lỗi
    Và payload đầu ra phải chuẩn hóa định dạng chuỗi và mảng tags

  Kịch bản: Từ chối payload tạo Chủ đề khi thiếu tiêu đề hoặc sai lĩnh vực (Invalid Domain)
    Khi người dùng gửi payload tạo chủ đề thiếu tiêu đề hoặc sai type:
      | title       |                                                   |
      | categoryId  | cat-tam-tang                                      |
      | type        | khoa-hoc-hien-dai                                 |
    Thì Zod Schema "TopicCreateSchema" phải trả về lỗi hợp chuẩn (Validation Error)
    Và thông báo lỗi phải chỉ rõ "Tiêu đề không được để trống" và "Lĩnh vực phải là phat-hoc hoặc huyen-hoc"

  Kịch bản: Xác thực payload đánh giá ôn tập SM-2 (Spaced Repetition Review)
    Khi người dùng hoàn thành một phiên ôn tập với chất lượng đánh giá:
      | topicId | topic-abhidharma-01 |
      | quality | 4                   |
    Thì Zod Schema "SM2ReviewInputSchema" phải parse thành công với quality trong khoảng từ 0 đến 5
    Và nếu quality nằm ngoài khoảng 0 đến 5 thì hệ thống phải báo lỗi "Chất lượng ôn tập phải từ 0 đến 5"

  Kịch bản: Hydration dữ liệu từ LocalStorage lên Server mà không mất dữ liệu (Zero-Loss Migration)
    Cho người dùng có dữ liệu LocalStorage chứa 5 chủ đề và 12 ghi chú cá nhân
    Khi ứng dụng khởi động và gửi payload tới endpoint "/api/sync/hydrate"
    Thì hệ thống phải xác thực payload bằng "ImportExportPayloadSchema"
    Và lưu thành công toàn bộ 5 chủ đề và 12 ghi chú vào cơ sở dữ liệu
    Và không ghi đè làm mất bất kỳ ghi chú nào đã tồn tại

  Kịch bản: Xuất và Nhập toàn bộ cơ sở tri thức (Full Backup & Restore)
    Khi người dùng yêu cầu xuất file sao lưu JSON
    Thì hệ thống tạo ra file JSON chứa đầy đủ metadata, topics, notes, resources, tags, và studyProgress
    Và khi nhập lại file này vào một hệ thống mới, hệ thống phải phục hồi chính xác 100% dữ liệu
