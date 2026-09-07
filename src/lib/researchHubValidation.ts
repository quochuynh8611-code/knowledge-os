import { z } from "zod";

export const ResearchSessionStatusEnum = z.enum([
  "idle",
  "packaged",
  "prompt_ready",
  "handoff_active",
  "artifact_received",
  "completed",
  "archived",
]);

export const TaskPromptModeEnum = z.enum([
  "study_guide",
  "srs_deep_dive",
  "comparative",
  "qa_flashcard",
  "custom",
]);

export const ArtifactTypeEnum = z.enum([
  "study_guide",
  "briefing_doc",
  "qa_pair",
  "raw_markdown",
]);

export const ArtifactStatusEnum = z.enum([
  "received",
  "validated",
  "partially_imported",
  "imported",
  "archived",
]);

export const ImportTargetTypeEnum = z.enum([
  "note",
  "flashcards",
  "obsidian",
]);

export const CreateResearchSessionSchema = z.object({
  topicId: z.string().min(1, "Topic ID không được để trống"),
  notebookUrl: z.string().url().optional().nullable(),
  notebookId: z.string().optional().nullable(),
});

export const UpdateResearchSessionSchema = z.object({
  status: ResearchSessionStatusEnum.optional(),
  notebookUrl: z.string().url().optional().nullable(),
  notebookId: z.string().optional().nullable(),
});

export const PackageSourceSchema = z.object({
  content: z.string().min(1, "Nội dung source package không được để trống"),
  sourceCount: z.number().int().nonnegative().optional().default(0),
});

export const GeneratePromptSchema = z.object({
  promptMode: TaskPromptModeEnum.default("study_guide"),
  promptText: z.string().min(1, "Nội dung prompt không được để trống"),
  cliCommandHint: z.string().optional().nullable(),
});

export const IngestCitationSchema = z.object({
  markerIndex: z.number().int().nonnegative(),
  sourceTitle: z.string().min(1, "Tên nguồn trích dẫn không được để trống"),
  quote: z.string().optional().nullable(),
});

export const IngestArtifactSchema = z.object({
  sourcePackageId: z.string().optional().nullable(),
  taskPromptId: z.string().optional().nullable(),
  topicId: z.string().min(1, "Topic ID không được để trống"),
  artifactType: ArtifactTypeEnum.default("study_guide"),
  title: z.string().min(1, "Tiêu đề artifact không được để trống"),
  rawContent: z.string().min(1, "Nội dung artifact không được để trống"),
  citations: z.array(IngestCitationSchema).optional().default([]),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const ReviewArtifactSchema = z.object({
  status: z.enum(["validated", "archived", "received"]),
});

export const ImportArtifactNoteSchema = z.object({
  title: z.string().min(1, "Tiêu đề ghi chú không được để trống").optional(),
  type: z.enum(["study", "insight", "question", "summary"]).default("insight"),
  tags: z.array(z.string()).optional().default([]),
  targetTopicId: z.string().optional(),
});

export const ImportFlashcardItemSchema = z.object({
  front: z.string().min(1, "Mặt trước không được để trống"),
  back: z.string().min(1, "Mặt sau không được để trống"),
  type: z.enum(["basic", "cloze"]).default("basic"),
});

export const ImportArtifactFlashcardsSchema = z.object({
  flashcards: z.array(ImportFlashcardItemSchema).min(1, "Cần ít nhất một flashcard"),
  targetTopicId: z.string().optional(),
});

export const ImportArtifactObsidianSchema = z.object({
  vaultPath: z.string().optional(),
  targetFolder: z.string().optional(),
  fileName: z.string().optional(),
});
