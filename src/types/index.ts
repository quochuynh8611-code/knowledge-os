export type CategoryType = 'phat-hoc' | 'huyen-hoc';

export interface Category {
  id: string;
  name: string;
  slug: string;
  type: CategoryType;
  parentId?: string | null;
  description?: string;
  icon?: string;
  color?: string;
}

export type TopicStatus = 'not_started' | 'in_progress' | 'completed' | 'reviewing';

export type LinkType = 'related' | 'prerequisite' | 'advanced' | 'contradicts';

export interface KnowledgeLink {
  id: string;
  sourceId: string;
  targetId: string;
  sourceTitle?: string;
  targetTitle?: string;
  linkType: LinkType;
  strength: number; // 1-5
  notes?: string;
}

export type NoteType = 'study' | 'insight' | 'question' | 'summary';

export interface Note {
  id: string;
  topicId: string;
  topicTitle?: string;
  title: string;
  content: string; // Markdown formatted
  type: NoteType;
  isPrivate: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type ResourceType = 'book' | 'article' | 'video' | 'audio' | 'pdf';

export interface Resource {
  id: string;
  topicId: string;
  topicTitle?: string;
  title: string;
  url?: string;
  filePath?: string;
  type: ResourceType;
  author?: string;
  notes?: string;
  createdAt: string;
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
