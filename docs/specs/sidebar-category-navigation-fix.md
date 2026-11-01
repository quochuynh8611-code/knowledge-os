# Đặc Tả Kỹ Thuật: Sửa Lỗi Điều Hướng "Lĩnh Vực Nghiên Cứu" Tại AppSidebar

## 1. Bối cảnh & Hiện tượng lỗi
- **Hiện tượng**: Khi người dùng đang xem chi tiết một chủ đề (`activeTab = 'topics'`, `selectedTopicId` khác `null`), việc bấm chọn bất kỳ lĩnh vực nào ở sidebar ("Lĩnh Vực Nghiên Cứu", ví dụ: Phật Học, Công Nghệ, Đông Y...) không làm giao diện quay về danh sách chủ đề của lĩnh vực đó. Màn hình vẫn bị kẹt ở giao diện chi tiết (`TopicDetail`). Người dùng buộc phải bấm chuyển sang tab khác (ví dụ: Tổng quan, Ghi chú) rồi bấm lại lĩnh vực mới thấy tác dụng.
- **Mục tiêu hành vi**:
  1. Thoát ngay lập tức khỏi màn hình chi tiết chủ đề đang mở.
  2. Hiển thị cây/danh sách chủ đề (`TopicTree`).
  3. Áp dụng chính xác bộ lọc lĩnh vực được chọn.
  4. Giữ nguyên semantics toggle hiện có:
     - Bấm lĩnh vực chưa chọn: chọn lĩnh vực đó, thoát chi tiết chủ đề, lọc danh sách chủ đề theo lĩnh vực.
     - Bấm lại lĩnh vực đang chọn: bỏ bộ lọc (toàn bộ chủ đề), thoát chi tiết chủ đề, hiển thị toàn bộ cây chủ đề.
  5. Đồng bộ URL hash routing: hash phản ánh `#/topics?cat=...` hoặc `#/topics`, không còn tham chiếu `selectedTopicId` cũ.

## 2. Xác minh nguyên nhân gốc rễ trên Local Codebase
- **`src/components/layout/AppSidebar.tsx` (dòng 383–389)**:
  ```tsx
  <button
    key={root.id}
    onClick={() => {
      setSelectedCategoryFilter(isSelected ? null : root.id);
      setActiveTab('topics');
    }}
  ```
  Handler chọn lĩnh vực cập nhật `selectedCategoryFilter` và gọi `setActiveTab('topics')`, nhưng **hoàn toàn không gọi `setSelectedTopicId(null)`**.
- **`src/App.tsx` (dòng 337–342)**:
  ```tsx
  case "topics":
    return (
      <React.Suspense fallback={<TabLoadingFallback />}>
        {selectedTopicId ? <TopicDetail /> : <TopicTree />}
      </React.Suspense>
    );
  ```
  Khi `selectedTopicId !== null`, App ưu tiên render `<TopicDetail />` thay vì `<TopicTree />`.
- **`src/context/NavigationContext.tsx` (dòng 156–162)**:
  ```tsx
  const setActiveTab = useCallback((tab: ActiveTab) => {
    setActiveTabState(tab);
    setSubViewState(null);
    if (tab !== "topics" && tab !== "flashcards" && tab !== "mindmap") {
      setSelectedTopicIdState(null);
    }
  }, []);
  ```
  Khi gọi `setActiveTab('topics')`, nếu người dùng vốn đang ở tab `topics` (hoặc chuyển sang `topics`), `NavigationContext` giữ nguyên `selectedTopicId`.
- **Hệ quả kết hợp**: Vì `selectedTopicId` không bị xóa khi người dùng bấm vào một lĩnh vực trong sidebar, `App.tsx` tiếp tục render `TopicDetail`, khiến người dùng có cảm giác nút bấm lĩnh vực bị "đơ" hoặc không có tác dụng.

## 3. Phạm vi sửa đổi & Blast Radius
- **Phạm vi sửa đổi tối thiểu**: Chỉ sửa handler click lĩnh vực tại `src/components/layout/AppSidebar.tsx`:
  Bổ sung `setSelectedTopicId(null)` khi click lĩnh vực.
- **Lý do không sửa toàn cục trong `NavigationContext.tsx`**:
  Việc thay đổi semantics của `setActiveTab('topics')` trong `NavigationContext` sẽ làm vỡ tính năng giữ trạng thái chủ đề khi người dùng chuyển qua lại giữa các tab (ví dụ: chuyển từ chủ đề sang mindmap/flashcards rồi quay lại). Sửa tại handler của `AppSidebar` đảm bảo blast radius tối thiểu, dễ cô lập và dễ rollback.
- **Ràng buộc phạm vi**:
  - Không sửa nút "xem tất cả" hoặc nút "Chủ đề học".
  - Không thay đổi hành vi sidebar thu gọn.
  - Không thay đổi backend, database, API, hoặc seed data.
  - Tuyệt đối tuân thủ quy tắc `Zero-Default Universal Baseline` (ADR-076).

## 4. Kịch bản Gherkin Đặc Tả Kiểm Thử (Regression Test Suite)

```gherkin
Feature: Điều hướng Lĩnh Vực Nghiên Cứu tại AppSidebar

  Scenario: Chuyển lĩnh vực từ màn hình chi tiết chủ đề
    Given người dùng đang xem chi tiết chủ đề A thuộc lĩnh vực Phật Học
    And hệ thống có chủ đề B thuộc lĩnh vực Công Nghệ
    When người dùng bấm lĩnh vực Công Nghệ ở sidebar
    Then màn hình chi tiết chủ đề A không còn hiển thị
    And cây chủ đề hiển thị chủ đề B
    And không hiển thị chủ đề A trong danh sách đã lọc
    And lĩnh vực Công Nghệ được đánh dấu đang chọn
    And URL hash chuyển về dạng #/topics?cat=cat-cong-nghe (không còn topic-a)

  Scenario: Chọn lĩnh vực không có chủ đề
    Given người dùng đang mở chi tiết một chủ đề
    And lĩnh vực Kinh Doanh không có chủ đề nào
    When người dùng bấm lĩnh vực Kinh Doanh ở sidebar
    Then thoát màn hình chi tiết chủ đề
    And hiển thị trạng thái rỗng tương ứng của cây chủ đề
    And không còn lưu giữ nội dung chi tiết chủ đề cũ

  Scenario: Bấm lại lĩnh vực đang chọn (toggle off)
    Given bộ lọc Phật Học đang được chọn
    And người dùng đang mở chi tiết một chủ đề
    When người dùng bấm lại lĩnh vực Phật Học ở sidebar
    Then bộ lọc lĩnh vực được gỡ bỏ
    And hiển thị cây chủ đề chứa đầy đủ các lĩnh vực (không lọc)
    And không tiếp tục hiển thị trang chi tiết chủ đề cũ

  Scenario: Chọn lĩnh vực từ tab khác
    Given người dùng đang ở tab Tổng quan (dashboard)
    When người dùng bấm lĩnh vực Công Nghệ ở sidebar
    Then chuyển sang tab cây chủ đề (topics)
    And áp dụng bộ lọc lĩnh vực Công Nghệ

  Scenario: Chuyển liên tiếp giữa các lĩnh vực
    Given người dùng đang xem cây chủ đề lọc theo Phật Học
    When người dùng bấm Công Nghệ rồi bấm tiếp Đông Y ở sidebar
    Then cây chủ đề phản ánh chính xác lĩnh vực Đông Y
    And người dùng không cần chuyển sang tab trung gian nào

## 5. Verification and known limitations

### Runtime Patch
- Chỉ sửa handler click lĩnh vực tại `src/components/layout/AppSidebar.tsx` bằng cách thêm `setSelectedTopicId(null);` trước `setActiveTab('topics');`.
- Không thay đổi `src/context/NavigationContext.tsx`, `src/App.tsx`, hash router, hay backend/database trong thay đổi này.

### Verification Results (Báo cáo gần nhất)
- **Targeted Integration Suite** (`tests/integration/sidebar-category-navigation.test.tsx`): 5/5 scenarios PASS.
- **Related Regression Suites**: 23/23 tests PASS.
  - `tests/integration/app-shell-collapsible-sidebar.test.tsx`: 14/14 PASS.
  - `tests/unit/navigation-hash-sync.test.tsx`: 5/5 PASS.
  - `tests/unit/navigation-context.test.tsx`: 4/4 PASS.
- **Typecheck** (`npm run typecheck` / `tsc --noEmit`): PASS (0 lỗi).
- **ESLint** (`npx eslint src/components/layout/AppSidebar.tsx tests/integration/sidebar-category-navigation.test.tsx`): PASS (0 lỗi, 0 cảnh báo).

### Known Limitations
- **Bốn fixed-delay 20 ms trong test**: Các scenario 1, 2, 3, 4 trong file test vẫn đang sử dụng `await new Promise((r) => setTimeout(r, 20));` trước khi click để nhường event loop giải phóng cờ đồng bộ `isSyncingFromHash.current` trong `NavigationContext`.
- **`asyncUtilTimeout 5000 ms`**: Thiết lập toàn cục tại đầu file test để tránh timeout khi render toàn bộ cây ứng dụng trong môi trường JSDOM.
- **React `act(...)` warnings**: Xuất hiện trong quá trình chạy test do các component modal con của App cập nhật background state chưa được bọc `act`. Các warning này chưa được xử lý và không được khẳng định là hoàn toàn vô hại trong mọi trường hợp.
- **Chưa xác minh browser thật**: Toàn bộ kết quả kiểm chứng hiện tại chỉ được thực hiện trên môi trường tự động (JSDOM / Vitest). Chưa xác minh trên trình duyệt thực tế.
- **Chưa chứng minh test hiện tại giống bản trước quá trình tái dựng**: Phiên bản test hiện tại được tái dựng từ transcript sau các lần khôi phục thất bại, chưa có bằng chứng hash/commit chứng minh giống 100% bản trước đó.
- **Test Checksum**: SHA-256 hiện tại của `tests/integration/sidebar-category-navigation.test.tsx` là `4a5b7b90bd45a4bc157fd5c4b538aed22bfc0c87c63fc606ff31873eb88a306b` để làm mốc đối chiếu review.
- **Khả năng Flaky**: Việc 5 test PASS trong môi trường hiện tại không khẳng định test hoàn toàn không flaky khi chạy trên môi trường có độ trễ hoặc tải CPU cao.

```
