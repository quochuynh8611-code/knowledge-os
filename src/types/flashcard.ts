export type FlashcardType = 'basic' | 'cloze';

export type FlashcardState = 'new' | 'learning' | 'review' | 'relearning';

export type FlashcardLifecycleStatus = 'active' | 'suspended' | 'archived';

export type ReviewRating = 1 | 2 | 3 | 4;

export interface Flashcard {
  id: string;
  topicId: string;
  noteId?: string | null;
  resourceId?: string | null;
  type: FlashcardType;
  front: string;
  back: string;
  lifecycleStatus?: FlashcardLifecycleStatus; // Default: 'active'
  schedule?: FlashcardSchedule;
  createdAt: string;
  updatedAt: string;
}

export interface FlashcardSchedule {
  id: string;
  flashcardId: string;
  cardId?: string; // Backward compatibility alias
  state: FlashcardState;
  dueAt: string;
  due?: string; // Backward compatibility alias
  interval: number; // Interval in days (>= 0)
  easeFactor: number; // Default 2.50, floor 1.30, ceiling 3.50
  repetitions: number; // Number of consecutive successful repetitions
  lapses: number; // Number of times card went back to relearning
  lastReviewedAt?: string | null;
  lastReviewed?: string | null; // Backward compatibility alias
  updatedAt: string;
}

export interface FlashcardReview {
  id: string; // Server UUID primary key
  clientEventId: string; // Client UUID idempotency key (@unique)
  flashcardId: string;
  cardId?: string; // Backward compatibility alias
  topicId: string;
  rating: ReviewRating; // 1: Again, 2: Hard, 3: Good, 4: Easy
  reviewDurationMs: number; // Execution duration in ms (>= 0)
  reviewedAt: string; // ISO 8601 timestamp
  stateBefore: FlashcardState;
  stateAfter: FlashcardState;
  intervalBefore: number;
  intervalAfter: number;
  easeFactorBefore: number;
  easeFactorAfter: number;
  dueBeforeAt: string;
  dueBefore?: string; // Backward compatibility alias
  dueAfterAt: string;
  dueAfter?: string; // Backward compatibility alias
}

export interface FlashcardReviewResponse {
  success: boolean;
  duplicate: boolean;
  clientEventId: string;
  review: FlashcardReview;
  schedule: FlashcardSchedule; // Original resulting schedule
}

export interface FlashcardCreateInput {
  topicId: string;
  noteId?: string | null;
  resourceId?: string | null;
  type: FlashcardType;
  front: string;
  back: string;
  lifecycleStatus?: FlashcardLifecycleStatus;
}

export interface FlashcardUpdateInput {
  topicId?: string;
  noteId?: string | null;
  resourceId?: string | null;
  type?: FlashcardType;
  front?: string;
  back?: string;
  lifecycleStatus?: FlashcardLifecycleStatus;
}

export interface FlashcardReviewInput {
  clientEventId: string;
  flashcardId: string;
  cardId?: string; // Backward compatibility alias
  topicId: string;
  rating: ReviewRating;
  reviewDurationMs: number;
}

export interface FlashcardProgressStats {
  totalCards: number;
  total?: number; // Alias for backward compatibility
  newCards: number;
  learningCards: number;
  reviewCards: number;
  dueToday: number;
  retentionRate: number;
}

