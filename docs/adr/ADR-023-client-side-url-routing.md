# ADR-023: Điều Hướng URL Hash & Deep-Linking (Client-Side URL Hash Routing)

- **Mã ADR:** ADR-023
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi:** `src/context/NavigationContext.tsx`, `src/lib/urlRouting.ts`, `src/App.tsx`

---

## 1. Bối Cảnh (Context)
Hiện tại, toàn bộ điều hướng của Knowledge OS dựa vào `useState` trong `NavigationContext.tsx`. Người dùng không thể bookmark, chia sẻ liên kết trực tiếp tới một chủ đề (`topicId`), và bị mất vị trí làm việc mỗi khi làm mới trình duyệt (F5).

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Sử Dụng URL Hash Routing (`window.location.hash`)**:
   - Chọn giải pháp URL Hash (`#/topics/topic-1`, `#/graph`, `#/search?q=tam`) thay vì History API Path (`/topics/topic-1`) để:
     - Tương thích 100% với static hosting, file:// protocol, GitHub Pages và môi trường không có server rewrite.
     - Triệt tiêu hoàn toàn rủi ro lỗi HTTP 404 khi người dùng refresh trực tiếp một deep-link URL trên server tĩnh.
2. **Module Helper Thuần Túy (`src/lib/urlRouting.ts`)**:
   - Tách toàn bộ logic phân giải URL và tạo URL thành các hàm thuần túy (`parseLocationHash`, `buildLocationHash`) để kiểm thử độc lập và tái sử dụng an toàn.
3. **Đồng Bộ Hai Chiều Với `NavigationContext`**:
   - Khởi tạo giá trị ban đầu của `activeTab`, `selectedTopicId`, `searchQuery`, `selectedCategoryFilter`, `selectedTagFilter` từ `window.location.hash`.
   - Cập nhật `window.location.hash` mỗi khi các setter trong `NavigationContext` được gọi.
   - Đăng ký lắng nghe sự kiện `hashchange` để xử lý thao tác nút Back/Forward của trình duyệt.
4. **Bảo Toàn Khả Năng Tương Thích & Môi Trường Non-Browser**:
   - Nếu chạy trong môi trường SSR/Node.js/Test (thiếu `window`), hệ thống tự động fallback về in-memory state mà không gây crash.

---

## 3. Đánh Giá Trade-offs (Two-Way Door)

- **Ưu điểm**:
  - Tăng trải nghiệm người dùng: bookmark được tab/chủ đề, giữ nguyên trạng thái khi reload trang, nút Back/Forward hoạt động chính xác.
  - Zero Bundle Overhead: không thêm dependency ngoài (`react-router-dom`).
  - Zero Backend Risk: không cần cấu hình rewrite trên Nginx/Express.
- **Rủi ro kiểm soát**: Rất thấp (Logic được bọc trong pure helper và kiểm thử 100%).
