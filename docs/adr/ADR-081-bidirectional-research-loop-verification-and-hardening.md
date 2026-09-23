# ADR-081 — Bidirectional Research Loop Verification, Lifecycle Hardening & Reader Release Quality Gates

## Status

Proposed

---

## 1. Context

Qua các Phase 19, 20, 21A và 21B, hệ thống Unified Research Reader trong Knowledge OS đã hoàn thiện các năng lực nền tảng:
- **Phase 19 (ADR-077):** Điều hướng trích dẫn 2 chiều (`archive://{documentId}?loc={locator}`).
- **Phase 20 (ADR-078):** Điều phối trích dẫn toàn cục từ Topic và Notes sang các Reader chuyên biệt.
- **Phase 21A (ADR-079):** Trích xuất và phát hiện liên kết ngược (Citation Backlinks Explorer).
- **Phase 21B (ADR-080):** Điều hướng chính xác tới occurrence trích dẫn trong `NoteReaderModal` với `scrollIntoView` và transient visual focus.

Trước khi tiến hành đóng gói phát hành (Reader Subsystem Release), hệ thống cần một giai đoạn chuẩn hóa, kiểm định toàn trình (End-to-End Loop Verification) và làm vững chắc vòng đời giao diện (Lifecycle Hardening) để ngăn chặn các lỗi phát sinh do timing, unmount đột ngột, ký tự đặc biệt trong locator hoặc phân tán ranh giới kiểm thử.

---

## 2. Problem Statement

1. **Thiếu Bài Test Kiểm Thử Chu Trình Toàn Trình:** Các bài test hiện tại kiểm tra từng lát cắt độc lập (Parser, Selector, Modal, Sidebar), chưa có bài kiểm thử liên hoàn từ lúc bôi đen tạo citation đến lúc phát hiện backlink và nhảy ngược lại Reader.
2. **Rủi Ro Về Timing & Unmount:** Việc kích hoạt `setTimeout` (2.5s) cho visual pulse highlight có thể gây rò rỉ bộ nhớ hoặc lỗi truy cập phần tử nếu người dùng đóng mở modal liên tục trong thời gian ngắn.
3. **Ký Tự Đặc Biệt Trong Locator:** Locator có thể chứa các ký tự URL phức tạp (`%`, `&`, `#`, `.`, `:`), nếu query trực tiếp vào DOM mà không escape an toàn có thể ném `SyntaxError`.
4. **Nhiễu Rào Cản Release (Release Gate Flakiness):** Sự phụ thuộc vào kết quả chạy full-repo (>340 test files) có nguy cơ làm tắc nghẽn quyết định phát hành do các module legacy không liên quan gây ra flakiness.

---

## 3. Decision

Ban kiến trúc kỹ thuật quyết định triển khai các giải pháp chuẩn hóa sau:

1. **Chuẩn Hóa Chu Trình Nghiên Cứu Hai Chiều (Bidirectional Research Loop):**
   - Khép kín và xác nhận luồng:
     $$\text{Reader} \rightarrow \text{Selection/Excerpt} \rightarrow \text{Save Note} \rightarrow \text{Backlinks Discovery} \rightarrow \text{Note Modal} \rightarrow \text{Occurrence Focus} \rightarrow \text{Jump to Reader} \rightarrow \text{Close Modal} \rightarrow \text{Preserve State}$$
2. **Xây Dựng Test Integration Chuyên Trách:**
   - Tạo file `tests/integration/reader-loop-hardening.test.tsx` làm bài kiểm tra chuẩn mực cho toàn bộ chu trình 7 bước.
3. **Hardening Vòng Đời & Timing Trong `NoteReaderModal`:**
   - Quản lý timer highlight bằng `useEffect` cleanup hook, đảm bảo gỡ bỏ class và hủy timer ngay khi modal unmount hoặc khi đổi target citation.
   - Bọc toàn bộ DOM query bằng hàm `escapeSelectorValue` tương thích đa môi trường (Browser `CSS.escape` và Fallback RegExp).
   - Bảo vệ an toàn phương thức `scrollIntoView` với optional chaining `targetElement.scrollIntoView?.()`.
4. **Kiểm Soát Vòng Đời Phiên Đọc Trong `UnifiedResearchReader`:**
   - Sử dụng `globalReadingPositionStore` đảm bảo vị trí đọc luôn được duy trì xuyên suốt quá trình mở, điều hướng và đóng `NoteReaderModal`.
5. **Thiết Lập Quality Gates Hai Tầng (Two-Tier Quality Gates):**
   - **Tier 1 (Blocking Release Gate):** `git diff --check`, `npm run typecheck`, và bộ Reader Subsystem Regression Suite (< 10s, 100% deterministic pass).
   - **Tier 2 (Informational Monitor):** Chạy full suite repository để quan sát nhưng không chặn phát hành Reader.
6. **Duy Trì Tuyệt Đối Các Ranh Giới An Toàn:**
   - Không thay đổi schema, không đổi format `archive://{documentId}?loc={locator}`, không ghi vào Obsidian Vault.

---

## 4. Scope & Explicit Non-Goals

### In Scope
- Hardening lifecycle & timing trong `NoteReaderModal.tsx` và `UnifiedResearchReader.tsx`.
- Xây dựng `tests/integration/reader-loop-hardening.test.tsx`.
- Xây dựng tài liệu đặc tả Phase 22, ADR-081, Gherkin scenarios và Test Matrix.

### Non-Goals
- Không thêm UI nút điều hướng occurrence tiếp theo/trước đó.
- Không mở rộng backlinks sang Flashcards hay Graph View.
- Không lưu persistent index trên disk/database.
- Không ghi vào Obsidian Vault.

---

## 5. Alternatives Considered

| Giải Pháp Cân Nhắc | Ưu Điểm | Nhược Điểm | Quyết Định |
|---|---|---|---|
| **A. Dùng Full Repository Suite làm Blocking Gate** | Bao quát toàn bộ codebase. | Chạy rất lâu (>280s), dễ bị chặn bởi các module legacy cũ không liên quan. | **Bác bỏ** |
| **B. Mở rộng trực tiếp các file test unit hiện có** | Không tạo thêm file mới. | Làm phình to test files, lẫn lộn giữa unit test cấp thấp và integration loop cấp cao. | **Bác bỏ** |
| **C. Tạo test integration chuyên trách + Tier 1 Quality Gate (Được chọn)** | Tách bạch rõ ràng, kiểm thử toàn trình 7 bước, chạy cực nhanh (< 10s), deterministic 100%. | Cần duy trì thêm 1 file integration test. | **Chấp thuận** |

---

## 6. Trade-offs

- **Lợi ích:** Tăng độ tin cậy của Reader Subsystem lên mức production-ready, loại bỏ triệt để nguy cơ rò rỉ bộ nhớ khi unmount modal, đảm bảo việc mở/đóng modal không bao giờ làm mất vị trí đọc của người dùng.
- **Chi phí:** Bổ sung thêm 1 bài test integration toàn trình và thêm các đoạn mã phòng vệ nhỏ trong `NoteReaderModal.tsx`.

---

## 7. Blast Radius Classification

- **Phạm vi tác động trực tiếp (Low Blast Radius):**
  - `src/components/modals/NoteReaderModal.tsx` (timer cleanup và selector escaping).
  - `src/components/reader/UnifiedResearchReader.tsx` (bảo toàn reading position).
  - `tests/integration/reader-loop-hardening.test.tsx` (test mới).
- **Phạm vi hoàn toàn không bị ảnh hưởng (Zero Blast Radius):**
  - Database schema, REST API, Obsidian Vault storage.
  - `src/lib/markdownReadability.tsx`, `src/lib/readerBacklinksSelector.ts`, `src/lib/readerDocumentResolver.ts`.

---

## 8. Safety & Invariants

1. **Purely Non-Mutating:** Không ghi đè hoặc tạo mới bất kỳ tệp tin nào trong Obsidian Vault.
2. **Session Persistence:** Vị trí đọc hiện tại không bao giờ bị reset về 0 khi người dùng đóng modal ghi chú.
3. **Degradation Safety:** Khi gặp citation lỗi hoặc locator không tồn tại, modal hiển thị bình thường ở đầu trang mà không ném lỗi.

---

## 9. Testing & Release Quality Gates

- **Lệnh Kiểm Định Tier 1 (Bắt buộc 100% Xanh):**
  ```bash
  git diff --check
  npm run typecheck
  npx vitest run tests/unit/reader-citation-backlinks-selector.test.ts tests/unit/note-reader-archive-deeplink.test.tsx tests/unit/reader-sidebar-citation-jump.test.tsx tests/unit/reader-sidebar-document-notes.test.tsx tests/integration/reader-bidirectional-citation.test.tsx tests/integration/global-citation-orchestration.test.tsx tests/integration/reader-loop-hardening.test.tsx
  ```

---

## 10. Rollback Strategy

Nếu có bất kỳ vấn đề phát sinh không mong muốn trong Phase 22, hệ thống có thể hoàn tác an toàn về commit `9134759` mà không ảnh hưởng tới bất kỳ dữ liệu lưu trữ hay trạng thái người dùng nào.

---

## 11. Consequences

- Hệ thống Reader của Knowledge OS đạt trạng thái hardened, sẵn sàng cho việc sử dụng thực tế hàng ngày của người dùng.
- Quy trình phát hành Reader được chuẩn hóa với Quality Gate minh bạch và đáng tin cậy.

---

## 12. Open Questions

- Không còn câu hỏi kỹ thuật tồn đọng. Mọi quyết định đều kế thừa và tương thích 100% với ADR-077 đến ADR-080.
