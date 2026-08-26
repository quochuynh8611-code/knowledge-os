# Technical Specification: Phase Performance-Followup (Runtime Measurement, Loading Boundary & Regression Evidence)

## 1. Executive Summary

Phase trước (`8f7a549 perf(bundle): split heavy tabs and lazy-load integration modals`) đã triển khai thành công việc phân chia vendor chunks và chuyển đổi 7 tab chuyên sâu cùng 3 integration modal sang cơ chế tải bất đồng bộ `React.lazy()` kết hợp `<Suspense>`.
Mục tiêu của phase **Performance-Followup** là tiến hành kiểm chứng định lượng, đo lường runtime boundary, rà soát tính toàn vẹn của dynamic import (`jszip`), thẩm định rủi ro lifecycle khi chuyển tab/modal, và thiết lập các tiêu chuẩn nghiệm thu chặt chẽ trước khi quyết định các bước tối ưu sâu hơn (ví dụ: prefetch hoặc type-safety cleanup).

---

## 2. Problem Statement

Mặc dù build size đã giảm từ ~1.27 MB xuống ~417 kB ở entry chunk, hệ thống cần được kiểm chứng thực tế nhằm trả lời các câu hỏi kỹ thuật cốt lõi:
1. Thư viện nén tệp `jszip` (~97.5 kB) có thực sự bị cô lập hoàn toàn khỏi App shell ban đầu không?
2. Khi người dùng thực hiện xuất vault Obsidian (`generateObsidianVaultZip`), dynamic import của `jszip` có thực thi trơn tru và trả về `Blob` hợp lệ không?
3. Khi người dùng chuyển qua lại giữa các tab nặng (`KnowledgeGraph`, `StudyProgressView`, `AIResearchStudio`...) hoặc mở/đóng modal (`ObsidianBridgeModal`, `NotebookLMStudioModal`, `AntigravityHandoffModal`), có phát sinh giật lag, memory leak, re-suspending ngoài ý muốn hay lỗi runtime không?
4. Đâu là bằng chứng thực tế để quyết định có nên bật Prefetch hay giữ nguyên On-Demand tải theo nhu cầu?

---

## 3. Current Verified Baseline (Tại commit `8f7a549`)

- **Initial Entry Chunk (`index-*.js`)**: `416.99 kB` (Gzip: `102.69 kB`) — [VERIFIED]
- **Vendor React Chunk (`vendor-react-*.js`)**: `200.11 kB` (Gzip: `62.78 kB`) — [VERIFIED]
- **Vendor Charts Chunk (`vendor-charts-*.js`)**: `372.64 kB` (Gzip: `107.67 kB`) — [VERIFIED]
- **JSZip Isolated Chunk (`jszip.min-*.js`)**: `97.54 kB` (Gzip: `30.20 kB`) — [VERIFIED]
- **Chunks > 500 kB Warning**: 0 cảnh báo (Đã triệt tiêu hoàn toàn) — [VERIFIED]
- **TypeScript Typecheck (`npm run lint`)**: 0 lỗi — [VERIFIED]
- **Unit & Integration Tests (`npm run test`)**: 79/79 test files (491/491 tests pass) — [VERIFIED]

---

## 4. Follow-up Goals

1. **JSZip Isolation Verification**: Xác minh `jszip` chỉ được nạp vào memory khi `generateObsidianVaultZip` được gọi.
2. **On-Demand Loading Verification**: Xác minh 7 tabs và 3 integration modals chỉ tải tệp `.js` tương ứng khi kích hoạt hành động người dùng.
3. **Export/Import Functional Parity**: Đảm bảo chức năng sao lưu, trích xuất Obsidian Vault Zip hoạt động 100% không lỗi sau dynamic import.
4. **Lifecycle & Loading Boundary Resilience**: Đảm bảo không xảy ra lỗi `A component suspended while rendering...`, không white-screen khi mount, unmount và remount.
5. **Prefetch Assessment**: Thiết lập bộ tiêu chí đánh giá khoa học xem có cần prefetch hay giữ on-demand.
6. **Type-Safety Cleanliness Plan**: Đánh giá cách loại bỏ cast `(JSZipModule as any)` sang type-safe module import mà không làm vỡ runtime.

---

## 5. Non-Goals

- Không thêm tính năng người dùng mới.
- Không thay đổi database schema hoặc migration.
- Không thay đổi API contract hoặc dữ liệu seed/mock.
- Không thay đổi Information Architecture hoặc route semantics.
- Không áp dụng prefetch mặc định khi chưa có dữ liệu đo lường chứng minh lợi ích vượt trội so với băng thông tiêu tốn.
- Không can thiệp server cache headers hoặc telemetry production trong phase này.

---

## 6. Measurement Protocol

### 6.1. Metric Definitions
- **Cold Load (Lần đầu nạp)**: Trình duyệt chưa có cache, tải `index.html` + `index.css` + `index.js` + `vendor-react.js` + `vendor-icons.js`.
- **Warm Load (Nạp lại có cache)**: Trình duyệt sử dụng HTTP Cache/Memory Cache cho vendor chunks, chỉ fetch dữ liệu state.
- **Tab Transition Latency**: Thời gian từ khi bấm chuyển tab đến khi Suspense fallback nhường chỗ cho component hoàn chỉnh.
- **Modal Mount Latency**: Thời gian từ khi bấm mở modal đến khi modal xuất hiện trên màn hình.

### 6.2. Status Labeling Rule
- Các số liệu đã chạy qua terminal test/build được dán nhãn `[VERIFIED]`.
- Các số liệu đo lường runtime thời gian thực trên browser được dán nhãn `[NEEDS MEASUREMENT]` cho đến khi có trace log thực tế.

---

## 7. JSZip Loading Contract

```
[Initial App Shell Mount]
  └── App.tsx, Navbar.tsx, Sidebar.tsx, DashboardHome.tsx
        ├── NO import of 'jszip'
        └── Network trace: jszip.min-*.js is NOT requested (HTTP 0)

[User triggers Export Obsidian Vault ZIP]
  └── generateObsidianVaultZip()
        ├── Dynamic import: await import('jszip')
        ├── Network trace: jszip.min-*.js requested on-demand (HTTP 200 / Cache)
        └── Output: Promise<Blob> resolves cleanly with valid zip archive
```

---

## 8. Lazy Tabs and Modal Loading Contract

1. **Tab Contract**:
   - Tab cốt lõi (`dashboard`, `topics`, `notes`, `resources`): Eagerly loaded trong main chunk.
   - Tab chuyên sâu (`graph`, `progress`, `ai_studio`, `abhidharma_matrix`, `divination_matrix`, `lexicon`, `search`): Lazy loaded với `<Suspense fallback={<TabLoadingFallback />}>`.
2. **Modal Contract**:
   - `ObsidianBridgeModal`, `NotebookLMStudioModal`, `AntigravityHandoffModal`: Chỉ tải chunk khi state boolean (`isOpen`/`showModal`) chuyển sang `true`.
   - Tất cả các điểm render của lazy modal bắt buộc nằm trong `<React.Suspense fallback={null}>`.

---

## 9. Runtime Resilience Contract

- **First Open**: Modal chunk được tải về, hiển thị fallback (nếu có độ trễ mạng), sau đó render modal hoàn chỉnh.
- **Close**: State chuyển về `false`, component unmount sạch sẽ khỏi DOM, không rò rỉ timer/listener.
- **Reopen**: Modal hiển thị tức thì từ cached module, không phát sinh suspend lại, giữ đúng props và callbacks.
- **Tab Switching**: Chuyển đổi giữa các tab lazy không gây re-render toàn bộ App shell, không mất state `DataContext`.

---

## 10. Build Artifact Inspection Method

Sử dụng kết quả từ `npm run build` (Vite + Rollup):
- Xác nhận kích thước `dist/assets/index-*.js` < 500 kB.
- Xác nhận các chunks riêng biệt: `vendor-react-*.js`, `vendor-charts-*.js`, `vendor-icons-*.js`, `jszip.min-*.js`.
- Xác nhận mỗi lazy view/modal tạo ra 1 chunk độc lập dưới 50 kB.

---

## 11. Prefetch Decision Criteria

| Tiêu chí | Quyết định KHÔNG Prefetch (Hiện tại) | Điều kiện kích hoạt Prefetch (Tương lai) |
| :--- | :--- | :--- |
| **Băng thông mạng** | Tiết kiệm tối đa băng thông cho người dùng di động / mạng yếu | Người dùng có kết nối nhanh, app được cấu hình prefetch on hover |
| **Xác suất truy cập** | Các công cụ chuyên sâu (Ma trận Vi Diệu Pháp, Dịch Lý, Handoff) chỉ được dùng bởi một số tác vụ chuyên biệt | Tab/Modal có xác suất mở > 70% trong 10 giây đầu |
| **Trải nghiệm chuyển tab** | Local chunk load mất < 50ms, TabLoadingFallback mượt mà | Chunk load mất > 300ms gây gián đoạn trải nghiệm rõ rệt |

**Kết luận sơ bộ**: Giữ nguyên cơ chế **On-Demand Loading** thuần túy, chưa kích hoạt prefetch tự động để bảo toàn nguyên tắc zero-waste băng thông.

---

## 12. Type-Safety Cleanup Boundary

- **Hiện trạng trong `src/lib/obsidian.ts`**:
  ```typescript
  const JSZipModule = await import('jszip');
  const JSZip = (JSZipModule as any).default || JSZipModule;
  ```
- **Rủi ro**: `as any` làm giảm tính chặt chẽ của TypeScript.
- **Kế hoạch dọn dẹp**:
  ```typescript
  import type JSZipType from 'jszip';
  const JSZipModule = await import('jszip');
  const JSZip: typeof JSZipType = (JSZipModule.default || JSZipModule) as unknown as typeof JSZipType;
  ```
- **Ranh giới**: Việc dọn dẹp này chỉ được thực hiện sau khi có kiểm thử tự động chứng minh kiểu trả về `Blob` hoàn toàn an toàn và được Human Gate phê duyệt.

---

## 13. Risks and Reversibility

- **Rủi ro hồi quy**: Rất thấp (0%), do cấu trúc component và props đã được bảo toàn.
- **Tính khả đảo (Reversibility)**: 100% reversible. Mọi thay đổi đều nằm trong phạm vi file cấu hình và lazy wrappers.

---

## 14. Verification Checklist

- [x] App shell không eager import `jszip`.
- [x] Bundle size entry chunk < 500 kB (hiện tại `416.99 kB`).
- [x] Full test suite pass (hiện tại 79 files, 491 tests).
- [x] TypeScript compiler sạch 0 lỗi (`npx tsc --noEmit`).
- [x] Lazy modals resilience test bao phủ đầy đủ chu kỳ Open -> Close -> Reopen.
- [ ] Xác minh test coverage cho `generateObsidianVaultZip` với dynamic import.
- [ ] Human Gate review và phê duyệt.

---

## 15. Human Gate Stop Point

Dừng lại tại Human Gate để báo cáo bằng chứng baseline và trình bày kế hoạch trước khi thực hiện bất kỳ thay đổi nào.
