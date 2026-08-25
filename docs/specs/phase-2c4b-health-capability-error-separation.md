# 📋 ĐẶC TẢ KỸ THUẬT: POST-PHASE 2C.4 HARDENING MICRO-INCREMENT
## Tách Biệt Capability Error và Connectivity/Runtime Error trong ExportImportModal

> **Trạng thái:** 🟢 **VERIFIED & IMPLEMENTED (100% GREEN)**  
> **Tài liệu liên quan:** [`docs/specs/phase-2c4-data-management-modal.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/phase-2c4-data-management-modal.md) · [`docs/architecture-decisions.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/architecture-decisions.md) (ADR-009)  
> **Mục tiêu:** Phân định rành mạch giữa (1) Kho lưu trữ ngoại tuyến không có năng lực Disaster Recovery vs (2) Lỗi mất kết nối mạng / lỗi runtime khi gọi API máy chủ.
> **Kiểm chứng:** 11/11 tests PASS trong `tests/unit/phase2c-data-management-modal-component.test.tsx`.

---

## 🎯 1. BỐI CẢNH & VẤN ĐỀ CẦN GIẢI QUYẾT

Hiện tại trong `ExportImportModal.tsx`, khi gọi `repo.getDbHealth()`:
```typescript
repo.getDbHealth()
  .then(health => { setDbHealth(health); setIsOfflineRepo(false); })
  .catch(err => { setDbHealth(null); setIsOfflineRepo(true); });
```
Đoạn code trên đang gộp chung mọi lỗi (cả khi server bị sập, mất mạng hay API lỗi 500) thành `isOfflineRepo = true` và hiển thị thông báo: *"Chế độ ngoại tuyến (Offline): Các tác vụ phục hồi máy chủ chỉ hỗ trợ khi có kết nối máy chủ hoạt động."*

Điều này gây mơ hồ về mặt ngữ nghĩa (Semantics Ambiguity):
- **Trường hợp A (Capability Error):** Ứng dụng đang chạy với `LocalStorageDataRepository` thuần túy (không hỗ trợ Disaster Recovery và ném ra lỗi `UNSUPPORTED_OFFLINE_OPERATION`). Đây là giới hạn năng lực thiết kế (Design Capability).
- **Trường hợp B (Connectivity/Runtime Error):** Ứng dụng chạy với `ApiDataRepository` nhưng server PostgreSQL bị mất mạng, sập nguồn hoặc ném lỗi kết nối. Đây là lỗi vận hành/kết nối mạng (Runtime Connectivity Issue).

---

## 🛡️ 2. PHÂN ĐỊNH TRẠNG THÁI RÕ RÀNG (ERROR TAXONOMY)

| Loại Lỗi | Điều Kiện Kích Hoạt | Trạng Thái UI | Thông Điệp Hiển Thị |
| :--- | :--- | :--- | :--- |
| **Capability Error (Offline Repository)** | `err.message` chứa `UNSUPPORTED_OFFLINE_OPERATION` | `isOfflineCapability = true`, ẩn health badge | ⚠️ *"Kho lưu trữ cục bộ (LocalStorage): Tính năng sao lưu máy chủ & kiểm tra trạng thái không được hỗ trợ ở chế độ offline."* |
| **Connectivity Error (Server Unreachable)** | Lỗi mạng, HTTP 500, timeout, connection refused | `isOfflineCapability = false`, hiển thị health badge `unhealthy` | 🔴 Health Badge: *"PostgreSQL Mất Kết Nối"* kèm cảnh báo *"Không thể kết nối tới cơ sở dữ liệu máy chủ. Vui lòng kiểm tra đường truyền mạng."* |
| **Healthy Status** | `health.status === 'healthy'` | Badge xanh | 🟢 *"PostgreSQL Đang Kết Nối ({latencyMs}ms)"* |
| **Degraded Status** | `health.status === 'degraded'` | Badge vàng | 🟡 *"PostgreSQL Độ Trễ Cao ({latencyMs}ms)"* |

---

## 🔒 3. INVARIANTS & SCOPE CONSTRAINTS

1. **Zero Backend Changes:** Giữ nguyên 100% hợp đồng backend `/api/health/db` và `/api/backup/*`.
2. **Zero DataContext Changes:** Không thay đổi interface `DataContext`.
3. **Zero New Dependencies:** Không thêm thư viện ngoài.
4. **Backward Compatibility:** Không làm thay đổi hành vi xuất JSON cục bộ hay Markdown report đã có.
5. **Exact Separation Contract:** Chỉ bật `isOfflineCapability` khi lỗi chứa định danh `UNSUPPORTED_OFFLINE_OPERATION`.
