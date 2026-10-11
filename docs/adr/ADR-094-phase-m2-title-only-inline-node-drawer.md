# ADR-094 — Phase M2 Chọn Hướng Inline Node Drawer Dạng Title-Only Cho Saved Documents

**Trạng thái**: Accepted  
**Ngày**: 2026-10-11  
**Tác giả**: Staff Software Engineer / Technical Architect  
**Phạm vi**: Mind Map saved-document editing  
**Liên quan**: Phase P7.C, Phase M1, [mindmap-phase-m2-planning-spec-v1.md](../specs/mindmap-phase-m2-planning-spec-v1.md)

---

## Bối cảnh

Saved-document mode hiện đã có nền tảng runtime/persistence vững chắc để hỗ trợ chỉnh sửa cục bộ rồi lưu phiên bản mới:

- `workingDocumentTree` là nguồn dữ liệu runtime duy nhất cho tài liệu đang mở.
- `handleSaveVersion(...)` persist từ `workingDocumentTree` qua `projectedTreeToDocumentTree(...)`.
- Dirty-state guard và mode-switch guard đã tồn tại và được bảo vệ ở Phase P7.C.

Persisted node schema hiện tại của `MindMapDocumentNode` chỉ bao gồm `id`, `title`, `nodeType`, `semanticBadge`, `sourceIdReference`, `children`; chưa có bằng chứng thực tế cho các trường mở rộng như `notes`, `status`, `progress` ở cấp node trong hệ thống lưu trữ.

---

## Quyết định

Phase M2 triển khai **Inline Node Drawer** với phạm vi **title-only** cho các node trong `saved-document` mode.

Cụ thể:

1. **Saved-document only**: Drawer chỉ được kích hoạt trong `activeMode === "saved-document"`. Tuyệt đối không mở trong `live-topic` mode.
2. **Title-only editing**: Drawer chỉ cho phép chỉnh sửa trường `title` của node.
3. **Read-only metadata**: Các trường `id`, `nodeType`, `semanticBadge` và `sourceIdReference` (nếu có) chỉ hiển thị ở dạng read-only.
4. **Không đổi persisted schema**: Không thêm trường mới vào `MindMapDocumentNode`.
5. **No auto-persist**: Khi người dùng gõ hoặc cập nhật title trong drawer, dữ liệu được ghi vào `workingDocumentTree` runtime và kích hoạt `isDirty = true`; việc lưu trữ lâu dài (persistence) hoàn toàn thông qua flow Save/Version hiện có.
6. **Đóng Drawer không clear selection**: Khi đóng drawer, chỉ reset state drawer (`activeDrawerNodeId = null`), giữ nguyên visual selection trên canvas (`selectedNodeIds`).
7. **Component cô lập**: Tách drawer thành component độc lập `src/components/mindmap/MindMapNodeDrawer.tsx` để giảm tải cho `MindMapView.tsx`.

---

## Lý do

### 1. Giảm thiểu blast radius
Việc giới hạn chỉnh sửa ở `title` tránh việc phải thay đổi `MindMapDocumentNode` schema, không cần viết migration scripts hay thêm validation phức tạp vào `mindmapDocumentStorage.ts`.

### 2. Tái sử dụng trọn vẹn seams hiện có
Hệ thống đã có sẵn `renameNodeTitle(...)` và `applyTreeMutation(...)` liên kết chặt chẽ với `workingDocumentTree`, `isDirty`, `historyState` (Undo/Redo), và `handleSaveVersion(...)`. Title-only editing là bước mở rộng tự nhiên nhất.

### 3. Tránh over-engineering
Chưa có yêu cầu hoặc schema hỗ trợ cho ghi chú chi tiết (`notes`) hay tiến độ (`status`) ở cấp node. Việc giả định trước sẽ tạo ra nợ kỹ thuật không cần thiết.

### 4. Tính chất Two-way Door
Nếu drawer phát sinh vấn đề hồi quy, việc rollback có thể thực hiện sạch sẽ tại tầng UI component mà không ảnh hưởng tới bất kỳ dữ liệu đã lưu nào.

---

## Các phương án đã cân nhắc

### Option A — Title-only drawer (ĐƯỢC CHỌN)
- **Ưu điểm**: Scope nhỏ, rủi ro thấp, không đổi schema, dễ viết unit test theo phương pháp Test-First.
- **Nhược điểm**: Chưa hỗ trợ ghi chú chi tiết theo từng node.

### Option B — Title + notes/description
- **Ưu điểm**: Hữu ích hơn cho việc ghi chú học tập chuyên sâu.
- **Nhược điểm**: Chưa có persisted schema hỗ trợ; kéo theo rich text editor và rủi ro phình to payload lưu trữ.

### Option C — Title + status/tag/metadata
- **Ưu điểm**: Quản trị tri thức phong phú.
- **Nhược điểm**: Blast radius rất lớn, tương đương một phase domain-model mới.

**Kết luận**: Chọn Option A cho Phase M2.

---

## Hệ quả

### Tích cực
- Cung cấp giao diện chỉnh sửa node trực quan đầu tiên cho tài liệu mind map độc lập.
- Duy trì 100% tính nhất quán (parity) với lifecycle P7.C vì bám chặt vào `workingDocumentTree`.
- Tạo cơ sở component chuẩn mực để mở rộng sang các trường metadata khác trong tương lai.

### Tiêu cực
- Người dùng chưa thể ghi chú chi tiết (notes) theo node trong phase này.

---

## Guardrails Triển Khai

1. Chặn tuyệt đối mở drawer khi đang ở `live-topic` mode.
2. Không mutate cây phân cấp trực tiếp; mọi thay đổi phải qua `renameNodeTitle(...)` và `applyTreeMutation(...)`.
3. Không tự động gọi `appendMindMapVersion` khi đang gõ.
4. Bảo toàn nguyên vẹn ngữ nghĩa của `isDirty` và leave guard.
5. Giữ nguyên schema `MindMapDocumentNode` và `MindMapTreeNode`.

---

## Trigger Để Revisit ADR Này

- Khi có yêu cầu sản phẩm chính thức về trường `notes` hoặc `status` ở cấp node.
- Khi repo triển khai schema mới cho node metadata và có migration path rõ ràng.
