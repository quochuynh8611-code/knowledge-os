# Spec: Phase 7B — Resource Open Target Resolution & Model/Form/Viewer UX Upgrade

**Status:** IN_PROGRESS (Spec Refinement & Test-First Gate)  
**Phase:** 7B  
**Depends on:** Phase 7A (Rebrand & Focus Note Reader)

---

## 1. Problem Statement & Resolution Architecture

Hiện tại, việc mở tài liệu từ `ResourceViewerModal`, `ResourcesManager` và `TopicDetail` có các hạn chế:
- **Đồng nhất sai giữa "có chuỗi target" và "mở trực tiếp được"**: Trong ngữ cảnh trình duyệt web, một target có thể là `file:///...`, đường dẫn hệ thống cục bộ (`/Users/...`), custom scheme (`obsidian://...`), hoặc một chuỗi không an toàn. Không thể mặc định mọi chuỗi đều có thể dùng thẻ `<a href="..." target="_blank">` để mở thành công.
- **Trỏ mù (Blind linking)**: Khi người dùng bấm "Mở tài liệu" ở một tệp chỉ có đường dẫn cục bộ hoặc target không hỗ trợ, trình duyệt sẽ bị chặn bởi sandbox bảo mật hoặc không phản hồi, gây trải nghiệm tệ.
- **Thiếu phân loại đích mở theo năng lực môi trường thực thi (Execution Context Capabilities)**.

---

## 2. Target Classification & Resolver Contract

Hàm resolver chuẩn tắc: `resolveResourceOpenTarget(resource: Resource | null | undefined)`

### A. Định nghĩa phân loại đích mở (`ResourceTargetType`):
1. **`web_url`**:
   - Điều kiện: Bắt đầu bằng `http://` hoặc `https://`.
   - Năng lực: `canOpenDirectly = true`.
   - Hành vi UI: Mở tab mới với `target="_blank"` và `rel="noreferrer"`.
2. **`custom_scheme`**:
   - Điều kiện: Custom protocol hợp lệ (VD: `obsidian://...`, `notion://...`, `zotero://...`).
   - Năng lực: `canOpenDirectly = true`.
   - Hành vi UI: Kích hoạt ứng dụng ngoài tương ứng qua OS protocol handler.
3. **`local_path`**:
   - Điều kiện: Bắt đầu bằng `/`, `file://`, ổ đĩa `C:\`, `D:\`, hoặc đường dẫn tệp tương đối/tuyệt đối.
   - Năng lực: `canOpenDirectly = false` (do chính sách bảo mật Sandbox của trình duyệt chặn truy cập hệ thống tệp tùy ý).
   - Hành vi UI: **Không render link trực tiếp**. Cung cấp nút `"Sao chép đường dẫn"` và giải thích rõ để người dùng mở bằng ứng dụng trên máy.
4. **`unsupported_target`**:
   - Điều kiện: Chuỗi không thuộc các định dạng an toàn trên (hoặc scheme nguy hiểm như `javascript:`, `data:`).
   - Năng lực: `canOpenDirectly = false`.
   - Hành vi UI: Hiển thị cảnh báo đích mở không được hỗ trợ trong môi trường hiện tại.
5. **`none`**:
   - Điều kiện: Resource không có `openTarget`, không có `url`, và không có `filePath`.
   - Năng lực: `canOpenDirectly = false`.
   - Hành vi UI: Hiển thị trạng thái chưa thiết lập nguồn.

---

## 3. Thứ Tự Fallback & Độ Ưu Tiên (Resolution Hierarchy)

```
                       ┌─────────────────────────┐
                       │  Đầu vào: Resource      │
                       └────────────┬────────────┘
                                    │
                                    ▼
                 ┌──────────────────────────────────────┐
                 │ 1. Kiểm tra `resource.openTarget`?   │
                 └──────┬────────────────────────┬──────┘
                   CÓ   │                        │ KHÔNG
                        ▼                        ▼
           ┌────────────────────────┐  ┌─────────────────────────────────┐
           │ Phân loại openTarget:  │  │ 2. Kiểm tra `resource.url`?     │
           │ - http/https → web_url │  └──────┬───────────────────┬──────┘
           │ - scheme://  → scheme  │    CÓ   │                   │ KHÔNG
           │ - file/path  → local   │         ▼                   ▼
           │ - khác       → unsupp. │  ┌──────────────┐ ┌──────────────────────┐
           └────────────────────────┘  │ Phân loại url│ │ 3. Có `filePath`?    │
                                       │ (web/scheme/ │ └──────┬────────┬──────┘
                                       │  local/uns.) │   CÓ   │        │ KHÔNG
                                       └──────────────┘        ▼        ▼
                                                        ┌───────────┐ ┌────────┐
                                                        │local_path │ │  none  │
                                                        └───────────┘ └────────┘
```

### Bảng Kết Quả Chi Tiết:

| Trường hợp | Nguồn được chọn (`sourceField`) | Phân loại (`targetType`) | `canOpenDirectly` | Hành vi giao diện (UI Affordance) |
|---|---|---|---|---|
| Có `openTarget` là `https://drive.google.com/...` | `openTarget` | `web_url` | **`true`** | Nút *"Mở Tài Liệu Trực Tiếp"* (Tab mới) |
| Có `openTarget` là `obsidian://open?...` | `openTarget` | `custom_scheme` | **`true`** | Nút *"Mở Trong Ứng Dụng (Obsidian)"* |
| Có `openTarget` là `file:///Users/.../doc.pdf` | `openTarget` | `local_path` | **`false`** | Thông báo tệp cục bộ + Nút *"Sao chép đường dẫn"* |
| `openTarget` rỗng, có `url` là `https://suttacentral.net/...` | `url` (fallback) | `web_url` | **`true`** | Nút *"Mở Nguồn Tham Chiếu"* (Tab mới) |
| Không có `openTarget`/`url`, chỉ có `filePath` | `filePath` (fallback) | `local_path` | **`false`** | Thông báo tệp cục bộ + Nút *"Sao chép đường dẫn"* |
| `openTarget` là chuỗi không hợp lệ `javascript:...` | `openTarget` | `unsupported_target` | **`false`** | Cảnh báo đích mở không an toàn / không hỗ trợ |
| Không có bất kỳ trường nào | `none` | `none` | **`false`** | Thông báo chưa có nguồn |

---

## 4. Giao Diện & Trải Nghiệm Người Dùng (UI & UX)

### A. `ResourceViewerModal.tsx`:
- **Chỉ render nút mở trực tiếp** khi `resolver.canOpenDirectly === true`.
- **Nếu là `local_path`**: Hiển thị card tệp cục bộ với đường dẫn chuẩn hóa (`normalizeFilePath`), thông điệp giải thích vì sao trình duyệt không tự mở file hệ thống, kèm nút 1-click `Sao chép đường dẫn`.
- **Nếu là `unsupported_target`**: Hiển thị cảnh báo màu hổ phách/đỏ nêu rõ định dạng đích mở không thể thực thi an toàn.
- **Phân định rõ 3 dòng thông tin**:
  1. *Đích mở nội dung ưu tiên* (`openTarget` - nếu có).
  2. *Liên kết tham chiếu* (`url` - nếu có).
  3. *Đường dẫn tệp cục bộ* (`filePath` - nếu có).

### B. `ResourceFormModal.tsx`:
- Bổ sung trường `openTarget` với giải thích rõ: *"Đích mở ưu tiên khi bấm 'Mở tài liệu' (hỗ trợ link Web, Google Drive, Obsidian URL; để trống sẽ tự fallback sang Liên kết tham chiếu hoặc Tệp cục bộ)"*.
- Nhãn rõ ràng:
  - `url` $\rightarrow$ `"Liên kết tham chiếu (URL Web)"`
  - `filePath` $\rightarrow$ `"Đường dẫn tệp cục bộ (filePath)"`
  - `openTarget` $\rightarrow$ `"Đích mở nội dung (openTarget - tùy chọn)"`
- Giữ nguyên vẹn toàn bộ dữ liệu cũ khi sửa.

### C. `ResourcesManager.tsx` & `TopicDetail.tsx`:
- Nút icon external link trên các card tài liệu sử dụng chung resolver `resolveResourceOpenTarget(res)`.
- Nếu `canOpenDirectly` là `true`: Hiển thị icon mở link với `href` chính xác.
- Nếu `canOpenDirectly` là `false` (như tài liệu chỉ có local path): Ẩn nút link ngoài, người dùng mở viewer để sao chép đường dẫn an toàn.

---

## 5. Schema Validation & Data Integrity

- Bổ sung `openTarget: z.string().optional()` vào `ResourceSchema`, `ResourceCreateBaseSchema`, `ResourceUpdateSchema` trong `src/lib/validation.ts`.
- Validation rule: Tài liệu hợp lệ khi có ít nhất một trong: `url`, `filePath`, hoặc `openTarget`.
- Bảo toàn 100% snapshot export/import và checksum calculation.
