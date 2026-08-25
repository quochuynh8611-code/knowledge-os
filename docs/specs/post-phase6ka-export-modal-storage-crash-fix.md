# SPECIFICATION: Post-Phase 6k.a — Export / Backup Modal Storage Crash Resilience Fix

## 1. Problem Statement & Root Cause Diagnosis
### Hiện tượng (Symptom):
Khi người dùng bấm vào biểu tượng "Tải xuống / Sao lưu & Phục hồi" trên thanh điều hướng (Navbar), toàn bộ ứng dụng bị crash và biến thành màn hình trắng (White Screen of Death), làm mất cả Navbar lẫn nội dung chính.

### Nguyên nhân gốc rễ (Root Cause):
Trong tệp [`src/components/modals/ExportImportModal.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/modals/ExportImportModal.tsx):
1. State `libraryRootPath` được khởi tạo trực tiếp trong `useState` bằng:
   ```typescript
   const [libraryRootPath, setLibraryRootPath] = useState<string>(() => {
     if (typeof window !== 'undefined') {
       return localStorage.getItem('knowledge_os_library_root_path') || '';
     }
     return '';
   });
   ```
2. Hàm xử lý thay đổi `handleLibraryRootChange` gọi trực tiếp:
   ```typescript
   localStorage.setItem('knowledge_os_library_root_path', newPath);
   ```
3. Khi trình duyệt chặn quyền truy cập storage (chế độ ẩn danh nghiêm ngặt, cookie bên thứ ba bị khóa, sandbox iframe, hoặc `localStorage` ném `SecurityError` / `QuotaExceededError`), các lệnh gọi `localStorage.getItem` và `localStorage.setItem` ném ra ngoại lệ chưa được xử lý (uncaught exception) ngay trong chu kỳ render của React. Vì không có `try/catch` bọc quanh, lỗi này làm hỏng toàn bộ cây component React của ứng dụng.

---

## 2. Technical Solution

### 2.1 Safe Storage Helpers
Tạo module helper thuần túy an toàn tại `src/lib/storage.ts`:
```typescript
export function safeGetLocalStorageItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Graceful fallback when localStorage is blocked or throws
  }
  return null;
}

export function safeSetLocalStorageItem(key: string, value: string): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return true;
    }
  } catch {
    // Graceful fallback when localStorage quota is exceeded or storage is blocked
  }
  return false;
}
```

### 2.2 Refactor `ExportImportModal.tsx`
- Khởi tạo `libraryRootPath` thông qua `safeGetLocalStorageItem('knowledge_os_library_root_path') || ''`.
- Ghi dữ liệu thông qua `safeSetLocalStorageItem('knowledge_os_library_root_path', newPath)`.
- Khi storage ném lỗi:
  - Component vẫn render bình thường, không làm crash app.
  - State `libraryRootPath` hoạt động in-memory bình thường với fallback `''`.

---

## 3. Non-Goals & Invariants
1. **Không thay đổi Business Logic:** Hành vi backup, export JSON, restore snapshot và live data context giữ nguyên 100%.
2. **Zero DB / API Mutation:** Không làm thay đổi cơ chế gọi database hay REST API.
3. **Tương thích ngược:** Khi storage hoạt động bình thường, giá trị đường dẫn cấu hình đã lưu vẫn được tải và ghi chính xác.

---

## 4. Test Strategy
1. **Test 1:** Khi `localStorage.getItem` ném `SecurityError` khi mount modal $\rightarrow$ Modal vẫn render đầy đủ, app không crash, fallback `libraryRootPath` là `''`.
2. **Test 2:** Khi `localStorage.setItem` ném `QuotaExceededError` khi thay đổi library root $\rightarrow$ State in-memory vẫn cập nhật, input nhận giá trị mới, app không crash.
3. **Test 3:** Khi `localStorage` hoạt động bình thường $\rightarrow$ Giá trị đã lưu được nạp đúng vào input.
4. **Test 4:** Bảo đảm 100% các test suite hiện hữu của modal (`phase2c-data-management-modal-component.test.tsx`, `data-management-backup-manifest-ui.test.tsx`) tiếp tục PASS.
