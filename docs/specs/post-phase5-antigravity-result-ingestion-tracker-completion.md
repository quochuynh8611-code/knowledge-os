# 📋 ĐẶC TẢ KỸ THUẬT: POST-PHASE 5 MICRO-INCREMENT
## Antigravity Result Ingestion & Tracker Completion Polish (Khép Kín Vòng Quay Kết Quả & Hoàn Thiện Trạng Thái Tracker)

> **Trạng thái:** 🟢 VERIFIED & IMPLEMENTED (100% GREEN)  
> **Phạm vi:** Post-Phase 5 Micro-Increment (Quy tắc hoàn tất Job Tracker khi nạp kết quả Markdown từ Antigravity/NotebookLM)  
> **Tài liệu liên quan:** [`docs/specs/adr-015-automated-antigravity-notebooklm-handoff.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/adr-015-automated-antigravity-notebooklm-handoff.md) · [`docs/specs/post-phase5-automated-antigravity-notebooklm-handoff.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase5-automated-antigravity-notebooklm-handoff.md)  
> **Mục tiêu:** Định nghĩa hợp đồng nghiệp vụ rõ ràng cho việc chuyển trạng thái `status` của Handoff Job từ `queued`/`processing` sang `success` khi kết quả nghiên cứu được nạp (ingested) trở lại Knowledge OS.

---

## 🎯 1. BỐI CẢNH & ĐỘNG LỰC THIẾT KẾ

Tại increment `958a222`, hệ thống đã tạo thành công cơ chế khởi tạo Job (`queued`), sinh lệnh CLI `agy -p` và lưu trữ danh sách Job trong UI Tracker. Tuy nhiên:
1. **Thiếu Điều Kiện Hoàn Tất Tự Động (Completion Contract):** Job vẫn giữ nguyên trạng thái `queued` vô thời hạn ngay cả sau khi người dùng đã nạp file Markdown kết quả từ Antigravity về Artifacts Locker.
2. **Rủi Ro Đánh Dấu Hoàn Tất Sai (False Completion):** Thao tác bấm nút "Chuẩn bị Handoff" hoặc "Sao chép lệnh CLI" **TUYỆT ĐỐI KHÔNG** được coi là hoàn tất Job.
3. **Quy Tắc Khớp Kết Quả (Matching & Safety Rules):** Khi nạp một Artifact mới (qua tải tệp `.md` hoặc biểu mẫu nhập), hệ thống phải kiểm tra đối chiếu chính xác (`topicId` và `artifactType`, hoặc `jobId` tường minh) để chuyển trạng thái Job tương ứng sang `success`, không được làm sai lệch các Job của chủ đề khác.

---

## 🛡️ 2. PHẠM VI (SCOPE DEFINITION)

### ✅ Trong phạm vi (Scope IN):
1. **Hàm Hoàn Tất Khớp Job Thuần Túy (`completeMatchingHandoffJob`):**
   - Đầu vào: `{ topicId: string; artifactType?: NotebookLMArtifactType; jobId?: string }`.
   - Logic ưu tiên:
     - Nếu có `jobId`: Tìm đúng Job theo ID và xác nhận `topicId` trùng khớp $\rightarrow$ cập nhật `status = 'success'`, `updatedAt = now`.
     - Nếu không có `jobId`: Tìm Job đang chờ gần nhất (`queued` hoặc `processing`) có cùng `topicId` và cùng `artifactType` $\rightarrow$ cập nhật `status = 'success'`, `updatedAt = now`.
     - Nếu không tìm thấy Job phù hợp hoặc dữ liệu không hợp lệ: Trả về `null`, không làm ảnh hưởng các Job khác.
2. **Tích Hợp Vào Quy Trình Nạp Artifact trong `NotebookLMStudioModal.tsx`:**
   - Khi lưu thành công Artifact mới trong Artifacts Locker (hàm `handleSaveNewArtifact` hoặc tải tệp Markdown):
     - Kích hoạt `completeMatchingHandoffJob({ topicId: currentTopic.id, artifactType })`.
     - Cập nhật lại UI Tracker State trên giao diện modal.
3. **Hiển Thị Trực Quan Trạng Thái Job Tracker:**
   - `queued`: Huy hiệu vàng hổ phách (`amber`).
   - `processing`: Huy hiệu xanh dương (`blue`).
   - `success`: Huy hiệu xanh ngọc bảo (`emerald`) biểu thị đã nạp kết quả thành công.
   - `failed`: Huy hiệu đỏ hồng (`rose`).

### ❌ Ngoài phạm vi (Scope OUT):
- KHÔNG tạo background process / daemon tự động polling file hệ thống.
- KHÔNG gọi trực tiếp API đám mây riêng tư của Google NotebookLM.
- KHÔNG thay đổi cấu trúc DataContext, Prisma Schema hay REST API.
- KHÔNG tự động chuyển trạng thái sang `success` khi chỉ mới bấm nút Chuẩn bị hoặc Sao chép lệnh CLI.

---

## 📐 3. THIẾT KẾ CHI TIẾT & BẢNG TRẠNG THÁI (STATE MACHINE)

```
[Bấm "Chuẩn bị Handoff"]
         │
         ▼
    ( status: 'queued' ) ──[Sao chép lệnh CLI]──► ( Vẫn giữ 'queued' )
         │
         │   [Thực thi ngoài: agy -p ...]
         │
         ▼
[Nạp Artifact Kết Quả (File .md / Form)]
         │
    (Khớp topicId + artifactType)
         │
         ▼
    ( status: 'success' )  <-- Ghi nhận hoàn tất trong UI Tracker
```

---

## 🔒 4. RÀO CHẮN AN TOÀN & KHẢ NĂNG PHỤC HỒI (REVERSIBILITY)

1. **Zero State Pollution:** Dữ liệu artifact không hợp lệ hoặc bị lỗi validation sẽ bị chặn từ đầu, không kích hoạt cập nhật trạng thái Job.
2. **Non-destructive Ingestion:** Nếu không có Job nào khớp, Artifact vẫn được lưu trữ bình thường vào Artifacts Locker mà không gây lỗi runtime.
3. **Two-Way Door:** Thuần túy là logic client-side deterministic, có thể mở rộng thêm cơ chế file watcher / local API bridge sau này mà không phá vỡ schema.
