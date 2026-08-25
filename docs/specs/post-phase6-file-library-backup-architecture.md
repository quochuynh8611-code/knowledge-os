# Đặc Tả Kỹ Thuật: Kiến Trúc Thư Viện Tệp Vật Lý & Kiểm Toán Sao Lưu (Post-Phase 6 Micro-Phase)

> **Tài liệu tham chiếu:** [`ADR-017`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/adr-017-file-library-backup-architecture.md) · [`docs/PROJECT_STATUS.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/PROJECT_STATUS.md)  
> **Người thực hiện:** Staff Software Engineer / Technical Architect  
> **Trạng thái:** Proposed (Chờ phê duyệt Human Gate)  

---

## 1. Mục Tiêu Chiến Lược

Xây dựng kiến trúc quản lý kiểm toán đường dẫn tệp vật lý (**File Library & Path Audit Engine**) và xuất bảng kê sao lưu (**File Library Manifest**), đảm bảo:
1. Xác định rõ ràng nguồn chân lý giữa **Metadata trong App** và **Tệp tin vật lý trên Ổ đĩa**.
2. Kiểm toán và phát hiện chính xác các tài liệu bị đứt gãy đường dẫn (`missing`) hoặc nằm ngoài thư mục thư viện chuẩn (`outside_library`).
3. Cung cấp công cụ xuất tệp `file-library-manifest.json` phục vụ quy trình sao lưu trọn gói.
4. Bảo đảm tính tương thích ngược 100% với dữ liệu hiện có và rào chắn **Zero Binary Ingestion**.

---

## 2. Thiết Kế Data Model & Types

### 2.1. Audit & Manifest Interfaces (`src/lib/fileLibraryAudit.ts`)

```typescript
export type FileReferenceStatus = 'exists' | 'missing' | 'outside_library' | 'unspecified';

export interface FileReferenceEntry {
  id: string;
  sourceType: 'resource' | 'note';
  title: string;
  topicId: string;
  topicTitle?: string;
  rawPath?: string;
  resolvedPath?: string;
  relativeToRoot?: string;
  status: FileReferenceStatus;
  sizeBytes?: number;
  mimeType?: string;
  lastCheckedAt: string;
}

export interface FileLibraryAuditSummary {
  totalItems: number;
  totalWithLocalPath: number;
  existingCount: number;
  missingCount: number;
  outsideLibraryCount: number;
  unspecifiedCount: number;
  totalFileSizeBytes: number;
  libraryRootPath?: string;
  auditedAt: string;
}

export interface FileLibraryManifest {
  manifestVersion: '1.0';
  exportedAt: string;
  libraryRootPath?: string;
  summary: FileLibraryAuditSummary;
  entries: FileReferenceEntry[];
}
```

### 2.2. Pure Functions Contract

1. `normalizeFilePath(rawPath: string): string`: Chuẩn hóa dấu phân cách thư mục (`/`), loại bỏ khoảng trắng thừa.
2. `classifyPathRelativeToRoot(resolvedPath: string, libraryRootPath?: string): 'inside' | 'outside' | 'no_root'`: Xác định xem đường dẫn có nằm bên trong thư mục gốc hay không.
3. `auditFileReferences(resources: Resource[], notes: Note[], options?: { libraryRootPath?: string; fileExistsChecker?: (path: string) => boolean; fileSizeGetter?: (path: string) => number }): { summary: FileLibraryAuditSummary; entries: FileReferenceEntry[] }`: Hàm thuần túy kiểm toán toàn bộ danh sách resources/notes.
4. `generateFileLibraryManifest(auditResult: { summary: FileLibraryAuditSummary; entries: FileReferenceEntry[] }, options?: { libraryRootPath?: string }): FileLibraryManifest`: Xuất dữ liệu bảng kê manifest có cấu trúc chuẩn.

---

## 3. UI Integration Contract (`ExportImportModal.tsx`)

Trong giao diện Quản Lý Dữ Liệu (`ExportImportModal.tsx`):
1. **Thêm mục / tab hoặc khu vực "Kiểm Toán Thư Viện Tệp (File Library Audit)"**:
   - Hiển thị cấu hình Thư mục Thư viện Gốc (`libraryRootPath`).
   - Hiển thị Thống kê Tổng quan (Tổng số tệp tham chiếu, Tệp hợp lệ, Tệp thất lạc, Tệp ngoài thư viện).
   - Nút hành động **"Xuất Bảng Kê Manifest (JSON)"** (`data-testid="btn-export-file-manifest"`).
   - Bảng hướng dẫn 3 bước sao lưu toàn diện (Checklist).

---

## 4. Blast Radius & Mitigation Strategy

| Thành Phần | Rủi Ro Tiềm Ẩn | Biện Pháp Phòng Vệ / Giảm Thiểu |
| :--- | :--- | :--- |
| **Prisma Schema / Database** | Schema migration phức tạp | **Không thay đổi schema database**. Audit chạy dựa trên dữ liệu hiện có trong memory/context. |
| **Snapshot Size (15MB Limit)** | Phình to dung lượng | Manifest được xuất thành tệp JSON riêng biệt, không nhét binary vào Snapshot. |
| **Cross-Platform Filesystem** | Khác biệt dấu phân cách giữa Windows / macOS | Chuẩn hóa đường dẫn qua `normalizeFilePath` sử dụng format chuẩn POSIX slash `/`. |
| **Offline / Browser Runtime** | Trình duyệt không có quyền truy cập trực tiếp `fs` | Hàm audit chấp nhận dependency injection `fileExistsChecker` (Node sử dụng `fs.existsSync`, Browser sử dụng state/probe hoặc mock an toàn). |
