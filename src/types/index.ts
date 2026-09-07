export type CategoryType = string;

export type TopicVisibility = 'active' | 'hidden';

export interface Category {
  id: string;
  name: string;
  slug: string;
  type?: CategoryType;
  parentId?: string | null;
  description?: string;
  icon?: string;
  color?: string;
}

export type TopicStatus = 'not_started' | 'in_progress' | 'completed' | 'reviewing';

export type LinkType = 'related' | 'prerequisite' | 'advanced' | 'contradicts';

export interface KnowledgeLink {
  id?: string;
  sourceId: string;
  targetId: string;
  sourceTitle?: string;
  targetTitle?: string;
  linkType: LinkType;
  strength: number; // 1-5
  notes?: string;
  explanation?: string;
}

export type NoteType = 'study' | 'insight' | 'question' | 'summary';

export interface Note {
  id: string;
  topicId: string;          // Primary FK — kept for backward compatibility
  topicIds?: string[];      // Optional multi-topic support (additive)
  topicTitle?: string;
  title: string;
  content: string; // Markdown formatted
  sourcePath?: string; // Optional local Markdown / Obsidian file path
  type: NoteType;
  isPrivate: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type ResourceType = 'book' | 'article' | 'video' | 'audio' | 'pdf' | 'md';

export interface Resource {
  id: string;
  topicId: string;
  topicTitle?: string;
  title: string;
  url?: string;
  filePath?: string;
  openTarget?: string;
  type: ResourceType;
  author?: string;
  notes?: string;
  sourceRegistryId?: string; // Optional — populated by buildSourceRegistry()
  createdAt: string;
}

// Research Storage v1: append-only progress history snapshot
export type SnapshotTriggerReason = 'manual' | 'session_complete' | 'milestone';

export interface KnowledgeProgressSnapshot {
  id: string;
  topicId: string;
  capturedAt: string;           // ISO string
  progressData: StudyProgress;  // Immutable copy — do NOT mutate
  triggerReason?: SnapshotTriggerReason;
}

export interface StudyProgress {
  topicId: string;
  status: TopicStatus;
  progress: number; // 0 - 100
  startDate?: string;
  endDate?: string;
  nextReview?: string; // ISO date string
  interval: number; // days
  easeFactor: number; // default 2.5
  repetitions: number;
  totalNotes: number;
  timeSpent: number; // in minutes
  lastStudied?: string;
}

export interface Topic {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  categorySlug?: string;
  categoryName?: string;
  type: CategoryType;
  parentId?: string | null;
  description: string;
  content: string; // Markdown
  tags: string[];
  links: KnowledgeLink[];
  studyProgress: StudyProgress;
  visibility?: TopicVisibility; // Default: 'active'
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
  count?: number;
}

export interface StudySessionLog {
  id: string;
  topicId: string;
  topicTitle: string;
  durationMinutes: number;
  timestamp: string;
  notes?: string;
}

export * from './flashcard';

