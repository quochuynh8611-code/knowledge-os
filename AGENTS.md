# Antigravity & Agent Rules — Knowledge OS

## ⚠️ QUY TẮC CỐT LÕI BẤT BIẾN (STRICT ARCHITECTURAL INVARIANTS)

### 1. Zero-Default Universal Baseline (Cấm Tùy Tiện Thêm Lĩnh Vực Nghiên Cứu)
- **QUY TẮC**: Khi nâng cấp, refactor, tạo phase mới hoặc sửa lỗi, **TUYỆT ĐỐI KHÔNG TÙY TIỆN THÊM BẤT KỲ LĨNH VỰC NGHIÊN CỨU (CATEGORIES) HOẶC CHỦ ĐỀ (TOPICS) MẶC ĐỊNH NÀO VÀO HỆ THỐNG**.
- Dữ liệu khởi tạo `INITIAL_CATEGORIES`, `INITIAL_TOPICS`, `INITIAL_NOTES`, `INITIAL_RESOURCES`, `INITIAL_TAGS` trong `src/data/initialData.ts` PHẢI LUÔN LÀ MẢNG RỖNG `[]`.
- Không gian làm việc ban đầu của người dùng thương mại phải là **Zero-Default Clean Slate** (0 bản ghi). Người dùng tự quyết định tạo lĩnh vực học tập đầu tiên của riêng mình.
- CẤM hardcode tên các lĩnh vực chuyên biệt cũ (như "Phật Học", "Huyền Học", "Đông Y", "Khoa Học Tự Nhiên", "Khoa Học Xã Hội", "Kinh Tế", "Kinh Tế & Tài Chính", "Phần Mềm", v.v.) vào các component UI, dropdown, selectors hoặc placeholder.
- Tham chiếu: [`docs/adr/ADR-076-commercial-domain-neutralization.md`](docs/adr/ADR-076-commercial-domain-neutralization.md) và [`docs/session-logs/2026-10-17-hermetic-test-guard-and-zero-default-rule.md`](docs/session-logs/2026-10-17-hermetic-test-guard-and-zero-default-rule.md).

### 2. Test Hermeticity (Tính Cô Lập Của Bộ Kiểm Thử)
- Tất cả unit tests và integration tests PHẢI DUY TRÌ TÍNH CÔ LẬP TUYỆT ĐỐI (Hermetic).
- CẤM mọi hành vi gọi live HTTP mutation ra server phát triển (`localhost:3000`) trong quá trình chạy test.
- Chốt chặn `process.env.VITEST` trong `src/services/dataRepository.ts` (`ApiDataRepository.getUrl`) và `src/services/syncQueue.ts` (`SyncQueueService.executeMutation`) là bất khả xâm phạm.

### 3. Quy Chuẩn Đóng Phase & Release Hygiene
- Luôn kiểm tra quality gates trước khi đóng phase:
  1. Targeted tests PASS 100%.
  2. Related regression suites PASS 100%.
  3. `npx tsc --noEmit` PASS 0 lỗi.
  4. Git hygiene: Không `git add .`, không tự ý commit/push nếu chưa có phê duyệt từ Human.
