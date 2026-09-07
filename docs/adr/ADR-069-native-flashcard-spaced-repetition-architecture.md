# ADR-069: Native Flashcard & Spaced-Repetition Subsystem Architecture

- **Status**: Approved (Phase F1A Architecture Baseline — Option A Event-ID & Idempotent API Locked)
- **Date**: 2026-09-06
- **Authors**: Knowledge OS Architecture & Core Team
- **Deciders**: Lead Architect, Product Owner, Engineering Team
- **Consulted**: `DataContext`, `StudyProgress`, `spaced-repetition.ts`, `syncRoutes.ts`, `types/index.ts`
- **Informed**: All Knowledge OS Modules

---

## 1. Context & Architectural Objective

Knowledge OS hiện theo dõi việc học tập ở cấp độ vĩ mô qua `Topic.studyProgress` (`status`, `progress`, `timeSpent`, `lastStudied`, `nextReview`).

Mục tiêu dài hạn của hệ thống Flashcard bản địa là hoàn thiện chu trình:
```text
Knowledge OS content
→ Flashcards linked to Topic / Note / Resource
→ Native review sessions
→ Spaced repetition scheduling
→ Progress dashboard
→ Optional AnkiConnect one-way export later
```

Để đáp ứng chu trình trên một cách an toàn và bền vững, kiến trúc thiết lập 3 trụ cột kỹ thuật:
1. **Phân tách Trạng thái Triệt để (State Separation)**: Tách biệt nội dung thẻ (`Flashcard`), trạng thái lặp lại ngắt quãng (`FlashcardSchedule`), và lịch sử sự kiện ôn tập (`FlashcardReview`).
2. **Chiến lược Định danh Option A & Phản hồi Lũy đẳng Nhất quán (Option A Idempotent API Semantics)**: Khóa chính máy chủ `id` kết hợp với khóa định danh duy nhất do client sinh `clientEventId` (`@unique`) trên thực thể `FlashcardReview`. Phản hồi API luôn trả về HTTP 200 nhất quán kèm cờ `duplicate: boolean` theo chuẩn Knowledge OS (`SyncSession`).
3. **Phạm vi MVP Tinh gọn & Chuẩn Thuật ngữ (Strict MVP Scope & Terminology)**: Liên kết trực tiếp vào nội dung Knowledge OS (`Topic`, `Note`, `Resource`) với 2 loại thẻ cơ bản (`basic`, `cloze`).

---

## 2. Architectural Decisions

### 2.1 State Separation Architecture
Kiến trúc phân tách rành mạch 3 lớp dữ liệu:
- **`Flashcard` (Nội dung & Định danh)**: Lưu trữ nội dung câu hỏi/câu trả lời (`front`, `back`), phân loại (`type: 'basic' | 'cloze'`), và liên kết trực tiếp tới nội dung tri thức (`topicId` bắt buộc, `noteId` tùy chọn, `resourceId` tùy chọn).
- **`FlashcardSchedule` (Trạng thái Ôn tập 1:1)**: Lưu trữ trạng thái tiến trình SRS của thẻ (`state`, `due`, `interval`, `easeFactor`, `repetitions`, `lapses`, `lastReviewed`).
- **`FlashcardReview` (Sự kiện Ôn tập Bất biến 1:N)**: Lưu vết từng sự kiện chấm điểm với khóa định danh máy chủ `id` và khóa lũy đẳng do client sinh `clientEventId`.

### 2.2 Option A Event-ID & Consistent Idempotent API Semantics
Áp dụng mẫu hình chuẩn của `SyncSession` (`id` + `clientSyncId @unique`) trong `prisma/schema.prisma` và `syncRoutes.ts`:

- **Định danh Hai Lớp (Two-Tier Identification)**:
  - `FlashcardReview.id`: Khóa chính cơ sở dữ liệu (UUID do máy chủ sinh).
  - `FlashcardReview.clientEventId`: Khóa lũy đẳng bắt buộc do client sinh (UUIDv4) ngay khi người dùng chọn mức đánh giá.
  - Trường `clientEventId` được bảo vệ bằng **ràng buộc duy nhất (Unique Constraint / Unique Index)** trong cơ sở dữ liệu.

- **Ngữ nghĩa Phản hồi Lũy đẳng Nhất quán (Consistent Duplicate Response Semantics)**:
  Cả trường hợp bản ghi mới và bản ghi trùng lặp đều trả về cấu trúc phản hồi `FlashcardReviewResponse` đồng nhất với mã trạng thái **HTTP 200**:
  
  1. Kiểm tra sự tồn tại của `FlashcardReview` theo `clientEventId`:
     ```typescript
     const existingReview = await prisma.flashcardReview.findUnique({
       where: { clientEventId: payload.clientEventId },
       include: { card: { include: { schedule: true } } },
     });
     ```
  2. **Nếu đã tồn tại (`existingReview`)**: Server lập tức phản hồi HTTP 200 (Duplicate Fast Return), không thực hiện lại giao dịch cập nhật:
     ```json
     {
       "success": true,
       "duplicate": true,
       "clientEventId": "evt-uuid-123",
       "review": existingReview,
       "schedule": existingReview.card.schedule
     }
     ```
  3. **Nếu chưa tồn tại**: Server thực thi giao dịch nguyên tử (Atomic Transaction):
     - Chèn bản ghi `FlashcardReview` mới với `clientEventId`.
     - Cập nhật `FlashcardSchedule` tương ứng theo kết quả tính toán SM-2.
     - Phản hồi HTTP 200 với cùng cấu trúc chuẩn:
     ```json
     {
       "success": true,
       "duplicate": false,
       "clientEventId": "evt-uuid-123",
       "review": newReview,
       "schedule": updatedSchedule
     }
     ```

- **Miễn nhiễm hoàn toàn trước Delayed Retry**:
  - Kịch bản: Sự kiện A (`clientEventId = A`) $\rightarrow$ Sự kiện B (`clientEventId = B`) $\rightarrow$ Sự kiện A bị mạng phát lại trễ sau sự kiện B.
  - Cơ chế bảo vệ: Khi Sự kiện A gửi lại trễ, bước 1 tìm thấy `clientEventId = A` đã tồn tại vĩnh viễn trong bảng `FlashcardReview`. Server trả về ngay HTTP 200 `{ duplicate: true }` mà không chạy giao dịch, bảo toàn tuyệt đối trạng thái của thẻ sau Sự kiện B.

### 2.3 Direct Content Linking & Minimal Card Types
- **Liên kết Nội dung**: Gắn kết trực tiếp với `Topic` (bắt buộc), `Note` (tùy chọn), hoặc `Resource` (tùy chọn).
- **Loại Thẻ**:
  - `basic`: Thẻ hai mặt (Mặt trước / Mặt sau).
  - `cloze`: Thẻ điền vào chỗ trống (`{{c1::từ khóa}}`).

### 2.4 Scheduling Engine & Rating Scale
Hàm tính toán thuần túy `calculateFlashcardNextReview` xử lý lịch ôn độc lập với 4 trạng thái (`new`, `learning`, `review`, `relearning`) và 4 mức đánh giá:
- `Again` (1): Chưa nhớ $\rightarrow$ chuyển `relearning`, reset interval về 1 ngày, tăng `lapses`.
- `Hard` (2): Khó nhớ $\rightarrow$ tăng interval thận trọng ($I \times 1.2$), giảm Ease Factor.
- `Good` (3): Nhớ đúng $\rightarrow$ tăng interval chuẩn ($I \times EF$).
- `Easy` (4): Nhớ tốt $\rightarrow$ tăng interval nhanh với hệ số thưởng ($I \times EF \times 1.3$).

### 2.5 Native Review Sessions & In-Memory Dashboard
- Phiên ôn tập trực tiếp trên trình duyệt, tạo bản ghi `FlashcardReview` kèm `clientEventId` và áp dụng lũy đẳng vào cơ sở dữ liệu.
- Dashboard tổng hợp các chỉ số ôn tập thời gian thực qua các hàm phái sinh thuần túy trong bộ nhớ từ dữ liệu `Flashcard` và `FlashcardSchedule`.

### 2.6 Decoupled One-Way Export Boundary
- Chức năng xuất khẩu một chiều sang Anki / AnkiConnect được duy trì ở ranh giới trừu tượng (pure transformation), không có phụ thuộc thời gian chạy vào phần mềm Anki.

---

## 3. Data Contracts (TypeScript & Database Model)

### 3.1 TypeScript Contracts

```typescript
export type FlashcardType = 'basic' | 'cloze';

export type FlashcardState = 'new' | 'learning' | 'review' | 'relearning';

export type ReviewRating = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy

/**
 * Dynamic Spaced Repetition Schedule State (1:1 with Flashcard)
 */
export interface FlashcardSchedule {
  id: string;
  cardId: string;
  state: FlashcardState;
  due: string;            // ISO Date string
  interval: number;       // in days
  easeFactor: number;     // default 2.5, min 1.3, max 3.5
  repetitions: number;    // consecutive successful reviews
  lapses: number;         // number of times forgotten
  lastReviewed?: string;  // ISO Date string
  updatedAt: string;
}

/**
 * Static/Content Flashcard Entity
 */
export interface Flashcard {
  id: string;
  topicId: string;        // Primary anchor (required)
  noteId?: string;        // Optional source note reference
  resourceId?: string;    // Optional source resource reference
  type: FlashcardType;
  front: string;          // Question / Prompt
  back: string;           // Answer / Explanation
  schedule?: FlashcardSchedule; // Associated schedule state
  isSuspended?: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Immutable Review Telemetry Event with Client-Generated Idempotency Key (Option A)
 */
export interface FlashcardReview {
  id: string;             // Server-generated Primary Key (UUID)
  clientEventId: string;  // Client-generated Idempotency Key (UUID) - Enforced UNIQUE in DB
  cardId: string;
  topicId: string;
  rating: ReviewRating;
  reviewDurationMs: number;
  reviewedAt: string;     // ISO Date string
  stateBefore: FlashcardState;
  stateAfter: FlashcardState;
  intervalBefore: number;
  intervalAfter: number;
  easeFactorBefore: number;
  easeFactorAfter: number;
  dueBefore: string;
  dueAfter: string;
}

/**
 * Standard API Response for Review Mutations (Consistent Idempotent Semantics)
 */
export interface FlashcardReviewResponse {
  success: boolean;
  duplicate: boolean;     // true if request was an idempotent duplicate
  clientEventId: string;
  review: FlashcardReview;
  schedule: FlashcardSchedule;
}
```

### 3.2 Conceptual Prisma Schema (Option A Additive Design)

```prisma
model Flashcard {
  id          String             @id @default(uuid())
  topicId     String
  noteId      String?
  resourceId  String?
  type        String             @default("basic") // 'basic' | 'cloze'
  front       String
  back        String
  isSuspended Boolean            @default(false)
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt
  schedule    FlashcardSchedule?
  reviews     FlashcardReview[]
}

model FlashcardSchedule {
  id          String    @id @default(uuid())
  cardId      String    @unique
  card        Flashcard @relation(fields: [cardId], references: [id], onDelete: Cascade)
  state       String    @default("new") // 'new' | 'learning' | 'review' | 'relearning'
  due         DateTime  @default(now())
  interval    Int       @default(0)
  easeFactor  Float     @default(2.5)
  repetitions Int       @default(0)
  lapses      Int       @default(0)
  lastReviewed DateTime?
  updatedAt   DateTime  @updatedAt
}

model FlashcardReview {
  id               String    @id @default(uuid()) // Server-generated PK
  clientEventId    String    @unique             // Option A: Client-generated Idempotency Key
  cardId           String
  card             Flashcard @relation(fields: [cardId], references: [id], onDelete: Cascade)
  topicId          String
  rating           Int       // 1-4
  reviewDurationMs Int       @default(0)
  reviewedAt       DateTime  @default(now())
  stateBefore      String
  stateAfter       String
  intervalBefore   Int
  intervalAfter    Int
  easeFactorBefore Float
  easeFactorAfter  Float
  dueBefore        DateTime
  dueAfter         DateTime
}
```

---

## 4. Phased Implementation Roadmap

- **Phase F1B**: Khai báo Types, Zod Schemas cho `Flashcard`, `FlashcardSchedule`, `FlashcardReview`, và `FlashcardReviewResponse`.
- **Phase F2**: Thuật toán lặp lại ngắt quãng thuần túy (`flashcardScheduler.ts`) và bộ phân tích cú pháp cloze (`clozeParser.ts`).
- **Phase F3**: Quản lý thẻ liên kết Topic/Note/Resource và bộ lọc hàng đợi ôn tập.
- **Phase F4**: Giao diện phiên ôn tập bản địa với cơ chế ghi nhận `FlashcardReview` lũy đẳng qua Option A `clientEventId` và HTTP 200 duplicate fast return.
- **Phase F5**: Bảng điều khiển tiến độ ôn tập (selectors trong bộ nhớ) và ranh giới xuất khẩu một chiều.
