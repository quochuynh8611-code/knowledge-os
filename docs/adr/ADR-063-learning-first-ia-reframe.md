# ADR-063: Learning-First Information Architecture (IA) Reframe & Multi-Disciplinary Study Control Tower

- **Status**: Proposed (Reviewed & Ready for Baseline Lock)
- **Date**: 2026-08-30
- **Authors**: Antigravity AI & Architecture Team
- **Deciders**: Lead Product Architect & Engineering Team
- **Consulted**: `DataContext`, `NavigationContext`, `DashboardHome`, `Sidebar`, `Navbar`
- **Informed**: All Knowledge OS Components

---

## 1. Context

Knowledge OS đã trải qua nhiều giai đoạn phát triển thành công (Phase P1 đến P12), tích hợp các công cụ chuyên sâu như Quản trị dữ liệu, Ma trận Abhidharma/Kinh Dịch, Từ điển đa ngữ thuật ngữ (Multilingual Lexicon), Cầu nối Obsidian/NotebookLM/Antigravity, và Trình xem tài liệu kiến trúc Markdown (Docs Explorer).

Tuy nhiên, cấu trúc giao diện hiện tại đang bộc lộ điểm nghẽn nghiêm trọng về trải nghiệm người dùng:
1. **Lệch trọng tâm mục tiêu (Goal Mismatch)**: Ứng dụng hiện tại có dáng dấp của một "Kho quản trị tri thức / File Catalog" hơn là một "Bàn điều khiển học tập đa môn" (Đông y, Tiếng Trung, Tiếng Anh, Phật học, Huyền học...).
2. **Cognitive Overload**: Sidebar và Header hiển thị dàn trải các công cụ chuyên sâu ở cùng mức độ ưu tiên trực quan với các tác vụ học tập hàng ngày.
3. **Thiếu tính định hướng hành động**: Khi mở Dashboard, người dùng không thể biết ngay *"Hôm nay học gì?"*, *"Môn ưu tiên đang ở đâu?"* và *"Bài tiếp theo là gì?"*.
4. **Card môn học tĩnh**: Thẻ lĩnh vực chỉ hiển thị số lượng topic và % hoàn thành danh mục thuần túy (coverage), không phản ánh trạng thái học tập thực tế (recency, in-progress, next step).

---

## 2. Decision

Chúng tôi quyết định thực hiện một đợt tái cấu trúc toàn diện về Kiến trúc Thông tin (IA Reframe) và giao diện Tổng quan (Overview Redesign) theo nguyên tắc **Learning-First**:

1. **Phân tầng lại Sidebar thành 3 nhóm rõ rệt**:
   - **Tầng 1 - Học tập (Learning)**: `Tổng quan`, `Tiến độ & Ôn tập`, `Chủ đề học`.
   - **Tầng 2 - Tri thức (Knowledge)**: `Ghi chú`, `Tài liệu`, `Bản đồ tri thức`, `Tìm kiếm`.
   - **Tầng 3 - Công cụ & Tiện ích (Tools & Scholar Suite)**: `AI Studio`, `Ma trận phân tích`, `Mô hình hệ thống`, `Từ điển thuật ngữ`, `Tài liệu kiến trúc`.
2. **Thay thế DashboardHome bằng "Learning Control Tower" với 5 khối ưu tiên**:
   - Khối 1: **Today Recommendation & Action Hero** (Đề xuất học tập tất định).
   - Khối 2: **Priority Domain & Active Focus** (Môn trọng tâm & Bài học kế tiếp).
   - Khối 3: **Learning State Cards** (Lưới môn học đa lĩnh vực hiển thị trạng thái và nút vào học).
   - Khối 4: **Resume Queue & Recent Study Flow** (Hàng đợi tiếp tục các bài học dở dang).
   - Khối 5: **Utility Section** (Khu vực công cụ phụ trợ đặt ở chân trang).
3. **Áp dụng Priority Rules v1 (Deterministic & Evidence-Based)**:
   - Đề xuất học tập dựa trên cascade: `Due SM-2 Review Queue` $\rightarrow$ `Recent In-Progress Topic` $\rightarrow$ `Next Step in Active Domain` $\rightarrow$ `Fallback`.
4. **Giảm trọng lượng nhận thức của Header**:
   - Thu gọn các nút tích hợp ngoại vi (Obsidian, NotebookLM, Handoff) vào menu phụ hoặc icon gọn gàng, tăng diện tích và độ nổi bật cho Study Timer và CTA học tập.

---

## 3. Data Assumptions & Data Gaps

Để đảm bảo blast radius thấp và tính tương thích ngược tuyệt đối:

### 3.1. Dữ liệu có sẵn trong State hiện tại (No Migration Required)
- `topics`: Danh sách chủ đề kèm `studyProgress` (`status`, `progress`, `timeSpent`, `lastStudied`, `nextReview`).
- `categories`: Hệ thống danh mục cha con (Root và Child Categories) kèm `color`, `slug`, `name`.
- `reviewQueue`: Danh sách topic đến hạn ôn tập SM-2 tính qua `getReviewQueue(topics)`.
- `stats`: Tổng thời gian học, số topic hoàn thành.

### 3.2. Dữ liệu phái sinh (Derived Selectors - Wave 0)
- `priorityDomain`: Xác định root category của topic có hoạt động học gần nhất (`lastStudied` hoặc `updatedAt`).
- `nextStepTopic`: Topic đầu tiên chưa hoàn thành (`status !== 'completed'`) thuộc môn học ưu tiên theo thứ tự cây topic.
- `domainStatus`: Đánh giá trạng thái môn học (`active` nếu học trong 7 ngày, `maintenance` nếu hoàn thành >80%, `dormant` nếu không học >14 ngày).
- `domainTotalTime`: Tổng `timeSpent` tích lũy của toàn bộ topic trong môn học.
- `resumeQueue`: Lọc danh sách `topics` có trạng thái `in_progress` / `reviewing` với `progress < 100`, sắp xếp theo `lastStudied` giảm dần.

### 3.3. Dữ liệu thiếu & Trì hoãn sang v2 (Deferred to v2)
- **User-Pinned Domain**: Tính năng người dùng tự ghim môn học cố định (v1 dùng derived recency).
- **Prerequisite Graph Engine**: Bộ kiểm tra điều kiện tiên quyết nghiêm ngặt giữa các topic (v1 dựa trên thứ tự cây danh mục).
- **Daily Target & Streak Calendar**: Tính số ngày học liên tiếp và mục tiêu thời gian mỗi ngày (v1 hiển thị tổng số phút học và recency).

---

## 4. Alternatives Considered

### Alternative A: Giữ nguyên Dashboard, chỉ thêm một Tab mới "Học tập"
- **Đánh giá**: Bác bỏ. Việc tạo thêm tab mới làm trầm trọng thêm sự phân mảnh điều hướng, khiến người dùng phải chuyển qua chuyển lại giữa Dashboard, Topics và Học tập.

### Alternative B: Biến ứng dụng thành LMS / Flashcard App thuần túy
- **Đánh giá**: Bác bỏ. Làm mất đi bản sắc và sức mạnh cốt lõi của Knowledge OS là khảo sát liên môn, bản đồ tri thức mạng lưới và tích hợp ghi chép Markdown sâu.

### Alternative C (Lựa chọn): Tái định vị Overview thành Learning Control Tower & Phân tầng IA 3 cấp
- **Đánh giá**: Tối ưu. Đưa hành động học tập lên hàng đầu nhưng vẫn giữ nguyên vẹn khả năng truy cập vào toàn bộ kho tri thức và công cụ chuyên sâu ở các tầng thích hợp.

---

## 5. Trade-offs

### Ưu điểm (Pros)
- **Tốc độ kích hoạt hành vi học tập**: Giảm số bước thao tác để bắt đầu học từ 4-5 clicks xuống còn 1 click.
- **Giảm xao nhãng**: Không còn bị các công cụ chuyên sâu làm loãng mục tiêu khi chỉ muốn học bài hàng ngày.
- **Tương thích hoàn hảo với học đa môn**: Giúp người học cân bằng giữa các môn đang học dở (Đông y, Tiếng Trung, Tiếng Anh, Phật học...).
- **An toàn kỹ thuật**: Không can thiệp vào schema Prisma hay API backend, hoàn toàn xử lý qua presentation & derived selectors.

### Nhược điểm & Rủi ro (Cons & Risks)
- **Thay đổi thói quen điều hướng**: Người dùng quen tìm Docs/Lexicon trên menu chính sẽ cần làm quen với nhóm Tầng 3 (Tools).
- **Phụ thuộc vào chất lượng dữ liệu Topic**: Nếu các topic chưa được cập nhật `status` hoặc `timeSpent`, các derived state ban đầu sẽ cần fallback mượt mà.

---

## 6. Blast Radius Assessment

- **Phạm vi tác động**: Giới hạn trong tầng UI/UX của Frontend:
  - File mới: `src/lib/learningStateSelectors.ts`
  - Component sửa: `src/components/layout/Sidebar.tsx`, `src/components/layout/Navbar.tsx`, `src/components/dashboard/DashboardHome.tsx`
  - Component con mới (nếu tách): `TodayLearningHero.tsx`, `LearningStateCard.tsx`, `ResumeStudyQueue.tsx`.
- **Rủi ro hồi quy (Regression Risk)**: Thấp. Không làm thay đổi routing hash URL, không ảnh hưởng tới logic đồng bộ Offline Sync Queue hay Data Management Modals.

---

## 7. Rollout Strategy

Triển khai qua 5 Wave có kiểm soát:
- **Wave 0**: Spec Data Mapping & Helper Selectors Foundation (`learningStateSelectors.ts` + Unit Tests).
- **Wave 1**: Tái cấu trúc phân tầng IA Sidebar & Header Cleanup.
- **Wave 2**: Khối Action Hero "Hôm nay học gì" & Today Recommendation.
- **Wave 3**: Chuyển đổi Root Domain Cards thành Learning State Cards.
- **Wave 4**: Resume Queue, Utility Section & Viewport Responsiveness Polish.

---

## 8. Rejected Ideas

1. **Không ưu tiên phát triển thêm công cụ phụ**: Tạm dừng mọi đề xuất làm thêm Glossary, Markdown Docs nâng cao hay Export Formats mới cho đến khi trải nghiệm học tập cốt lõi đạt chuẩn.
2. **Không duy trì sự bình đẳng thị giác (Visual Equivalence) cho mọi module**: Các công cụ phụ phải chấp nhận hạ bậc nhận thức để nhường không gian cho việc học.
3. **Không để Overview tiếp tục là Catalog tĩnh**: Xóa bỏ hoàn toàn định hướng dashboard chỉ để ngắm số liệu thống kê.
