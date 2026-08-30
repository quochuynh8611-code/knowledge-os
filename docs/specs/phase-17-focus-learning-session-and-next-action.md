# Phase 17: Focus Learning Session & Guided Next-Action UX

> **Status:** SPECIFICATION & REFINEMENT  
> **Type:** UX Architecture & Flow Refinement  
> **Target Baseline:** 193 test files / 1204 tests PASS (100% GREEN)  
> **Gherkin Reference:** [`docs/gherkin/phase-17-focus-learning-session-and-next-action.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/phase-17-focus-learning-session-and-next-action.feature)  
> **Test Suite Plan:** `tests/unit/phase17-learning-session-flow.test.tsx`

---

## 1. Bối cảnh & Vấn đề Người Dùng (Context & Problem Statement)

Sau khi hoàn thiện nền tảng dữ liệu, từ điển đa ngữ, và dọn dẹp phân loại tri thức (Phases 1–16), trọng tâm của Knowledge OS chuyển dịch mạnh mẽ sang **trải nghiệm học tập trực tiếp của học giả (Learning-First Product Experience)** với triết lý: *Calm, Low Cognitive Load, Frictionless, và Không lộ machinery kỹ thuật*.

### Ba Điểm Ma Sát UX Lớn Hiện Hữu:
1. **Đứt gãy giữa Bấm Giờ Học & Đọc Nội Dung (Session Fragmentation):**  
   Khi người dùng bấm "Vào học tiếp" từ Dashboard hoặc "Học (Timer)" trong TopicDetail, ứng dụng chỉ bật một pop-up modal đồng hồ đếm giờ cô lập (`StudyTimerModal`), che toàn bộ bài đọc và ghi chú. Khi đóng modal để đọc bài, giao diện mất đi sự hiện diện của phiên học đang diễn ra.
2. **Quá tải Công Cụ Nền & Thiếu Định Hướng Kế Tiếp (Toolbar Clutter & Action Ambiguity):**  
   Header của `TopicDetail` chứa tới 7 nút bấm ngang hàng (`Antigravity AI`, `Handoff Bundle`, `Obsidian`, `NotebookLM`, `Timer`, `Ôn tập`, `Edit`), khiến người học bị quá tải thị giác. Thiếu một **Next-Action Card** chỉ rõ bước học tiếp theo.
3. **Thiếu Luồng Đóng Gói Phiên Học Tinh Tế (Session Wrap-up & Takeaway):**  
   Khi kết thúc học, người dùng chỉ bấm "Lưu thời gian" một cách khô khan, thiếu bước tổng kết thành quả ngắn (đã học bao nhiêu phút, cập nhật % hoàn thành, ghi nhanh 1 đúc kết cốt lõi - Key Takeaway).

---

## 2. Mục Tiêu UX & Nguyên Tắc Thiết Kế (UX Goals & Design Principles)

1. **Calm & Unobtrusive:** Không làm gián đoạn trải nghiệm đọc tài liệu sâu; loại bỏ mọi popup cản trở tầm nhìn khi đang học.
2. **Active Learning Session Bar:** Thanh trạng thái phiên học gắn kết (floating/docked bar) chạy dọc chân trang hoặc đầu trang, hiển thị tên chủ đề, đồng hồ đếm thời gian thực, nút Tạm dừng/Tiếp tục và nút "Hoàn tất phiên học".
3. **Rõ Ràng 4 Trạng Thái Phiên Học (4 Session Semantics):**
   - `running`: Đang tích lũy thời gian học thực tế.
   - `paused`: Tạm dừng đếm giờ khi học giả nghỉ ngơi hoặc ngắt quãng, hiển thị chỉ báo "Đang tạm dừng".
   - `resume`: Tiếp tục đếm giờ từ mốc thời gian đã tạm dừng (không bị reset về 0).
   - `complete`: Kích hoạt dialog tổng kết phiên học (`SessionWrapupModal`).
4. **Session Wrap-up & Takeaway Note Rule (Quy tắc đúc kết có điều kiện):**
   - Khi hoàn tất phiên học: Luôn lưu thời gian tích lũy (`timeSpent`) và cập nhật % tiến độ (`progress`).
   - **Chỉ tự động tạo ghi chú mới khi nội dung Takeaway không rỗng** (`takeaway.trim().length > 0`). Nếu ô đúc kết để trống, hệ thống không tạo ghi chú rác.
5. **Tinh Giản Toolbar TopicDetail:**
   - Gom các nút tích hợp ngoại vi (`Obsidian`, `NotebookLM`, `Handoff Bundle`) vào một menu phụ trang nhã: `Công cụ nghiên cứu ▾`.
   - Đặt Primary Action nổi bật: *"Bắt đầu phiên học"* hoặc *"Tiếp tục bài học"*.

---

## 3. Kiến Trúc Thành Phần & Luồng Dữ Liệu (Component Architecture)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Knowledge OS Layout                           │
│                                                                         │
│  ┌─────────────────────────────────┐   ┌─────────────────────────────┐  │
│  │   Dashboard / TopicDetail View  │   │  Toolbar: [Học tiếp] [•••]  │  │
│  │                                 │   └─────────────────────────────┘  │
│  │   - Topic Reading Space         │                                    │
│  │   - Next-Action Card            │                                    │
│  │   - Notes & Resources           │                                    │
│  └─────────────────────────────────┘                                    │
│                                                                         │
│  ═════════════════════════════════════════════════════════════════════  │
│  🟢 ACTIVE LEARNING SESSION BAR (Docked Bottom / Floating)               │
│  [Đang học: Học thuyết Âm Dương]  ⏱️ 18:42  [⏸ Tạm dừng]  [✓ Hoàn tất] │
└─────────────────────────────────────────────────────────────────────────┘
                                   │ (Click Hoàn tất)
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    SESSION WRAP-UP MODAL (Tổng kết)                     │
│  - Thời gian vừa học: 19 phút                                           │
│  - Cập nhật tiến độ: [════════════ 75% ]                                │
│  - Đúc kết phiên học (Tùy chọn):                                        │
│    [ "Âm thăng Dương giáng, điều hòa khí huyết tạng phủ..."          ]  │
│                                                                         │
│  [Bỏ qua]                                       [Lưu thành quả phiên học]│
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.1. ActiveLearningSessionBar Component Contract
- **Vị trí:** Gắn cố định đáy màn hình (`fixed bottom-4 left-1/2 -translate-x-1/2 z-40`), có bóng đổ mờ trang nhã, bo góc `rounded-2xl`.
- **Props & Context Binding:**
  - Lấy `activeTimerTopicId`, `timerSeconds`, `isTimerRunning`, `timerMode`, `pomodoroTimeRemaining` từ context.
  - Các nút tương tác:
    - Nút Tạm dừng / Tiếp tục (`pauseStudyTimer` / `resumeStudyTimer`).
    - Nút Thu nhỏ / Mở rộng (`isMinimized`).
    - Nút Chuyển nhanh đến chủ đề đang học (`openTopicDetail(activeTimerTopicId)`).
    - Nút Hoàn tất (`onOpenWrapupModal`).

### 3.2. SessionWrapupModal Component Contract
- **Props:**
  - `isOpen: boolean`
  - `topic: Topic`
  - `minutesSpent: number`
  - `onClose: () => void`
  - `onSaveWrapup: (params: { progress: number; status: TopicStatus; takeaway?: string }) => void`
- **Xử lý Lưu Dữ Liệu:**
  1. Ghi nhận thời gian học: Gọi `stopAndSaveStudyTimer()`.
  2. Cập nhật tiến độ: Gọi `updateTopicProgress(topic.id, newProgress, newStatus)`.
  3. **Tạo Note Takeaway có điều kiện:**
     - Nếu `takeaway.trim().length > 0`: Gọi `addNote({ topicId: topic.id, title: `Đúc kết: ${topic.title} (${new Date().toLocaleDateString('vi-VN')})`, content: takeaway.trim(), type: 'insight', tags: ['Takeaway', 'StudySession'] })`.
     - Nếu `takeaway.trim().length === 0`: Không gọi `addNote`, hoàn tất lưu trong im lặng.

### 3.3. TopicDetail Next-Action Hub & Toolbar Simplification
- **Header Actions:**
  - Nút chính nổi bật: `Bắt đầu học (Timer)` (nếu chưa học) hoặc `Vào học tiếp` (nếu đang học dở dang).
  - Nút `Ôn tập SM-2` (hiển thị khi có review due hoặc muốn củng cố trí nhớ).
  - Menu Dropdown `Công cụ nghiên cứu ▾` chứa: `Antigravity AI Scholar`, `Handoff Bundle`, `Obsidian Bridge`, `NotebookLM Studio`, và `Chỉnh sửa chủ đề`.
- **Next-Action Card (trên đầu tab Nội dung):**
  - Hiển thị tóm tắt trạng thái: Tiến độ hiện tại, số ghi chú, thời gian đã tích lũy.
  - Gợi ý hành động tiếp theo một cách tinh tế (Ví dụ: *"Bạn đã tích lũy 45 phút. Hãy ghi thêm đúc kết hoặc chuyển sang ôn tập Flashcards"*).

---

## 4. Rào Chắn Kỹ Thuật & Giảm Thiểu Rủi Ro Mobile (Guardrails & Mobile Mitigation)

1. **Zero Database / API Schema Change:** Sử dụng hoàn toàn các interface và API hiện hữu (`Topic`, `Note`, `studyProgress`, `addNote`, `updateTopicProgress`, `dataRepository`).
2. **Zero Auto-Migration / Zero Background Magic:** Toàn bộ hành vi đều do người dùng kích hoạt tường minh.
3. **Mobile Risk Mitigation:**
   - Trên màn hình nhỏ (`< 640px`), `ActiveLearningSessionBar` tự động chuyển sang chế độ thanh mỏng gọn (Compact Strip) chỉ gồm: Tên chủ đề rút gọn, đồng hồ nhỏ, nút Play/Pause và nút Check Hoàn tất.
   - Không che khuất thanh điều hướng chính hay nút cuộn trang.
   - Hỗ trợ nút thu gọn (Collapse to Pill) khi người dùng muốn đọc toàn màn hình.

---

## 5. Kế Hoạch Kiểm Thử Từng Bước (Test-First Plan)

### File Kiểm Thử Mục Tiêu: `tests/unit/phase17-learning-session-flow.test.tsx`

| Section / Describe Block | Kịch Bản Kiểm Thử Cụ Thể | Acceptance Criteria |
| :--- | :--- | :--- |
| **1. ActiveLearningSessionBar State Semantics** | **1.1.** Render đúng khi timer running (`activeTimerTopicId !== null`, `isTimerRunning === true`). | Hiển thị tên topic, thời gian thực, nút Pause. |
| | **1.2.** Bấm Pause chuyển sang trạng thái paused (`isTimerRunning === false`), hiển thị nút Resume. | Đồng hồ giữ nguyên số giây, không bị reset. |
| | **1.3.** Bấm Resume tiếp tục đếm thời gian từ số giây hiện tại. | Thời gian tiếp tục tăng từ mốc đã pause. |
| | **1.4.** Bấm nút Hoàn tất kích hoạt mở `SessionWrapupModal`. | Kích hoạt callback mở modal tổng kết. |
| | **1.5.** Ẩn hoàn toàn khi không có active session (`activeTimerTopicId === null`). | Không render DOM node thừa. |
| **2. SessionWrapupModal & Takeaway Invariants** | **2.1.** Hiển thị đúng số phút vừa học và % tiến độ hiện tại của chủ đề. | Hiển thị chính xác thời gian và slider tiến độ. |
| | **2.2.** Lưu với Takeaway không rỗng: Lưu thời gian, cập nhật progress, và **tạo 1 ghi chú mới**. | `addNote` được gọi với type `'insight'` và nội dung takeaway. |
| | **2.3.** Lưu khi Takeaway rỗng: Lưu thời gian, cập nhật progress, nhưng **KHÔNG tạo ghi chú**. | `addNote` tuyệt đối KHÔNG được gọi. |
| | **2.4.** Đóng modal tự động dọn sạch active timer session. | `stopAndSaveStudyTimer` được gọi và session bar biến mất. |
| **3. TopicDetail Next-Action & Toolbar Ergonomics** | **3.1.** Toolbar chính hiển thị CTA học tập nổi bật và menu gọn `Công cụ nghiên cứu`. | Không bị tràn 7 nút ngang hàng, giao diện tĩnh tại. |
| | **3.2.** Dropdown menu mở ra đầy đủ các công cụ nâng cao (AI Studio, Obsidian, NotebookLM, Handoff). | Tích hợp ngoại vi vẫn truy cập đầy đủ và an toàn. |
| | **3.3.** Next-Action Card hiển thị đúng trạng thái học và nút hành động nhanh. | Dẫn dắt người học tiếp tục bài học dở dang. |
