# language: vi
Tính năng: Quản lý Lưu Trữ Bền Vững & Migration (Phase 2 - Persistence, Prisma & Zod Validation)
  Là một học giả nghiên cứu Phật học và Huyền học
  Tôi muốn dữ liệu chủ đề, ghi chú, liên kết và tiến độ ôn tập SM-2 được lưu trữ bền vững trong cơ sở dữ liệu quan hệ
  Để không bao giờ bị mất dữ liệu khi đổi trình duyệt, dọn cache, hoặc nghiên cứu trên nhiều thiết bị.

  Bối cảnh:
    Cho hệ thống có sẵn bộ Zod Schema Validation và lớp DataRepository trừu tượng

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

  Kịch bản: Đảm bảo tính Bất Biến (Idempotency) khi gửi lại Hydration Payload nhiều lần
    Cho một gói tin Hydration có "clientSyncId" là "sync-session-uuid-123"
    Khi gói tin được gửi tới server lần thứ nhất
    Thì server xử lý thành công và lưu 10 topics, 20 notes
    Và khi gói tin cùng "clientSyncId" được gửi lại lần thứ hai do retry mạng
    Thì server không tạo thêm bản ghi trùng lặp nào và trả về kết quả thống kê tương đương

  Kịch bản: Giải quyết xung đột dữ liệu theo nguyên tắc Last-Write-Wins (LWW)
    Cho ghi chú "note-01" đã có trên server với thời gian sửa là "2026-08-20T10:00:00Z"
    Khi client gửi phiên bản ghi chú "note-01" có thời gian sửa là "2026-08-23T15:00:00Z" (mới hơn)
    Thì server cập nhật nội dung ghi chú thành phiên bản mới nhất từ client
    Và nếu client gửi bản ghi có thời gian cũ hơn thì server bảo lưu nội dung hiện tại

  Kịch bản: Tương tác qua lớp DataRepository mà không gọi trực tiếp Database hay LocalStorage trong UI
    Khi DataContext cần nạp dữ liệu khởi tạo
    Thì DataContext gọi "dataRepository.loadInitialData()"
    Và nhận về dữ liệu được chuẩn hóa theo đúng interface "IDataRepository"
