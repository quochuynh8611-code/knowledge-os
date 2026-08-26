# language: vi
Tính năng: Phase 7B — Resource Open Target Resolution & Model/Form/Viewer UX Upgrade
  Để quản lý nguồn tài liệu và đích mở nội dung chính xác, tránh trỏ mù và phù hợp với năng lực trình duyệt
  Là một nhà nghiên cứu sử dụng hệ thống
  Tôi muốn phân loại rõ ràng đích mở tài liệu và chỉ kích hoạt mở trực tiếp khi môi trường hỗ trợ an toàn

  Bối cảnh:
    Cho hệ thống quản lý tài liệu nghiên cứu

  # ---------------------------------------------------------------------------
  # 1. Target Classification & Fallback Scenarios
  # ---------------------------------------------------------------------------
  Kịch bản: 1. openTarget là HTTPS URL hợp lệ
    Khi kiểm tra đích mở của tài liệu có openTarget "https://drive.google.com/file/d/123/view"
    Thì resolver phải phân loại đích mở là "web_url"
    Và trạng thái canOpenDirectly phải là true
    Và targetUrl phải là "https://drive.google.com/file/d/123/view"

  Kịch bản: 2. openTarget là custom scheme Obsidian URL
    Khi kiểm tra đích mở của tài liệu có openTarget "obsidian://open?vault=Research&file=Abhidharma"
    Thì resolver phải phân loại đích mở là "custom_scheme"
    Và trạng thái canOpenDirectly phải là true
    Và targetUrl phải là "obsidian://open?vault=Research&file=Abhidharma"

  Kịch bản: 3. openTarget là file protocol hoặc đường dẫn cục bộ
    Khi kiểm tra đích mở của tài liệu có openTarget "file:///Users/researcher/Library/doc.pdf"
    Thì resolver phải phân loại đích mở là "local_path"
    Và trạng thái canOpenDirectly phải là false
    Và giao diện không được tạo liên kết mở trực tiếp mà phải cung cấp nút sao chép đường dẫn

  Kịch bản: 4. Fallback từ openTarget rỗng sang url tham chiếu hợp lệ
    Khi kiểm tra đích mở của tài liệu không có openTarget và có url "https://suttacentral.net/dn22"
    Thì resolver phải fallback lấy nguồn từ url
    Và phân loại đích mở là "web_url"
    Và trạng thái canOpenDirectly phải là true

  Kịch bản: 5. Chỉ có filePath cục bộ
    Khi kiểm tra đích mở của tài liệu không có openTarget, không có url và chỉ có filePath "/Books/kosa.pdf"
    Thì resolver phải phân loại đích mở là "local_path"
    Và trạng thái canOpenDirectly phải là false
    Và targetUrl phải là "/Books/kosa.pdf"

  Kịch bản: 6. Không có bất kỳ nguồn nào
    Khi kiểm tra đích mở của tài liệu không có openTarget, không có url và không có filePath
    Thì resolver phải phân loại đích mở là "none"
    Và trạng thái canOpenDirectly phải là false

  Kịch bản: 7. openTarget là chuỗi không an toàn hoặc không được hỗ trợ
    Khi kiểm tra đích mở của tài liệu có openTarget "javascript:alert(1)"
    Thì resolver phải phân loại đích mở là "unsupported_target"
    Và trạng thái canOpenDirectly phải là false

  # ---------------------------------------------------------------------------
  # 2. UI & Form Consistency
  # ---------------------------------------------------------------------------
  Kịch bản: Viewer chỉ render nút mở trực tiếp khi canOpenDirectly là true
    Khi mở ResourceViewerModal cho một tài liệu có canOpenDirectly là false
    Thì không được render thẻ liên kết Mở Tài Liệu Trực Tiếp
    Và phải hiển thị giải thích trung thực kèm nút sao chép đường dẫn nếu có đường dẫn tệp

  Kịch bản: Form cho phép nhập/sửa openTarget và giữ nguyên dữ liệu cũ
    Khi mở ResourceFormModal để sửa một tài liệu cũ
    Thì các trường cũ phải được hiển thị đầy đủ
    Và trường openTarget cho phép bổ sung đích mở mới mà không làm mất dữ liệu cũ
