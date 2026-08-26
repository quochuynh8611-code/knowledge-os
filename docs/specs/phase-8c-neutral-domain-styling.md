# Technical Specification: Phase 8C — Neutral & Scalable Domain Styling (Multi-Discipline Research Workspace)

## 1. Problem Statement
Trang chủ (Dashboard - Domain Hub) và thanh điều hướng (Sidebar) hiện vẫn tồn tại các nhánh logic hard-code ưu tiên thị giác cho 2 lĩnh vực mặc định:
- `phat-hoc` -> icon `Sparkles`, palette màu `amber`
- `huyen-hoc` -> icon `Compass`, palette màu `indigo`
- Các lĩnh vực khác do người dùng tạo thêm (Kinh tế, Lịch sử, Khoa học tự nhiên, Kỹ thuật...) -> rơi vào fallback đơn điệu `sky` với icon `Folder`.

Điều này làm cho:
- Sản phẩm chưa thật sự trung tính và bình đẳng về mặt thị giác giữa các ngành khoa học.
- Khi người dùng tạo nhiều lĩnh vực mới, tất cả các card mới đều có chung một màu `sky`, làm giảm tính phân biệt và trải nghiệm trực quan.

---

## 2. Goals & Non-Goals

### 2.1. Goals
1. **Loại bỏ hoàn toàn các rẽ nhánh hard-code (`if (slug === 'phat-hoc') ...`)**:
   - Không còn phân biệt đối xử cứng trong code giữa lĩnh vực tích hợp sẵn và lĩnh vực do người dùng tạo.
2. **Xây dựng Hệ Thống Định Kiểu Lĩnh Vực Nhất Quán & Khả Mở (Deterministic Domain Palette System)**:
   - Cung cấp một bộ bảng màu học thuật tinh tế, trung tính, hài hòa (Slate, Stone, Emerald, Amber, Indigo, Sky, Rose, Teal, Violet).
   - Xác định kiểu dáng (icon, màu nền, border, thanh tiến độ, action link) một cách **tự động và tất định (deterministic)** dựa trên `category.id`, `category.slug`, hoặc `category.color`.
   - Bất kể lĩnh vực nào (Phật học, Dịch học, Sinh học, Kinh tế học, Khoa học máy tính...), mỗi card đều có phong cách trực quan cao cấp, riêng biệt và đồng đều về đẳng cấp thị giác.
3. **Đồng bộ hóa trên toàn bộ ứng dụng**:
   - Dashboard Domain Hub cards.
   - Sidebar Domain filter list.
   - Topic item badges.
4. **Bảo toàn 100% tính tương thích ngược**:
   - Dữ liệu `Category` hiện có (`INITIAL_CATEGORIES`, categories trong localStorage/DB) hoạt động hoàn hảo mà không cần chạy database migration.

### 2.2. Non-Goals
1. **Không đổi Schema / Model**: Giữ nguyên cấu trúc interface `Category`.
2. **Không thay đổi hành vi nghiệp vụ**: Toàn bộ luồng lọc `selectedCategoryFilter`, tính toán `calculateRootCategoryStats`, và điều hướng `activeTab` giữ nguyên vẹn 100%.

---

## 3. Architecture & Proposed Solution

### 3.1. Unified Domain Style Resolver (`getNeutralDomainStyle`)
Thay vì kiểm tra hard-code `slug === 'phat-hoc'`, một resolver trung tâm sẽ xác định style:

```typescript
export interface DomainStyleToken {
  icon: React.ElementType;
  iconBg: string;
  hoverBorder: string;
  progressBar: string;
  percentText: string;
  actionText: string;
  arrowHover: string;
  badgeBg: string;
  badgeText: string;
}
```

- **Nguyên tắc chọn style**:
  1. Nếu category có `color` hợp lệ hoặc `icon` hợp lệ, ưu tiên sử dụng.
  2. Ngược lại, sử dụng cơ chế băm chuỗi tất định (Deterministic String Hash / Palette Rotation) dựa trên `category.id` hoặc `category.slug` để gán bảng màu cân đối từ danh sách palette học thuật được tuyển chọn.
  3. Kết quả là 100% domain (dù là có sẵn hay mới tạo) đều có màu sắc hài hòa, chuyên nghiệp và không trùng lặp vô lý.

---

## 4. Blast Radius & Affected Files
- `src/lib/domainStyling.ts` [NEW]: Module utility định kiểu domain trung tính, phân giải palette và icon tự động.
- `src/components/dashboard/DashboardHome.tsx` [MODIFY in Execution Phase]: Sử dụng `getNeutralDomainStyle`.
- `src/components/layout/Sidebar.tsx` [MODIFY in Execution Phase]: Sử dụng `getNeutralDomainStyle` cho danh sách lĩnh vực.
- `tests/unit/phase8c-neutral-domain-styling.test.tsx` [NEW]: Unit & integration tests kiểm chứng tính trung tính, nhất quán và không hard-code.
- `docs/specs/phase-8c-neutral-domain-styling.md` [NEW]: Bản đặc tả này.
- `docs/gherkin/phase-8c-neutral-domain-styling.feature` [NEW]: Kịch bản BDD.

---

## 5. Rollback Strategy
Toàn bộ logic hoàn toàn nằm ở tầng presentation helper (`domainStyling.ts`). Nếu cần khôi phục, chỉ cần đảo ngược lại hàm lấy style trong `DashboardHome.tsx` và `Sidebar.tsx` mà không gây bất kỳ ảnh hưởng nào tới dữ liệu.
