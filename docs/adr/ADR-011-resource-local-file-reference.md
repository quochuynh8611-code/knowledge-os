# ADR-011: Quản Lý Tài Liệu Tham Khảo Bằng Tham Chiếu Đường Dẫn Cục Bộ (Local File Reference) & Web URL

- **Mã ADR:** ADR-011
- **Trạng thái:** IMPLEMENTED & VERIFIED
- **Ngày tạo:** 2026-08-24
- **Ngày hoàn tất kiểm chứng:** 2026-08-24
- **Phạm vi đã triển khai (Implemented Scope):**
  - `src/lib/validation.ts` (`ResourceCreateSchema` source presence constraint, `ResourceUpdateSchema`)
  - `src/components/modals/ResourceFormModal.tsx` (Source mode selector `web | local`, input switching, payload isolation)
  - `tests/unit/resource-local-reference.test.ts` (8/8 tests pass)
  - `tests/unit/resource-form-modal.test.tsx` (6/6 tests pass)
- **Phạm vi loại trừ / Định hướng tương lai (Out of Scope / Future Considerations):**
  - Cập nhật huy hiệu Web/Local trên `ResourcesManager.tsx` và `TopicDetail.tsx`
  - Nút "Sao chép đường dẫn" và viewer preview trên `ResourceViewerModal.tsx`
  - Finder / File System Access API integration
  - Tích hợp cầu nối Obsidian / NotebookLM

---

## 1. Bối Cảnh (Context)

Hệ thống Knowledge OS (Dashboard Nghiên Cứu Phật Học & Huyền Học) cho phép người nghiên cứu đính kèm các tài liệu tham khảo (sách, kinh điển, bài giảng, tài liệu PDF, video, audio) vào từng chủ đề (Topic).

Người dùng có nhu cầu quản lý tài liệu lưu trữ sẵn trên ổ cứng cục bộ (ví dụ: kho sách PDF Kinh Điển Pali, Luận giải Abhidhamma, tài liệu scan Kỳ Môn Độn Giáp, v.v.).

Cần đưa ra quyết định kiến trúc rõ ràng về phương thức xử lý tài liệu cục bộ:
- **Lựa chọn A (Binary Upload/Ingestion):** Tải file lên server/DB hoặc chuyển sang Base64 lưu trong LocalStorage.
- **Lựa chọn B (Local File Reference Only):** Chỉ lưu trữ đường dẫn tham chiếu (`filePath`) trỏ tới vị trí file trên máy tính của người dùng; giữ nguyên tính năng nhập URL web (`url`).

---

## 2. Quyết Định Kiến Trúc Đã Triển Khai (Implemented Architecture Decision)

Thực thi **Lựa chọn B — Local File Reference Only**:

1. **Zero Binary Ingestion**:
   - Ứng dụng **tuyệt đối không** upload binary, không lưu base64 vào PostgreSQL hay LocalStorage.
   - Giữ ứng dụng siêu nhẹ (payload mỗi resource chỉ vài chục bytes metadata, < 2KB).
2. **Zero File Mutation**:
   - Không copy, không di chuyển (move), không đổi tên file gốc trên ổ cứng của người dùng.
3. **Dual Source Model**:
   - Hỗ trợ 2 phương thức nguồn tài liệu:
     - **Web URL (`url`)**: Đường dẫn trang web, thư viện trực tuyến (`http://`, `https://`).
     - **Local File Path (`filePath`)**: Đường dẫn tệp tin trên máy tính (`/path/to/file.pdf`, `C:\...`, `file:///...`).
4. **Source Presence Constraint (Đã enforce trong `src/lib/validation.ts`)**:
   - Một `Resource` hợp lệ bắt buộc phải có ít nhất một trong hai trường: `url` hoặc `filePath` (hoặc cả hai).
   - Từ chối mọi payload không có nguồn hoặc chỉ chứa chuỗi rỗng / whitespace.
5. **Form UI Interaction Contract (Đã enforce trong `src/components/modals/ResourceFormModal.tsx`)**:
   - Hỗ trợ bộ chuyển đổi nguồn `sourceMode: 'web' | 'local'`.
   - Khi chọn `web`: Hiển thị field URL (mặc định `https://`).
   - Khi chọn `local`: Hiển thị field `filePath`, không tự động điền `https://`.
   - Khi submit: Cô lập payload (mode web chỉ gửi `url`, mode local chỉ gửi `filePath`).

---

## 3. Các Hạng Mục Loại Trừ Khỏi Phase Này (Explicitly Out of Scope / Non-Goals)

Để giữ phạm vi kiểm thử cô lập và an toàn tuyệt đối cho hệ thống, các hạng mục sau **không thực hiện trong phase này**:
1. Không sửa `ResourceViewerModal.tsx`.
2. Không sửa `ResourcesManager.tsx`.
3. Không sửa `TopicDetail.tsx`.
4. Không thêm badge Web/Local hay nút "Sao chép đường dẫn" ở danh sách.
5. Không can thiệp Finder hay gọi OS shell mở file trực tiếp.

---

## 4. Phân Tích Đánh Đổi (Trade-offs)

### Ưu điểm (Pros):
- **Hiệu năng & Dung lượng**: LocalStorage (~5MB) và PostgreSQL database không bị phình to bởi các file PDF hàng chục/hàng trăm MB.
- **Tốc độ Backup & Restore (Disaster Recovery)**: Checksum snapshot và backup JSON diễn ra tức thì (< 100ms), không bị nghẽn I/O.
- **Bảo mật & Quyền riêng tư**: Ứng dụng không lưu trữ file nhạy cảm lên server.
- **Đơn giản hóa hạ tầng**: Không cần cấu hình S3, Cloud Storage, hay CDN multipart upload.

### Nhược điểm & Rào cản (Cons & Mitigation):
- **Phụ thuộc vị trí file**: Nếu người dùng xóa hoặc đổi tên file trên ổ cứng, đường dẫn `filePath` sẽ bị đứt gãy.
  - *Biện pháp giảm thiểu*: Giao diện cho phép chỉnh sửa nhanh `filePath` thông qua modal.

---

## 5. Invariants Kỹ Thuật (Technical Invariants)

1. `Resource.filePath` chỉ là chuỗi string metadata đại diện cho đường dẫn tệp.
2. Dung lượng JSON của một Resource payload luôn `< 2KB`.
3. Tương thích ngược 100% với 4 `INITIAL_RESOURCES` hiện hữu.
4. Export/Import Payload Schema và Backup Snapshot giữ nguyên vẹn trường `filePath`.

---

## 6. Kết Quả Kiểm Thử (Verification Results)

- `tests/unit/resource-local-reference.test.ts`: **8/8 PASS** (Schema rejection on empty source, backward compatibility, metadata payload size).
- `tests/unit/resource-form-modal.test.tsx`: **6/6 PASS** (Source switcher, input isolation, submit clean payload).
- Full Regression Test Suite (`npm test`): **18/18 test files PASS — 128/128 tests PASS (100% GREEN)**.
- Production Build (`npm run build`): **PASS cleanly**.
