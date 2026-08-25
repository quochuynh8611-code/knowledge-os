# 📋 ĐẶC TẢ KỸ THUẬT: POST-PHASE 5 MICRO-INCREMENT
## Automated Antigravity Handoff Pipeline for NotebookLM (Tự Động Hóa Pipeline Handoff Antigravity cho NotebookLM)

> **Trạng thái:** 🟢 VERIFIED & IMPLEMENTED (100% GREEN)  
> **Phạm vi:** Post-Phase 5 Micro-Increment (Thiết lập pipeline bàn giao tự động qua File Manifest & CLI Headless giữa NotebookLM Studio và Antigravity 2.0)  
> **Tài liệu liên quan:** [`docs/specs/adr-015-automated-antigravity-notebooklm-handoff.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/adr-015-automated-antigravity-notebooklm-handoff.md) · [`docs/specs/post-phase5-scholar-citation-generator.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase5-scholar-citation-generator.md)  
> **Mục tiêu:** Tự động hóa toàn bộ quy trình đóng gói dữ liệu nguồn, sinh chỉ thị chuyên biệt và tạo manifest lệnh CLI `agy -p` để Antigravity 2.0 có thể tiếp nhận và thực thi xử lý NotebookLM, kèm bảng theo dõi trạng thái Job tại Client.

---

## 🎯 1. BỐI CẢNH & ĐỘNG LỰC THIẾT KẾ

Tại Phase 2b (`NotebookLMStudioModal.tsx`), người dùng có thể sao chép thủ công tài liệu nguồn hoặc task prompt. Tuy nhiên, khi chuyển sang môi trường **Antigravity 2.0 Headless Execution**, một pipeline chuẩn cần:
1. **Định danh Job rõ ràng (`jobId`):** Phân biệt từng phiên nghiên cứu và từng loại artifact (`study_guide`, `faq`, `briefing_doc`, `audio_overview_summary`, `source_pack`).
2. **Cấu trúc File Handoff chuẩn hóa:** Tự động quy định vị trí lưu trữ tài liệu nguồn (`*-source.md`), chỉ thị prompt (`*-prompt.md`), manifest (`*-manifest.json`) và tệp kết quả dự kiến (`*-result.md`) trong thư mục `.agents/handoffs/`.
3. **Phân định rành mạch giữa Inter-process Manifest và UI Tracker State:**
   - **Tệp Manifest JSON (`*-manifest.json`):** Inter-process artifact cho Antigravity Agent đọc hiểu bối cảnh và vị trí tệp.
   - **LocalStorage (`phat_hoc_antigravity_handoff_jobs_v1`):** Lưu trữ UI tracker state để người dùng theo dõi danh sách, trạng thái và sao chép lại lệnh trên giao diện.
4. **Sinh Lệnh CLI Động (`buildAntigravityCLICommand`):** Không lưu chuỗi `command` cố định trong storage, thay vào đó tổng hợp động từ cấu trúc Job khi hiển thị/sao chép.
5. **Wording Chuẩn Xác:** Sử dụng **"Chuẩn bị Handoff Antigravity"** vì ở increment này việc kích hoạt `agy -p` được thực hiện qua dòng lệnh của người dùng hoặc script tự động.

---

## 🛡️ 2. PHẠM VI (SCOPE DEFINITION)

### ✅ Trong phạm vi (Scope IN):
1. **Cấu trúc Dữ liệu Handoff Job (`AntigravityHandoffJob`):**
   ```typescript
   export type AntigravityJobStatus = 'queued' | 'processing' | 'success' | 'failed';

   export interface AntigravityHandoffJob {
     jobId: string;           // 'job-nlm-1724580000000-abc123'
     status: AntigravityJobStatus;
     artifactType: NotebookLMArtifactType;
     topicId: string;
     topicTitle: string;
     sourcePath: string;      // '.agents/handoffs/job-nlm-...-source.md'
     promptPath: string;      // '.agents/handoffs/job-nlm-...-prompt.md'
     manifestPath: string;    // '.agents/handoffs/job-nlm-...-manifest.json'
     resultPath?: string;     // '.agents/handoffs/job-nlm-...-result.md'
     createdAt: string;       // ISO timestamp
     updatedAt: string;       // ISO timestamp
     errorMessage?: string;
   }
   ```
2. **Module Helper Thuần Túy (`src/lib/antigravityPipeline.ts`):**
   - `createAntigravityHandoffJob(topic, artifactType, customInstructions?, notes?, resources?): { job: AntigravityHandoffJob; sourceContent: string; promptContent: string; manifestContent: string }`
   - `buildAntigravityCLICommand(job: AntigravityHandoffJob): string`
   - `serializeAntigravityJobManifest(job: AntigravityHandoffJob): string`
   - `generateHandoffFilenames(jobId: string, topicSlug: string)`
   - `getStoredHandoffJobs(): AntigravityHandoffJob[]`
   - `saveHandoffJob(job: AntigravityHandoffJob): void`
   - `updateHandoffJobStatus(jobId: string, status: AntigravityJobStatus, errorMessage?: string): void`
   - `deleteHandoffJob(jobId: string): void`
3. **Tích Hợp Giao Diện trong `NotebookLMStudioModal.tsx`:**
   - Nút hành động **"Chuẩn bị Handoff Antigravity"** (data-testid: `btn-prepare-antigravity-handoff`) trong tab Task Prompt.
   - Bảng theo dõi tiến độ **Lịch sử Pipeline Handoff (Job Tracker)** hiển thị danh sách các Job gần đây, huy hiệu trạng thái, ô hiển thị câu lệnh CLI sinh từ `buildAntigravityCLICommand`, nút sao chép câu lệnh và nút xóa bản ghi.

### ❌ Ngoài phạm vi (Scope OUT):
- KHÔNG gọi `child_process.exec` từ app runtime browser (tuân theo ADR-015).
- KHÔNG tạo background daemon / WebSocket server cục bộ.
- KHÔNG gọi trực tiếp API đám mây riêng tư của Google NotebookLM.
- KHÔNG thay đổi Prisma schema hoặc REST API backend.
- KHÔNG thêm thư viện phụ thuộc bên ngoài.

---

## 📐 3. THIẾT KẾ CHI TIẾT (TECHNICAL SPECIFICATIONS)

### 3.1. Quy tắc Sinh Lệnh CLI Headless (`buildAntigravityCLICommand`)
```typescript
export function buildAntigravityCLICommand(job: AntigravityHandoffJob): string {
  const resultArg = job.resultPath ? ` --output "${job.resultPath}"` : '';
  return `agy -p "Khảo cứu NotebookLM: Xử lý chủ đề '${job.topicTitle}' (dạng ${job.artifactType}) theo prompt '${job.promptPath}' với dữ liệu nguồn '${job.sourcePath}'"${resultArg}`;
}
```

### 3.2. Cấu trúc Tệp Manifest JSON (`*-manifest.json`)
```json
{
  "version": "1.0",
  "jobId": "job-nlm-1724580000000-abc123",
  "pipeline": "antigravity-notebooklm-mediator",
  "topic": {
    "id": "topic-vi-dieu-phap",
    "title": "Vi Diệu Pháp Toàn Tập"
  },
  "artifactType": "study_guide",
  "files": {
    "source": ".agents/handoffs/job-nlm-1724580000000-abc123-source.md",
    "prompt": ".agents/handoffs/job-nlm-1724580000000-abc123-prompt.md",
    "manifest": ".agents/handoffs/job-nlm-1724580000000-abc123-manifest.json",
    "result": ".agents/handoffs/job-nlm-1724580000000-abc123-result.md"
  },
  "createdAt": "2026-08-25T14:30:00.000Z"
}
```

---

## 🔒 4. INVARIANTS & CHỈ SỐ AN TOÀN

1. **Zero Binary Ingestion:** Dữ liệu nguồn chỉ chứa văn bản Markdown sạch và metadata tham chiếu tệp.
2. **Reversible Architecture (ADR-015):** Giao thức file/CLI hoàn toàn độc lập, dễ dàng cắm thêm Local Bridge sau này mà không phá vỡ UI contract.
3. **Blast Radius:** Rất thấp, đóng gói trọn vẹn trong module `antigravityPipeline.ts` và mở rộng nhẹ `NotebookLMStudioModal.tsx`.
