# ADR-2026-09-25: Vault Discovery và Markdown Image Context Wiring

- **Trạng thái**: Proposed
- **Ngày**: 2026-09-25
- **Phạm vi**: `server.ts`, `src/lib/vaultDiscovery.ts`, markdown renderer entry points, API tests liên quan
- **Loại quyết định**: Một chiều ở mức vừa phải (ảnh hưởng bootstrap server và contract đọc ảnh Markdown), cần review trước khi merge

## 1. Bối cảnh

Hệ thống đang có hai triệu chứng chức năng cần xử lý:

1. Danh sách Obsidian vault được nạp không đầy đủ vì phụ thuộc vào `OBSIDIAN_VAULTS_CONFIG` dạng JSON tĩnh, dẫn tới giới hạn thực tế theo số vault được khai báo trong `.env`.
2. Ảnh Markdown ở nhiều luồng đọc tài liệu bị fallback sai vì `MarkdownReadabilityRenderer` không luôn nhận đủ `docPath` và `sourceType`, làm sai ngữ cảnh resolve attachment URL.

Quan sát hiện tại cho thấy bootstrap server đã được nối thêm `discoverAndMergeVaultProfiles`, đồng thời nhiều entry point UI đã được sửa để truyền lại ngữ cảnh renderer thay vì để renderer tự suy đoán.[cite:2]

## 2. Vấn đề

Nếu tiếp tục phụ thuộc vào cấu hình vault tĩnh, server sẽ không phản ánh đúng trạng thái vault thật trên máy người dùng khi có vault mới hoặc vault chưa được khai báo vào biến môi trường.[cite:2] Nếu tiếp tục để renderer tự đoán nguồn tài liệu, các đường dẫn ảnh tương đối như `image.png`, `./image.png`, hoặc `assets/image.png` có thể bị resolve sang route sai và trả về HTTP 404.[conversation_history:1]

## 3. Quyết định

### 3.1 Vault discovery

Áp dụng cơ chế discovery hợp nhất nhiều nguồn thay vì chỉ đọc cấu hình tĩnh:

- Nguồn ưu tiên 1: `OBSIDIAN_VAULTS_CONFIG` nếu tồn tại và parse hợp lệ.
- Nguồn ưu tiên 2: system registry `obsidian.json`.
- Nguồn ưu tiên 3: quét các thư mục đồng cấp với `OBSIDIAN_VAULT_ROOT` để tìm vault hợp lệ.

Kết quả hợp nhất phải:

- Deduplicate theo đường dẫn chuẩn hóa và resolved path.
- Giữ được nhãn tùy chỉnh nếu đã có từ explicit config.
- Sinh `vaultId` duy nhất, ổn định và an toàn cho API exposure.

### 3.2 Markdown image context

Mọi entry point gọi `MarkdownReadabilityRenderer` phải truyền tường minh:

- `docPath`: đường dẫn nguồn thực tế của document đang đọc.
- `sourceType`: xác định rõ `vault` hoặc `docs`.

Renderer và URL resolver không được mặc định suy đoán source nếu call site đã biết rõ ngữ cảnh.

## 4. Lý do

Tách `vaultDiscovery.ts` thành module riêng giúp cô lập logic discovery khỏi bootstrap server, tăng khả năng unit test và giảm coupling ở `createServerApp`.[cite:2] Việc truyền tường minh `docPath` và `sourceType` đưa tri thức ngữ cảnh về đúng call site, đúng nguyên tắc “Shift Intelligence Left”: ràng buộc phải được thể hiện thành dữ liệu đầu vào rõ ràng thay vì suy luận runtime mơ hồ.[conversation_history:1]

## 5. Hệ quả

### Lợi ích

- Server phản ánh đầy đủ các vault hợp lệ đang tồn tại, không còn phụ thuộc tuyệt đối vào `.env`.[conversation_history:1]
- Markdown image rendering ổn định hơn cho cả nguồn `docs` và `vault`, đặc biệt với relative attachment paths.[conversation_history:1]
- Có seam rõ ràng để test discovery, route HTTP ảnh, và wiring ở mức component/integration.[cite:2]

### Chi phí và rủi ro

- Discovery lúc bootstrap tăng thêm I/O file system và độ phức tạp khởi tạo server.
- Nếu không giới hạn rõ tiêu chí “vault hợp lệ”, có thể quét nhầm thư mục tài liệu thông thường.
- Nếu path normalization hoặc dedup key thay đổi thiếu kiểm soát, có thể gây lệch `vaultId` hoặc xuất hiện duplicate profile.
- Các thay đổi hiện vẫn nằm trong working tree rộng hơn phạm vi ticket, nên rủi ro merge nhầm file ngoài scope còn tồn tại.[cite:2]

## 6. Phương án đã cân nhắc

### Option A — Giữ nguyên config tĩnh

- Ưu điểm: đơn giản, ít I/O, ít thay đổi bootstrap.
- Nhược điểm: không phản ánh trạng thái hệ thống thực, cần bảo trì thủ công, dễ tái phát lỗi thiếu vault.

### Option B — Chỉ đọc `obsidian.json`

- Ưu điểm: gần nguồn dữ liệu hệ thống hơn `.env`.
- Nhược điểm: vẫn không bao quát mọi trường hợp người dùng có vault hợp lệ nhưng registry không đủ hoặc khác môi trường.

### Option C — Merge explicit config + registry + sibling scan (**chọn**)

- Ưu điểm: bao phủ tốt nhất, vẫn giữ tương thích ngược với cấu hình explicit, giảm điểm lỗi đơn.
- Nhược điểm: phức tạp hơn, cần test kỹ dedup, precedence và bảo mật đường dẫn.

## 7. Quy tắc chấp nhận

Thay đổi này chỉ được xem là sẵn sàng merge khi đồng thời thỏa các điều kiện sau:

1. `GET /api/obsidian/vaults` trả đầy đủ các vault hợp lệ sau merge, không duplicate.
2. Relative Markdown image paths render đúng cho cả `docs` và `vault` source.
3. HTTP routes ảnh trả đúng status và `Content-Type` cho file nhị phân thật.
4. `npm run typecheck` xanh.
5. Targeted tests và regression tests xanh.
6. `git diff --check` sạch.
7. Diff cuối cùng chỉ chứa các file trong phạm vi ADR hoặc được giải trình riêng.

## 8. Gherkin tối thiểu

```gherkin
Feature: Vault discovery bootstrap
  Scenario: Merge vaults from explicit config, registry, and sibling scan
    Given server has explicit vault config and accessible system vault sources
    When the application bootstrap runs
    Then the vault list should include all valid vaults without duplicates

Feature: Markdown image resolution
  Scenario: Resolve relative image path for vault source
    Given a markdown document from vault source with a relative image path
    When the readability renderer renders the document
    Then the generated image URL should target the vault attachment endpoint

  Scenario: Resolve relative image path for docs source
    Given a markdown document from docs source with a relative image path
    When the readability renderer renders the document
    Then the generated image URL should target the docs raw endpoint
```

## 9. Follow-up bắt buộc trước merge

- Cô lập diff đúng scope của ADR.
- Review lại contract route docs/attachment nếu có sửa ngoài dự kiến.
- Chụp snapshot kết quả test cuối cùng sau khi làm sạch working tree.
- Chỉ chuyển trạng thái ADR từ `Proposed` sang `Accepted` khi checklist review cuối đạt đủ.
