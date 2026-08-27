# ADR-017: Tách Rời State Management & Phân Định Ranh Giới Ngữ Cảnh (State Management Split & Context Boundary)

- **Mã ADR:** ADR-017
- **Trạng thái:** PROPOSED (DRAFT FOR APPROVAL)
- **Ngày tạo:** 2026-08-27
- **Tác giả:** Staff Software Engineer / Technical Architect
- **Phạm vi:** `src/context/DataContext.tsx`, `src/App.tsx`, UI components

---

## 1. Bối Cảnh (Context)

`DataContext.tsx` hiện tại là một **God Context** với quy mô gần 1000 dòng mã, quản lý đồng thời:
1. **Domain Data State:** Categories, Topics, Notes, Resources, Tags.
2. **Navigation & Filter State:** `activeTab`, `selectedTopicId`, `searchQuery`, `selectedCategoryFilter`, `selectedTagFilter`.
3. **Study Timer State:** `activeTimerTopicId`, `timerSeconds`, `isTimerRunning`, `timerMode`, `pomodoroTimeRemaining`, kèm timer interval effect chạy mỗi 1 giây.
4. **Spaced Repetition (SM-2) Logic:** `reviewTopicSM2`, tính toán hàng đợi `reviewQueue`, `stats`.
5. **Import/Export/Disaster Recovery Logic:** `exportAllDataJSON`, `importAllDataJSON`, `resetToDefaultData`, `reloadAllData`.

---

## 2. Vấn Đề (Problem Statement)

1. **Hiệu năng Render không cần thiết (Unnecessary Re-renders):**
   - Bộ đếm thời gian Pomodoro/Stopwatch cập nhật state mỗi 1 giây (`setTimerSeconds`), khiến **toàn bộ các component subscribe vào `useData()`** (kể cả TopicTree, NotesManager, DashboardHome) phải re-evaluate nếu không memoize cẩn thận.
2. **Coupling giữa UI Navigation và Business Data:**
   - Việc chuyển tab (`setActiveTab`) hay chọn bộ lọc tìm kiếm (`setSearchQuery`) nằm chung context với việc thêm/sửa/xóa Topic/Note làm tăng độ phức tạp khi test hoặc tái sử dụng.
3. **Khó bảo trì và mở rộng:**
   - Mọi tính năng mới đều có xu hướng nhồi nhét thêm hàm vào `DataContext`, biến nó thành điểm nghẽn duy nhất của toàn bộ frontend.

---

## 3. Ràng Buộc Bất Biến (Invariants & Constraints)

- **Bảo tồn Backward Compatibility:** Hook `useData()` hiện tại phải tiếp tục hoạt động hoặc được alias tương thích ngược để không làm gãy 85 test suites và hàng chục components UI.
- **Không thay đổi hành vi người dùng:** Phím tắt, chuyển tab, đếm giờ Pomodoro, đánh giá SM-2 phải giữ nguyên trải nghiệm.
- **Tiếp cận từng bước (Evolutionary, Non-Breaking):** Không thực hiện big-bang rewrite.

---

## 4. Các Phương Án Lựa Chọn (Decision Options)

### Phương án A: Tách rời thành 3 Contexts chuyên biệt với Facade Provider
- *Mô tả:*
  1. **`NavigationContext` (`useNavigation`):** Quản lý `activeTab`, `selectedTopicId`, filters, search.
  2. **`StudyTimerContext` (`useStudyTimer`):** Quản lý bộ đếm giờ Pomodoro / Stopwatch và ticker 1s.
  3. **`KnowledgeDataContext` (`useKnowledgeData`):** Quản lý thực thể nghiệp vụ (Categories, Topics, Notes, Resources, Tags) và các CRUD/SM-2 actions.
  4. **`DataProvider` Facade (Legacy Adapter):** Kết hợp 3 contexts con và cung cấp hook `useData()` tổng hợp để tương thích ngược 100% với code hiện hữu.
- *Ưu điểm:*
  - Giải quyết triệt để vấn đề re-render 1s của timer.
  - Phân định rõ ràng trách nhiệm.
  - 100% backward compatible qua Facade pattern.
- *Nhược điểm:* Cần tạo thêm 3 files context con và cập nhật DataProvider bọc ngoài.

### Phương án B: Giữ God Context nhưng dùng React memo và context selectors
- *Mô tả:* Giữ nguyên cấu trúc 1 file DataContext, thêm useMemo tối đa.
- *Ưu điểm:* Không cần tạo file mới.
- *Nhược điểm:* Không giải quyết tận gốc vấn đề kiến trúc; timer ticker vẫn nằm chung context value object.

---

## 5. Khuyến Nghị & Đánh Giá Rủi Ro

> **Khuyến nghị:** Chọn **Phương án A (Tách 3 Contexts chuyên biệt với Facade Provider)**.

| Tiêu chí | Đánh giá |
|---|---|
| **Blast Radius** | 🟢 Low (Nhờ Facade Provider, các component cũ không cần đổi import ngay) |
| **Tính thuận nghịch (Reversibility)** | 🟢 2-way door (Dễ dàng gộp lại hoặc mở rộng độc lập) |
| **Tác động hiệu năng** | 🟢 Loại bỏ hoàn toàn re-render chu kỳ 1s trên cây DOM lớn |

---

## 6. Lộ Trình Triển Khai (Rollout Plan)

- **Bước 1:** Tách `StudyTimerContext` ra khỏi DataContext, đưa ticker 1s vào context riêng.
- **Bước 2:** Tách `NavigationContext` ra khỏi DataContext.
- **Bước 3:** Tinh gọn `KnowledgeDataContext` chỉ còn quản lý dữ liệu tri thức và persistence.
- **Bước 4:** Giữ `useData()` làm aggregate hook xuất từ `DataProvider` bọc ngoài 3 providers.
- **Bước 5:** Chạy toàn bộ 561 tests để xác minh tính toàn vẹn.
