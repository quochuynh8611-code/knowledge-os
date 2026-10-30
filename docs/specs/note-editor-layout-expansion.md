# Spec: Note Editor Layout Expansion & Focus Writing Mode

## 1. Mục tiêu & Bối cảnh
- **Bối cảnh:** Hộp thoại tạo và chỉnh sửa ghi chú (`NoteFormModal.tsx`) trước đây có chiều rộng hẹp (`max-w-xl` ~576px) và khung nội dung cố định nhỏ, gây hạn chế tầm nhìn khi soạn thảo ghi chú học tập và nghiên cứu chuyên sâu.
- **Mục tiêu:**
  1. Mở rộng chiều rộng modal trên desktop lên tối đa `1.024px` (`max-w-5xl`), đồng thời co giãn vừa vặn với khoảng lề an toàn trên màn hình nhỏ/mobile.
  2. Tách Header, Provenance Banner (nếu có) và Footer ra khỏi vùng cuộn body (`shrink-0`), bảo đảm nút Lưu/Hủy luôn tiếp cận được trong viewport.
  3. Tăng chiều cao khả dụng của vùng viết theo độ phân giải màn hình và bổ sung chế độ "Mở rộng vùng viết" (Focus Writing Mode) dùng cơ chế flexbox để textarea tự động chiếm toàn bộ chiều cao còn lại của thân modal.
  4. Thu gọn `sourcePath` và `tags` vào mục "Thông tin bổ sung" (Accordion) có chỉ báo tóm tắt số lượng thẻ, trạng thái tệp nguồn và liên kết ARIA (`aria-expanded`, `aria-controls` với ID duy nhất qua `useId()`).

## 2. Non-Goals (Không thuộc phạm vi)
- Không thêm toolbar Markdown, preview, hay thư viện soạn thảo (editor library) mới.
- Không thay đổi `DataContext`, API route, schema Prisma, hay cơ chế lưu trữ.
- Không can thiệp các vấn đề ngoài scope: draft reset khi dữ liệu ngữ cảnh cập nhật, Enter-to-submit trên ô tiêu đề, xác nhận đóng khi đang sửa dở (dirty close guard), hay trạng thái lưu bất đồng bộ (async save).
- Không thay đổi hành vi phím `Tab` (giữ nguyên mặc định điều hướng focus của trình duyệt).

## 3. Đặc tả Hành vi Giao diện & Responsive Layout
- **Container Modal (`<form>`):**
  - Chiều rộng tối đa `1.024px` trên desktop, co giãn theo viewport trên mobile và không gây tràn ngang (`horizontal overflow`).
  - Ở chế độ thường: giới hạn chiều cao tối đa `92vh` (`max-h-[92vh]`), chiều cao thực tế ôm theo nội dung và cuộn bên trong thân form khi nội dung vượt khung.
  - Ở chế độ tập trung (Focus Writing Mode): modal mở cố định ở mức `92vh` (`h-[92vh]`) để tạo không gian dọc cho phần tử flex con giãn nở.
- **Header & Provenance Banner (`shrink-0`):**
  - Cố định phía trên vùng cuộn; hiển thị tiêu đề modal, badge trạng thái "Chế độ tập trung" khi bật Focus mode, nút đóng `X` (`type="button"`), và thanh thông tin nguồn trích dẫn (`initialProvenance`) nếu có.
- **Thân Form Cuộn (`data-testid="note-form-body"`, `flex-1 min-h-0 overflow-y-auto flex flex-col`):**
  - **Chế độ thường (Standard Mode):**
    - Hàng 1: Chọn chủ đề liên kết & Phân loại ghi chú (chia cột trên màn hình `md+`, xếp dọc trên mobile).
    - Hàng 2: Ô nhập tiêu đề ghi chú (`title`).
    - Hàng 3: Khung nội dung (`textarea`) có chiều cao tối thiểu thích ứng theo kích thước màn hình (`200px` trên mobile, `260px` trên tablet `sm+`, `320px` trên desktop `lg+`), đi kèm nút bật/tắt `Mở rộng vùng viết` (`type="button"`, `aria-pressed="false"`).
    - Hàng 4: Mục "Thông tin bổ sung (Thẻ & Tệp nguồn)" dạng Accordion:
      - Mặc định thu gọn (`aria-expanded="false"`, panel gắn thuộc tính `hidden` để loại khỏi tab order và cây accessibility).
      - Hiển thị badge tóm tắt số lượng thẻ (`N thẻ`), trạng thái đường dẫn nguồn (`Có tệp nguồn` / `Chưa gắn tệp`) và cảnh báo nếu đường dẫn nằm ngoài thư mục gốc.
  - **Chế độ Tập trung (Focus Writing Mode):**
    - Thu gọn phần chọn chủ đề/phân loại thành một thanh tóm tắt 1 dòng (nếu chưa có chủ đề hợp lệ sẽ hiển thị `"Chưa chọn chủ đề"`) kèm nút `"Chỉnh sửa thông tin"` (`type="button"`) để quay lại chế độ thường bất cứ lúc nào.
    - Giữ hiển thị ô tiêu đề ghi chú (`title`).
    - Ẩn khu vực Accordion "Thông tin bổ sung" bằng thuộc tính `hidden` nhưng giữ nguyên trạng thái đã nhập trong bộ nhớ.
    - Khung bao và bản thân `textarea` chuyển sang bố cục flex (`flex-1 min-h-0` trên khung bao và `flex-1 min-h-[160px] resize-none` trên `textarea`), tận dụng toàn bộ chiều cao còn lại của thân modal đồng thời giữ sàn tối thiểu `160px` để an toàn trên màn hình thấp.
    - Giữ nguyên cùng một phần tử DOM `HTMLTextAreaElement` (không unmount/remount) và bảo toàn dữ liệu nháp khi chuyển đổi qua lại.
- **Footer (`shrink-0`):**
  - Cố định ở đáy `<form>`, nằm ngoài vùng cuộn body, gồm nút `Hủy bỏ` (`type="button"`) và nút `Tạo Ghi Chú` / `Lưu Ghi Chú` (`type="submit"`).

## 4. Hướng dẫn Chạy Tái Lập Browser Harness Cô Lập
Harness cô lập mount trực tiếp `NoteFormModal` và stylesheet thật (`src/index.css`) với `DataContext.Provider` giả lập trong bộ nhớ, chặn mọi truy cập mạng ra ngoài và không chạm tới dev server ở port `3000`.

1. **Khởi động Vite server cho harness tại port `5174`:**
   ```bash
   npx vite --host 127.0.0.1 --port 5174 --strictPort
   ```
   - URL trang harness: `http://127.0.0.1:5174/tests/harness/note-editor-harness.html`
   - Các kịch bản fixture in-memory hỗ trợ qua query string:
     - Mặc định: `?scenario=default`
     - Dữ liệu dài + Provenance + 10 tags: `?scenario=long-fixture`
     - Chưa có chủ đề hợp lệ: `?scenario=empty-topics`
2. **Chạy bộ kiểm thử Playwright E2E:**
   - Dùng browser mặc định của Playwright (nếu máy đã cài Playwright browsers):
     ```bash
     npx playwright test tests/e2e/note-editor-layout-harness.spec.ts
     ```
   - Dùng Google Chrome hệ thống (trên máy chưa cài bộ binary riêng của Playwright):
     ```bash
     PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/e2e/note-editor-layout-harness.spec.ts
     ```
   - Ảnh chụp màn hình mặc định được lưu vào thư mục output của Playwright (`test-results/...` qua `testInfo.outputPath(...)`). Có thể ghi đè thư mục lưu ảnh bằng biến môi trường `HARNESS_SCREENSHOT_DIR=/duong/dan/thu/muc`.
3. **Dừng tiến trình harness:**
   - Nhấn `Ctrl+C` tại đúng terminal khởi động harness.
   - Nếu chạy nền, chỉ dừng PID đã lưu từ process do phiên đó tạo, sau khi kiểm tra danh tính process. Không chạy lệnh kill theo port và không tác động tới tiến trình ở port `3000`.

## 5. Giới hạn Hiện Tại (Known Limitations)
- **Bộ gõ tiếng Việt IME thực tế:** Các bài kiểm thử tự động hiện điền chuỗi tiếng Việt dựng sẵn qua DOM/Playwright, chưa kiểm chứng chu trình sự kiện composition (`compositionstart` / `compositionupdate` / `compositionend`) của bộ gõ IME thực tế (Unikey / macOS Vietnamese input).
- **Kiểm toán Accessibility (A11y):** Mới kiểm chứng các thuộc tính ARIA và trạng thái `hidden` phục vụ điều hướng cơ bản; chưa thực hiện audit toàn diện với trình đọc màn hình thực tế (VoiceOver/NVDA), kiểm tra focus trap toàn phần hay đo độ tương phản ở chế độ tối (Dark mode).
- **An toàn dữ liệu nháp (Draft / Save Safety):** Các vấn đề về tự động lưu nháp (autosave), cảnh báo khi đóng lúc đang gõ dở, khóa nút khi lưu bất đồng bộ và reset form khi context cập nhật nằm ngoài phạm vi của bản nâng cấp bố cục này.
