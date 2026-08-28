# 📘 Runbook Vận Hành: Antigravity & NotebookLM Knowledge Bridge

> **Dành cho:** Lập trình viên, Operator & Autonomous AI Agents (Antigravity 2.0)  
> **Phiên bản:** v1.0 (Phase P4.1 Hardening)  
> **Thư mục Handoff:** `.agents/handoffs/`

---

## 1. Cấu Trúc Bộ Tệp Handoff (Handoff Artifact Set)

Mỗi phiên làm việc với Antigravity Agent được cấu thành từ 4 tệp định danh theo `jobId` (`job-nlm-${timestamp}-${randomSuffix}`):

```text
.agents/handoffs/
├── {jobId}-manifest.json   # Tệp điều phối liên tiến trình (Inter-process Manifest)
├── {jobId}-source.md       # Tài liệu nguồn tổng hợp 6 phần (Source Pack)
├── {jobId}-prompt.md       # Chỉ thị chuyên biệt cho Agent (Task Prompt)
└── {jobId}-result.md       # Tệp kết quả do Agent tạo ra (Target Output)
```

---

## 2. Quy Trình Thực Thi Dành Cho Antigravity Agent (Agent Execution Protocol)

1. **Bước 1: Tiếp nhận Lệnh CLI**:
   ```bash
   agy -p "Khảo cứu NotebookLM: Xử lý chủ đề '{topicTitle}' (dạng {artifactType}) theo prompt '.agents/handoffs/{jobId}-prompt.md' với dữ liệu nguồn '.agents/handoffs/{jobId}-source.md'" --output ".agents/handoffs/{jobId}-result.md"
   ```
2. **Bước 2: Đọc hiểu và Xác thực Manifest**:
   - Đọc `.agents/handoffs/{jobId}-manifest.json`.
   - Kiểm tra các trường: `jobId`, `artifactType`, `files.source`, `files.prompt`, `files.result`.
3. **Bước 3: Thực thi Phân Tích & Nghiên Cứu**:
   - Sử dụng tri thức và prompt trong `{jobId}-prompt.md` để khảo cứu tài liệu trong `{jobId}-source.md`.
4. **Bước 4: Ghi Tệp Kết Quả**:
   - Ghi nội dung phân tích vào `.agents/handoffs/{jobId}-result.md`.
5. **Bước 5: Nhập Kết Quả vào Giao Diện**:
   - Người dùng tải hoặc nạp `{jobId}-result.md` vào Topic / Note trên UI.
   - Hàm `completeMatchingHandoffJob({ topicId, artifactType, jobId })` tự động chuyển trạng thái Job thành `success`.

---

## 3. Invariants & Guardrails (Ràng Buộc An Toàn)

- **Text-Only Markdown**: Không nhúng nhị phân (binary) vào tệp nguồn hoặc manifest.
- **Rolling Buffer 50 Jobs**: UI Tracker tự động thu dọn các job cũ khi vượt quá 50 bản ghi.
- **Graceful Storage I/O**: Mọi thao tác lưu trạng thái đều bọc safe storage, không crash ứng dụng khi quota bị chặn.
