# Đặc Tả Kiểm Thử Test-First: Mind Map Phase P1 — Persistence Foundation
> **Tài liệu đặc tả kiểm thử kỹ thuật (Test-First Specification v1.0)**  
> **Đường dẫn lưu trữ:** `docs/specs/mindmap-persistence-p1-test-first-spec-v1.md`  
> **Trạng thái:** DRAFT FOR HUMAN APPROVAL (Spec-First / Zero Implementation Code)  
> **Tham chiếu hợp đồng:** `P1 Planning Spec v1.1 Review-Ready` (Đã được phê duyệt có điều kiện)

---

## 1. Contract Reference & Governance Rules

1. **Hợp đồng nền tảng (Baseline Contract):**
   - Tài liệu này là đặc tả kiểm thử chính thức cho **Mind Map Phase P1 — Persistence Foundation**.
   - Mọi mã nguồn implementation và test suite trong Phase P1 bắt buộc phải tuân thủ 100% các hợp đồng dữ liệu, invariants và kịch bản Gherkin được quy định trong tài liệu này và bản *P1 Planning Spec v1.1*.
2. **Quy tắc bất biến về kế thừa kiểm thử (Test Precedence Invariant):**
   - Không được phép giữ lại bất kỳ hành vi cũ nào chỉ vì các test suite cũ đang pass nếu hành vi đó mâu thuẫn với contract mới đã được phê duyệt.
   - Nếu phát hiện test suite cũ giả định rằng `MindMapView` chỉ hoạt động ở chế độ Live Topic Projection và từ chối chế độ Saved Document, test suite đó sẽ được đánh dấu để tái cấu trúc / cập nhật tương thích trong giai đoạn implementation; tuyệt đối không dùng test cũ để phủ quyết contract mới.
3. **Mức độ ảnh hưởng (Blast Radius Definition):**
   - **"Blast radius thấp, cô lập trong Mind Map bounded context."**
   - Cảnh báo: `MindMapView.tsx` sẽ được mở rộng behavior để phân định 2 chế độ `live-topic` và `saved-document`.

---

## 2. Gherkin Acceptance Scenarios

### Scenario 1: Tạo tài liệu mới từ Live Projection
- **Loại test:** Unit & UI Integration
- **Contract liên quan:** `MindMapDocumentRepository.createDocument()` & `MindMapSaveModal`
- **Phân loại:** P1 Must-have
- **Dữ liệu đầu vào:**
  - `activeMode: 'live-topic'`
  - Topic đang xem: `topic-tu-dieu-de` với 4 nodes con
  - `CreateDocumentInput`: `{ title: "Hệ Thống Tứ Diệu Đế Chuẩn", changeSummary: "Khởi tạo từ Topic" }`
- **Kết quả quan sát được (Expected Observable Result):**
  - Trả về `document.id` hợp lệ, `currentVersionNumber: 1`, `totalVersionsCount: 1`.
  - Mảng `versions` trong payload chứa đúng 1 version có `treeData` sao chép 100% cấu trúc nodes.
  - UI chuyển `activeMode` sang `'saved-document'`, hiển thị badge `[Hệ Thống Tứ Diệu Đế Chuẩn (v1)]`.

```gherkin
Scenario: Creating and saving a new document from live projection
  Given I am in "live-topic" mode viewing topic "topic-tu-dieu-de"
  When I click the "💾 Lưu sơ đồ" toolbar button
  And I enter title "Hệ Thống Tứ Diệu Đế Chuẩn" and confirm save
  Then a new document summary should be stored in "knowledge_os_mindmap_documents_v1"
  And version 1 should contain the full treeData snapshot of the current projection
  And the active mode should switch to "saved-document" with version indicator "v1"
```

---

### Scenario 2: Load tài liệu đã lưu
- **Loại test:** UI Integration & Repository Query
- **Contract liên quan:** `MindMapDocumentRepository.listDocuments()` & `MindMapDocumentBrowserModal`
- **Phân loại:** P1 Must-have
- **Dữ liệu đầu vào:** Có sẵn 2 tài liệu trong localStorage (`doc-1`, `doc-2`). Người dùng chọn `doc-1`.
- **Kết quả quan sát được:**
  - Modal danh sách đóng lại.
  - Canvas render cây snapshot từ `doc-1` version hiện tại.
  - Không làm biến đổi DataContext trong phạm vi observable contract của P1 (không làm thay đổi product state ngoài Mind Map bounded context theo contract P1).

```gherkin
Scenario: Browsing and opening a previously saved document
  Given 2 saved mind map documents exist in storage
  When I click the "📂 Sơ đồ đã lưu" toolbar button
  Then the browser modal should display both documents with their titles and version badges
  When I click "Mở sơ đồ" on "Hệ Thống Tứ Diệu Đế Chuẩn"
  Then the modal should close
  And the canvas should render the tree snapshot from version 1
  And live DataContext topics should remain completely unmodified
```

---

### Scenario 3: Lưu version mới (Auto-increment)
- **Loại test:** Unit & UI Integration
- **Contract liên quan:** `MindMapDocumentRepository.appendVersion()`
- **Phân loại:** P1 Must-have
- **Dữ liệu đầu vào:** Đang mở document có `currentVersionNumber: 1`. Thay đổi `layoutMode: 'tree_vertical'`. Bấm lưu version mới với `changeSummary: "Chuyển layout dọc"`.
- **Kết quả quan sát được:**
  - Sinh ra version record mới có `versionNumber: 2`.
  - Document summary cập nhật `currentVersionNumber: 2`, `totalVersionsCount: 2`.
  - UI hiển thị badge `(v2)`.

```gherkin
Scenario: Saving a new version snapshot with auto-increment
  Given I am viewing the saved document "Hệ Thống Tứ Diệu Đế Chuẩn" at version 1
  And I toggle collapse on node "Khổ Đế" and change layout to "tree_vertical"
  When I click "💾 Lưu sơ đồ" and enter change summary "Cập nhật layout dọc"
  Then a new version 2 should be appended to the document payload
  And the active version indicator should update to "v2"
  And version 1 and version 2 should both be preserved in payload history
```

---

### Scenario 4: Cắt tỉa phiên bản đúng quy chuẩn khi vượt quá 5 versions
- **Loại test:** Unit Test
- **Contract liên quan:** Version Auto-Pruning Policy (`MAX_VERSIONS = 5`)
- **Phân loại:** P1 Must-have
- **Dữ liệu đầu vào:** Document đã có sẵn 5 versions (v1, v2, v3, v4, v5). Thực hiện `appendVersion()` cho version 6.
- **Kết quả quan sát được:**
  - `document.currentVersionNumber === 6`.
  - `document.totalVersionsCount === 5`.
  - Mảng `versions` trong payload chứa đúng 5 phần tử: [v2, v3, v4, v5, v6].
  - Version 1 bị loại bỏ hoàn toàn khỏi payload.

```gherkin
Scenario: Enforcing the strict 5-version retention limit
  Given a document already has 5 saved versions (v1, v2, v3, v4, v5)
  When I save a new version 6
  Then the payload should contain exactly 5 versions: v2, v3, v4, v5, v6
  And version 1 should be automatically pruned
  And the document summary "currentVersionNumber" should be 6
```

---

### Scenario 5: Đổi tên tài liệu (Rename)
- **Loại test:** Unit & UI Integration
- **Contract liên quan:** `MindMapDocumentRepository.renameDocument()`
- **Phân loại:** P1 Must-have
- **Dữ liệu đầu vào:** `documentId: "doc-1"`, `newTitle: "Bản đồ Triết học Phật giáo Toàn thư"`.
- **Kết quả quan sát được:**
  - Tiêu đề trong metadata summary cập nhật thành chuỗi mới.
  - `updatedAt` được làm mới theo ISO 8601.
  - Lịch sử các version bên trong payload không bị xáo trộn.

```gherkin
Scenario: Renaming a saved mind map document
  Given a saved document exists with title "Bản thảo cũ"
  When I trigger rename with new title "Bản đồ Triết học Phật giáo Toàn thư"
  Then the document summary title in storage should update to "Bản đồ Triết học Phật giáo Toàn thư"
  And the toolbar header should reflect the new title immediately
```

---

### Scenario 6: Lưu trữ tài liệu (Soft Delete / Archive)
- **Loại test:** Unit & UI Integration
- **Contract liên quan:** `MindMapDocumentRepository.archiveDocument()`
- **Phân loại:** P1 Must-have
- **Dữ liệu đầu vào:** Bấm "Lưu trữ" trên thẻ tài liệu trong Document Browser Modal.
- **Kết quả quan sát được:**
  - `document.isArchived` chuyển sang `true`.
  - Khi gọi `listDocuments({ includeArchived: false })`, tài liệu bị ẩn khỏi danh sách.
  - Payload của tài liệu vẫn được bảo tồn nguyên vẹn trên storage, không bị xóa file.

```gherkin
Scenario: Archiving a document (Soft delete)
  Given a saved document "Sơ đồ nháp" exists in storage
  When I click "Lưu trữ" on this document in the browser modal
  Then the document "isArchived" flag should become true
  And the document should no longer appear in the active documents list
```

---

### Scenario 7: Khôi phục khi dữ liệu Storage bị Corrupted JSON
- **Loại test:** Unit Fault Tolerance
- **Contract liên quan:** Safe JSON Deserializer
- **Phân loại:** P1 Must-have
- **Dữ liệu đầu vào:** Key `knowledge_os_mindmap_documents_v1` chứa chuỗi JSON hỏng `{ "broken": [ `
- **Kết quả quan sát được:**
  - Repository phải bắt lỗi parse an toàn, không crash ứng dụng, và trả fallback rỗng / kết quả an toàn (có thể phát tín hiệu chẩn đoán nếu cần, nhưng diagnostic mechanism không phải là contract bắt buộc của P1).

```gherkin
Scenario: Corrupted storage JSON recovery
  Given the localStorage key "knowledge_os_mindmap_documents_v1" contains malformed JSON
  When the application loads the document list
  Then the repository should catch the JSON parse error without throwing
  And return an empty list [] gracefully
```

---

### Scenario 8: Xử lý khi LocalStorage bị vô hiệu hóa kèm cảnh báo Volatile
- **Loại test:** Unit & UI Integration
- **Contract liên quan:** In-Memory Fallback & UI Warning Banner
- **Phân loại:** P1 Must-have
- **Dữ liệu đầu vào:** `window.localStorage` ném lỗi SecurityError hoặc bị chặn.
- **Kết quả quan sát được:**
  - Thao tác lưu trả về `{ success: true, isVolatile: true }`.
  - UI hiển thị cảnh báo màu vàng: `⚠️ Bộ nhớ tạm thời (RAM) — Dữ liệu sẽ mất khi tải lại trang`.
  - UI không được hiển thị câu thông báo "Đã lưu vĩnh viễn".

```gherkin
Scenario: Storage unavailable handling with volatile warning
  Given window.localStorage is unavailable or throws errors
  When I save a new mind map document
  Then the repository should fallback to volatile in-memory storage with "isVolatile: true"
  And the UI should display a prominent warning "Bộ nhớ tạm thời (RAM) — Dữ liệu sẽ mất khi tải lại trang"
  And the UI must not claim permanent persistence
```

---

### Scenario 9: QuotaExceededError chỉ cắt tỉa chính tài liệu đang lưu
- **Loại test:** Unit Resilience
- **Contract liên quan:** 3-Step Safe Quota Recovery
- **Phân loại:** P1 Must-have
- **Dữ liệu đầu vào:** `localStorage.setItem` ném `QuotaExceededError` khi đang lưu version 4 của `doc-A`.
- **Kết quả quan sát được:**
  - Bước 1: Cắt tỉa version cũ của chính `doc-A` xuống còn 3 versions gần nhất.
  - Bước 2: Thử retry ghi lại.
  - Bước 3: Nếu vẫn lỗi, trả về `{ success: false, errorCode: 'STORAGE_QUOTA_EXCEEDED' }`.
  - Tuyệt đối không xóa bất kỳ tài liệu archived nào khác trong kho.

```gherkin
Scenario: Safe quota recovery without deleting archived documents
  Given localStorage triggers QuotaExceededError when saving version 4 of a document
  When the repository executes quota recovery
  Then it should prune earlier versions of the current document down to 3
  And if saving still fails, return "STORAGE_QUOTA_EXCEEDED" error code
  And zero archived documents belonging to other topics should be deleted
```

---

### Scenario 10: Cô lập trạng thái giữa Saved Document và Live Topic
- **Loại test:** UI Integration Boundary
- **Contract liên quan:** Mode Discriminator Isolation
- **Phân loại:** P1 Must-have
- **Dữ liệu đầu vào:** Đang xem Saved Document, bấm nút "Quay về xem Topic".
- **Kết quả quan sát được:**
  - `activeMode` chuyển về `'live-topic'`.
  - Canvas kích hoạt lại `projectToMindMapTree()` từ `DataContext`.
  - Cấu trúc cây snapshot của Saved Document được đóng lại an toàn.

```gherkin
Scenario: Mode switching isolation between saved document and live projection
  Given I am viewing a saved document "Sơ đồ Độc Lập"
  When I click the "Quay về xem Topic" button
  Then the mode should switch back to "live-topic"
  And the canvas should re-project live data from the active topic in DataContext
```

---

### Scenario 11: Quay về Live Mode từ Saved Document
- **Loại test:** UI Integration
- **Contract liên quan:** `btn-return-live-mode`
- **Phân loại:** P1 Must-have
- **Dữ liệu đầu vào:** Đang ở `mode === 'saved-document'`, bấm `btn-return-live-mode`.
- **Kết quả quan sát được:** Toolbar xóa active document badge, render lại Topic selector.

```gherkin
Scenario: Returning to live topic mode from saved document view
  Given I am in "saved-document" mode viewing "Bản Đồ A"
  When I click the button "Quay về xem Topic"
  Then the active document indicator should disappear
  And the topic selector dropdown should become visible and active
```

---

### Scenario 12: Unsaved Changes Guard trên View State
- **Loại test:** UI Integration
- **Contract liên quan:** View State Dirty Detection Guard
- **Phân loại:** P1 Must-have
- **Dữ liệu đầu vào:** Đang ở `mode === 'saved-document'`. Thay đổi `layoutMode` từ ngang sang dọc (chưa bấm lưu version). Bấm chọn Topic khác trên menu.
- **Kết quả quan sát được:**
  - Xuất hiện dialog cảnh báo: *"Bạn có thay đổi về góc nhìn chưa lưu trên sơ đồ này. Bạn có muốn tiếp tục?"*.
  - Nếu bấm "Hủy": Giữ nguyên màn hình saved document hiện tại.
  - Nếu bấm "Tiếp tục": Chuyển sang topic mới và xóa dirty draft.

```gherkin
Scenario: Unsaved changes guard on view state mutation
  Given I am viewing a saved document at version 1
  And I collapse 2 nodes without saving a new version
  When I click "Quay về xem Topic" or select another topic
  Then a confirmation dialog should prompt "Bạn có thay đổi về góc nhìn chưa lưu..."
  And choosing "Hủy" should keep the current saved document view active
```

---

### Scenario 13: Từ chối Tiêu đề không hợp lệ (Invalid Title)
- **Loại test:** Unit Validator
- **Contract liên quan:** `validateDocumentInput()`
- **Phân loại:** P1 Must-have
- **Dữ liệu đầu vào:** `title: ""` (rỗng) hoặc `title: "   "` (chỉ có khoảng trắng) hoặc `title` dài 121 ký tự.
- **Kết quả quan sát được:** Ném lỗi hoặc trả về mã lỗi `INVALID_TITLE`. Không thực hiện ghi dữ liệu.

```gherkin
Scenario: Rejecting invalid document titles
  Given a user attempts to create a document with an empty title "   "
  When the repository validates the input
  Then it should reject the operation with error "INVALID_TITLE"
  And zero records should be added to storage
```

---

### Scenario 14: Từ chối Cây rỗng (Empty Tree)
- **Loại test:** Unit Validator
- **Contract liên quan:** `validateDocumentTree()`
- **Phân loại:** P1 Must-have
- **Dữ liệu đầu vào:** `treeData: null` hoặc `treeData: { id: "", title: "", children: [] }`.
- **Kết quả quan sát được:** Bị từ chối với lỗi `EMPTY_TREE`.

```gherkin
Scenario: Rejecting empty tree data
  Given an input payload containing no valid root node in treeData
  When the repository validates the tree structure
  Then it should reject the operation with error "EMPTY_TREE"
```

---

### Scenario 15: Phát hiện và xử lý trùng lặp ID nút (Duplicate Node IDs)
- **Loại test:** Unit Validator
- **Contract liên quan:** `validateTreeIdUniqueness()`
- **Phân loại:** P1 Must-have
- **Dữ liệu đầu vào:** Cây phân cấp có 2 nodes khác nhau cùng mang `id: "node-duplicate-1"`.
- **Kết quả quan sát được:** Validator phát hiện xung đột và từ chối lưu với lỗi `DUPLICATE_NODE_ID`.

```gherkin
Scenario: Rejecting duplicate node IDs in document tree
  Given a tree structure containing two distinct nodes with identical ID "node-duplicate-1"
  When the tree validator checks ID uniqueness
  Then it should reject the payload with error "DUPLICATE_NODE_ID"
```

---

### Scenario 16: Từ chối Cross-link trỏ tới Node không tồn tại
- **Loại test:** Unit Validator
- **Contract liên quan:** `validateCrossLinkReferences()`
- **Phân loại:** P1 Must-have
- **Dữ liệu đầu vào:** Mảng `crossLinks` chứa cạnh có `targetNodeId: "non-existent-node-xyz"`.
- **Kết quả quan sát được:** Validator từ chối với lỗi `DANGLING_EDGE_REFERENCE`.

```gherkin
Scenario: Rejecting cross links pointing to non-existent nodes
  Given a document edge pointing to targetNodeId "missing-node-id"
  And "missing-node-id" does not exist anywhere in treeData
  When the validator checks reference integrity
  Then it should reject the edge with error "DANGLING_EDGE_REFERENCE"
```

---

## 3. Unit Test Matrix

Test suite dự kiến: `tests/unit/mindmap-document-storage.test.ts` (Planned).

| Phân hệ (Subsystem) | Test Case Description | Invariant & Assertions |
| :--- | :--- | :--- |
| **Serializer** | Round-trip Document Summary serialization | `deserialize(serialize(doc)) === doc` bảo toàn 100% trường |
| **Serializer** | Round-trip Version Payload serialization | Bảo toàn đầy đủ `treeData`, `crossLinks`, `viewState` |
| **Serializer** | Schema Version validation | Nhận diện `schemaVersion: 1`; từ chối schema version lạ (`null`) |
| **Serializer** | Malformed JSON parsing resilience | Bắt lỗi JSON parse; không throw; trả về fallback an toàn |
| **Serializer** | Null / Undefined optional fields | Xử lý an toàn `description`, `rootTopicId`, `tags` rỗng |
| **Validator** | Title rỗng hoặc chỉ chứa khoảng trắng | Ném lỗi `INVALID_TITLE` |
| **Validator** | Title vượt quá 120 ký tự | Ném lỗi `INVALID_TITLE` |
| **Validator** | TreeData rỗng / không có root node | Ném lỗi `EMPTY_TREE` |
| **Validator** | Duplicate Node IDs trong cùng 1 cây | Ném lỗi `DUPLICATE_NODE_ID` |
| **Validator** | Cross-link trỏ tới node không tồn tại | Ném lỗi `DANGLING_EDGE_REFERENCE` |
| **Validator** | Node type không hợp lệ | Ném lỗi `INVALID_NODE_TYPE` |
| **Validator** | Edge type không thuộc `LinkType` chuẩn | Ném lỗi `INVALID_EDGE_TYPE` |
| **Repository** | `createDocument()` tạo version 1 | Trả về Summary + Version 1; tăng total count |
| **Repository** | `getDocumentSummary()` & `getDocumentPayload()` | Đọc chính xác theo ID; trả về `null` nếu không tìm thấy |
| **Repository** | `listDocuments({ includeArchived: false })` | Lọc bỏ các tài liệu có `isArchived: true` |
| **Repository** | `appendVersion()` tự động tăng số version | `v1` $\rightarrow$ `v2` $\rightarrow$ `v3`; cập nhật `updatedAt` |
| **Repository** | `renameDocument()` cập nhật tiêu đề | Đổi title trong summary; giữ nguyên toàn bộ payload |
| **Repository** | `archiveDocument()` & `restoreDocument()` | Lật cờ `isArchived` giữa `true` và `false` |
| **Retention Policy** | Cắt tỉa tối đa 5 versions khi append v6 | Payload chỉ còn `[v2, v3, v4, v5, v6]`; `currentVersionNumber` là 6 |
| **Resilience** | `localStorage` bị vô hiệu hóa / throw error | Fallback In-Memory; trả về `isVolatile: true` |
| **Resilience** | `QuotaExceededError` phục hồi 3 bước | Prune document hiện tại xuống 3 versions $\rightarrow$ Retry $\rightarrow$ Safe error |
| **Resilience** | Bảo vệ tuyệt đối archived documents khi đầy bộ nhớ | Không được xóa bất kỳ tài liệu archived nào |

---

## 4. UI Integration Test Matrix

Test suite dự kiến: `tests/unit/mindmap-persistence-ui.test.tsx` (Planned).

| Giao diện / Luồng tương tác | Hành động kiểm thử (Action) | Kỳ vọng giao diện (Expected UI State) |
| :--- | :--- | :--- |
| **Toolbar Save Button** | Click "💾 Lưu sơ đồ" ở Live Topic mode | Mở `MindMapSaveModal` với tiêu đề gợi ý sẵn theo tên Topic |
| **Save Confirmation** | Nhập tiêu đề và bấm xác nhận lưu | Modal đóng, toolbar xuất hiện badge `[Tên Sơ Đồ (v1)]`, mode đổi sang `saved-document` |
| **Document Browser** | Click "📂 Sơ đồ đã lưu" trên Toolbar | Mở `MindMapDocumentBrowserModal` hiển thị danh sách các tài liệu đã lưu |
| **Open Saved Document** | Chọn 1 tài liệu trong browser modal và bấm "Mở" | Modal đóng, canvas render snapshot cây đã lưu, live DataContext không đổi |
| **Return to Live Mode** | Click nút "Quay về xem Topic" | Badge tài liệu biến mất, toolbar kích hoạt lại Topic selector |
| **Volatile Warning Banner** | Khi storage trả về `isVolatile: true` | Hiển thị callout cảnh báo màu vàng trên toolbar về nguy cơ mất dữ liệu khi reload |
| **Quota Error Banner** | Khi lưu gặp lỗi `STORAGE_QUOTA_EXCEEDED` | Hiển thị banner lỗi màu đỏ thân thiện, không crash màn hình |
| **Unsaved Changes Dialog** | Đổi layoutMode trên saved doc rồi chuyển Topic | Hiển thị dialog xác nhận: "Bạn có thay đổi về góc nhìn chưa lưu..." |
| **Cancel Guard** | Bấm "Hủy" trên dialog cảnh báo | Giữ nguyên góc nhìn saved document hiện tại |
| **Continue Guard** | Bấm "Tiếp tục" trên dialog cảnh báo | Hủy dirty draft và chuyển sang xem Topic mới |

---

## 5. Tree Adapter Contract

Module: `src/lib/mindmapDocumentStorage.ts` (Planned).

### 5.1. `projectedTreeToDocumentTree(projected: MindMapTreeNode): MindMapDocumentNode`
- **Mục tiêu:** Chuyển đổi cây hình chiếu runtime sang schema lưu trữ bền vững.
- **Yêu cầu kiểm thử:**
  1. Loại bỏ toàn bộ các trường tính toán runtime: `hopDistance`, `parentHopId`, `domain`, `categoryName`, `studyStatus`, `progress`.
  2. Bảo toàn 100% các trường: `id`, `title`, `nodeType`, `semanticBadge`, `sourceIdReference`, và mảng đệ quy `children`.
  3. Không làm biến đổi (mutate) đối tượng `projected` đầu vào (Pure function).
  4. Đảm bảo tính toàn vẹn ID không bị trùng lặp.

### 5.2. `documentTreeToProjectedTree(docNode: MindMapDocumentNode, layoutMode: MindMapLayoutMode): MindMapTreeNode`
- **Mục tiêu:** Tái tạo cây hình chiếu để truyền trực tiếp vào component `MindMapTreeCanvas`.
- **Yêu cầu kiểm thử:**
  1. Gán giá trị mặc định an toàn cho các trường runtime: `hopDistance: 0`, `domain: 'general'`, `tags: []`.
  2. Bảo toàn 100% cấu trúc phân cấp cây cha-con.
  3. Render tương thích hoàn toàn với vector layout của `MindMapTreeCanvas`.

---

## 6. Test Ordering (Red-Green-Refactor Plan)

Thứ tự thực thi nghiêm ngặt trong giai đoạn implementation (khi có lệnh phê duyệt):

```
1. Types Contract Review ──> 2. Validator Tests (Red) ──> 3. Serializer Tests (Red)
                                                                 │
┌────────────────────────────────────────────────────────────────┘
▼
4. Repository CRUD Tests (Red) ──> 5. Retention & Quota Tests (Red) ──> 6. Tree Adapter Tests (Red)
                                                                             │
┌────────────────────────────────────────────────────────────────────────────┘
▼
7. Storage Implementation (Green) ──> 8. UI Integration Tests (Red ──> Green) ──> 9. Full Regression Gate
```

---

## 7. Quality Gates (Static Analysis & Regression)

Các lệnh kiểm chuẩn chất lượng (chỉ khai báo, không tự chạy):

```bash
# 1. Typecheck toàn dự án (Zero TypeScript errors)
npm run typecheck

# 2. Chạy toàn bộ Unit & Integration tests hiện có
npm test

# 3. Chạy riêng test suite Mind Map Persistence mới (khi implementation)
npx vitest run tests/unit/mindmap-document-storage.test.ts
npx vitest run tests/unit/mindmap-persistence-ui.test.tsx

# 4. Build kiểm chứng production bundle
npm run build
```

---

## 8. File Boundary cho Implementation Phase

### Planned Files (Chưa tạo, chưa sửa):
1. `src/types/mindmapDocument.ts`: Khai báo types chuẩn.
2. `src/lib/mindmapDocumentStorage.ts`: Pure repository, validator, serializer, adapters.
3. `src/components/mindmap/MindMapSaveModal.tsx`: Modal lưu tài liệu / lưu version.
4. `src/components/mindmap/MindMapDocumentBrowserModal.tsx`: Modal duyệt danh sách tài liệu.
5. `tests/unit/mindmap-document-storage.test.ts`: Unit test suite.
6. `tests/unit/mindmap-persistence-ui.test.tsx`: UI integration test suite.
7. `src/components/mindmap/MindMapView.tsx`: Tích hợp toolbar buttons và state discriminator.

### Absolute Frozen Files (Tuyệt đối không sửa):
- ❌ `src/context/DataContext.tsx`
- ❌ `src/lib/mindmapProjection.ts`
- ❌ `src/components/mindmap/MindMapTreeCanvas.tsx`
- ❌ `prisma/schema.prisma`
- ❌ `src/server/*`
- ❌ `package.json`

---
