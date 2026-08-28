# ADR-020: Tích Hợp ResearchRepositoryV2 Vào DataContext Qua Adapter Pattern

- **Mã ADR:** ADR-020
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-27
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi:** `src/context/DataContext.tsx`, `src/services/researchRepositoryV2.ts`, `src/services/dataRepository.ts`

---

## 1. Bối Cảnh (Context)
Lớp `ResearchRepositoryV2` được thiết kế trong ADR-015 như một Decorator bọc ngoài `IDataRepository` để chuẩn hóa các thuộc tính nghiên cứu mở rộng (như ghi chú đa chủ đề `Note.topicIds`).
Trước Phase P1.3, `DataContext.tsx` vẫn khởi tạo trực tiếp `ApiDataRepository` hoặc `LocalStorageDataRepository` mà chưa bọc `ResearchRepositoryV2`. Đồng thời `ResearchRepositoryV2` còn thiếu phương thức `resetAllData()`.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Chuỗi Decorator Thống Nhất (Repository Composition Chain)**:
   - Trong `DataContext.tsx`, `dataRepository` được khởi tạo bằng chuỗi:
     ```typescript
     const baseRepo: IDataRepository =
       typeof window !== "undefined"
         ? new ApiDataRepository("/api", new LocalStorageDataRepository(STORAGE_KEY))
         : new LocalStorageDataRepository(STORAGE_KEY);
     const dataRepository: IDataRepository = new ResearchRepositoryV2(baseRepo);
     ```
2. **Quy Tắc Tương Thích Ngược Bắt Buộc (Backward Compatibility Rule)**:
   - Khi lưu một `Note`, nếu `note.topicIds` có phần tử, `ResearchRepositoryV2` tự động gán `topicId = note.topicIds[0]` trước khi chuyển xuống tầng cơ sở.
   - Nếu `note.topicIds` không tồn tại hoặc rỗng, giữ nguyên `note.topicId`.
3. **Hoàn Thiện Interface `IDataRepository`**:
   - `ResearchRepositoryV2` triển khai `resetAllData(): Promise<boolean> { return this.base.resetAllData(); }`.

---

## 3. Đánh Giá Trade-offs: Hai Chiều (Two-Way Door)

- **Ưu điểm**:
  - Tự động kích hoạt quy tắc multi-topic note cho mọi thao tác `addNote` và `updateNote` trong toàn bộ ứng dụng.
  - Xóa bỏ 1 lỗi TypeScript compile (TS2420) trong baseline diagnostics.
  - Zero disruption tới các chức năng hiện có (tất cả các phương thức khác được ủy quyền 100% trong suốt).
- **Rủi ro kiểm soát**: Rất thấp (Zero logic rẽ nhánh ngoài việc gán fallback `topicId = topicIds[0]`).
