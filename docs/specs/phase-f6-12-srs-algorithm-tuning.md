# Technical Specification: Phase F6.12 — SRS Algorithm Tuning
# (Tối Ưu Hóa Thuật Toán Lặp Lại Ngắt Quãng & Phân Tích Thích Ứng)

**Ngày lập**: 2026-09-07  
**Giai đoạn**: Phase F6.12  
**Trạng thái**: Planning  
**Subsystem**: Native Flashcard & Spaced Repetition (SRS Engine)  

---

## 1. TỔNG QUAN & BỐI CẢNH

Sau khi hoàn thiện các giai đoạn:
- **Phase F6.10**: Tạo thẻ từ bài đọc ghi chú (Selection, Cloze Auto-detection, Batch Import).
- **Phase F6.11**: Trải nghiệm phòng ôn tập (Dashboard Header, Priority Filter, Quick Edit, View History, Export CSV, Celebration).

**Mục tiêu Phase F6.12**:
Tập trung chuyên sâu vào **cốt lõi thuật toán lặp lại ngắt quãng (SRS Algorithm Tuning)** nhằm nâng cao tối đa hiệu quả ghi nhớ dài hạn (retention rate), giảm tải áp lực ôn tập quá mức (review fatigue), và hỗ trợ học sinh / học giả trước các kỳ thi quan trọng.

---

## 2. NGUYÊN TẮC THIẾT KẾ KỸ THUẬT

1. **Zero Database Schema Migrations**:
   - Tận dụng triệt để schema hiện tại của `Flashcard`, `FlashcardSchedule`, `FlashcardReview`.
   - Các tham số thuật toán thích ứng (stability, difficulty, variant, exam date) được tính toán động (runtime derivation) từ lịch sử `FlashcardReview` hoặc lưu trữ phi xâm lấn (client state / URL query params / LocalStorage context).
2. **Deterministic & Pure Algorithm Architecture**:
   - Tách rời toàn bộ logic toán học và thuật toán vào thư viện tiện ích thuần túy (`src/lib/srsAlgorithmTuning.ts`), đảm bảo 100% code có thể unit test độc lập không phụ thuộc DOM hay Database.
3. **Card-Level Variant Partition (A/B Testing)**:
   - Thay vì chia theo người dùng (trong mô hình đơn người dùng cục bộ), hệ thống phân hoạch các thẻ thành 2 nhóm đồng đều dựa trên hàm băm ID thẻ:
     - **Variant A (Control)**: Thuật toán SuperMemo-2 (SM-2) truyền thống.
     - **Variant B (Adaptive)**: Thuật toán thích ứng tích hợp độ ổn định và đường cong quên Ebbinghaus.

---

## 3. USER STORIES & ACCEPTANCE CRITERIA (GHERKIN FORMAT)

### US1: Trực Quan Hóa Đường Cong Ghi Nhớ (Retention Curve & Ebbinghaus Forgetting Curve)

**User Story:**  
Là người học, tôi muốn xem biểu đồ suy giảm trí nhớ theo thời gian thực đối chiếu với đường cong lãng quên Ebbinghaus, để biết chính xác điểm rơi trí nhớ và lý do thẻ cần được ôn tập.

```gherkin
Feature: Retention Curve Visualization

  Scenario: Hiển thị biểu đồ suy giảm trí nhớ theo thời gian
    Given Người dùng có ít nhất 5 lượt ôn tập trong lịch sử
    When Người dùng mở bảng điều khiển phân tích "Retention Curve"
    Then Hệ thống tính toán tỷ lệ ghi nhớ thực tế theo số ngày trôi qua (0, 1, 2, ..., 30+ ngày)
    And Vẽ đường cong thực tế (Empirical Retention Points)
    And Vẽ đè đường cong lý thuyết Ebbinghaus R(t) = exp(-t / S)
    And Cho phép lọc theo Chủ đề (Topic), Loại thẻ (Basic / Cloze), và Độ khó (Easy / Medium / Hard)

  Scenario: Thẻ chưa đủ dữ liệu phân tích
    Given Người dùng chưa có lượt ôn tập nào
    When Người dùng mở bảng điều khiển "Retention Curve"
    Then Hệ thống hiển thị trạng thái hướng dẫn (Empty State): "Cần ít nhất 5 lượt ôn tập để xây dựng đường cong trí nhớ"
```

---

### US2: Lập Lịch Thích Ứng Thông Minh (Adaptive Scheduling Engine)

**User Story:**  
Là người học, tôi muốn thuật toán tự động phân tích tốc độ phản hồi và lịch sử quên của từng thẻ để điều chỉnh chu kỳ ôn tập linh hoạt, giúp thẻ khó được củng cố dày đặc hơn và thẻ dễ được dãn cách tối đa.

```gherkin
Feature: Adaptive Scheduling Engine

  Scenario: Thẻ khó liên tục bị quên (Lapses cao, phản hồi chậm)
    Given Một thẻ nhớ có số lần quên lapses >= 2 hoặc phản hồi mất > 15 giây
    When Người dùng chấm điểm "Again [1]" hoặc "Hard [2]"
    Then Thuật toán phân loại độ khó của thẻ là "Hard" (Inferred Difficulty)
    And Điều chỉnh hệ số độ dễ Ease Factor giảm sâu hơn SM-2 tiêu chuẩn (-0.25 thay vì -0.15)
    And Rút ngắn chu kỳ kế tiếp để tránh tái quên

  Scenario: Thẻ dễ phản hồi tự tin (Tốc độ phản hồi nhanh < 3 giây)
    Given Một thẻ nhớ có lịch sử ghi nhớ ổn định (retention rate > 85%)
    When Người dùng chấm điểm "Easy [4]" với thời lượng phản hồi < 3 giây
    Then Thuật toán cộng thêm Bonus dãn cách chu kỳ (Adaptive Interval Bonus x 1.3)
    And Đẩy lịch ôn tiếp theo xa hơn SM-2 tiêu chuẩn nhằm tiết kiệm thời gian học
```

---

### US3: Hàng Đợi Ôn Tập Thông Minh & Chế Độ Luyện Thi (Smart Queue & Exam Countdown)

**User Story:**  
Là người học đang chuẩn bị cho kỳ thi, tôi muốn hàng đợi ôn tập ưu tiên tối đa các thẻ quan trọng có nguy cơ quên cao nhất trước ngày thi để tối ưu điểm số.

```gherkin
Feature: Smart Review Queue & Exam Countdown

  Scenario: Lập thứ tự hàng đợi theo Priority Score
    Given Hàng đợi gồm các thẻ đến hạn và quá hạn
    When Hệ thống kích hoạt chế độ "Smart Queue"
    Then Mỗi thẻ được tính điểm ưu tiên: PriorityScore = f(daysOverdue, retentionRate, difficulty, topicWeight)
    And Các thẻ có nguy cơ quên cao nhất được sắp xếp lên đầu hàng đợi ôn tập

  Scenario: Kích hoạt chế độ đếm ngược ngày thi (Exam Countdown Mode)
    Given Người dùng thiết lập ngày thi mục tiêu là 7 ngày tới
    When Người dùng bật chế độ "Exam Countdown Mode"
    Then Thuật toán nén chu kỳ ôn tập (Interval Compression) sao cho toàn bộ thẻ trong chủ đề được ôn lại ít nhất 1 lần trước ngày thi
    And Ưu tiên triệt để các thẻ có retentionRate < 60%
```

---

### US4: Khung Đánh Giá So Sánh Thuật Toán (Card-Level A/B Testing Framework)

**User Story:**  
Là người nghiên cứu học thuật, tôi muốn phân tích hiệu quả giữa thuật toán SM-2 truyền thống và thuật toán Thích ứng (Adaptive) trên cùng một bộ thẻ để kiểm chứng thuật toán nào giúp ghi nhớ lâu hơn.

```gherkin
Feature: Card-Level A/B Testing Framework

  Scenario: Phân hoạch thẻ ngẫu nhiên nhưng tất định vào Variant A và B
    Given Danh sách các thẻ flashcard trong cơ sở tri thức
    When Hệ thống gán variant bằng hàm băm ID thẻ: hash(cardId) % 2
    Then 50% số thẻ được phân bổ vào "Variant A: SM-2 Classic"
    And 50% số thẻ được phân bổ vào "Variant B: Adaptive Engine"

  Scenario: Xem báo cáo đối chiếu hiệu năng A/B Test
    Given Cả hai nhóm thẻ Variant A và B đã có ít nhất 20 lượt review
    When Người dùng mở bảng đối chuẩn "SRS A/B Comparison"
    Then Hệ thống so sánh:
      | Metric                     | Variant A (SM-2) | Variant B (Adaptive) |
      | Tỷ lệ nhớ (Retention Rate) | xx%              | yy%                  |
      | Tỷ lệ quên (Lapse Rate)    | xx%              | yy%                  |
      | Thời gian phản hồi TB      | xx.xs            | yy.ys                |
    And Tính toán mức chênh lệch hiệu suất (Effect Size) kèm chỉ báo thống kê p-value
```

---

## 4. MA TRẬN FILE & THÀNH PHẦN KIẾN TRÚC

| Thành phần | Đường dẫn | Loại | Nhiệm vụ |
|:---|:---|:---:|:---|
| **SRS Engine Utils** | `src/lib/srsAlgorithmTuning.ts` | NEW | Pure logic: Ebbinghaus curve, Difficulty inference, Adaptive scheduler, Priority scoring, A/B variant partition & z-test. |
| **Retention Curve Chart** | `src/components/flashcards/RetentionCurveChart.tsx` | NEW | Visual SVG/Canvas chart: đường cong thực nghiệm & Ebbinghaus theoretical overlay. |
| **Exam Countdown Toolbar** | `src/components/flashcards/ExamCountdownToolbar.tsx` | NEW | Input chọn ngày thi, thanh đếm ngược ngày, nút chuyển chế độ Smart Queue. |
| **A/B Comparison Panel** | `src/components/flashcards/SrsVariantComparisonModal.tsx` | NEW | Modal thống kê đối chiếu hiệu năng Variant A (SM-2) vs Variant B (Adaptive). |
| **Review Studio Hook** | `src/components/flashcards/FlashcardReviewStudio.tsx` | MODIFY | Tích hợp Smart Queue ranking, Exam mode compression, và gắn cờ variant. |
| **API Endpoints** | `src/server/controllers/flashcardController.ts` | MODIFY | Thêm API query param `?mode=smart&examDate=...` & analytics aggregation. |
| **Unit & Integration Tests**| `tests/unit/srs-algorithm-tuning.test.ts` & `tests/integration/srs-smart-queue.test.tsx` | NEW | Đảm bảo 100% test coverage cho cả 4 User Stories. |
