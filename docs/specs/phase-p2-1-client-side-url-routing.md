# Technical Specification: Phase P2.1 — Client-Side URL Hash Routing & Deep-Linking

## 1. Problem Statement & Motivation
Sau khi hoàn thành toàn bộ nhóm Phase 1 (tách `NavigationContext`, đồng bộ Tag dual-write, tích hợp `ResearchRepositoryV2`, đồng bộ `NoteTopicLink` và `KnowledgeProgressSnapshot`), ứng dụng đã có lớp dữ liệu và kiến trúc component vững chắc.

Tuy nhiên, cơ chế điều hướng hiện tại của ứng dụng (`NavigationContext.tsx`) hoàn toàn phụ thuộc vào bộ nhớ RAM (`in-memory React state`):
1. **Mất trạng thái khi Reload (F5 / Cmd+R)**: Người dùng đang nghiên cứu một chủ đề hoặc đang ở tab `ai_studio`, khi tải lại trang sẽ bị đưa về `dashboard`.
2. **Không hỗ trợ Deep-Linking & Bookmark**: Không thể lưu bookmark hoặc gửi đường dẫn trực tiếp đến một chủ đề cụ thể (ví dụ: `#/topics/topic-abhidharma-tong-quan`).
3. **Lịch sử trình duyệt (Back/Forward) không hoạt động**: Nhấn nút Back trên trình duyệt sẽ thoát khỏi ứng dụng thay vì quay lại tab/chủ đề trước đó.

---

## 2. Goals & Non-Goals

### 2.1. Goals
1. **Định dạng URL Hash Chuẩn Hóa**:
   - Tab routes: `#/` (dashboard), `#/topics`, `#/graph`, `#/progress`, `#/notes`, `#/resources`, `#/search`, `#/ai_studio`, `#/abhidharma_matrix`, `#/divination_matrix`, `#/lexicon`.
   - Topic detail deep-link: `#/topics/:topicId` (ví dụ: `#/topics/topic-abhidharma-tong-quan`).
   - Query & Filters: `#/search?q=tam+so`, `#/topics?cat=cat-tam-tang&tag=vi-dieu-phap`.
2. **Đồng Bộ Hai Chiều (Bidirectional URL Hash Sync)**:
   - **Hash $\rightarrow$ State**: Lắng nghe sự kiện `hashchange` / `popstate` để cập nhật `activeTab`, `selectedTopicId`, `searchQuery`, `selectedCategoryFilter`, `selectedTagFilter`.
   - **State $\rightarrow$ Hash**: Khi người dùng chuyển tab hoặc mở chủ đề, tự động cập nhật `window.location.hash` mà không reload trang.
3. **Module Helper Thuần Túy (`src/lib/urlRouting.ts`)**:
   - `parseLocationHash(hash: string)`: Phân giải chuỗi hash thành đối tượng trạng thái điều hướng.
   - `buildLocationHash(state)`: Tạo chuỗi hash chuẩn từ trạng thái điều hướng.
4. **Bảo Toàn Tương Thích Ngược 100%**:
   - Mọi component sử dụng `useNavigation()` hoặc facade `useData()` không cần sửa đổi mã nguồn.

### 2.2. Non-Goals
- Không cài thêm thư viện routing nặng (như `react-router-dom`) nhằm giữ bundle size siêu nhẹ và kiểm soát 100% logic.
- Không thay đổi các API backend hay cơ sở dữ liệu.

---

## 3. Architecture & Data Flow

```
                      Browser URL Hash (#/topics/topic-abhidharma?tag=triet-hoc)
                                          │
                     [Initial Load / hashchange Event]
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │    Pure Helper (src/lib/urlRouting.ts) │
                      │    parseLocationHash(hash)             │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │    NavigationContext.tsx               │
                      │    - activeTab: "topics"               │
                      │    - selectedTopicId: "topic-..."      │
                      │    - selectedTagFilter: "triet-hoc"    │
                      └───────────────────┬────────────────────┘
                                          │
                     [User Action: setActiveTab / openTopicDetail]
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │    buildLocationHash(newState)         │
                      │    window.location.hash = "#/graph"    │
                      └────────────────────────────────────────┘
```

---

## 4. File Changes Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `src/lib/urlRouting.ts` | **NEW** | Module thuần túy chứa `parseLocationHash`, `buildLocationHash`, và hằng số tab hợp lệ. |
| `src/context/NavigationContext.tsx` | **MODIFY** | Tích hợp đồng bộ 2 chiều giữa React state và `window.location.hash`. |
| `docs/specs/phase-p2-1-client-side-url-routing.md` | **NEW** | Bản đặc tả kỹ thuật này. |
| `docs/adr/ADR-023-client-side-url-routing.md` | **NEW** | Quyết định kiến trúc URL Hash Routing. |
| `docs/gherkin/phase-p2-1-client-side-url-routing.feature` | **NEW** | Kịch bản kiểm thử BDD. |
| `tests/unit/url-routing.test.ts` | **NEW** | Unit test suite kiểm chứng phân giải và tạo URL hash thuần túy. |
| `tests/unit/navigation-hash-sync.test.tsx` | **NEW** | Integration test suite kiểm chứng đồng bộ `NavigationContext` ↔ `window.location.hash`. |

---

## 5. Rollback Strategy
Thay đổi hoàn toàn nằm ở tầng client navigation (Two-Way Door). Có thể vô hiệu hóa hash sync trong `NavigationContext` bất kỳ lúc nào mà không ảnh hưởng đến bất kỳ dữ liệu nào.
