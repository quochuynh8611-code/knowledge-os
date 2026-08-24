# ☸️ Knowledge OS — Hệ Điều Hành Quản Lý & Khảo Cứu Tri Thức Phật Học & Huyền Học Phương Đông

> **Trung tâm Cấu trúc hóa Tri thức, Spaced Repetition (SM-2) và Cầu nối Đa Nền tảng (Obsidian, NotebookLM, Antigravity AI)**

---

## 🧭 Cổng Điều Hướng Tài Liệu (Documentation Hub)

Để thuận tiện cho người dùng mới và các nhà phát triển, tài liệu của dự án được chia thành 3 cẩm nang chuyên biệt:

- 📖 **[Cẩm Nang Hướng Dẫn Sử Dụng (User Guide)](docs/user-guide.md):** Khám phá 13 màn hình chức năng, quy trình học 15–30 phút hằng ngày, hệ thống Spaced Repetition SM-2 và FAQ.
- 🛠️ **[Cẩm Nang Dành Cho Developer (Developer Guide)](docs/developer-guide.md):** Kiến trúc Dual-Tier Persistence, Invariants dữ liệu 35 topics canonical, Resource schema contract, ranh giới Web Sandbox và quy chuẩn OODA.
- 📊 **[Bảng Điều Hành Dự Án (Project Status & Roadmap)](docs/PROJECT_STATUS.md):** Trạng thái chi tiết các Phase (Phase 1 Local File Picker, Phase 2a Obsidian, Phase 2b NotebookLM, Phase 3 Antigravity).

---

## 🌟 Bắt Đầu Nhanh Cho Người Dùng Mới

### 1. Mục tiêu của Knowledge OS
Knowledge OS giúp bạn hệ thống hóa việc học và nghiên cứu hai kho tàng tri thức uyên áo:
- **Phật Học Học Thuật:** Tam Tạng Pali (Tipiṭaka), Luận Tạng Vi Diệu Pháp (Abhidhamma), Duy Thức Học (Yogācāra), Thiền Định (Samatha - Vipassanā).
- **Huyền Học & Dịch Học:** Chu Dịch (64 Quẻ), Kỳ Môn Độn Giáp, Phong Thủy Huyền Không Vận 9, Bát Tự Hà Lạc, Tử Vi Đẩu Số.

### 2. Lộ trình 10 phút đầu tiên
1. **Mở Tổng quan:** Nhìn bức tranh chung và các chủ đề cần ôn tập hôm nay.
2. **Vào Chủ đề:** Chọn 1 chủ đề khởi đầu (ví dụ: *Vi Diệu Pháp Toàn Tập* hoặc *Kinh Dịch*).
3. **Đọc Chi tiết Chủ đề:** Xem phần định vị khái niệm, luận thuyết và đồ thị liên kết.
4. **Tạo Ghi chú:** Ghi lại 2–3 ý tâm đắc dạng `insight` hoặc `question`.
5. **Cập nhật Tiến độ:** Đánh giá độ nhớ để hệ thống xếp lịch ôn tập theo thuật toán SM-2.

---

## 🚀 Cài Đặt & Chạy Ứng Dụng (Quick Start for Developers)

### Yêu cầu môi trường:
- Node.js v20+ / v22+ / v26+
- npm v10+

### Các bước khởi chạy:
```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Chạy môi trường phát triển (Dev Server tại http://localhost:3000)
npm run dev

# 3. Chạy toàn bộ 18 test suites (Vitest)
npm test

# 4. Build bundle production
npm run build

# 5. Chạy production server
npm run start
```

---

## 🏛️ Kiến Trúc Cốt Lõi (Architecture Highlights)

1. **Dual-Tier Persistence:**
   - Ưu tiên lưu trữ và đồng bộ hóa qua API Express / PostgreSQL Database (Prisma 7.9.1).
   - Tự động chuyển đổi sang LocalStorage (`phat_hoc_huyen_hoc_clean_v3`) khi database/backend chưa sẵn sàng, đảm bảo ứng dụng vận hành 100% không gián đoạn.
2. **Canonical Invariants (SSOT):**
   - 35 Chủ đề Canonical (Topics) thuộc 8 Danh mục (Categories) chuẩn hóa.
   - Không có liên kết tự trỏ, không có ghi chú/tài nguyên mồ côi (Zero Orphan Records).
3. **Resource Contract (Zero Binary Ingestion):**
   - Hỗ trợ cả 2 nguồn: **Đường dẫn Web (`url`)** và **Tham chiếu Tệp Cục bộ (`filePath`)**.
   - Tuyệt đối không đọc binary (`FileReader`) hay lưu trữ base64 làm phình cơ sở dữ liệu.
4. **Knowledge Triad Bridge:**
   - **Obsidian Vault:** Xuất gói ZIP chuẩn cấu trúc Markdown Zettelkasten kèm `[[Wiki Links]]`.
   - **Google NotebookLM:** Đóng gói 1-click tài liệu nguồn sạch phục vụ sinh Audio Overview Podcast và Study Guides.
   - **Antigravity AI Scholar:** Tích hợp trợ lý nghiên cứu liên ngành Phật học - Dịch học.

---

## 📜 Giấy Phép & Bản Quyền

Dự án phát triển phục vụ mục đích nghiên cứu học thuật phi thương mại.
