# ADR-071: NotebookLM Progressive Disclosure Workspace Architecture

## Status
**Proposed** (Target: Phase F8.1 / Integration Suite)

## Context & Problem Statement
Knowledge OS cung cấp tính năng tích hợp nghiên cứu với Google NotebookLM thông qua Antigravity 2.0. Trong phiên bản trước (ADR-070 / v2.1), `NotebookLMStudioModal.tsx` đóng vai trò là Orchestrator nhưng được hiện thực dưới dạng một monolithic component dài hơn 1,000 dòng.

Giao diện cũ hiển thị tất cả các khu vực cùng lúc trên một màn hình cuộn dọc dài:
1. Topic selector và link mở NotebookLM
2. Khung xem trước tài liệu nguồn (Source Document)
3. Bộ sinh Task Prompt và nút bấm cấu hình
4. Lệnh headless CLI `agy -p` và bảng theo dõi Job Tracker
5. Kho kết quả Artifact Locker và biểu mẫu nhập dữ liệu

Điều này dẫn đến:
- **Mật độ thông tin quá cao**: Người dùng bị phân tâm bởi quá nhiều khối chức năng và nút bấm trong một viewport.
- **Visual hierarchy bị loãng**: Không có hướng dẫn luồng thao tác tuần tự rõ ràng (Step-by-step guidance).
- **Khó bảo trì**: Một file chứa toàn bộ logic fetch session, sao chép clipboard, validation, form state, job tracking và rendering.

## Decision Drivers
- Tối ưu hóa trải nghiệm người dùng theo nguyên tắc **Progressive Disclosure** (chỉ hiển thị thông tin khi người dùng cần đến bước đó).
- Bảo toàn 100% hợp đồng dữ liệu, API REST và hành vi nghiệp vụ hiện có.
- Duy trì khả năng tiếp cận các công cụ kỹ thuật nâng cao (CLI, Job manifest, pipeline tracker) cho power users mà không làm rối mắt người dùng thông thường.
- Kiến trúc module hóa sạch sẽ, dễ viết unit test độc lập cho từng phần.

## Alternatives Considered

### Phương án 1: Giữ nguyên modal dài và thêm cuộn neo (Scroll spy / Anchor tabs)
- **Ưu điểm**: Không cần thay đổi cấu trúc state hay chia bước.
- **Nhược điểm**: Modal vẫn quá nặng, mật độ thông tin vẫn cao, tải toàn bộ DOM cùng lúc, không giải quyết được vấn đề phân tâm thị giác.

### Phương án 2: Tách thành nhiều Modal độc lập (Source Modal, Prompt Modal, Ingest Modal)
- **Ưu điểm**: Mỗi modal nhỏ gọn.
- **Nhược điểm**: Làm đứt gãy luồng trải nghiệm (người dùng phải đóng mở liên tục 3 modal khác nhau), tăng nguy cơ mất đồng bộ state giữa các modal khi người dùng chuyển qua lại.

### Phương án 3: Tạo full-page workspace route (`/workspace/notebooklm`)
- **Ưu điểm**: Không gian hiển thị rộng rãi không bị giới hạn bởi modal.
- **Nhược điểm**: Phá vỡ mô hình tích hợp in-context hiện tại của Knowledge OS (người dùng đang xem một Topic trong `TopicDetail` hoặc ở `Navbar` muốn mở nhanh NotebookLM modal mà không bị chuyển trang). Tăng blast radius lên hệ thống routing.

### Phương án 4 (Được chọn): 3-Step Stepper Workspace trong Modal với Progressive Disclosure & Collapsible Advanced Area
- **Quyết định**: Giữ modal container nhưng chia nội dung thành 3 bước logic:
  1. **Bước 1 — Nguồn (Source)**: Chọn chủ đề, xem tóm tắt & preview tài liệu nguồn, copy/download/mở NotebookLM.
  2. **Bước 2 — Prompt (Prompt & Handoff)**: Chọn loại artifact, nhập chỉ dẫn, preview prompt, kích hoạt Handoff Antigravity.
  3. **Bước 3 — Kết quả (Results & Locker)**: Nạp Markdown/thêm kết quả, duyệt danh sách artifact, thẩm định qua `ArtifactReviewDrawer`.
  - **Vùng kỹ thuật (Advanced Section)**: Thu gọn CLI, Job ID, và Pipeline History vào accordion mặc định đóng ở chân modal.
  - **Tách module component**: Chia nhỏ thành các component con đặt trong `src/components/integrations/notebooklm/`.

## Architectural Consequences & Trade-offs

### Positive Consequences
- **UX vượt trội**: Người dùng được dẫn dắt theo đúng chu trình tự nhiên: Chuẩn bị nguồn $\rightarrow$ Tạo Prompt $\rightarrow$ Nhập kết quả.
- **Giảm tải nhận thức**: Mỗi bước chỉ có 1 Primary CTA duy nhất và các thông tin liên quan trực tiếp.
- **Khả năng kiểm thử cao**: Các pure utilities và step components có thể được test độc lập với test props giả lập.
- **Tương thích ngược 100%**: Không thay đổi schema Prisma, không thay đổi REST routes, không thay đổi storage keys.

### Negative Consequences / Risks & Mitigations
- **Risk**: Người dùng muốn xem nhanh danh sách kết quả cũ ở Bước 3 mà không muốn đi qua Bước 1 và 2.
  - *Mitigation*: Stepper cho phép click tự do chuyển giữa các bước (1, 2, 3) bất cứ lúc nào, không khóa cứng tuyến tính.
- **Risk**: Power user quen copy lệnh `agy -p` ngay ở màn hình chính có thể cảm thấy mất thêm 1 click mở Advanced section.
  - *Mitigation*: Khi bấm "Chuẩn bị Handoff Antigravity" ở Bước 2, hệ thống tự động hiển thị thông báo thành công và gợi ý mở/sao chép lệnh CLI trong Advanced section.

## Blast Radius & Rollback Plan
- **Blast Radius**: Rất hẹp, chỉ giới hạn trong phạm vi hiển thị UI của modal NotebookLM (`NotebookLMStudioModal`). Toàn bộ API backend (`/api/research-sessions`, `/api/artifacts`), storage adapter, và các màn hình khác trong app hoàn toàn không bị ảnh hưởng.
- **Rollback Plan**: Toàn bộ thay đổi nằm trong `src/components/integrations/notebooklm/` và `NotebookLMStudioModal.tsx`. Trong trường hợp phát sinh lỗi nghiêm trọng, chỉ cần khôi phục lại file `NotebookLMStudioModal.tsx` gốc mà không cần rollback cơ sở dữ liệu hay backend server.
