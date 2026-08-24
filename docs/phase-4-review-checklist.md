# BẢNG KIỂM TRA CHẤT LƯỢNG VẬN HÀNH (PHASE 4 REVIEW CHECKLIST)
## Knowledge OS — Dashboard Nghiên Cứu Phật Học & Huyền Học

---

## 🎯 1. Danh Mục Tiêu Chuẩn Chất Lượng (Quality Gates)

| Nhóm Kiểm Tra | Tiêu Chí Bắt Buộc | Trạng Thái Kỹ Thuật | Ghi Chú & Bằng Chứng |
| :--- | :--- | :---: | :--- |
| **A. Security Boundary** | - Payload size guard chặn snapshot > 15MB<br>- Chặn prompt > 20.000 ký tự<br>- Rate limiting 10 req/min cho `/api/gemini/*`<br>- Rate limiting 5 req/min cho `/api/backup/restore` | 🟢 **100% VERIFIED** | Đã kiểm chứng qua 4 tests trong `phase-4-production-hardening.test.ts` |
| **B. Health & Latency** | - Phân loại đúng 3 ngưỡng: `<100ms` (healthy), `100-1000ms` (degraded), `>=1000ms` (unhealthy)<br>- Xử lý lỗi ngoại tuyến DB trả về `connected: false`<br>- Schema `DbHealthResponseSchema` hợp lệ 100% | 🟢 **100% VERIFIED** | Đã kiểm chứng qua 3 tests trong `phase-4-production-hardening.test.ts` & `checkDbHealth` |
| **C. Backup/Restore Integrity** | - SHA-256 Checksum khớp Bit-for-Bit giữa Node & Browser<br>- Chặn đứng phục hồi khi checksum lệch trước mọi mutation<br>- Chặn snapshot malformed không kích hoạt rehydration | 🟢 **100% VERIFIED** | Đã kiểm chứng qua 5 tests trong `phase2c-checksum-parity` + 2 tests trong Phase 4 |
| **D. AI Resilience & Cost** | - Bounded retry tối đa 2 lần/model khi gặp 503/429/overload<br>- Fast-fail ngay lập tức khi gặp 400/401/Invalid Arg (Không retry vô hạn)<br>- Ghi log model thực tế đã phục vụ phản hồi | 🟢 **100% VERIFIED** | Đã kiểm chứng qua 4 tests trong `phase-4-production-hardening.test.ts` |
| **E. Zero Binary Ingestion** | - Tài liệu đính kèm chỉ lưu `filePath` metadata (< 2KB)<br>- Không nhúng binary vào database, snapshot hay handoff | 🟢 **100% VERIFIED** | Đã khóa cứng từ Phase 1 và duy trì 100% đến nay |
| **F. Observability** | - Structured JSON logging cho startup, DB offline, restore fail, AI retry không lộ bí mật | 🟢 **100% VERIFIED** | Đã kiểm chứng qua helper `formatStructuredLog` & `logStructuredEvent` |

---

## 🛡️ 2. Quy Trình Kiểm Thử Độc Lập Hoàn Tất

1. [x] **Test-First Demonstration:** Chạy `tests/unit/phase-4-production-hardening.test.ts` ghi nhận failure evidence trước khi implement code.
2. [x] **Unit & Middleware Tests:** Kiểm tra Rate Limiter và Structured Logger (13/13 tests PASS).
3. [x] **Full Regression Pass:** Đạt 100% PASS trên toàn bộ 26 test files của repository (`npm test` -> 186/186 tests PASS).
4. [x] **TypeScript Strict Check:** `npm run lint` (`tsc --noEmit`) đạt 0 exit code, 0 error, 0 warning.
5. [x] **Production Bundle Build:** `npm run build` tạo bundle sạch trong thư mục `dist/`.
