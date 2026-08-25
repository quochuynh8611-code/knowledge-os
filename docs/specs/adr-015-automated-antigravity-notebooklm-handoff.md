# 🏛️ ADR-015: Automated Antigravity Handoff Pipeline for NotebookLM via CLI & File-Based Protocol

> **Trạng thái:** ACCEPTED / READY FOR IMPLEMENTATION  
> **Ngày quyết định:** 2026-08-25  
> **Người phụ trách:** Staff Software Engineer / Technical Architect  
> **Phân loại quyết định:** Two-Way Door (Reversible Decision)  
> **Tài liệu liên quan:** [`docs/specs/post-phase5-automated-antigravity-notebooklm-handoff.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase5-automated-antigravity-notebooklm-handoff.md) · [`docs/gherkin/post-phase5-automated-antigravity-notebooklm-handoff.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/post-phase5-automated-antigravity-notebooklm-handoff.feature)

---

## 🎯 1. BỐI CẢNH (CONTEXT)

Ở Phase 2b (`NotebookLMStudioModal.tsx`) và Phase 3 (`AntigravityHandoffModal.tsx`), Knowledge OS đã xây dựng nền tảng đóng gói tài liệu nguồn (Source Document) và sinh Task Prompt chỉ thị cho Antigravity 2.0. Tuy nhiên, quy trình này vẫn dựa trên việc sao chép thủ công từng đoạn text qua clipboard hoặc tải file lẻ.

Antigravity 2.0 sở hữu năng lực thực thi headless qua CLI (`agy -p`), tiếp nhận input file, và tự động gọi NotebookLM skill mà không cần xác nhận nhiều lần nếu `nlm` đã được xác thực một lần.

Chúng ta cần quyết định giao thức tích hợp (Integration Protocol) giữa Knowledge OS và Antigravity 2.0:
- **Phương án A:** File & CLI-based Handoff Pipeline (`agy -p` + Job Manifest JSON + Structured Source/Prompt Files).
- **Phương án B:** Local API Socket / WebSocket Bridge (Dựng local HTTP/WS daemon lắng nghe request từ trình duyệt).

---

## ⚖️ 2. PHÂN TÍCH QUYẾT ĐỊNH (DECISION DRIVERS)

| Tiêu chí | Phương án A (CLI & File Manifest) | Phương án B (Local API Bridge) |
| :--- | :--- | :--- |
| **Yêu cầu Daemon** | ❌ Không cần (Chạy 100% Client-side/Offline) | ⚠️ Bắt buộc có Node.js server chạy ngầm |
| **Bảo mật & Sandbox** | 🟢 An toàn tuyệt đối, không mở cổng mạng localhost | ⚠️ Nguy cơ CORS, port collision, unauthenticated socket |
| **Độ trễ & Trải nghiệm** | 🟢 1-click Chuẩn bị Handoff, sao chép CLI Command | 🟢 Kích hoạt trực tiếp nếu daemon sống |
| **Blast Radius** | 🟢 Cực thấp, độc lập hoàn toàn | ⚠️ Cao (cần quản lý vòng đời daemon, reconnection) |
| **Tính khả nghịch (Reversibility)** | 🟢 Two-way door (Dễ dàng nâng cấp lên API bridge sau này) | ⚠️ One-way door (Phụ thuộc vào kiến trúc socket) |

---

## 🚀 3. QUYẾT ĐỊNH (DECISION)

Chúng tôi quyết định chọn **Phương án A: File & CLI-Based Handoff Protocol**:
1. **Phân Định Rõ Ràng Hai Nguồn Dữ Liệu:**
   - **Tệp Manifest JSON (`*-manifest.json`):** Đóng vai trò là **Inter-process Handoff Artifact** chuẩn hóa giữa Knowledge OS và Antigravity 2.0.
   - **LocalStorage (`phat_hoc_antigravity_handoff_jobs_v1`):** Đóng vai trò là **UI Tracker State** lưu trữ danh sách và trạng thái theo dõi tiến độ phía Client.
2. **Không Persist Thuộc Tính Lệnh (`command`):** Cấu trúc Job được giữ tinh gọn, lệnh CLI headless được sinh động qua hàm thuần túy `buildAntigravityCLICommand(job)` khi cần hiển thị/sao chép.
3. **Wording Chính Xác:** Sử dụng hành vi **"Chuẩn bị Handoff Antigravity"** (Prepare Antigravity Handoff) để phản ánh đúng thực tế chuẩn bị gói hồ sơ và lệnh CLI trước khi người dùng thực thi qua terminal.

---

## 🛡️ 4. HỆ QUẢ & RỦI RO (CONSEQUENCES & MITIGATIONS)

- **Ưu điểm:**
  - Giữ vững nguyên tắc **Zero External Cloud Sync Claim** và **100% Client-side Offline Capability**.
  - Không phát sinh dependency mới, không phụ thuộc vào tiến trình daemon nền.
  - Phù hợp hoàn hảo với thói quen làm việc của học giả kỹ thuật (terminal & editor).
- **Kế hoạch mở rộng tương lai (Future Evolution):**
  - Khi cần nâng cấp lên kết nối tự động trực tiếp, schema `AntigravityHandoffJob` sẽ được tái sử dụng 100% làm payload cho Local API Bridge mà không cần đổi contract UI.
