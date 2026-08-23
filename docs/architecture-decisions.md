# TÀI LIỆU QUYẾT ĐỊNH KIẾN TRÚC (ARCHITECTURE DECISION RECORDS - ADR)

## Dashboard Nghiên Cứu Phật Học & Huyền Học (Knowledge OS)

---

## ADR-001: Quản lý Trạng Thái & Chiến lược Lưu trữ Hai Tầng (Dual-Tier Persistence)

- **Trạng thái:** ACCEPTED
- **Bối cảnh:**
  - Ứng dụng hiện tại chỉ lưu trên `localStorage` (~5MB), tiềm ẩn rủi ro mất dữ liệu khi xóa cache hoặc đổi trình duyệt.
  - Mục tiêu dài hạn là hệ thống production-ready với PostgreSQL/Prisma, nhưng cần đảm bảo ứng dụng vẫn hoạt động độc lập ngay cả khi người dùng chưa cấu hình cơ sở dữ liệu (Offline-first capability).
- **Quyết định:**
  - Thiết kế kiến trúc lưu trữ **Hai tầng (Dual-Tier Resilience Layer)**:
    1. **Tầng 1 (Primary / Server-side):** PostgreSQL quản lý qua Prisma ORM khi có kết nối backend.
    2. **Tầng 2 (Fallback / Local):** Client-side LocalStorage với cấu trúc JSON chuẩn hóa đồng nhất với Prisma Schema.
  - Cung cấp nút 1-click "Đồng bộ lên Máy chủ" và "Tải toàn bộ về Máy cục bộ".
- **Hệ quả:**
  - _Tích cực:_ Không bao giờ mất dữ liệu nghiên cứu của học giả; người dùng không chuyên vẫn dùng được ngay mà không bắt buộc cài đặt cơ sở dữ liệu.
  - _Tiêu cực:_ Cần duy trì layer đồng bộ và kiểm tra tính nhất quán giữa client và server.

---

## ADR-002: Lựa chọn Framework Kiểm Thử & Chiến lược Test-First (Vitest + React Testing Library)

- **Trạng thái:** ACCEPTED
- **Bối cảnh:**
  - Dự án chạy trên nền Vite 6 và React 19. Cần công cụ chạy test siêu tốc, hỗ trợ TypeScript native, ESM và môi trường DOM ảo.
- **Quyết định:**
  - Chọn **Vitest** làm Test Runner chính vì tích hợp trực tiếp cấu hình `vite.config.ts`, khởi động nhanh hơn 10x so với Jest.
  - Sử dụng **@testing-library/react** và **jsdom** để kiểm thử hành vi người dùng (User-centric interaction testing).
  - Áp dụng nguyên tắc **Test-First**: Viết Gherkin Scenarios và Failing Tests trước khi triển khai component thực tế.
- **Hệ quả:**
  - _Tích cực:_ Phản hồi test tức thời trong lúc code (watch mode), đảm bảo không xảy ra regression.
  - _Tiêu cực:_ Cần cấu hình mock cho một số API trình duyệt như `canvas-confetti` và `ResizeObserver`.

---

## ADR-003: Kiến trúc Giao Diện & Dark Mode với Tailwind CSS v4

- **Trạng thái:** ACCEPTED
- **Bối cảnh:**
  - Dự án sử dụng Tailwind CSS v4 (`@tailwindcss/vite`). Tailwind v4 không sử dụng file `tailwind.config.js` mà khai báo qua CSS variables và chỉ thị `@theme` trong CSS.
- **Quyết định:**
  - Triển khai **ThemeToggle** sử dụng thuộc tính `data-theme` hoặc class `.dark` trên phần tử `<html>`.
  - Định nghĩa bảng màu hài hòa phương Đông:
    - _Light Mode:_ Tông Giấy cổ (Stone-50/100), Điểm xuyết Vàng Hoàng Mai (Amber-800) và Chàm Lam (Indigo-800).
    - _Dark Mode:_ Tông Mực Nho (Stone-900/950), Nền đêm sâu tĩnh mịch (Zendark), giảm chói mắt khi nghiên cứu văn bản cổ ban đêm.
- **Hệ quả:**
  - _Tích cực:_ Tuân thủ đúng chuẩn Tailwind v4, không bị cảnh báo lỗi build.
  - _Tiêu cực:_ Cần rà soát các utility class màu sắc để đảm bảo độ tương phản (WCAG AA).

---

## ADR-004: Thuật Toán Ôn Tập Gián Đoạn (SuperMemo-2 SM-2 Algorithm)

- **Trạng thái:** ACCEPTED
- **Bối cảnh:**
  - Khối lượng kiến thức Phật học (89 Tâm, 52 Tâm sở, 24 Duyên) và Huyền học (64 Quẻ, Bát môn, Cửu tinh) rất đồ sộ. Người nghiên cứu cần phương pháp ghi nhớ khoa học.
- **Quyết định:**
  - Triển khai thuật toán chuẩn **SuperMemo-2 (SM-2)** với công thức cập nhật Hệ số Dễ dàng ($EF$):
    $$EF' = EF + (0.1 - (5 - q) \times (0.08 + (5 - q) \times 0.02))$$
    Trong đó $q \in [0, 5]$ và $EF_{min} = 1.3$.
  - Tính toán khoảng cách ngày ($I$):
    - Lần 1: $I(1) = 1$ ngày
    - Lần 2: $I(2) = 6$ ngày
    - Lần $n$: $I(n) = \text{round}(I(n-1) \times EF)$
    - Nếu $q < 3$: Reset $I = 1$ ngày, $Repetitions = 0$.
- **Hệ quả:**
  - _Tích cực:_ Đảm bảo tính khoa học, chuẩn hóa tương thích với Anki.
  - _Tiêu cực:_ Cần xử lý múi giờ cục bộ khi tính toán `nextReview` để không bị lệch ngày.

---

## ADR-005: Kiểm Tra Hợp Chuẩn Dữ Liệu bằng Zod (Runtime Schema Validation)

- **Trạng thái:** ACCEPTED
- **Bối cảnh:**
  - Luồng nhập dữ liệu từ file bên ngoài (JSON, Markdown) có nguy cơ gây lỗi ứng dụng (Crash) nếu thiếu trường hoặc sai kiểu dữ liệu.
- **Quyết định:**
  - Sử dụng **Zod** để khai báo Schema duy nhất (Single Source of Truth) cho cả Validation runtime và TypeScript Types.
  - Tất cả các luồng Input từ API và File Upload đều phải qua hàm `safeParse()` của Zod.
- **Hệ quả:**
  - _Tích cực:_ Loại bỏ hoàn toàn `any`, bảo vệ 100% ứng dụng khỏi dữ liệu rác.
  - _Tiêu cực:_ Tăng thêm một ít bundle size (~14KB gzipped).

---

## ADR-006: Chiến Lược Chuyển Đổi Lưu Trữ từ LocalStorage sang PostgreSQL / Prisma (Hybrid Persistence & Zero-Loss Hydration)

- **Trạng thái:** PROPOSED FOR REVIEW
- **Bối cảnh:**
  - Hiện tại, cơ sở tri thức nghiên cứu của người dùng chỉ được lưu trong `localStorage` của trình duyệt. Điều này tiềm ẩn các giới hạn:
    1. Dung lượng tối đa của LocalStorage chỉ khoảng 5MB - 10MB, không đủ chứa hàng nghìn ghi chú, trích dẫn kinh điển lớn hoặc hình ảnh số hóa.
    2. Không hỗ trợ truy vấn quan hệ nhiều-nhiều (Many-to-Many), chỉ mục phức tạp, hoặc giao dịch ACID an toàn.
    3. Dữ liệu dễ bị mất khi người dùng dọn dẹp trình duyệt hoặc chuyển đổi máy tính.
  - Tuy nhiên, nhiều học giả và người dùng phi công nghệ cần ứng dụng chạy ngay được mà không bắt buộc phải cài đặt máy chủ PostgreSQL cục bộ trước.
- **Quyết định:**
  - Thiết kế kiến trúc lưu trữ **Lai Hai Tầng (Hybrid Resilience Layer)** với PostgreSQL + Prisma ORM làm Backend Core và LocalStorage làm Client Fallback:
    1. **Prisma ORM Models:** Định nghĩa các thực thể có quan hệ chặt chẽ: `Category`, `Topic`, `Note`, `Resource`, `Tag`, `KnowledgeLink`, `StudyProgress`, `StudySessionLog`, `LexiconTerm`.
    2. **Đa dạng hóa Database Engine (Zero Friction):** Hỗ trợ chuỗi kết nối linh hoạt qua biến môi trường `DATABASE_URL`:
       - Môi trường Production / Server: PostgreSQL (`postgresql://...`).
       - Môi trường Local Dev / Offline: SQLite (`file:./dev.db`) khi chưa có máy chủ PostgreSQL.
    3. **Quy trình Hydration Không Mất Dữ Liệu (Zero-Loss First Boot Migration):**
       - Khi khởi động, Frontend kiểm tra kết nối API máy chủ (`/api/health`).
       - Nếu máy chủ phản hồi và cơ sở dữ liệu rỗng (hoặc có dữ liệu mới trên client chưa đồng bộ), Frontend tự động kích hoạt gói tin `POST /api/sync/hydrate` gửi toàn bộ dữ liệu từ `localStorage` lên máy chủ.
       - Server sử dụng Transaction (`prisma.$transaction`) để `upsert` theo UUID/Slug, kết hợp dữ liệu cũ và mới mà không bao giờ ghi đè làm mất ghi chú người dùng.
    4. **Offline Resilience & Fallback:**
       - Nếu backend tạm thời không kết nối được, Frontend tự động chuyển về chế độ LocalStorage mượt mà mà không ném lỗi ra màn hình.
- **Hệ quả:**
  - _Tích cực:_
    - Dữ liệu nghiên cứu tồn tại vĩnh viễn, bảo vệ toàn vẹn bằng quan hệ Foreign Key và Transaction ACID.
    - Không gián đoạn trải nghiệm của người dùng cũ (dữ liệu LocalStorage tự động chuyển đổi lên DB).
    - Hỗ trợ cả hai chế độ chạy máy chủ PostgreSQL và chạy cục bộ không cần cấu hình phức tạp.
  - _Tiêu cực:_
    - Cần quản lý cấu hình Prisma Client và thực hiện test các tình huống xung đột cập nhật (Conflict Resolution).
