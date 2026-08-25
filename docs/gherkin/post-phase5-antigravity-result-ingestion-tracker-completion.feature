# language: vi
Tính năng: Post-Phase 5 Micro-Increment - Hoàn Tất Job Tracker Khi Nạp Kết Quả Antigravity
  Là một học giả nghiên cứu trên Knowledge OS
  Tôi muốn trạng thái Job Tracker tự động chuyển sang "success" khi tôi nạp artifact kết quả từ Antigravity
  Và đảm bảo không đánh dấu hoàn tất nhầm khi chỉ sao chép lệnh hoặc khi dữ liệu không khớp chủ đề

  Bối cảnh:
    Cho một chủ đề "Vi Diệu Pháp Toàn Tập" với mã "topic-vi-dieu-phap"
    Và một chủ đề "Kỳ Môn Độn Giáp Toàn Thư" với mã "topic-ky-mon"

  Kịch bản: 1. Nạp Artifact kết quả hợp lệ chuyển trạng thái Job sang success
    Giả sử một handoff job với mã "job-nlm-1" có trạng thái "queued" cho chủ đề "topic-vi-dieu-phap" và loại "study_guide"
    Khi tôi nạp một artifact mới cho chủ đề "topic-vi-dieu-phap" với loại "study_guide"
    Thì trạng thái của job "job-nlm-1" trong tracker phải chuyển thành "success"
    Và thời gian "updatedAt" của job phải được cập nhật mới hơn "createdAt"

  Kịch bản: 2. Nạp Artifact không khớp chủ đề hoặc loại artifact không làm thay đổi Job
    Giả sử một handoff job với mã "job-nlm-1" có trạng thái "queued" cho chủ đề "topic-vi-dieu-phap" và loại "study_guide"
    Khi tôi nạp một artifact mới cho chủ đề "topic-ky-mon" hoặc loại "faq"
    Thì trạng thái của job "job-nlm-1" vẫn giữ nguyên là "queued"
    Và không có job nào của chủ đề khác bị chuyển trạng thái nhầm

  Kịch bản: 3. Thao tác chuẩn bị hoặc sao chép lệnh CLI không tự ý hoàn tất Job
    Giả sử một handoff job vừa được tạo cho chủ đề "topic-vi-dieu-phap"
    Khi người dùng nhấn nút "Sao chép lệnh CLI" nhiều lần
    Thì trạng thái của job trong tracker vẫn phải là "queued"
    Và không được chuyển sang "success"

  Kịch bản: 4. Dữ liệu nạp bị lỗi hoặc rỗng không làm bẩn tracker state
    Giả sử một handoff job với mã "job-nlm-1" có trạng thái "queued" cho chủ đề "topic-vi-dieu-phap"
    Khi người dùng cố nạp một artifact với nội dung rỗng hoặc URL không hợp lệ
    Thì hệ thống báo lỗi xác thực đầu vào
    Và trạng thái của job "job-nlm-1" vẫn được bảo toàn là "queued"

  Kịch bản: 5. Ưu tiên hoàn tất Job đang chờ gần nhất khi có nhiều Job cùng chủ đề
    Giả sử chủ đề "topic-vi-dieu-phap" có hai job "job-nlm-old" (tạo trước) và "job-nlm-new" (tạo sau) đều ở trạng thái "queued"
    Khi tôi nạp một artifact mới khớp loại cho chủ đề "topic-vi-dieu-phap"
    Thì job "job-nlm-new" được chuyển sang "success"
    Và job "job-nlm-old" vẫn giữ nguyên trạng thái "queued"
