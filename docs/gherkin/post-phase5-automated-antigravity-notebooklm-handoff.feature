# language: vi
Tính năng: Post-Phase 5 Micro-Increment - Tự Động Hóa Pipeline Handoff Antigravity cho NotebookLM
  Là một học giả nghiên cứu trên Knowledge OS
  Tôi muốn chuẩn bị tự động các gói hồ sơ Job (Source, Prompt, Manifest) và lệnh CLI headless cho Antigravity 2.0
  Để có thể kích hoạt Antigravity xử lý NotebookLM một cách chuẩn hóa và theo dõi tiến độ trên giao diện

  Bối cảnh:
    Cho một chủ đề "Vi Diệu Pháp Toàn Tập" với đầy đủ luận thuyết, ghi chú và tài liệu tham khảo

  Kịch bản: 1. Tạo đối tượng Handoff Job với đầy đủ metadata chuẩn và không persist chuỗi command
    Khi tôi yêu cầu tạo handoff job cho chủ đề với loại artifact "study_guide"
    Thì hệ thống phải cấp phát một mã "jobId" duy nhất bắt đầu bằng "job-nlm-"
    Và trạng thái ban đầu của job phải là "queued"
    Và đường dẫn sourcePath phải có định dạng ".agents/handoffs/[jobId]-source.md"
    Và đường dẫn promptPath phải có định dạng ".agents/handoffs/[jobId]-prompt.md"
    Và đường dẫn manifestPath phải có định dạng ".agents/handoffs/[jobId]-manifest.json"
    Và đối tượng job không chứa thuộc tính command cố định

  Kịch bản: 2. Tổng hợp câu lệnh CLI headless "buildAntigravityCLICommand" động từ Job
    Khi tôi truyền đối tượng handoff job vào hàm "buildAntigravityCLICommand"
    Thì câu lệnh CLI trả về phải bắt đầu bằng 'agy -p "'
    Và câu lệnh phải chứa tiêu đề chủ đề
    Và câu lệnh phải chứa đường dẫn promptPath và sourcePath

  Kịch bản: 3. Tuần tự hóa tệp manifest JSON làm inter-process handoff artifact
    Khi tôi tạo manifest JSON cho một handoff job
    Thì nội dung manifest phải có cấu trúc JSON hợp lệ
    Và manifest chứa phiên bản "1.0" cùng đối tượng topic và danh sách files

  Kịch bản: 4. Quản lý UI Tracker State trong LocalStorage
    Khi tôi lưu một handoff job mới vào tracker
    Thì danh sách job truy xuất từ LocalStorage phải chứa job đó
    Khi tôi cập nhật trạng thái job thành "processing" hoặc "success"
    Thì trạng thái mới phải được cập nhật kèm timestamp "updatedAt"
    Khi tôi xóa job theo "jobId"
    Thì job đó phải được loại bỏ khỏi danh sách tracker

  Kịch bản: 5. Giao diện NotebookLMStudioModal chuẩn bị Handoff và sao chép lệnh CLI
    Khi người dùng mở NotebookLMStudioModal và chọn tab "Chỉ thị Antigravity"
    Thì modal phải hiển thị nút "Chuẩn bị Handoff Antigravity"
    Khi người dùng nhấn nút "Chuẩn bị Handoff Antigravity"
    Thì hệ thống sinh bản ghi Job với trạng thái "queued" trong tracker
    Và giao diện hiển thị câu lệnh CLI "agy -p" sinh động kèm nút sao chép 1-click
    Và danh sách "Lịch sử Pipeline Handoff" hiển thị Job vừa tạo với huy hiệu "queued"
