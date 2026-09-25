# Nhật Ký Phiên Làm Việc: Phase 5.2 — Application Provider Routing & Feature-Flag Wiring

- **Thời gian thực hiện**: 2026-09-24
- **Trạng thái**: Hoàn tất (Completed)
- **Mục tiêu**: Thiết lập configuration boundary (`researchProviderConfig.ts`) và dependency composition boundary (`researchProviderComposition.ts`) cho Research Provider routing ở tầng application, bảo toàn hành vi legacy khi cờ tính năng mặc định là `false`.

---

## 1. Các Nội Dung Đã Triển Khai (What Was Implemented)

1. **Configuration Contract (`src/server/config/researchProviderConfig.ts`)**:
   - Định nghĩa kiểu `ResearchProviderConfig`.
   - Cung cấp `DEFAULT_RESEARCH_PROVIDER_CONFIG` an toàn (`enableProviderRouting: false`, `allowNotebookLM: false`, `defaultProviderId: "antigravity-legacy"`, `allowProviderFallback: true`, `enableMcpServer: false`).
   - Hàm `readResearchProviderConfig(env)` xử lý phân giải biến môi trường độc lập, không làm thay đổi `process.env`.
   - Hàm `isProviderAllowed(providerId, config)` kiểm tra phân quyền provider chính xác theo whitelist và cờ tính năng.
   - Không chứa bất kỳ trường bí mật (secret/token/key) nào trong cấu hình.

2. **Dependency Composition (`src/server/bootstrap/researchProviderComposition.ts`)**:
   - Định nghĩa kiểu `ResearchProviderComposition`.
   - Hàm thuần túy `composeResearchProviderDependencies({ config, deps })` không có hiệu ứng phụ (side-effect free).
   - Khi `enableProviderRouting === false`, trả về trạng thái vô hiệu hóa an toàn (`enabledProviderIds: []`, mọi dependencies trả về `null`).
   - Khi `defaultProviderId` không hợp lệ hoặc bị cấm, fail-safe vô hiệu hóa composition thay vì tự chọn ngẫu nhiên.
   - Không tự ý tạo network client hoặc đọc credentials ngầm.

3. **Kiểm Thử Test-First**:
   - `tests/unit/research-provider-config.test.ts`: 10/10 tests PASS.
   - `tests/unit/research-provider-composition.test.ts`: 12/12 tests PASS.

---

## 2. Các Thành Phần Giữ Nguyên Tuyệt Đối (What Was Intentionally Untouched)

- `server.ts` (Chưa gắn trực tiếp vào vòng đời server).
- `src/server/serverConfig.ts`.
- `src/server/routes/**`.
- `src/components/**`.
- `src/server/services/providers/**` và `src/server/services/storage/**`.
- `src/server/services/researchSessionService.ts`.
- `src/server/mcp/**`.
- `prisma/schema.prisma`.
- `package.json`.

---

## 3. Tuyên Bố Sẵn Sàng (Readiness Statement)

Tầng application configuration và composition boundary cho Research Provider đã sẵn sàng và được kiểm thử toàn diện mà không xâm lấn runtime server chính.
