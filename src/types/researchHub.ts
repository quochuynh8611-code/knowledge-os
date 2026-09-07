export type ResearchSessionStatus =
  | 'idle'
  | 'packaged'
  | 'prompt_ready'
  | 'handoff_active'
  | 'artifact_received'
  | 'completed'
  | 'archived';

export type TaskPromptMode =
  | 'study_guide'
  | 'srs_deep_dive'
  | 'comparative'
  | 'qa_flashcard'
  | 'custom';

export type ArtifactType =
  | 'study_guide'
  | 'briefing_doc'
  | 'qa_pair'
  | 'raw_markdown';

export type ArtifactStatus =
  | 'received'
  | 'validated'
  | 'partially_imported'
  | 'imported'
  | 'archived';

export type ImportTargetType = 'note' | 'flashcards' | 'obsidian';

export type ImportStatus = 'pending' | 'success' | 'failed';

export type TimelineEventType =
  | 'session_created'
  | 'source_packaged'
  | 'prompt_generated'
  | 'handoff_prepared'
  | 'artifact_received'
  | 'artifact_reviewed'
  | 'note_imported'
  | 'flashcards_generated'
  | 'obsidian_exported';

export interface SourcePackageDTO {
  id: string;
  sessionId: string;
  version: number;
  isCurrent: boolean;
  content: string;
  contentHash: string;
  sourceCount: number;
  createdAt: string;
}

export interface TaskPromptDTO {
  id: string;
  sessionId: string;
  promptMode: TaskPromptMode;
  promptText: string;
  promptHash: string;
  version: number;
  isCurrent: boolean;
  cliCommandHint?: string | null;
  createdAt: string;
}

export interface ArtifactCitationDTO {
  id: string;
  artifactId: string;
  markerIndex: number;
  sourceTitle: string;
  quote?: string | null;
  createdAt: string;
}

export interface ArtifactImportDTO {
  id: string;
  artifactId: string;
  targetType: ImportTargetType;
  targetNoteId?: string | null;
  targetCardId?: string | null;
  exportPath?: string | null;
  status: ImportStatus;
  itemCount: number;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroundedArtifactDTO {
  id: string;
  sessionId: string;
  sourcePackageId?: string | null;
  sourcePackageVersion?: number;
  taskPromptId?: string | null;
  topicId: string;
  artifactType: ArtifactType;
  title: string;
  rawContent: string;
  contentHash: string;
  idempotencyKey: string;
  status: ArtifactStatus;
  citationCount: number;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  citations?: ArtifactCitationDTO[];
  imports?: ArtifactImportDTO[];
}

export interface ResearchTimelineEventDTO {
  id: string;
  sessionId: string;
  topicId: string;
  eventType: TimelineEventType;
  eventData?: Record<string, unknown> | null;
  createdAt: string;
}

export interface ResearchSessionDTO {
  id: string;
  topicId: string;
  status: ResearchSessionStatus;
  notebookUrl?: string | null;
  notebookId?: string | null;
  createdAt: string;
  updatedAt: string;
  sourcePackages?: SourcePackageDTO[];
  taskPrompts?: TaskPromptDTO[];
  artifacts?: GroundedArtifactDTO[];
  timelineEvents?: ResearchTimelineEventDTO[];
  currentSourcePackage?: SourcePackageDTO | null;
  currentTaskPrompt?: TaskPromptDTO | null;
}
