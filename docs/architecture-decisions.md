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

## ADR-006: Kiến Trúc Persistence Chuẩn Hóa với PostgreSQL, Idempotent Hydration Contract & Repository Pattern

- **Trạng thái:** PROPOSED FOR REVIEW (REVISION 2)
- **Bối cảnh:**
  - Ứng dụng hiện lưu trữ hoàn toàn trên `localStorage` client-side. Cần chuyển sang PostgreSQL + Prisma ORM làm cơ sở dữ liệu quan hệ production-ready duy nhất.
  - Cần đảm bảo:
    1. Cơ sở dữ liệu server-side có cấu hình đơn nhất, chuẩn hóa, không dùng kỹ thuật hybrid đa provider phức tạp trong runtime.
    2. Giao thức `POST /api/sync/hydrate` phải có tính bất biến (Idempotent), hỗ trợ retry an toàn nhiều lần mà không tạo bản ghi trùng lặp hoặc sai lệch dữ liệu.
    3. Tránh việc refactor lớn trực tiếp vào `DataContext.tsx` làm tăng blast-radius; tách biệt bằng lớp `DataRepository` trung gian.
- **Quyết định Kiến Trúc:**
  1. **Single Target Persistence (PostgreSQL + Prisma ORM):**
     - Target duy nhất cho server persistence trong Phase 2A là **PostgreSQL** (`provider = "postgresql"` trong `prisma/schema.prisma`).
     - Chuỗi kết nối được cấu hình thông qua biến môi trường chuẩn `DATABASE_URL` trong `.env`.
  2. **Giao Thức Idempotent Hydration (`POST /api/sync/hydrate`):**
     - **Payload Contract:** Gồm `clientSyncId` (UUID v4 chống trùng lặp), `version: "2.0.0"`, `clientTimestamp` (ISO 8601), và toàn bộ các thực thể dữ liệu.
     - **Quy tắc Giải quyết Xung đột (Last-Write-Wins - LWW):**
       - So sánh trường `updatedAt` của bản ghi: nếu bản ghi trên Client có `updatedAt` mới hơn Server $\rightarrow$ tiến hành cập nhật; ngược lại giữ nguyên dữ liệu Server.
       - Với `StudyProgress`: Hợp nhất thông minh, giữ `timeSpent`, `repetitions`, `easeFactor` và `interval` tối ưu nhất.
     - **Tính Bất Biến khi Retry:** Gửi lại cùng một payload nhiều lần (hoặc khi mất kết nối mạng giữa chừng) cho ra cùng một kết quả chính xác, không sinh duplicate ID hay foreign key lỗi.
  3. **Kiến Trúc Repository Pattern (`src/services/dataRepository.ts`):**
     - Tạo interface `IDataRepository` chuẩn hóa: `getTopics()`, `saveTopic()`, `deleteTopic()`, `getNotes()`, `saveNote()`, `syncHydrate()`...
     - `DataContext.tsx` chỉ tương tác với `dataRepository`, không trực tiếp gọi `fetch()` hay `localStorage`, giữ nguyên 100% API cho UI components và giảm thiểu tối đa blast-radius.
- **Hệ quả:**
  - _Tích cực:_
    - Kiến trúc Prisma rõ ràng, chuẩn mực công nghiệp, dễ bảo trì và migrate.
    - An toàn tuyệt đối khi mạng chập chờn hoặc người dùng bấm đồng bộ nhiều lần.
    - Giảm thiểu 80% rủi ro regression trên `DataContext.tsx` và UI layer.
  - _Tiêu cực:_
    - Cần triển khai thêm lớp Repository service và viết test suite bao phủ các kịch bản LWW conflict resolution.
