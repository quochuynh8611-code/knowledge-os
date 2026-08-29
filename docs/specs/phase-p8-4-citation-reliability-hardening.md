# Phase P8.4 Mini-Spec: Citation Reliability Hardening & Export Naming Unification

**Status**: PROPOSED (Awaiting Human Sign-off)  
**Author**: Staff Software Engineer / Technical Architect  
**Domain**: Scholar Suite / Citation Reliability & Naming Policy  
**Baseline**: Phase P8.3 Complete (Commit `a0cf6df`)

---

## 1. Executive Summary

Phase P8.4 tập trung vào 2 mục tiêu củng cố tính bền bỉ và chuẩn hóa quy ước của Citation Subsystem:
1. **Quản trị Vòng Đời Timers & Triệt tiêu Stale State (`ScholarCitationModal.tsx`)**:
   - Quản trị toàn diện các timer phản hồi người dùng (`copied`, `copyError`, `statusMessage`) bằng `useRef` hoặc effect cleanup.
   - Triệt tiêu hoàn toàn nguy cơ memory leak và state update sau khi unmount.
   - Bảo đảm các thao tác liên tiếp (consecutive Copy/Download clicks) luôn reset timer cũ trước khi kích hoạt timer mới.
2. **Hệ Thống Đặt Tên Tệp Xuất Chuẩn Hóa & An Toàn Filesystem (`filename.ts`)**:
   - Xây dựng pure helper `src/lib/scholarCitation/filename.ts`:
     - `sanitizeCitationFilename(raw: string, fallback?: string): string`
     - `getScholarCitationSingleFilename(citationKey: string, format: 'bib' | 'json'): string`
     - `getScholarCitationBatchFilename(identifier: string, format: 'bib' | 'json', prefix?: string): string`
   - Chuẩn hóa:
     - Chuyển đổi ký tự tiếng Việt / Unicode có dấu sang dạng ASCII không dấu (`kusala` thay vì `kùsala`).
     - Loại bỏ các ký tự đặc biệt nguy hiểm cho hệ thống tệp (`/`, `\`, `..`, `:`, `*`, `?`, `"`, `<`, `>`, `|`).
     - Giới hạn độ dài an toàn tối đa 120 ký tự.
     - Deterministic 100%, không bị ảnh hưởng bởi timezone hay môi trường OS.

---

## 2. Detailed Specifications

### A. Feedback Timer Lifecycle Management (`ScholarCitationModal.tsx`)
1. **Timer Ref Storage**:
   ```typescript
   const feedbackTimerRef = useRef<NodeJS.Timeout | number | null>(null);
   ```
2. **Clear on Action**:
   - Trước khi gọi `setTimeout`, gọi `if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);`.
3. **Clear on Unmount & Modal Close**:
   ```typescript
   useEffect(() => {
     return () => {
       if (feedbackTimerRef.current) {
         clearTimeout(feedbackTimerRef.current);
       }
     };
   }, []);
   ```

### B. Filename Policy Specification (`src/lib/scholarCitation/filename.ts`)
1. **`sanitizeCitationFilename(raw: string, fallback = 'citation'): string`**:
   - Chuyển đổi `raw` sang ASCII bằng NFD normalizer (`normalize('NFD').replace(/[\u0300-\u036f]/g, '')`).
   - Thay thế khoảng trắng và ký tự không phải `[a-zA-Z0-9_-]` thành dấu gạch dưới `_`.
   - Thu gọn nhiều gạch dưới liên tiếp thành 1 gạch dưới.
   - Cắt bỏ gạch dưới ở đầu và cuối.
   - Nếu kết quả rỗng, trả về `fallback`.
2. **`getScholarCitationSingleFilename(citationKey: string, format: 'bib' | 'json'): string`**:
   - Trả về `${sanitizeCitationFilename(citationKey, 'citation')}.${format}`.
3. **`getScholarCitationBatchFilename(identifier: string, format: 'bib' | 'json', prefix = 'matrix_relations'): string`**:
   - Trả về `${prefix}_${sanitizeCitationFilename(identifier, 'all')}.${format}`.
