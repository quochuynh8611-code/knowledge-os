# ADR-018: Phân Rã Ngữ Cảnh Điều Hướng (Navigation Context Decomposition) & Kiến Trúc Facade

- **Mã ADR:** ADR-018
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-27
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi tài liệu:** Tách UI Navigation State ra khỏi DataContext, thiết lập Provider Topology phân cấp và bảo toàn tương thích ngược qua Facade Pattern.

---

## 1. Bối Cảnh (Context)
Sau khi hoàn thành tách Study Timer (`StudyTimerContext` - P0.1), Storage SSOT (`dataRepository` - P0.2), và Backend Composition Root (`server.ts` - P0.3), điểm nghẽn hiệu năng và phân quyền còn lại nằm ở `DataContext.tsx`:
- `DataContext` hiện đang quản lý song song dữ liệu thực thể (categories, topics, notes, resources, tags) và trạng thái hiển thị tạm thời (activeTab, searchQuery, filters, selectedTopicId).
- Mọi thao tác gõ phím trong ô tìm kiếm hoặc click chọn tab đều kích hoạt re-render toàn bộ subscriber của `DataContext`.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Trích xuất `NavigationContext` độc lập**:
   - Quản lý: `activeTab`, `selectedTopicId`, `searchQuery`, `selectedCategoryFilter`, `selectedTagFilter`, `openTopicDetail`.
   - Cung cấp hook `useNavigation()`.
2. **Topology Provider Phân Cấp (Hierarchical Provider Topology)**:
   - `NavigationProvider` nằm ngoài `InnerDataProvider` bên trong cấu trúc `DataProvider`:
     ```tsx
     export function DataProvider({ children }: { children: ReactNode }) {
       return (
         <NavigationProvider>
           <InnerDataProvider>{children}</InnerDataProvider>
         </NavigationProvider>
       );
     }
     ```
   - Đảm bảo **Zero Circular Dependency**: `NavigationContext` hoàn toàn không biết tới `DataContext`.
3. **Facade Compatibility Contract**:
   - `useData()` tiếp tục trả về đầy đủ các trường và hàm của `NavigationContext` thông qua cơ chế ủy quyền (delegation) bên trong `InnerDataProvider`.
   - 100% component hiện tại đang sử dụng `useData()` không cần sửa đổi khẩn cấp và không bị gãy giao diện.
4. **Render Isolation**:
   - Các component điều hướng chuyên biệt (Sidebar, Navbar, CommandPalette, ShortcutsModal) có thể chuyển dần sang sử dụng `useNavigation()` để hoàn toàn cách ly khỏi các thay đổi dữ liệu thực thể.

---

## 3. Đánh Giá Quyết Định: Hai Chiều (Two-Way Door)

- **Thuận nghịch hoàn toàn (Reversible)**: Không tác động tới REST API, Prisma schema hay LocalStorage format.
- **Tiêu chuẩn kiểm thử bắt buộc**:
  - Test Unit độc lập cho `NavigationContext`.
  - Test Parity giữa `useNavigation()` và Facade `useData()`.
  - Test Render Isolation: Component chỉ subscribe Navigation không bị re-render khi Data thay đổi, và ngược lại.
  - Zero regression trên 99 test files (615 tests).
