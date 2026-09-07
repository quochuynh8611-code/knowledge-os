# Technical Specification: Native Flashcard & Spaced-Repetition Subsystem (Phase F1A Baseline)

## 1. Executive Summary & Scope

Hệ thống **Flashcard & Spaced Repetition Subsystem** bổ sung tầng kiểm tra chủ động (Active Recall) nguyên tử vào Knowledge OS:
```text
Knowledge OS content
→ Flashcards linked to Topic / Note / Resource
→ Native review sessions
→ Spaced repetition scheduling
→ Progress dashboard
→ Optional AnkiConnect one-way export later
```

Kiến trúc tuân thủ nghiêm ngặt 3 nguyên tắc:
1. **Phân tách Trạng thái (State Separation)**: Tách biệt `Flashcard` (nội dung, liên kết), `FlashcardSchedule` (trạng thái SRS biến đổi 1:1), và `FlashcardReview` (lịch sử sự kiện bất biến 1:N).
2. **Option A Database-Level Idempotency & Fast Return**: Khóa chính máy chủ `id` kết hợp với khóa định danh duy nhất do client sinh `clientEventId` (`@unique`) trên `FlashcardReview`, kết hợp phản hồi HTTP 200 fast return `{ success: true, duplicate: true, clientEventId, ... }` chuẩn theo mô hình `POST /api/sync/hydrate`.
3. **Phạm vi MVP Tinh gọn**: Liên kết trực tiếp `topicId`, `noteId`, `resourceId`, 2 loại thẻ `basic` và `cloze`, các hàm phân tích dashboard thuần túy trong bộ nhớ.

---

## 2. Core Entities & Interface Contracts

```typescript
export type FlashcardType = 'basic' | 'cloze';

export type FlashcardState = 'new' | 'learning' | 'review' | 'relearning';

export type ReviewRating = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy

/**
 * Isolated Spaced Repetition Schedule State (1:1 with Flashcard)
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
 * Core Flashcard Entity (Content & Topic/Note/Resource Anchor)
 */
export interface Flashcard {
  id: string;
  topicId: string;        // Primary anchor (required)
  noteId?: string;        // Optional source note reference
  resourceId?: string;    // Optional source resource reference
  type: FlashcardType;
  front: string;          // Question or prompt
  back: string;           // Answer or explanation
  schedule?: FlashcardSchedule; // Associated schedule state
  isSuspended?: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Immutable Review Telemetry Event with Client-Generated Unique Key (Option A)
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
 * Standard API Response for Review Mutations (Option A Idempotent Semantics)
 */
export interface FlashcardReviewResponse {
  success: boolean;
  duplicate: boolean;     // true if request was an idempotent duplicate
  clientEventId: string;
  review: FlashcardReview;
  schedule: FlashcardSchedule;
}
```

---

## 3. Option A Database-Level Idempotency & Duplicate Response Semantics

### 3.1 Giao dịch Ôn tập & Cơ chế Phản hồi Nhanh (Fast Return Pattern)

Tương tự hợp đồng `POST /api/sync/hydrate` trong `syncRoutes.ts`:

```typescript
// 1. Kiểm tra sự kiện ôn tập đã tồn tại trước đó qua clientEventId
const existingReview = await prisma.flashcardReview.findUnique({
  where: { clientEventId: payload.clientEventId },
  include: { card: { include: { schedule: true } } },
});

// 2. Nếu đã tồn tại -> Phản hồi nhanh HTTP 200 (Duplicate Fast Return)
if (existingReview) {
  return res.status(200).json({
    success: true,
    duplicate: true,
    clientEventId: existingReview.clientEventId,
    review: existingReview,
    schedule: existingReview.card.schedule,
  });
}

// 3. Nếu chưa tồn tại -> Thực thi trong giao dịch ACID
const result = await prisma.$transaction(async (tx) => {
  const newReview = await tx.flashcardReview.create({
    data: {
      clientEventId: payload.clientEventId, // Client-generated UUID
      cardId: payload.cardId,
      topicId: payload.topicId,
      rating: payload.rating,
      reviewDurationMs: payload.reviewDurationMs,
      reviewedAt: new Date(payload.reviewedAt),
      stateBefore: payload.stateBefore,
      stateAfter: payload.stateAfter,
      intervalBefore: payload.intervalBefore,
      intervalAfter: payload.intervalAfter,
      easeFactorBefore: payload.easeFactorBefore,
      easeFactorAfter: payload.easeFactorAfter,
      dueBefore: new Date(payload.dueBefore),
      dueAfter: new Date(payload.dueAfter),
    },
  });

  const updatedSchedule = await tx.flashcardSchedule.upsert({
    where: { cardId: payload.cardId },
    create: {
      cardId: payload.cardId,
      state: payload.stateAfter,
      interval: payload.intervalAfter,
      easeFactor: payload.easeFactorAfter,
      due: new Date(payload.dueAfter),
      repetitions: payload.newRepetitions,
      lapses: payload.newLapses,
      lastReviewed: new Date(payload.reviewedAt),
    },
    update: {
      state: payload.stateAfter,
      interval: payload.intervalAfter,
      easeFactor: payload.easeFactorAfter,
      due: new Date(payload.dueAfter),
      repetitions: payload.newRepetitions,
      lapses: payload.newLapses,
      lastReviewed: new Date(payload.reviewedAt),
    },
  });

  return { review: newReview, schedule: updatedSchedule };
});

return res.status(200).json({
  success: true,
  duplicate: false,
  clientEventId: result.review.clientEventId,
  review: result.review,
  schedule: result.schedule,
});
```

### 3.2 Khắc phục triệt để Kịch bản Delayed Retry
- **Kịch bản**: Sự kiện A (`clientEventId = A`) được xử lý $\rightarrow$ Sự kiện B (`clientEventId = B`) được xử lý $\rightarrow$ Sự kiện A bị mạng gửi lại trễ sau sự kiện B.
- **Kết quả bảo vệ**: Bước 1 tìm thấy `existingReview` với `clientEventId = A`. Server trả về ngay HTTP 200 `{ duplicate: true }` và dữ liệu hiện tại mà không thực hiện `$transaction`, bảo vệ tuyệt đối trạng thái của thẻ sau sự kiện B.

---

## 4. Pure Logic Signatures (`src/lib/flashcardScheduler.ts`)

### 4.1. Deterministic Review Calculation

```typescript
export interface CalculateNextReviewInput {
  currentSchedule: FlashcardSchedule;
  rating: ReviewRating;
  referenceDate?: Date;
}

export interface NextReviewCalculationResult {
  nextSchedule: Omit<FlashcardSchedule, 'id' | 'cardId' | 'updatedAt'>;
  reviewPayload: Omit<FlashcardReview, 'id'>;
}

/**
 * Pure function: Computes the target FlashcardSchedule and review event payload
 * given the current schedule and rating.
 */
export function calculateFlashcardNextReview(
  input: CalculateNextReviewInput
): NextReviewCalculationResult;
```

### 4.2. Due Queue Filtering

```typescript
export interface FlashcardQueueFilters {
  topicId?: string;
}

/**
 * Pure selector: Returns cards due on or before `now` (excluding suspended cards),
 * sorted by due date ascending.
 */
export function getDueFlashcards(
  cards: Flashcard[],
  filters?: FlashcardQueueFilters,
  now?: Date
): Flashcard[];
```

### 4.3. Cloze Parser (`src/lib/clozeParser.ts`)

```typescript
export interface ClozeItem {
  index: number;
  answer: string;
  prompt: string;
}

/**
 * Parses markdown text containing {{c1::answer}} cloze deletions.
 */
export function parseClozeDeletions(rawText: string): ClozeItem[];
```

---

## 5. Architectural Boundaries

1. **Content Linking**: Thẻ nhớ gắn kết trực tiếp với `Topic` (bắt buộc), `Note` (tùy chọn), hoặc `Resource` (tùy chọn).
2. **State Separation**: Nội dung thẻ (`Flashcard`) và trạng thái lặp lại ngắt quãng (`FlashcardSchedule`) phân tách thành 2 cấu trúc rõ ràng.
3. **Option A Database-Level Idempotency & Fast Return**: Khóa duy nhất `FlashcardReview.clientEventId` kết hợp phản hồi HTTP 200 `{ duplicate: true, clientEventId }` bảo vệ an toàn trước mọi trường hợp retry muộn.
4. **Pure In-Memory Selectors**: Dashboard và thống kê phiên học là các hàm tính toán phái sinh thuần túy từ danh sách thẻ, không tạo thêm bảng hay entity phụ trợ.
5. **Decoupled One-Way Export**: Ranh giới trừu tượng phục vụ xuất khẩu một chiều sang Anki / AnkiConnect mà không phụ thuộc tiến trình bên ngoài.

---

## 6. Flashcard Evolutionary Roadmap

- **F1–F5**: Core Data Models, SM-2 Scheduler, Option A Idempotency, Review Studio, Dashboard Analytics. (Hoàn thành)
- **F6.0**: Manual Creation Modal & CSV/TSV Batch Import Parser. (Hoàn thành)
- **F6.0.1**: Scoped Keyboard Shortcut Priority Manager. (Hoàn thành)
- **F6.4**: Topic-Scoped Flashcard Review Hub (`#/flashcards/:topicId`). (Hoàn thành)
- **F6.5**: Card Browser & Card Lifecycle Management (Search, Filter, Sort, History, Suspend, Restore, Archive). (Hoàn thành)
- **F6.9**: Duplicate Card Detection & Intelligent Merging (Deterministic Key, Levenshtein Match, Scope Guard, Device Activity Log). (Hoàn thành)
- **F6.10**: **Note-to-Flashcard Integration** (Tạo flashcard từ văn bản bôi đen trong ghi chú, tự động nhận diện cloze, batch creation, NoteCardListSection, E2E Playwright, Tag `v0.10.0`). (Hoàn thành)
- **F6.6**: Custom/Cram Review Sessions & Multi-Topic Review Queue. (Roadmap tiếp theo)
- **F6.7**: Hierarchical Topic Card Inheritance (Descendant Topic Inclusion). (Roadmap tiếp theo)

