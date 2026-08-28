# ADR-038: Bộ Quy Tắc Đánh Giá Sức Khỏe Hàng Đợi Đồng Bộ (Sync Health Rules & Alerting Read Model)

- **Mã ADR:** ADR-038
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi:** `src/lib/syncTelemetry.ts`, `src/hooks/useSyncQueue.ts`, `src/components/ui/SyncStatusBadge.tsx`

---

## 1. Bối Cảnh (Context)
Từ P2.9a và P2.9b, hệ thống đã có telemetry lưu vết và bảng debug metrics. Tuy nhiên, người vận hành cần một chỉ báo sức khỏe tổng thể trực quan (Health Status) tự động phân loại tình trạng đồng bộ để phát hiện sớm các vấn đề nghiêm trọng như nghẽn hàng đợi hoặc mạng chập chờn kéo dài.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **4 Mức Phân Loại Tất Định (4 Health Status Tiers)**:
   - **`healthy`**: Hệ thống vận hành trơn tru (0 lỗi đang chờ, tỉ lệ thành công $\ge 90\%$).
   - **`degraded`**: Gián đoạn nhẹ (1 đến 4 lỗi đang chờ hoặc tỉ lệ thành công từ $50\%$ đến $89\%$).
   - **`critical`**: Lỗi nghiêm trọng ($\ge 5$ lỗi đang chờ, hoặc tỉ lệ thành công $< 50\%$, hoặc có mutation bị thử lại $\ge 5$ lần).
   - **`unknown`**: Chưa có dữ liệu phát sinh (hàng đợi rỗng và 0 sự kiện telemetry).
2. **Cơ Chế Tính Điểm Thuần Túy (Pure Functional Evaluation)**:
   - Hàm `evaluateSyncHealth(queue, telemetryStats, telemetryEvents)` là pure function, tính toán điểm sức khỏe (`score: 0 - 100`) và danh sách lý do (`reasons: string[]`) dựa trên snapshot hiện tại.
3. **Hiển Thị Tinh Gọn & Không Gây Ồn (Non-Intrusive Health Card)**:
   - Đặt một Health Status Card nhỏ gọn ở đầu tab Telemetry trong Popover `SyncStatusBadge`.
   - Sử dụng màu sắc tiêu chuẩn (`emerald`, `amber`, `rose`, `stone`) và icon tương ứng.
4. **Tránh Báo Động Giả (False Positive Mitigation)**:
   - Không áp dụng quy tắc tỉ lệ thành công khi số lượt thử $< 3$ để tránh việc 1 lỗi đầu tiên làm sụt giảm ngay lập tức xuống mức Critical.

---

## 3. Đánh Giá Trade-offs (Two-Way Door)

- **Ưu điểm**:
  - Tự động hóa việc phân tích sức khỏe hàng đợi, cung cấp lý do giải thích rõ ràng (`reasons`).
  - Đảm bảo tính minh bạch, dễ viết unit test vì là hàm thuần túy 100%.
- **Rủi ro kiểm soát**:
  - Không tạo sticky alert giả mạo: khi mutation lỗi được replay thành công hoặc bị discard, hệ thống tự động hồi phục về trạng thái `healthy`.
