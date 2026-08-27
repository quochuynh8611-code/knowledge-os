# Đặc Tả Kỹ Thuật: Lộ Trình Chuyên Nghiệp Hóa Kiến Trúc Knowledge OS (Professionalization Roadmap)

> **Tài liệu tham chiếu:** [`ADR-016 (Data Layer)`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/adr/ADR-data-layer-boundary.md) · [`ADR-017 (State Split)`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/adr/ADR-state-management-split.md)  
> **Người thực hiện:** Staff Software Engineer / Technical Architect  
> **Trạng thái:** Proposed (Chờ phê duyệt Human Approval Gate)  

---

## 1. Tầm Nhìn Kỹ Thuật (Strategic Technical Vision)

Chuyển hóa Knowledge OS từ một dashboard dạng monolithic-prototype thành một hệ thống **Sản Xuất Chuyên Nghiệp (Production-Grade Knowledge System)**:
1. **Rõ ràng nguồn chân lý (Single Source of Truth):** Quản lý nhất quán giữa In-Memory State, LocalStorage Offline Cache và PostgreSQL Server.
2. **Kiến trúc phân rã (Modular & Decoupled):** Tách God Context và Monolithic Server thành các đơn vị có ranh giới trách nhiệm rõ ràng (Single Responsibility Principle).
3. **Tiến hóa có bảo vệ (Evolution with Zero Regressions):** Mọi bước tái cấu trúc đều tuân thủ nguyên tắc *Backward Compatible*, *Test-First*, và *Zero Downtime*.

---

## 2. Bản Đồ Hiện Trạng & Điểm Nghẽn Kỹ Thuật (Current State Findings)

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                CURRENT ARCHITECTURE MAP                                   │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                           │
│   [App.tsx] ───────────────────────────► switch(activeTab)                                 │
│       │                                                                                   │
│       ▼                                                                                   │
│   [DataContext.tsx] (987 lines - GOD CONTEXT)                                             │
│       ├── UI Navigation State (activeTab, filters, query)                                 │
│       ├── Timer State (timerSeconds ticker 1s -> causes global re-render)                 │
│       ├── Domain State (categories, topics, notes, resources, tags)                       │
│       ├── Direct localStorage.getItem / setItem (Split SSOT)                              │
│       └── IDataRepository injection                                                       │
│               │                                                                           │
│               ├──► [LocalStorageDataRepository] (offline)                                 │
│               └──► [ApiDataRepository] (REST) ────► [server.ts] (1486 lines MONOLITH)    │
│                                                          ├── API Routing                  │
│                                                          ├── Prisma Client & Transactions │
│                                                          ├── Backup Snapshot Checksum     │
│                                                          └── AI Studio & Rate Limiting    │
│                                                                  │                        │
│                                                                  ▼                        │
│                                                        [PostgreSQL (Prisma)]              │
│                                                        - Topic.tags: String[] (Denorm)    │
│                                                        - TopicTag, NoteTopicLink (Norm)   │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

### Top 5 Rủi Ro Lớn Nhất Hiện Nay:
1. **Timer Re-render Leak:** Ticker 1 giây trong `DataContext` khiến toàn bộ ứng dụng bị re-evaluate liên tục.
2. **Dual-Persistence Conflict:** Cả `DataContext` và `LocalStorageDataRepository` cùng đọc/ghi `localStorage` độc lập, dễ dẫn đến mất đồng bộ trạng thái khi kết nối mạng chập chờn.
3. **Monolithic Backend Endpoint (`server.ts`):** 1486 dòng mã dồn chung khiến việc mở rộng API mới có nguy cơ làm ảnh hưởng các luồng backup/restore và health checks trọng yếu.
4. **Hybrid Tags Model:** Vừa duy trì `Topic.tags: String[]` vừa có `TopicTag` bảng quan hệ, cần cơ chế dual-write nhất quán ở tầng repository.
5. **Thiếu Client-Side Router:** Điều hướng phụ thuộc 100% vào `activeTab` trong memory, chưa hỗ trợ deep-linking URL cho từng Topic/Note.

---

## 3. Lộ Trình Triển Khai Phân Cấp (Prioritized Implementation Roadmap)

### 📌 Nhóm P0: Cần thực hiện ngay (Khắc phục điểm nghẽn hiệu năng & nguồn chân lý)

| Hạng mục | Mục tiêu kỹ thuật | Phạm vi tệp | Blast Radius | Tính thuận nghịch | Test bắt buộc |
|---|---|---|:---:|:---:|---|
| **P0.1: Tách StudyTimerContext** | Đưa `timerSeconds` và ticker 1s ra khỏi `DataContext` để triệt tiêu re-render toàn app | `src/context/StudyTimerContext.tsx`, `src/context/DataContext.tsx` | 🟢 Low | 2-way door | Test timer độc lập, test không làm gián đoạn `SpacedReviewModal` & `StudyTimerModal` |
| **P0.2: Thống nhất Storage SSOT qua Repository** | Chuyển toàn bộ thao tác ghi `localStorage` từ `DataContext` vào bên trong `LocalStorageDataRepository` | `src/services/dataRepository.ts`, `src/context/DataContext.tsx` | 🟡 Medium | 2-way door | 561 unit/integration tests hiện tại giữ nguyên 100% PASS |
| **P0.3: Modular hóa `server.ts`** | Tách server thành các sub-routers: `topicsRouter`, `notesRouter`, `resourcesRouter`, `backupRouter`, `aiRouter`, `healthRouter` | `src/server/routes/*.ts`, `server.ts` | 🟡 Medium | 2-way door | Bộ test API endpoints, test backup/restore, test rate-limiting |

---

### 📌 Nhóm P1: Nên làm tiếp theo (Phân rã ngữ cảnh & Chuẩn hóa dữ liệu)

| Hạng mục | Mục tiêu kỹ thuật | Phạm vi tệp | Blast Radius | Tính thuận nghịch | Test bắt buộc |
|---|---|---|:---:|:---:|---|
| **P1.1: Tách NavigationContext** | Tách `activeTab`, `selectedTopicId`, `searchQuery`, filters ra khỏi DataContext | `src/context/NavigationContext.tsx`, `src/context/DataContext.tsx`, `src/App.tsx` | 🟡 Medium | 2-way door | Test phím tắt, test CommandPalette, test chuyển tab |
| **P1.2: Repository Tag Dual-Write Sync** | Đảm bảo `ApiDataRepository` và `server.ts` tự động sync `TopicTag` khi cập nhật `Topic.tags` | `src/server/routes/topics.ts`, `src/services/dataRepository.ts` | 🟡 Medium | 2-way door | Test tag normalization, test tag filter consistency |
| **P1.3: Tích hợp ResearchRepositoryV2 vào DataContext qua Adapter** | Kích hoạt khả năng hỗ trợ multi-topic note (`topicIds`) và source registry trong DataContext | `src/context/DataContext.tsx`, `src/services/researchRepositoryV2.ts` | 🟡 Medium | 2-way door | Test multi-topic note resolution, test backward compatibility |

---

### 📌 Nhóm P2: Nâng cấp dài hạn (Mở rộng tính năng & Deep Linking)

| Hạng mục | Mục tiêu kỹ thuật | Phạm vi tệp | Blast Radius | Tính thuận nghịch | Test bắt buộc |
|---|---|---|:---:|:---:|---|
| **P2.1: Client-side URL Routing** | Hỗ trợ URL hash/path (ví dụ: `#/topics/vi-dieu-phap`) cho deep-linking | `src/App.tsx`, Navigation Layer | 🟡 Medium | 2-way door | Test navigation và reload URL |
| **P2.2: Chuyển đổi hoàn toàn sang Normalized Tags** | Loại bỏ cột `Topic.tags: String[]` cũ sau khi toàn bộ dữ liệu đã được migrate sang `TopicTag` | `prisma/schema.prisma`, `server.ts`, export/import | 🔴 High | 1-way door (Cần migration script) | Test migration idempotent, test Snapshot Semver 3.0 |
| **P2.3: Offline-First Synchronization Queue** | Hàng đợi đồng bộ hóa 2 chiều (Sync Queue) khi mạng từ offline chuyển sang online | `src/services/syncQueue.ts`, `src/context/DataContext.tsx` | 🔴 High | 2-way door | Test conflict resolution, test offline edits replay |

---

## 4. Kế Hoạch Đảm Bảo An Toàn & Rollback (Safety & Rollback Strategy)

1. **Facade Provider Pattern:** Luôn duy trì `DataProvider` bọc ngoài các context con, xuất ra hook `useData()` tương thích 100% với giao diện cũ để không bao giờ làm gãy component tầng lá.
2. **Schema Dual-Read/Dual-Write:** Không xóa cột cũ (`Topic.tags`, `Note.topicId`) cho đến khi lớp mới hoạt động ổn định qua nhiều chu kỳ kiểm thử.
3. **Zero-Regression Baseline:** Mỗi bước chuyển tiếp phải chạy qua toàn bộ 85 test files (561 tests) trên clean workspace trước khi commit.
