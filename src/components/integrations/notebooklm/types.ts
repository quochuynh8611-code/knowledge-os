import { Topic, Note, Resource, ResearchExcerpt } from '../../../types';
import { NotebookLMArtifact, NotebookLMArtifactType } from '../../../lib/notebooklm';
import { AntigravityHandoffJob, AntigravityJobStatus } from '../../../lib/antigravityPipeline';
import { ResearchSessionDTO, GroundedArtifactDTO } from '../../../types/researchHub';

export type NotebookLMWorkspaceStep = 'source' | 'prompt' | 'results';

export interface StepItemConfig {
  id: NotebookLMWorkspaceStep;
  label: string;
  stepNumber: number;
  description: string;
}

export interface TopicSourceSummary {
  topicTitle: string;
  domainLabel: string;
  notesCount: number;
  resourcesCount: number;
  excerptsCount: number;
  linksCount: number;
  hasDescription: boolean;
  hasContent: boolean;
  sourceDocumentLength: number;
}

export interface StatusBadgeInfo {
  label: string;
  badgeClass: string;
  description: string;
}

export type NotebookLMRuntimeStatus = 'unknown' | 'configured' | 'verified' | 'blocked';

export interface NotebookLMHeaderProps {
  onClose: () => void;
  topicTitle?: string;
  runtimeStatus?: NotebookLMRuntimeStatus;
}

export interface NotebookLMStepperProps {
  activeStep: NotebookLMWorkspaceStep;
  onSelectStep: (step: NotebookLMWorkspaceStep) => void;
  isPromptAvailable: boolean;
  hasArtifacts: boolean;
  artifactCount: number;
}

export interface NotebookLMSourceStepProps {
  currentTopic: Topic | undefined;
  topics: Topic[];
  selectedTopicId: string;
  onSelectTopicId: (topicId: string) => void;
  showAllTopics: boolean;
  onToggleShowAllTopics: () => void;
  notes: Note[];
  resources: Resource[];
  excerpts?: ResearchExcerpt[];
  sourceDocument: string;
  copiedSource: boolean;
  onCopySource: () => void;
  onDownloadSourceFile: () => void;
  onOpenNotebookLM: () => void;
  onProceedToPrompt: () => void;
}

export interface NotebookLMPromptStepProps {
  currentTopic: Topic | undefined;
  promptArtifactType: NotebookLMArtifactType;
  onSelectArtifactType: (type: NotebookLMArtifactType) => void;
  customInstructions: string;
  onChangeCustomInstructions: (value: string) => void;
  taskPrompt: string;
  copiedPrompt: boolean;
  onCopyPrompt: () => void;
  isHandoffSubmitting: boolean;
  onPrepareHandoff: () => void;
  onProceedToResults: () => void;
  onBackToSource: () => void;
  isLiveExecuting?: boolean;
  liveExecutionError?: string | null;
  onExecuteLiveResearch?: () => void;
}

export interface NotebookLMResultsStepProps {
  currentTopic: Topic | undefined;
  localArtifacts: NotebookLMArtifact[];
  sessionArtifacts: GroundedArtifactDTO[];
  currentSession: ResearchSessionDTO | null;
  showAddArtifact: boolean;
  onToggleShowAddArtifact: () => void;
  artifactType: NotebookLMArtifactType;
  onSelectArtifactType: (type: NotebookLMArtifactType) => void;
  artifactTitle: string;
  onChangeArtifactTitle: (val: string) => void;
  artifactContent: string;
  onChangeArtifactContent: (val: string) => void;
  notebookUrl: string;
  onChangeNotebookUrl: (val: string) => void;
  validationError: string | null;
  onSaveNewArtifact: (e: React.FormEvent) => void;
  onCancelAddArtifact: () => void;
  suggestedArtifactType?: NotebookLMArtifactType | null;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteLocalArtifact: (id: string) => void;
  onReviewArtifact: (artifact: GroundedArtifactDTO) => void;
  onSelectTopicId: (id: string) => void;
  allTopics: Topic[];
  onBackToPrompt: () => void;
  onLaunchStudySession?: (topicId: string) => void;
}

export interface AdvancedTechnicalDetailsProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  activeJob: AntigravityHandoffJob | null;
  handoffJobs: AntigravityHandoffJob[];
  currentSession: ResearchSessionDTO | null;
  copiedCliCommand: boolean;
  onCopyCliCommand: (job?: AntigravityHandoffJob) => void;
  onDeleteJob: (jobId: string) => void;
}

export interface DirectExecutionResponseDTO {
  sessionId: string;
  artifactId: string;
  artifactType: NotebookLMArtifactType;
  title: string;
  content: string;
  citedSourceIds: string[];
  citations?: Record<string, string>;
  references?: Array<{
    sourceId: string;
    citationNumber: number;
    citedText?: string;
    sourceTitle?: string;
  }>;
  cleanupStatus: 'CLEANED' | 'RETAINED';
  executionDurationMs: number;
}
