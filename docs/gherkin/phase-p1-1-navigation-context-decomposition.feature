# language: vi
Tính năng: Phân rã Navigation Context và Cơ chế Facade Tương Thích Ngược
  Là một học giả sử dụng Knowledge OS
  Tôi muốn trạng thái điều hướng (tab, tìm kiếm, bộ lọc) được quản lý độc lập với dữ liệu thực thể
  Để trải nghiệm tìm kiếm và chuyển tab diễn ra mượt mà, không gây re-render các thành phần hiển thị dữ liệu nặng

  Bối cảnh:
    Cho một hệ thống Knowledge OS đã nạp sẵn danh mục và chủ đề chuẩn

  Kịch bản: 1. Khởi tạo Navigation Context với giá trị mặc định chuẩn xác
    Khi NavigationProvider được gắn vào cây component
    Thì activeTab mặc định phải là "dashboard"
    Và selectedTopicId mặc định phải là null
    Và searchQuery mặc định phải là chuỗi rỗng
    Và selectedCategoryFilter mặc định phải là null
    Và selectedTagFilter mặc định phải là null

  Kịch bản: 2. Cập nhật trạng thái điều hướng qua các action setter
    Cho NavigationProvider đang hoạt động
    Khi người dùng gọi setActiveTab với "topics"
    Và người dùng gọi setSearchQuery với "Bát Chánh Đạo"
    Và người dùng gọi setSelectedCategoryFilter với "cat-phat-hoc"
    Thì activeTab phải đổi thành "topics"
    Và searchQuery phải đổi thành "Bát Chánh Đạo"
    Và selectedCategoryFilter phải đổi thành "cat-phat-hoc"

  Kịch bản: 3. Chuyển đến chi tiết chủ đề qua openTopicDetail
    Cho NavigationProvider đang hoạt động
    Khi người dùng gọi openTopicDetail với "topic-tam-tu-niem-xu"
    Thì selectedTopicId phải đổi thành "topic-tam-tu-niem-xu"
    Và activeTab phải tự động chuyển thành "topics"

  Kịch bản: 4. Đồng bộ hai chiều giữa useNavigation và Facade useData
    Cho DataProvider bọc NavigationProvider
    Khi một component cập nhật activeTab thông qua useNavigation
    Thì component khác đọc activeTab từ useData phải nhận được giá trị mới nhất
    Và khi một component cập nhật searchQuery thông qua useData
    Thì component khác đọc searchQuery từ useNavigation phải nhận được giá trị mới nhất

  Kịch bản: 5. Render Isolation - Cách ly re-render giữa Navigation và Data
    Cho một component A chỉ sử dụng useNavigation để hiển thị activeTab
    Và một component B chỉ sử dụng useDomainData để hiển thị danh sách categories
    Khi activeTab hoặc searchQuery thay đổi
    Thì component A phải re-render
    Nhưng component B không được phép re-render
