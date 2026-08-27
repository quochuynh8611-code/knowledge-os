# Technical Specification: Phase P1.1 — Navigation Context Decomposition & Facade Architecture

## 1. Problem Statement
Hiện tại, `src/context/DataContext.tsx` đang quản lý đồng thời:
1. **Domain Entity State**: `categories`, `topics`, `notes`, `resources`, `tags`, `stats`, `reviewQueue`, các thao tác CRUD và đồng bộ storage qua repository.
2. **UI Navigation Ephemeral State**: `activeTab`, `selectedTopicId`, `searchQuery`, `selectedCategoryFilter`, `selectedTagFilter`, và hàm `openTopicDetail`.

### Hệ quả:
- **Render Leak**: Mỗi khi người dùng gõ tìm kiếm (`searchQuery`), chuyển tab (`activeTab`), hoặc đổi bộ lọc danh mục/thẻ, `DataContext` phát sinh update làm toàn bộ các component subscriber (bao gồm cả các thành phần đồ thị nặng như `KnowledgeGraph`, `StudyProgressView`) phải re-render lại.
- **Vi phạm Single Responsibility Principle (SRP)**: DataContext vừa là Data Repository Bridge vừa là App Navigation State.

---

## 2. Goals & Non-Goals

### 2.1. Goals
1. **Tách Biệt Trách Nhiệm**: Trích xuất toàn bộ UI navigation state sang [`src/context/NavigationContext.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/context/NavigationContext.tsx).
2. **Render Isolation**: Cung cấp hook `useNavigation()` cho các UI components (Navbar, Sidebar, CommandPalette, ShortcutsModal...) để việc gõ `searchQuery` hoặc chuyển `activeTab` không kích hoạt re-render trên các component thuần dữ liệu.
3. **100% Backward Compatibility (Facade Pattern)**:
   - `DataProvider` tự động compose `NavigationProvider` và re-export đầy đủ các navigation fields/setters qua hook `useData()`.
   - Không làm gãy bất kỳ consumer hiện có nào (615/615 tests tiếp tục PASS).
4. **Tránh Phụ Thuộc Vòng (No Circular Dependency)**:
   - `NavigationContext` là một module độc lập, không import `DataContext`.
   - Cây Provider: `NavigationProvider` bọc `InnerDataProvider` bên trong `DataProvider`.

### 2.2. Non-Goals
- Không thay đổi schema cơ sở dữ liệu hay API REST backend.
- Không thay đổi bất kỳ logic nghiệp vụ nào của SM-2, Obsidian, NotebookLM hay Antigravity.
- Không xóa bỏ `useData()` trong giai đoạn này (chuyển tiếp an toàn qua Facade).

---

## 3. Architecture & Provider Topology

```
                  ┌────────────────────────────────────────┐
                  │           NavigationProvider           │
                  │   (activeTab, searchQuery, filters...) │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │            DataProvider                │
                  │   (categories, topics, notes, CRUD...) │
                  │   * Composes useNavigation() via Facade│
                  └───────────────────┬────────────────────┘
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                         ▼
   [Navigation-Only Consumers]               [Data-Only / Mixed Consumers]
   - Navbar                                  - TopicDetail
   - Sidebar                                 - KnowledgeGraph
   - CommandPalette                          - StudyProgressView
   - ShortcutsModal                          - NotesManager
   (Use: `useNavigation()`)                   (Use: `useData()` or `useDomainData()`)
   => Isolated from Data updates!            => Isolated from Key-stroke queries!
```

---

## 4. Interfaces & Contracts

### 4.1. Navigation Context Contract (`NavigationContext.tsx`)
```typescript
export type ActiveTab =
  | "dashboard"
  | "topics"
  | "graph"
  | "progress"
  | "notes"
  | "resources"
  | "search"
  | "ai_studio"
  | "abhidharma_matrix"
  | "divination_matrix"
  | "lexicon";

export interface NavigationContextType {
  activeTab: ActiveTab;
  selectedTopicId: string | null;
  searchQuery: string;
  selectedCategoryFilter: string | null;
  selectedTagFilter: string | null;

  setActiveTab: (tab: ActiveTab) => void;
  setSelectedTopicId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategoryFilter: (catId: string | null) => void;
  setSelectedTagFilter: (tag: string | null) => void;
  openTopicDetail: (topicId: string) => void;
}
```

### 4.2. Compatibility Facade Contract (`DataContext.tsx`)
`DataContextType` tiếp tục mở rộng toàn bộ các trường trên để đảm bảo backward compatibility 100%:
- `useData()` = Domain Data + Navigation Facade.
- `useNavigation()` = Pure Navigation State (Standalone & Lightweight).

---

## 5. Blast Radius & File Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `src/context/NavigationContext.tsx` | **NEW** | Quản lý navigation state, export `NavigationProvider` và `useNavigation()`. |
| `src/context/DataContext.tsx` | **MODIFY** | Nhúng `NavigationProvider` vào `DataProvider`, delegate navigation sang `useNavigation()`. |
| `tests/unit/navigation-context.test.tsx` | **NEW** | Unit tests cho `NavigationContext` (mặc định, cập nhật, ném lỗi khi thiếu Provider). |
| `tests/unit/data-navigation-facade-parity.test.tsx` | **NEW** | Test kiểm chứng parity giữa `useData()` và `useNavigation()`, và test render isolation. |

---

## 6. Rollback Strategy
Thay đổi hoàn toàn nằm ở tầng React Context phía client (Two-Way Door). Nếu cần rollback, chỉ cần hoàn tác `DataContext.tsx` về commit trước đó mà không ảnh hưởng tới dữ liệu hay database.
