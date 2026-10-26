# ADR-112: Phase 8 — Literature Review Matrix & Claim Synthesis Engine

## 1. Trạng Thái (Status)
- **Trạng thái:** 🟢 ACCEPTED & COMPLETED (Phase 8A: Core Engine & Tests; Phase 8B: LiteratureMatrixModal & ResourcesManager Integration)
- **Ngày quyết định:** 2026-10-26
- **Tác giả:** Staff Engineer & System Architect
- **Phạm vi:** Trích xuất 5 trục tổng quan tài liệu học thuật (Mục tiêu/Câu hỏi nghiên cứu, Phương pháp, Phát hiện then chốt, Hạn chế, Lập trường học thuật) từ tài nguyên (`Resource`), ghi chú liên kết (`Note`) và trích đoạn (`ResearchExcerpt`); phân tích mâu thuẫn học thuật (Contradiction Detection); cơ chế ghi đè thủ công không phá hủy dữ liệu (localStorage overrides); xuất bản ma trận sang Markdown và RFC-4180 CSV.

---

## 2. Bối Cảnh (Context)
Trong nghiên cứu học thuật đỉnh cao (luận văn thạc sĩ, tiến sĩ, bài báo quốc tế ISI/Scopus), bước tổng quan tài liệu (Literature Review) là công đoạn tốn nhiều thời gian nhất. Các học giả thường phải lập bảng so sánh chéo thủ công trên Excel hoặc Notion:
1. **Thiếu tính cấu trúc tự động:** Người dùng đọc hàng chục bài báo PDF/EPUB, ghi chú rải rác nhưng không có cách nào tổng hợp thành một ma trận so sánh 5 trục chuẩn mực học thuật (*Research Question, Methodology, Key Findings, Limitations, Stance*).
2. **Khó phát hiện mâu thuẫn và tranh luận học thuật (Scholarly Debates):** Khi hai hoặc nhiều nghiên cứu đưa ra kết luận trái ngược nhau về cùng một hiện tượng (ví dụ: mô hình số mũ vs. đường cong lũy thừa trong suy giảm trí nhớ), người nghiên cứu dễ bỏ sót các phát hiện đối lập nếu không có công cụ phát hiện tự động.
3. **Ràng buộc Zero-Database Migration:** Hệ thống cần nâng cấp năng lực ma trận tổng quan mà **tuyệt đối không thay đổi schema Prisma** hiện hữu, không phá vỡ tính tương thích ngược, và cho phép học giả tinh chỉnh từng ô trong ma trận với cơ chế lưu trữ cục bộ bền vững (`knowledge_os_literature_matrix_v1`).

---

## 3. Các Quyết Định Kiến Trúc (Architectural Decisions)

### Quyết định 1: Trích Xuất Ma Trận 5 Trục (Five-Axis Literature Matrix Extraction)
Với mỗi tài nguyên học thuật `Resource`, hàm thuần túy `buildLiteratureMatrixRow(resource, context)` sẽ phân tích ngữ nghĩa và tạo ra một hàng ma trận `LiteratureMatrixRow`:
- **Định danh & Trích dẫn:** `resourceId`, `title`, `author`, `year`, `type`, `doi`, `topicId`, `citationKey` (dạng `vaswani2017`, `nguyen2025` tự động tạo từ tác giả, năm và từ khóa tiêu đề).
- **Trục 1 — Mục tiêu / Câu hỏi nghiên cứu (`researchQuestion`):**
  - Quét các nhãn cấu trúc trong ghi chú `cleanNotes` của tài nguyên: `Mục tiêu:`, `Câu hỏi:`, `Objective:`, `Research Question:`, `Goal:`.
  - Nếu không có nhãn, suy diễn từ câu mở đầu hoặc mô tả tổng quan.
- **Trục 2 — Phương pháp nghiên cứu (`methodology`):**
  - Quét các nhãn cấu trúc: `Phương pháp:`, `Methodology:`, `Method:`, `Mô hình:`, `Thiết kế:`.
  - Quét các từ khóa phương pháp học thuật: `thực nghiệm`, `khảo sát`, `mô phỏng`, `định lượng`, `định tính`, `empirical`, `RCT`, `meta-analysis`, `case study`, `review`.
- **Trục 3 — Phát hiện then chốt & Luận điểm (`keyFindings`):**
  - Quét các nhãn cấu trúc: `Kết quả:`, `Phát hiện:`, `Luận điểm:`, `Findings:`, `Results:`, `Claim:`.
  - Kết hợp bổ trợ từ các trích đoạn `ResearchExcerpt` liên kết hoặc nội dung từ các `Note` trích dẫn tài nguyên này.
- **Trục 4 — Hạn chế & Khoảng trống nghiên cứu (`limitations`):**
  - Quét các nhãn cấu trúc: `Hạn chế:`, `Giới hạn:`, `Limitations:`, `Gap:`, `Chưa giải quyết:`.
- **Trục 5 — Lập trường học thuật (`stance`):**
  - Phân loại thành 4 trạng thái: `'supports'` (ủng hộ), `'contradicts'` (phản biện/mâu thuẫn), `'extends'` (kế thừa/mở rộng), `'neutral'` (trung lập).
  - Phân loại dựa trên các từ khóa chỉ báo:
    - `contradicts`: `mâu thuẫn`, `bác bỏ`, `phản bác`, `đối lập`, `contradicts`, `refutes`, `opposes`, `in contrast`.
    - `extends`: `mở rộng`, `kế thừa`, `phát triển từ`, `extends`, `builds on`, `improves upon`.
    - `supports`: `chứng minh`, `ủng hộ`, `xác nhận`, `đồng thuận`, `supports`, `confirms`, `validates`.

### Quyết định 2: Cơ Chế Ghi Đè Thủ Công Không Phá Hủy (`localStorage` Overrides)
Học giả có quyền chỉnh sửa thủ công bất kỳ ô nào trong 5 trục cho từng `resourceId`.
- Bản ghi đè được lưu trong `localStorage` tại key `knowledge_os_literature_matrix_v1` dưới dạng từ điển `Record<resourceId, LiteratureMatrixOverride>`.
- Khi tính toán `buildLiteratureMatrix`, hệ thống ưu tiên áp dụng giá trị ghi đè thủ công lên trên giá trị suy diễn tự động.
- Cung cấp hàm `saveMatrixRowOverride(resourceId, override)` và `clearMatrixRowOverride(resourceId)`.

### Quyết định 3: Tổng Hợp Luận Điểm & Cảnh Báo Mâu Thuẫn Học Thuật (Contradiction Alerts)
Hàm `analyzeLiteratureSynthesis(rows)` cung cấp bức tranh toàn cảnh:
- Tổng số tài liệu, tỷ lệ phân bổ lập trường học thuật (`supports`, `contradicts`, `extends`, `neutral`).
- Điểm độ bao phủ dữ liệu (Coverage Score: tỷ lệ các ô đã được điền thông tin).
- Tự động phát hiện các cặp hoặc nhóm tài liệu trong cùng một chủ đề (`topicId`) có lập trường mâu thuẫn (`contradicts` vs. `supports`), cảnh báo người nghiên cứu về các cuộc tranh luận học thuật then chốt để phục vụ viết phần thảo luận (Discussion).

### Quyết định 4: Xuất Bản Ma Trận Chuẩn Học Thuật (Markdown & CSV)
- `exportLiteratureMatrixToMarkdown(rows, summary)`: Xuất bảng Markdown 7 cột với ký tự gạch đứng `|` được escape an toàn, kèm theo khối tóm tắt tổng quan học thuật.
- `exportLiteratureMatrixToCsv(rows)`: Xuất file CSV tuân thủ chuẩn RFC-4180 (escape dấu ngoặc kép, dấu phẩy và ngắt dòng), tương thích hoàn hảo với Microsoft Excel, Google Sheets, R và Python Pandas.

---

## 4. Hậu Quả & Đánh Giá (Consequences)
- **Ưu điểm:**
  - Tự động hóa việc lập bảng Literature Review Matrix, tiết kiệm hàng tuần nghiên cứu.
  - Nhận diện tức thời các xung đột học thuật giữa các bài báo nghiên cứu.
  - Zero-Database Schema Migration: Hoàn toàn tận dụng metadata hiện hữu và localStorage cho overrides.
  - Xuất bản dữ liệu linh hoạt phục vụ biên soạn luận văn.
- **Biện pháp phòng ngừa:**
  - Khi tài nguyên có ghi chú trống, hệ thống sử dụng heuristic suy diễn an toàn từ tiêu đề và các trích đoạn highlight sẵn có, không sinh lỗi runtime.
