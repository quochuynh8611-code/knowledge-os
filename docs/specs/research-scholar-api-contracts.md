# Research Scholar — API Contracts & Payload Specifications (v1)

> **Source of Truth Reference:**  
> - Validation Schemas: `src/lib/validation.ts`  
> - Server Routes: `src/server/routes/` (`categoryRoutes.ts`, `topicRoutes.ts`, `noteRoutes.ts`, `flashcardRoutes.ts`, `resourceRoutes.ts`)  
> - Base URL: `http://localhost:3000/api`

---

## 1. Summary of Allowed Endpoints

| Action ID | Method | Path | Applicable Zod Schema |
| :--- | :---: | :--- | :--- |
| `CREATE_CATEGORY` | `POST` | `/categories` | `CategoryCreateSchema` |
| `CREATE_TOPIC` | `POST` | `/topics` | `TopicCreateSchema` |
| `CREATE_NOTE` | `POST` | `/notes` | `NoteCreateSchema` |
| `CREATE_FLASHCARD` | `POST` | `/flashcards` | `FlashcardCreateSchema` |
| `CREATE_RESOURCE` | `POST` | `/resources` | `ResourceCreateSchema` |
| `DELETE_NOTE` | `DELETE`| `/notes/:id` | URL Param `:id` |
| `DELETE_FLASHCARD`| `DELETE`| `/flashcards/:id` | URL Param `:id` |

---

## 2. Detailed Contract Specifications

### 2.1 CREATE_CATEGORY (`POST /api/categories`)
- **Controller Route:** `src/server/routes/categoryRoutes.ts:23`
- **Schema:** `CategoryCreateSchema` (`src/lib/validation.ts:69`)
- **Fields:**
  - `name` (*string*, required, min: 1): Tên danh mục / lĩnh vực.
  - `slug` (*string*, required, min: 1): Định danh URL của danh mục (Bắt buộc; CategoryCreateSchema yêu cầu slug; POST /api/categories không có slug sẽ trả 400 với ZodIssue path `["slug"]`).
  - `type` (*string*, optional): Tự động gán bằng `slug` nếu bỏ trống.
  - `description` (*string*, optional, nullable): Mô tả lĩnh vực.
  - `icon` (*string*, optional, nullable): Tên icon Lucide (ví dụ: `"Brain"`, `"BookOpen"`, `"FlaskConical"`).
  - `color` (*string*, optional, nullable): Mã màu HEX (ví dụ: `"#3b82f6"`, `"#6366f1"`).
  - `order` (*number*, optional, default: 0): Thứ tự hiển thị.
  - `parentId` (*string*, optional, nullable): ID danh mục cha nếu có.
- **Success Response:** `201 Created` ➔ `Category` object JSON.
- **Error Responses:**
  - `400 Bad Request`: `{ error: ZodIssue[] }` khi validation thất bại (ví dụ: thiếu `slug` hoặc `name`).
  - `500 Internal Server Error`: `{ error: "Failed to create category" }`.
- **E2E Provenance:**
  - *Validated in E2E Controlled Write Trial on 2026-11-01; initial request without slug returned 400 Bad Request.*

**Payload Mẫu:**
```json
{
  "name": "Research Sandbox",
  "slug": "research-sandbox",
  "description": "Khu vực thử nghiệm an toàn cho Research Scholar MVP",
  "icon": "FlaskConical",
  "color": "#6366f1",
  "order": 999
}
```

---

### 2.2 CREATE_TOPIC (`POST /api/topics`)
- **Controller Route:** `src/server/routes/topicRoutes.ts:107`
- **Schema:** `TopicCreateSchema` (`src/lib/validation.ts:159`)
- **Fields:**
  - `title` (*string*, required, min: 1, max: 200): Tiêu đề chủ đề nghiên cứu.
  - `categoryId` (*string*, required, min: 1): ID của Category cha sở hữu chủ đề này.
  - `slug` (*string*, optional): Tự động sinh từ `title` nếu bỏ trống.
  - `type` (*string*, optional, default: `"general"`): Loại chủ đề.
  - `parentId` (*string*, optional, nullable): ID của topic cha (dùng khi tạo chủ đề con phân tầng).
  - `description` (*string*, optional, default: `""`): Mô tả tóm tắt mục tiêu học tập.
  - `content` (*string*, optional, default: `""`): Đề cương chi tiết hoặc ghi chú ban đầu.
  - `tags` (*string[]*, optional, default: `[]`): Mảng nhãn phân loại (ví dụ: `["deep-learning", "nlp"]`).
  - `visibility` (*"active" | "hidden"*, optional, default: `"active"`): Trạng thái hiển thị.
- **Success Response:** `201 Created` ➔ `Topic` object JSON.
- **Error Responses:**
  - `400 Bad Request`: `{ error: ZodIssue[] }` khi thiếu `title` hoặc `categoryId`.
  - `500 Internal Server Error`: `{ error: "Failed to create topic" }`.

**Payload Mẫu:**
```json
{
  "title": "Kiến Trúc Transformer & Attention Mechanism",
  "categoryId": "550e8400-e29b-41d4-a716-446655440000",
  "description": "Nghiên cứu cơ chế Self-Attention, Multi-Head Attention và kiến trúc Encoder-Decoder gốc",
  "tags": ["deep-learning", "transformer", "nlp"],
  "content": "## Mục tiêu nghiên cứu\n- Nắm vững ma trận Q, K, V.\n- Hiểu công thức Scaled Dot-Product Attention."
}
```

---

### 2.3 CREATE_NOTE (`POST /api/notes`)
- **Controller Route:** `src/server/routes/noteRoutes.ts:47`
- **Schema:** `NoteCreateSchema` (`src/lib/validation.ts:203`)
- **Refinement Rule:** Bắt buộc phải có `topicId` HOẶC `topicIds` (mảng ID không rỗng).
- **Fields:**
  - `title` (*string*, required, min: 1): Tiêu đề bài ghi chú.
  - `content` (*string*, required, min: 1): Nội dung Markdown (hỗ trợ KaTeX `$E = mc^2$` và Mermaid).
  - `topicId` (*string*, required/conditional): ID của chủ đề liên kết chính.
  - `topicIds` (*string[]*, optional): Danh sách các chủ đề phụ cùng liên kết (multi-topic).
  - `type` (*"study" | "insight" | "question" | "summary"*, optional, default: `"insight"`).
  - `isPrivate` (*boolean*, optional, default: `false`): Đánh dấu ghi chú riêng tư.
  - `tags` (*string[]*, optional, default: `[]`): Thẻ tag ghi chú.
  - `sourcePath` (*string*, optional, nullable): Đường dẫn tài liệu nguồn liên quan nếu có.
- **Success Response:** `201 Created` ➔ `Note` object JSON (kèm `topicIds`).
- **Error Responses:**
  - `400 Bad Request`: `{ error: ZodIssue[] }` khi nội dung rỗng hoặc không có `topicId`.
  - `500 Internal Server Error`: `{ error: "Failed to create note" }`.

**Payload Mẫu:**
```json
{
  "topicId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "title": "Bản chất toán học của Scaled Dot-Product Attention",
  "type": "insight",
  "tags": ["math", "transformer", "attention"],
  "content": "### 1. Công thức tính Attention\nCơ chế Self-Attention được tính toán theo công thức:\n$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$\n\n### 2. Luồng xử lý ma trận\n```mermaid\ngraph LR\n    Q[Query] & K[Key] --> MatMul[Matrix Multiply]\n    MatMul --> Scale[Scale 1/sqrt(dk)]\n    Scale --> Softmax[Softmax]\n    Softmax & V[Value] --> Output[Attention Output]\n```\n\n### 3. Nhận định cốt lõi\nViệc chia cho $\\sqrt{d_k}$ giúp ổn định gradient khi số chiều vector lớn, tránh hiện tượng softmax bị bão hòa."
}
```

---

### 2.4 CREATE_FLASHCARD (`POST /api/flashcards`)
- **Controller Route:** `src/server/routes/flashcardRoutes.ts:24` ➔ `flashcardController.ts:54`
- **Schema:** `FlashcardCreateSchema` (`src/lib/validation.ts:992`)
- **Fields:**
  - `topicId` (*string*, required, min: 1): ID của chủ đề liên kết.
  - `front` (*string*, required, min: 1): Nội dung mặt trước (Câu hỏi ôn tập).
  - `back` (*string*, required, min: 1): Nội dung mặt sau (Câu trả lời chi tiết).
  - `type` (*"basic" | "cloze"*, required): Loại thẻ ghi nhớ.
  - `noteId` (*string*, optional, nullable): ID ghi chú nguồn sinh ra thẻ này.
  - `resourceId` (*string*, optional, nullable): ID tài liệu tham chiếu nếu có.
  - `lifecycleStatus` (*"active" | "suspended" | "archived"*, optional, default: `"active"`).
  - `idempotencyKey` (*string*, optional, min: 1): Khóa chống trùng lặp thẻ khi tạo lại.
- **Success Response:** `201 Created` ➔ `Flashcard` object JSON (kèm `schedule` mặc định).
- **Error Responses:**
  - `400 Bad Request`: `{ error: "Dữ liệu tạo flashcard không hợp lệ", details: ZodIssue[] }`.
  - `500 Internal Server Error`: `{ error: "Failed to create flashcard" }`.

**Payload Mẫu:**
```json
{
  "topicId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "noteId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "type": "basic",
  "front": "Tại sao trong công thức Attention của Transformer lại cần chia cho yếu tố căn bậc hai của d_k?",
  "back": "Để ngăn tích vô hướng giữa Query và Key tăng quá lớn ở số chiều cao, tránh làm giá trị Softmax rơi vào vùng gradient cực nhỏ (bão hòa)."
}
```

---

### 2.5 CREATE_RESOURCE (`POST /api/resources`)
- **Controller Route:** `src/server/routes/resourceRoutes.ts:20`
- **Schema:** `ResourceCreateSchema` (`src/lib/validation.ts:266`)
- **Refinement Rule:** Bắt buộc phải có ít nhất một trong ba trường: `url`, `filePath`, hoặc `openTarget`.
- **Fields:**
  - `topicId` (*string*, required, min: 1): ID chủ đề liên kết.
  - `title` (*string*, required, min: 1): Tiêu đề tài liệu tham khảo.
  - `type` (*"book" | "article" | "video" | "audio" | "pdf" | "md"*, optional, default: `"book"`).
  - `author` (*string*, optional): Tên tác giả hoặc tổ chức.
  - `url` (*string*, optional): Liên kết bài báo, web, hoặc tài liệu trực tuyến.
  - `filePath` (*string*, optional): Đường dẫn tương đối/tuyệt đối tới file cục bộ.
  - `openTarget` (*string*, optional): Đích mở ứng dụng.
  - `notes` (*string*, optional): Ghi chú tóm lược về tài liệu.
- **Success Response:** `201 Created` ➔ `Resource` object JSON.
- **Error Responses:**
  - `400 Bad Request`: `{ error: ZodIssue[] }` khi thiếu cả 3 nguồn (url, filePath, openTarget).
  - `500 Internal Server Error`: `{ error: "Failed to create resource" }`.

**Payload Mẫu:**
```json
{
  "topicId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "title": "Attention Is All You Need",
  "type": "article",
  "author": "Ashish Vaswani et al. (Google Brain)",
  "url": "https://arxiv.org/abs/1706.03762",
  "notes": "Bài báo khoa học nền tảng giới thiệu kiến trúc Transformer năm 2017"
}
```

---

### 2.6 DELETE_NOTE (`DELETE /api/notes/:id`)
- **Controller Route:** `src/server/routes/noteRoutes.ts:167`
- **URL Parameter:** `:id` (*string*, required): ID của ghi chú cần xóa.
- **Cascade Behavior:**
  - Không cascade xóa Topic.
  - Quan hệ trong bảng liên kết `NoteTopicLink` được dọn dẹp an toàn qua transaction.
  - Trường `noteId` trong các Flashcards liên quan chuyển thành `null` (thẻ flashcard không bị xóa mất).
- **Success Response:** `200 OK` ➔ `{ "success": true, "id": "..." }`.
- **Error Responses:**
  - `500 Internal Server Error`: `{ error: "Failed to delete note" }`.

---

### 2.7 DELETE_FLASHCARD (`DELETE /api/flashcards/:id`)
- **Controller Route:** `src/server/routes/flashcardRoutes.ts:33` ➔ `flashcardController.ts:140`
- **URL Parameter:** `:id` (*string*, required): ID của thẻ ghi nhớ cần xóa.
- **Cascade Behavior:** Tự động dọn dẹp lịch ôn `FlashcardSchedule` và lịch sử `FlashcardReview` của thẻ đó.
- **Success Response:** `200 OK` ➔ `{ "success": true, "id": "..." }`.
- **Error Responses:**
  - `404 Not Found`: Khi ID thẻ không tồn tại.
  - `500 Internal Server Error`: `{ error: "Failed to delete flashcard" }`.
