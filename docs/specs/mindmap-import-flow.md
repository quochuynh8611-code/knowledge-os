# Specification: Mind Map Markdown Outline Import Flow

## Document Status
- **Completed Baseline**: 
  - Phase I1: Pure Outline Parser & Tree AST Validator (Pure logic, Zero-Write)
  - Phase I2: Preview-Only Sandbox Modal (RAM-only Preview, Zero-Write)
  - Phase I3: Controlled Ingestion Engine & Confirmation Workflow (Topological Batch Ingestion, Dedupe & Compensation Rollback)
- **Status**: IMPLEMENTED, TESTED & COMMITTED LOCALLY (Commit `f779e3e`, NOT PUSHED)
- **Scope Boundary**: Pure Parsing, AST Projection Adapter, RAM Preview Modal, & Controlled Ingestion via DataContext Port.

---

## 1. Context & Motivation

Mind Map trong Knowledge OS là một **pure derived read-model** được chiếu (project) động từ Knowledge Graph (`Topic`, `Note`, `Resource`, `KnowledgeLink`). 

Hàm xuất Markdown hiện có (`exportMindMapToMarkdown`) serialize cấu trúc cây theo dạng outline có thụt lề kèm biểu tượng cảm xúc và nhãn ngữ nghĩa. Để hỗ trợ người dùng nhập nhanh một dàn ý cây phân cấp (từ Obsidian, Logseq, Typora hoặc từ file xuất trước đó), hệ thống cung cấp:
1. **Parser & Validator (Phase I1)**: Phân tích cú pháp outline sang AST độc lập.
2. **Preview Sandbox Modal (Phase I2)**: Xem trước cấu trúc cây tức thì trên bộ nhớ RAM mà không làm thay đổi CSDL.
3. **Controlled Ingestion (Phase I3)**: Ghi có kiểm soát vào `DataContext` với xác nhận tường minh, phòng vệ trùng lặp và khả năng rollback.

> [!IMPORTANT]
> **Zero-Write & Zero-Navigation Invariant**: Quá trình phân tích cú pháp, đổi layout, dán mẫu và xem trước hoàn toàn hoạt động trong bộ nhớ RAM, **không ghi dữ liệu, không thay đổi URL routing**. Dữ liệu chỉ được ghi vào hệ thống sau khi người dùng hoàn thành chuỗi xác nhận 3 bước ở Phase I3.

---

## 2. Architecture & Clean Layering

```
[Markdown Outline String]
          │
          ▼  (Phase I1 - Pure Parser & AST Validator)
[MindMapImportNode AST] ◄──────────── src/lib/mindmapImportParser.ts
          │
          ├─────────────────────────────────────────────────┐
          │ (Phase I2 - Preview Adapter)                    │ (Phase I3 - Controlled Ingestion Engine)
          ▼                                                 ▼
[MindMapTreeNode Projection] ◄── adapter.ts      [ingestMindMapAst] ◄── src/lib/mindmapImportIngestion.ts
          │                                                 │ (Topological Order & Dedupe)
          ▼                                                 ▼
[MindMapTreeCanvas (RAM Sandbox)]               [DataContext / DataRepository Port]
          ▲                                                 ▲
          └─────────────────┬───────────────────────────────┘
                            │
              [MindMapImportPreviewModal.tsx]
              (Category Select + Confirm Dialog)
```

1. **`src/lib/mindmapImportParser.ts` (Phase I1)**:
   - Module phân tích cú pháp thuần túy chuyển đổi Markdown thành `MindMapImportNode` AST.
   - Không phụ thuộc vào bất kỳ kiểu dữ liệu UI hay context nào.
2. **`src/lib/mindmapImportPreviewAdapter.ts` (Phase I2)**:
   - Module chuyển đổi thuần túy từ `MindMapImportNode` AST $\rightarrow$ `MindMapTreeNode`.
   - Tái sử dụng trực tiếp component `MindMapTreeCanvas` mà không làm ô nhiễm file parser.
3. **`src/lib/mindmapImportIngestion.ts` (Phase I3)**:
   - Ingestion Engine thuần túy xử lý duyệt cây theo thứ tự topo (cha tạo trước, con tạo sau).
   - Thiết lập `parentId` và chuyển đổi nhãn quan hệ thành `KnowledgeLink` (`prerequisite`, `advanced`, `related`, `contradicts`).
   - Xử lý 3 chiến lược Deduplication và cơ chế **Compensation Action Rollback**.
4. **`src/components/mindmap/MindMapImportPreviewModal.tsx` (Phase I2 & I3)**:
   - Giao diện Split-View gồm Textarea nhập dàn ý, Bảng chẩn đoán cú pháp, Khung nhìn sơ đồ xem trước, Dropdown chọn Category đích, và Hộp thoại xác nhận trước khi ghi.

---

## 3. Scope & Feature Summary

### In-Scope (Phase I1, I2, I3)
- **Parser**: Hỗ trợ bullet `-`, `*`, `+`, thụt lề 2 spaces / 4 spaces / tabs, nhãn quan hệ ngữ nghĩa `[tiên quyết]`, `[nâng cao]`, `[liên quan]`, `[đối chiếu]`, `[ghi chú]`, `[tài liệu]`.
- **Diagnostics**: Nhận diện icon `📚`, `📝`, `🔗`, markdown link `[Title](url)`, tiến độ `[Tiến độ: X%]`, phát hiện cảnh báo thụt lề nhảy cóc (`JUMP_INDENTATION`).
- **Sandbox UI**: Chuyển đổi Layout Ngang/Dọc, nút Dán mẫu, nút Xóa, và preview canvas an toàn.
- **Category Requirement**: Bắt buộc chọn đúng 1 danh mục đích từ dropdown trước khi kích hoạt nút nhập.
- **Confirmation Boundary**: Hộp thoại xác nhận hiển thị tóm tắt quy mô (`X chủ đề`), danh mục đích, và chiến lược trùng lặp.
- **Deduplication Strategies**:
  - `skip-and-reuse` (Mặc định): Tái sử dụng ID chủ đề đã có trong CSDL nếu trùng tên và nối các nhánh con vào chủ đề đó.
  - `create-with-suffix`: Tạo chủ đề mới kèm hậu tố `(Nhập mới)`.
  - `strict-abort`: Hủy bỏ toàn bộ quá trình nhập nếu phát hiện trùng lặp.
- **Compensation Action Rollback**: Tự động gọi `deleteTopic` theo thứ tự LIFO nếu gặp lỗi ngoại lệ giữa chừng.

### Non-Goals
- **Không tự ý chuyển hướng URL**: Sau khi nhập thành công, modal đóng lại an toàn, không thay đổi route/hash.
- **Không ghi ngầm (No Implicit Writes)**: Tuyệt đối không ghi dữ liệu nếu người dùng chưa bấm xác nhận trong dialog.

---

## 4. AST Output & Ingestion Port Specification

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

export type DedupeStrategy = "skip-and-reuse" | "create-with-suffix" | "strict-abort";

export interface IngestionOptions {
  targetCategoryId: string;
  targetCategoryType?: string;
  dedupeStrategy?: DedupeStrategy;
}

export interface IngestionPort {
  getExistingTopics: () => Topic[];
  createTopic: (topicData: Omit<Topic, "id" | "createdAt" | "updatedAt" | "studyProgress" | "links">) => string | Promise<string>;
  deleteTopic: (id: string) => void | Promise<void>;
  createKnowledgeLink: (linkData: Omit<KnowledgeLink, "id">) => void | Promise<void>;
}
```

---

## 5. Verification & Quality Gates

- **Unit Tests (`mindmap-import-parser.test.ts`)**: 9/9 tests passed.
- **Unit Tests (`mindmap-import-ingestion.test.ts`)**: 5/5 tests passed (Topo order, 3 Dedupe branches, Mid-batch Rollback).
- **Integration Tests (`mindmap-import-preview-modal.test.tsx`)**: 11/11 tests passed (Layout switcher, Category requirement, Dialog summary, Zero-write cancel, Ingestion submit).
- **Full Mindmap Suite**: 15/15 test files passed, 178/178 tests passed.
- **TypeScript Typecheck**: 0 errors.
