# 📋 ĐẶC TẢ KỸ THUẬT: POST-PHASE 5 MICRO-INCREMENT
## Citation Format Preference Hardening (Ghi Nhớ Định Dạng Trích Dẫn Dùng Chung)

> **Trạng thái:** 🟢 VERIFIED & IMPLEMENTED (100% GREEN)  
> **Phạm vi:** Post-Phase 5 Micro-Increment (Đồng bộ và ghi nhớ tùy chọn định dạng trích dẫn giữa CitationModal và BatchCitationModal)  
> **Tài liệu liên quan:** [`docs/specs/post-phase5-scholar-citation-generator.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase5-scholar-citation-generator.md) · [`docs/specs/post-phase5-batch-citation-export.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase5-batch-citation-export.md)  
> **Mục tiêu:** Lưu trữ và tái sử dụng định dạng trích dẫn ưu tiên của học giả (`apa` | `bibtex` | `markdown`) qua `localStorage`, đảm bảo chuyển đổi tab ở bất kỳ modal nào (đơn lẻ hoặc hàng loạt) đều tự động ghi nhớ và áp dụng cho các lần mở tiếp theo.

---

## 🎯 1. BỐI CẢNH & ĐỘNG LỰC THIẾT KẾ

Hiện tại, cả `CitationModal` (trích dẫn đơn lẻ) và `BatchCitationModal` (xuất trích dẫn hàng loạt) đều mặc định tab `apa` khi mở:
- Nếu một học giả chuyên làm việc với **LaTeX / Overleaf / Zotero**, họ liên tục phải chuyển sang tab **BibTeX** mỗi khi mở modal trích dẫn cho từng tài liệu hoặc xuất cả danh mục.
- Nếu một học giả chuyên ghi chép vào **Obsidian**, họ phải bấm tab **Markdown Footnotes** lặp đi lặp lại.

Việc thiết lập một **Shared Preference Store** gọn nhẹ phía Client giúp loại bỏ hoàn toàn ma sát thao tác này (zero UI friction).

---

## 🛡️ 2. PHẠM VI (SCOPE DEFINITION)

### ✅ Trong phạm vi (Scope IN):
1. **Khóa Lưu Trữ & Hằng Số Chuẩn:**
   - Storage Key: `knowledge_os_citation_format_pref`
   - Supported Formats: `'apa' | 'bibtex' | 'markdown'`
   - Default Fallback: `'apa'`
2. **Module Helper Thuần Túy (`src/lib/citationGenerator.ts`):**
   - `getStoredCitationFormat(): CitationFormat`: Đọc từ `localStorage`, xác minh tính hợp lệ, tự động fallback về `'apa'` nếu dữ liệu bị lỗi/rỗng/không hợp lệ.
   - `setStoredCitationFormat(format: CitationFormat): void`: Lưu định dạng hợp lệ vào `localStorage`, có bọc `try/catch` chống sập trong môi trường hạn chế quyền.
   - `resetStoredCitationFormat(): void`: Xóa preference, trả về mặc định `'apa'`.
   - `isValidCitationFormat(value: unknown): value is CitationFormat`: Hàm kiểm tra kiểu an toàn.
3. **Đồng Bộ Hai Chiều (Bi-directional Preference Persistence):**
   - Khi người dùng bấm đổi tab ở `CitationModal`, định dạng mới được lưu vào `localStorage`.
   - Khi mở `BatchCitationModal`, modal tự động khởi tạo tab theo định dạng đã lưu.
   - Ngược lại, khi người dùng đổi tab ở `BatchCitationModal`, lần mở sau của `CitationModal` cũng giữ đúng định dạng đó.
4. **Cơ Chế Phòng Vệ Trạng Thái Hỏng (Corrupt State Guardrail):**
   - Nếu `localStorage` chứa giá trị lạ như `"invalid_format"`, `null`, chuỗi rỗng `""` hoặc JSON hỏng: `getStoredCitationFormat()` trả về `'apa'` mà không ném ngoại lệ runtime.

### ❌ Ngoài phạm vi (Scope OUT):
- KHÔNG thêm backend API, không thêm bảng trong cơ sở dữ liệu hoặc Prisma Schema.
- KHÔNG thay đổi `DataContext` hay `TopicDetail`.
- KHÔNG thêm dependency bên ngoài.
- KHÔNG thay đổi layout hay CSS của các component modal.

---

## 📐 3. THIẾT KẾ CHI TIẾT (TECHNICAL SPECIFICATIONS)

```typescript
export const CITATION_FORMAT_STORAGE_KEY = 'knowledge_os_citation_format_pref';
export type CitationFormat = 'apa' | 'bibtex' | 'markdown';
export const DEFAULT_CITATION_FORMAT: CitationFormat = 'apa';

export function isValidCitationFormat(val: unknown): val is CitationFormat {
  return val === 'apa' || val === 'bibtex' || val === 'markdown';
}

export function getStoredCitationFormat(): CitationFormat {
  try {
    const stored = localStorage.getItem(CITATION_FORMAT_STORAGE_KEY);
    if (isValidCitationFormat(stored)) {
      return stored;
    }
    return DEFAULT_CITATION_FORMAT;
  } catch {
    return DEFAULT_CITATION_FORMAT;
  }
}

export function setStoredCitationFormat(format: CitationFormat): void {
  try {
    if (isValidCitationFormat(format)) {
      localStorage.setItem(CITATION_FORMAT_STORAGE_KEY, format);
    }
  } catch (e) {
    console.error('Failed to store citation format preference', e);
  }
}

export function resetStoredCitationFormat(): void {
  try {
    localStorage.removeItem(CITATION_FORMAT_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to reset citation format preference', e);
  }
}
```

---

## 🔒 4. INVARIANTS & CHỈ SỐ AN TOÀN

1. **Deterministic Fallback:** Mọi giá trị không hợp lệ đều được đưa về `'apa'`.
2. **Blast Radius:** Rất thấp (chỉ bổ sung helper đọc/ghi storage và khởi tạo state trong 2 modal).
3. **Zero Breaking Changes:** Không làm ảnh hưởng đến bất kỳ test suite nào trong 37 test files hiện hành.
