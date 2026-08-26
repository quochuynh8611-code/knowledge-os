# language: vi
Tính năng: Trung Tính Hóa & Đa Lĩnh Vực Hóa AI Research Studio (Phase AI-Studio-Neutralization)

  Bối cảnh:
    Cho rằng ứng dụng Không Gian Nghiên Cứu đang hiển thị mô-đun AI Research Studio
    Và hệ thống hỗ trợ nhiều lĩnh vực học thuật khác nhau (Phật học, Khoa học, Kinh tế, Lịch sử, v.v.)

  Kịch bản: 1. AI Studio hiển thị nhận diện thương hiệu trung tính và phổ quát
    Khi người dùng mở AI Research Studio
    Thì tiêu đề phụ phản ánh vai trò trợ lý khảo cứu đa ngành
    Và không mặc định gắn cứng thế giới quan Phật học hay Huyền học lên toàn bộ giao diện

  Kịch bản: 2. Research modes được mô hình hóa theo các tác vụ nghiên cứu phổ quát
    Khi người dùng xem danh sách các chế độ nghiên cứu của AI Studio
    Thì các chế độ hiển thị nhãn theo tác vụ học thuật như "Phân Tích Khái Niệm", "Ngữ Nguyên & Thuật Ngữ", "Tổng Hợp Liên Ngành"
    Và hệ thống vẫn chấp nhận các mã mode cũ để bảo đảm tính tương thích ngược

  Kịch bản: 3. Gợi ý truy vấn nhanh thích ứng linh hoạt theo lĩnh vực của chủ đề
    Khi người dùng chọn một chủ đề nghiên cứu thuộc lĩnh vực Khoa học hoặc Kinh tế
    Thì danh sách gợi ý truy vấn nhanh (Quick Prompts) mang tính chất học thuật tổng quát
    Và không ép buộc các câu hỏi riêng về Vi Diệu Pháp hay Dịch lý cho chủ đề không liên quan

  Kịch bản: 4. Sinh gói Handoff Bundle thích ứng theo domain với nguyên tắc học thuật nghiêm ngặt
    Khi người dùng tạo Handoff Bundle cho một chủ đề nghiên cứu
    Thì System Directive định vị AI là Học giả nghiên cứu đa lĩnh vực
    Và chỉ thị suy luận bổ sung ngữ cảnh phù hợp với domain mà không làm mất đi tính chặt chẽ học thuật

  Kịch bản: 5. Bảo toàn tính tương thích ngược cho Handoff Jobs Storage và API
    Khi ứng dụng đọc danh sách handoff jobs từ phiên bản lưu trữ cũ
    Thì dữ liệu cũ vẫn được khôi phục nguyên vẹn và không bị mất mát
    Và endpoint /api/gemini/research tiếp nhận hợp lệ cả chế độ mới lẫn chế độ kế thừa
