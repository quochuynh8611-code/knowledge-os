# Specification: Mind Map Markdown Outline Import Flow

## Document Status
- **Current Completed Baseline**: 
  - Phase I1: Pure Outline Parser & Tree AST Validator (Zero Write)
  - Phase I2: Preview-Only Sandbox Modal (Zero Write)
- **Status**: IMPLEMENTED & VALIDATED (Zero-Write Baseline)
- **Scope Boundary**: Pure Parsing, AST Projection Adapter & RAM Preview Modal (No Database/DataContext Mutation)

---

## 1. Context & Motivation

Mind Map trong Knowledge OS là một **pure derived read-model** được chiếu (project) động từ Knowledge Graph (`Topic`, `Note`, `Resource`, `KnowledgeLink`). 

Hàm xuất Markdown hiện có (`exportMindMapToMarkdown`) serialize cấu trúc cây theo dạng outline có thụt lề kèm biểu tượng cảm xúc và nhãn ngữ nghĩa. Để hỗ trợ người dùng nhập nhanh một dàn ý cây phân cấp (từ Obsidian, Logseq, Typora hoặc từ file xuất trước đó), hệ thống cần một bộ phân tích cú pháp (Parser) và một giao diện xem trước an toàn (Sandbox Preview).

> [!IMPORTANT]
> **Zero-Write Guarantee**: Cả Phase I1 và Phase I2 chỉ hoạt động thuần túy trong bộ nhớ RAM, **hoàn toàn không ghi dữ liệu, không thay đổi DataContext, không tác động cơ sở dữ liệu, không thay đổi URL routing**.

---

## 2. Architecture & Clean Layering

```
[Markdown Outline String]
          │
          ▼  (Phase I1 - Pure Parser & AST Validator)
[MindMapImportNode AST] ◄──────────── src/lib/mindmapImportParser.ts
          │
          ▼  (Phase I2 - Preview Adapter)
[MindMapTreeNode Projection] ◄──────── src/lib/mindmapImportPreviewAdapter.ts
          │
          ▼  (Phase I2 - UI Sandbox Canvas)
[MindMapTreeCanvas (RAM only)] ◄────── src/components/mindmap/MindMapImportPreviewModal.tsx
```

1. **`src/lib/mindmapImportParser.ts` (Phase I1)**:
   - Module phân tích cú pháp thuần túy chuyển đổi Markdown thành `MindMapImportNode` AST.
   - Không phụ thuộc vào bất kỳ kiểu dữ liệu UI hay context nào.
2. **`src/lib/mindmapImportPreviewAdapter.ts` (Phase I2)**:
   - Module chuyển đổi thuần túy từ `MindMapImportNode` AST $\rightarrow$ `MindMapTreeNode`.
   - Giúp tái sử dụng trực tiếp component `MindMapTreeCanvas` mà không làm ô nhiễm file parser.
3. **`src/components/mindmap/MindMapImportPreviewModal.tsx` (Phase I2)**:
   - Giao diện Split-View gồm Textarea nhập dàn ý, Bảng chẩn đoán cú pháp (Diagnostics), và Khung nhìn sơ đồ xem trước tức thì.
   - Chỉ có duy nhất 1 nút hành động "Đóng".

---

## 3. Scope & Non-Goals

### In-Scope (Phase I1 & I2)
- Parser hỗ trợ đầy đủ bullet `-`, `*`, `+`, thụt lề 2 spaces / 4 spaces / tabs, nhãn quan hệ ngữ nghĩa `[tiên quyết]`, `[nâng cao]`, `[liên quan]`, `[đối chiếu]`, `[ghi chú]`, `[tài liệu]`.
- Nhận diện icon `📚` (topic), `📝` (note), `🔗` (resource), liên kết Markdown `[Title](url)`, và tiến độ học tập `[Tiến độ: X%]`.
- Phát hiện cảnh báo thụt lề nhảy cóc (`JUMP_INDENTATION`) và tự động kẹp an toàn.
- Adapter `convertImportAstToMindMapTreeNode` tương thích hoàn toàn với `MindMapTreeCanvas`.
- UI Sandbox Modal xem trước với thanh chuyển đổi chế độ Layout Ngang/Dọc, nút Dán mẫu, nút Xóa, và bảng chẩn đoán lỗi thời gian thực.
- Nút "Xem trước dàn ý" (`btn-open-import-preview`) tích hợp trên thanh công cụ `MindMapView`.

### Non-Goals (Strictly Forbidden in Phase I1 & I2)
- **Không ghi dữ liệu (Zero Write)** vào `DataContext`, `localStorage`, hay API backend.
- **Không tự ý chuyển hướng URL (Zero Navigation)** khi người dùng nhấp vào các node trong khung xem trước.
- **Không claim tương thích Round-Trip 100%** do bản chất Markdown thiếu hụt các trường metadata (Category, StudyProgress SM-2, Tags, Content chi tiết).

---

## 4. AST Output & Adapter Specification

```typescript
export interface MindMapImportNode {
  id: string;                      // Transient ID ("import-node-0", "import-node-1", ...)
  title: string;                   // Clean text title without badges/icons/markdown links
  nodeType: "topic" | "note" | "resource";
  edgeTypeToParent?: "prerequisite" | "advanced" | "related" | "contradicts" | "has_note" | "has_resource";
  sourceIdReference?: string;      // Extracted from #/topics/<id>
  studyStatusText?: string;        // Raw status string (e.g. "Tiến độ: 50%")
  progressPercent?: number;        // Numeric progress (0 - 100)
  rawLine: string;
  lineNumber: number;
  depth: number;
  children: MindMapImportNode[];
}
```

---

## 5. Approval Gate for Ingestion Phase (Phase I3+)

Mọi giai đoạn tiếp theo hướng tới việc ghi dữ liệu (Ingestion vào `Topic[]` và `KnowledgeLink[]`) **bắt buộc phải có phê duyệt và tài liệu đặc tả riêng**, bao gồm:
- Thiết kế Transaction nguyên tử (Batch Add Topics & Links).
- Chính sách lựa chọn Category đích và giải quyết xung đột trùng lặp tiêu đề (Deduplication / Conflict resolution).
- Kế hoạch Rollback chi tiết khi import bị gián đoạn.
