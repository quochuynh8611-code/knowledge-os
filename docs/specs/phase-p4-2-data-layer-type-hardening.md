# Technical Specification: Phase P4.2 — Data Layer & Type Hardening

## 1. Problem Statement & Motivation
Khi thực hiện kiểm tra kiểu tĩnh (`npm run lint` / `tsc --noEmit`), hệ thống còn ghi nhận đúng **6 baseline TypeScript diagnostics** cũ thuộc về Data Layer và các mock test:
1. **`src/services/dataRepository.ts(159,7)`**: Lệch kiểu giữa `KnowledgeLink.id` (bắt buộc trong `src/types/index.ts`) và `KnowledgeLinkSchema` (tùy chọn trong `src/lib/validation.ts` và Obsidian graph generation).
2. **`tests/unit/obsidian-lib.test.ts(455,7 & 478,7)`**: Mock Topic thiếu thuộc tính bắt buộc `categoryId`.
3. **`tests/unit/phase2c-data-management-modal-component.test.tsx(77,5)`**: Mock `IDataRepository` thiếu method `resetAllData`.
4. **`tests/unit/storage-repository-ssot.test.ts(55,13 & 77,13)`**: Mock Topic thiếu thuộc tính `links` và `studyProgress` (vốn nên là optional hoặc được khởi tạo chuẩn).

Phase P4.2 thực hiện **Làm Sạch và Củng Cố Tầng Kiểu (Type Hardening)** nhằm đưa toàn bộ dự án về **0 lỗi TypeScript (0 errors)** mà không thay đổi bất kỳ hành vi runtime nào của sản phẩm.

---

## 2. Type Alignment Analysis & Proposed Adjustments

### 2.1. `KnowledgeLink` & `Topic` Type Alignment (`src/types/index.ts`)
- **`KnowledgeLink`**: Đổi `id: string` $\rightarrow$ `id?: string` để tương thích hoàn toàn với `KnowledgeLinkSchema` (Zod infer) và đồ thị liên kết tự động từ Obsidian/Markdown backlinks.
- **`Topic.links` & `Topic.studyProgress`**: Đổi sang `links?: KnowledgeLink[]` và `studyProgress?: StudyProgress` vì một Topic mới tạo hoặc topic sơ khởi có thể chưa có liên kết đồ thị hoặc chưa tham gia ôn tập SM-2.

### 2.2. Test Mock Updates
- **`tests/unit/obsidian-lib.test.ts`**: Bổ sung `categoryId: 'cat-kt-custom'` và `categoryId: 'cat-tl-custom'`.
- **`tests/unit/phase2c-data-management-modal-component.test.tsx`**: Bổ sung `resetAllData: vi.fn().mockResolvedValue(true)` vào mock `IDataRepository`.
- **`tests/unit/storage-repository-ssot.test.ts`**: Chuẩn hóa mock data với đầy đủ các trường hoặc dựa trên type optional.

---

## 3. Scope Boundaries & Reversibility

### 3.1. Boundaries
- **Được sửa**: `src/types/index.ts`, `tests/unit/obsidian-lib.test.ts`, `tests/unit/phase2c-data-management-modal-component.test.tsx`, `tests/unit/storage-repository-ssot.test.ts`.
- **Tuyệt đối không can thiệp**:
  - Không sửa `src/lib/syncQueue.ts`, `src/services/syncQueue.ts` hay `src/lib/syncTelemetry.ts`.
  - Không sửa `src/lib/antigravityPipeline.ts`.
  - Không thay đổi Prisma schema hoặc REST API endpoints.

### 3.2. Reversibility
- **100% Reversible (Two-Way Door)**: Chỉ là tinh chỉnh định nghĩa kiểu TypeScript và mock tests.

---

## 4. File Changes Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `docs/specs/phase-p4-2-data-layer-type-hardening.md` | **NEW** | Bản đặc tả kỹ thuật Phase P4.2 này. |
| `docs/adr/ADR-043-data-layer-type-hardening.md` | **NEW** | Quyết định kiến trúc chuẩn hóa kiểu tầng dữ liệu. |
| `docs/gherkin/phase-p4-2-data-layer-type-hardening.feature` | **NEW** | Kịch bản kiểm thử BDD cho Type Alignment & Zero Diagnostics. |
| `src/types/index.ts` | **MODIFY** | Đổi `KnowledgeLink.id` sang `id?: string`, `Topic.links` và `studyProgress` sang optional. |
| `tests/unit/obsidian-lib.test.ts` | **MODIFY** | Bổ sung `categoryId` trong mock topics. |
| `tests/unit/phase2c-data-management-modal-component.test.tsx` | **MODIFY** | Bổ sung `resetAllData` trong mock `IDataRepository`. |
| `tests/unit/storage-repository-ssot.test.ts` | **MODIFY** | Bổ sung `links` và `studyProgress` cho mock topics. |
