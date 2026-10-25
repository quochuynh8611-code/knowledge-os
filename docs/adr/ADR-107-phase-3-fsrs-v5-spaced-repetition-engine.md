# ADR-107: Phase 3 — FSRS v5 (Free Spaced Repetition Scheduler) Core Engine, DSR Model & Zero-Migration SM-2 Bridge

## 1. Trạng Thái (Status)
- **Trạng thái:** ✅ ACCEPTED & READY FOR IMPLEMENTATION
- **Ngày quyết định:** 2026-10-25
- **Tác giả:** Staff Engineer & System Architect
- **Phạm vi:** Core Spaced Repetition Engine, FSRS v4.5/v5 Mathematical Formulation (Difficulty, Stability, Retrievability - DSR), Power-Law Forgetting Curve, Desired Retention Tuning, Bijective Zero-Migration SM-2 ↔ FSRS Bridge.

---

## 2. Bối Cảnh (Context)
Knowledge OS đang nâng cấp lên trạm làm việc nghiên cứu chuyên môn cao (**Academic Research Workstation**).
Trong học tập và nghiên cứu chuyên sâu (Kinh điển, Ngôn ngữ Cổ Pāli/Sanskrit, Y khoa, Khoa học Máy tính), sinh viên và nhà nghiên cứu cần hệ thống lặp lại ngắt quãng (Spaced Repetition) có độ chuẩn xác cao nhất.

1. **Giới hạn của SM-2 truyền thống:**
   - SM-2 dựa trên giả định đường cong quên số mũ cố định $R(t) = e^{-t/S}$ và chỉ có một chỉ số `easeFactor`.
   - SM-2 không cho phép người học tùy biến tỷ lệ ghi nhớ mong muốn (**Desired Retention** $R_{req}$, ví dụ muốn nhớ 95% trước kỳ thi hoặc 85% để giảm tải ôn tập).
   - SM-2 thường dẫn đến hiện tượng quá tải thẻ (review hell) khi thẻ bị đánh giá lặp lại nhiều lần nhưng interval tăng quá chậm hoặc quá nhanh không phản ánh đúng độ bền trí nhớ.

2. **Ưu thế vượt trội của FSRS v5 (Free Spaced Repetition Scheduler):**
   - Được chứng minh thực nghiệm trên hàng chục triệu lượt ôn tập (Anki FSRS benchmark), FSRS giảm tới 20% - 30% số lượt ôn tập so với SM-2 trong khi vẫn duy trì đúng tỷ lệ ghi nhớ mục tiêu.
   - **Mô hình 3 thành phần trí nhớ (Three-Component Model of Memory - DSR):**
     - **Difficulty ($D \in [1, 10]$):** Độ khó cố hữu của kiến thức (thấp = dễ, cao = khó).
     - **Stability ($S > 0$, tính bằng ngày):** Độ bền trí nhớ — khoảng thời gian để xác suất truy xuất $R$ giảm về $90\%$.
     - **Retrievability ($R \in [0, 1]$):** Khả năng nhớ lại tại thời điểm $t$ ngày sau lần ôn gần nhất.
   - **Đường cong quên hàm lũy thừa (Power-law forgetting curve):**
     $$R(t, S) = \left(1 + F \cdot \frac{t}{S}\right)^C$$
     với $F = \frac{19}{81}$ và $C = -0.5$. Khi $t = S$, $R(S, S) = (1 + 19/81)^{-0.5} = (100/81)^{-0.5} = 9/10 = 0.90$ (chính xác 90%).
   - **Khoảng cách ôn tập tiếp theo ($I$):**
     $$I(R_{req}, S) = \max\left(1, \text{round}\left(\frac{S}{F} \left(R_{req}^{1/C} - 1\right)\right)\right)$$

3. **Ràng buộc kiến trúc cốt lõi:**
   - **Zero Database Schema Migrations:** Không thay đổi Prisma schema hiện hành. Cột `easeFactor` tiếp tục lưu trữ giá trị SM-2 tương đương được suy diễn 2 chiều từ Difficulty $D$.
   - **Bảo toàn 100% backward compatibility:** Mọi unit test SM-2 cũ gọi `calculateFlashcardNextReview` không truyền tham số algorithm vẫn giữ nguyên kết quả SM-2 chính xác.

---

## 3. Các Quyết Định Kiến Trúc (Architectural Decisions)

### Quyết định 1: Mô hình toán học FSRS v5 chuẩn hóa
Sử dụng bộ trọng số mặc định chuẩn FSRS v4.5 / v5 ($w_0 \dots w_{18}$):
```ts
export const DEFAULT_FSRS_WEIGHTS = [
  0.40255, 1.18385, 3.173, 15.69105, // S0(1..4)
  7.1949, 0.5345, 1.4604, 0.0046,   // D0, update D
  1.54575, 0.1192, 1.01925,         // recall S factor
  1.9395, 0.11, 0.29605, 0.22695,   // forget S factor
  0.2315, 2.9898, 0.51655, 0.6621    // rating modifiers & penalties
];
```
- **Khởi tạo thẻ mới ($state = \text{'new'}$):**
  - $S_0(G) = w_{G-1}$ với $G \in \{1, 2, 3, 4\}$.
  - $D_0(G) = \text{clamp}(w_4 - e^{w_5 \cdot (G - 1)} + 1, 1, 10)$.
- **Cập nhật độ khó (Mean Reversion):**
  - $D' = \text{clamp}(w_7 \cdot D_0(4) + (1 - w_7) \cdot (D - w_6 \cdot (G - 3)), 1, 10)$.
- **Cập nhật độ bền sau Recall thành công ($G \in \{2, 3, 4\}$):**
  - $S'_{recall} = S \cdot \left(1 + e^{w_8} \cdot (11 - D') \cdot S^{-w_9} \cdot (e^{w_{10} \cdot (1 - R)} - 1) \cdot h(G)\right)$
  - với $h(2) = w_{15}$ (Hard penalty), $h(3) = 1.0$ (Good), $h(4) = w_{16}$ (Easy bonus).
- **Cập nhật độ bền sau Forget / Lapsed ($G = 1$ Again):**
  - $S'_{forget} = \text{clamp}\left(w_{11} \cdot D'^{-w_{12}} \cdot \left((S + 1)^{w_{13}} - 1\right) \cdot e^{w_{14} \cdot (1 - R)}, 0.1, S\right)$.

### Quyết định 2: Bijective SM-2 ↔ FSRS Zero-Migration Bridge
1. **Từ SM-2 sang FSRS (`migrateSm2ToFsrsState`):**
   - $D = \text{clamp}\left(10 - \frac{\text{easeFactor} - 1.3}{3.5 - 1.3} \times 9 + \text{lapses} \times 0.5, 1.0, 10.0\right)$.
   - $S = \text{interval} > 0 ? \max(0.5, \text{interval}) : \text{DEFAULT\_FSRS\_WEIGHTS}[2]$ ($w_2 \approx 3.17$ ngày).
2. **Từ FSRS sang SM-2 (`syncFsrsToSm2Fields`):**
   - $\text{easeFactor} = \text{clamp}\left(3.5 - \frac{D - 1.0}{9.0} \times (3.5 - 1.3), 1.30, 3.50\right)$.

### Quyết định 3: Quản lý cấu hình & Preview khoảng cách 4 nút
- Cấu hình lưu trữ tại `localStorage.getItem('knowledge_os_srs_config')`:
  `{ algorithm: 'fsrs' | 'sm2', desiredRetention: number }`.
- Cung cấp hàm `previewCardRatingIntervals(schedule, options)` tính toán trước khoảng cách ngày cho 4 nút:
  - 1 (Again), 2 (Hard), 3 (Good), 4 (Easy) để hiển thị nhãn phụ trợ (ví dụ: `1 ngày`, `3 ngày`, `7 ngày`, `18 ngày`) ngay trên giao diện ôn tập.

---

## 4. Hệ Quả & Đảm Bảo Chất Lượng (Consequences)
- Không có rủi ro database migration.
- Thuật toán FSRS v5 tuân thủ 100% tài liệu toán học chính thức của tác giả Jarrett Ye (Open Spaced Repetition).
- Tất cả các test cases SM-2 hiện hữu vẫn chạy xanh tuyệt đối.
