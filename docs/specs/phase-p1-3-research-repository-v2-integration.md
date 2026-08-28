# Technical Specification: Phase P1.3 — Tích Hợp ResearchRepositoryV2 Vào DataContext Qua Adapter

## 1. Problem Statement & Motivation
Trong giai đoạn ADR-015 (Research Storage Architecture v1), lớp `ResearchRepositoryV2` đã được tạo ra dưới dạng **Decorator / Adapter Pattern** bọc ngoài `IDataRepository` nhằm mục đích:
1. Hỗ trợ ghi chú đa chủ đề (Multi-Topic Note: `topicIds?: string[]`) với quy tắc tương thích ngược bắt buộc: `topicId = topicIds[0]`.
2. Chuẩn bị ranh giới cho Source Registry và Snapshot History.

Tuy nhiên, `ResearchRepositoryV2` hiện đang ở trạng thái **chưa được tích hợp vào `DataContext.tsx`**:
- `DataContext.tsx` vẫn khởi tạo trực tiếp `ApiDataRepository` bọc `LocalStorageDataRepository` mà chưa đi qua `ResearchRepositoryV2`.
- `ResearchRepositoryV2` còn thiếu phương thức `resetAllData()` dẫn đến lỗi TypeScript TS2420 trong baseline diagnostics.
- Khi người dùng thêm hoặc sửa ghi chú đa chủ đề thông qua `DataContext.addNote()` hoặc `updateNote()`, logic chuẩn hóa `topicId = topicIds[0]` chưa được tự động kích hoạt tại ranh giới repository.

---

## 2. Goals & Non-Goals

### 2.1. Goals
1. **Hoàn thiện Interface Compliance của `ResearchRepositoryV2`**:
   - Bổ sung `resetAllData(): Promise<boolean>` ủy quyền cho `base.resetAllData()`, giải quyết triệt để lỗi TypeScript TS2420.
2. **Tích Hợp Adapter Vào DataContext (Decorator Topology)**:
   - Trong `src/context/DataContext.tsx`, khởi tạo `dataRepository` thông qua chuỗi:
     `ResearchRepositoryV2` ──> `ApiDataRepository` ──> `LocalStorageDataRepository`.
3. **Bảo Đảm Tương Thích Ngược Tuyệt Đối (Zero Drift & Backward Compat)**:
   - Các ghi chú đơn chủ đề (`topicId` truyền thống, không có `topicIds`) hoạt động 100% như cũ.
   - Các ghi chú đa chủ đề (`topicIds: ["top-B", "top-C"]`) tự động được gán `topicId = "top-B"` khi lưu xuống storage / API.
   - `exportAllDataJSON`, `importAllDataJSON`, `resetToDefaultData`, `reloadAllData` đều hoạt động ổn định xuyên suốt chuỗi adapter.

### 2.2. Non-Goals
- Không thay đổi REST API payload format của `/api/notes`.
- Không bắt buộc mọi ghi chú phải có `topicIds` (trường này là tùy chọn / additive).
- Không phá vỡ LocalStorage schema hiện hành.

---

## 3. Adapter Architecture & Decorator Flow

```
                      [UI Components / DataContext]
                                    │
                                    ▼
                      ┌────────────────────────────┐
                      │    ResearchRepositoryV2    │
                      │  (Decorator / Adapter)     │
                      ├────────────────────────────┤
                      │ - saveNote: resolveTopicIds│
                      │   topicId = topicIds[0]    │
                      │ - resetAllData: delegated  │
                      │ - other CRUD: delegated    │
                      └─────────────┬──────────────┘
                                    │
                                    ▼
                      ┌────────────────────────────┐
                      │     ApiDataRepository      │
                      │   (HTTP REST Client Tier)  │
                      └──────┬──────────────┬──────┘
                             │              │
                    (Online) │              │ (Offline / Error)
                             ▼              ▼
                     [Express REST]   [LocalStorageDataRepo]
                             │              │
                             ▼              ▼
                     [PostgreSQL DB]  [Browser LocalStorage]
```

---

## 4. Blast Radius & File Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `src/services/researchRepositoryV2.ts` | **MODIFY** | Thêm `resetAllData()`, hoàn thiện 100% IDataRepository interface. |
| `src/context/DataContext.tsx` | **MODIFY** | Khởi tạo `dataRepository` qua `new ResearchRepositoryV2(baseRepo)`. |
| `docs/specs/phase-p1-3-research-repository-v2-integration.md` | **NEW** | Đặc tả kỹ thuật P1.3. |
| `docs/adr/ADR-020-research-repository-v2-adapter-integration.md` | **NEW** | Quyết định kiến trúc tích hợp Adapter. |
| `docs/gherkin/phase-p1-3-research-repository-v2-integration.feature` | **NEW** | Kịch bản kiểm thử BDD. |
| `tests/unit/research-repository-adapter-datacontext.test.tsx` | **NEW** | Unit test kiểm chứng DataContext tích hợp ResearchRepositoryV2. |

---

## 5. Rollback Strategy
Thay đổi hoàn toàn ở tầng khởi tạo Decorator và hoàn thiện method ủy quyền (Two-Way Door). Có thể khôi phục dòng khởi tạo `dataRepository` trong `DataContext.tsx` mà không để lại bất kỳ tác dụng phụ nào.
