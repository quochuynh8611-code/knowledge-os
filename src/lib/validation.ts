import { z } from "zod";

// ==========================================
// 1. ENUMS & BASIC PRIMITIVES
// ==========================================

export const CategoryTypeEnum = z.enum(["phat-hoc", "huyen-hoc"], {
  message: "Lĩnh vực phải là phat-hoc hoặc huyen-hoc",
});

export const TopicStatusEnum = z.enum(
  ["not_started", "in_progress", "completed", "reviewing"],
  {
    message: "Trạng thái học tập không hợp lệ",
  },
);

export const NoteTypeEnum = z.enum(
  ["study", "insight", "question", "summary"],
  {
    message: "Loại ghi chú không hợp lệ",
  },
);

export const ResourceTypeEnum = z.enum(
  ["book", "article", "video", "audio", "pdf", "link"],
  {
    message: "Loại tài liệu không hợp lệ",
  },
);

export const LinkTypeEnum = z.enum(
  ["related", "prerequisite", "advanced", "contradicts"],
  {
    message: "Loại quan hệ liên kết không hợp lệ",
  },
);

// ==========================================
// 2. TAG SCHEMAS
// ==========================================

export const TagSchema = z.object({
  id: z.string().min(1, "Tag ID không được để trống"),
  name: z.string().min(1, "Tên tag không được để trống"),
  slug: z.string().min(1, "Slug không được để trống"),
  color: z.string().optional(),
  count: z.number().int().optional(),
});

export const TagCreateSchema = TagSchema.omit({ id: true });

// ==========================================
// 3. CATEGORY SCHEMAS
// ==========================================

export const CategorySchema = z.object({
  id: z.string().min(1, "Category ID không được để trống"),
  name: z.string().min(1, "Tên danh mục không được để trống"),
  slug: z.string().min(1, "Slug không được để trống"),
  type: CategoryTypeEnum,
  description: z.string().optional(),
  parentId: z.string().nullable().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  order: z.number().int().optional(),
});

export const CategoryCreateSchema = CategorySchema.omit({ id: true });
export const CategoryUpdateSchema = CategoryCreateSchema.partial();

// ==========================================
// 4. KNOWLEDGE LINK SCHEMAS
// ==========================================

export const KnowledgeLinkSchema = z.object({
  id: z.string().optional(),
  sourceId: z.string().min(1, "Source Topic ID không được để trống"),
  targetId: z.string().min(1, "Target Topic ID không được để trống"),
  sourceTitle: z.string().optional(),
  targetTitle: z.string().optional(),
  linkType: LinkTypeEnum.default("related"),
  strength: z.number().min(1).max(5).default(3),
  notes: z.string().optional(),
  explanation: z.string().optional(),
});

// ==========================================
// 5. STUDY PROGRESS & SM-2 SCHEMAS
// ==========================================

export const StudyProgressSchema = z.object({
  topicId: z.string().min(1, "Topic ID không được để trống"),
  status: TopicStatusEnum.default("not_started"),
  progress: z.number().min(0).max(100).default(0),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  lastStudied: z.string().optional(),
  nextReview: z.string().optional(),
  interval: z.number().int().min(0).default(0),
  easeFactor: z.number().min(1.3).default(2.5),
  repetitions: z.number().int().min(0).default(0),
  totalNotes: z.number().int().min(0).default(0),
  timeSpent: z.number().int().min(0).default(0),
});

export const SM2ReviewInputSchema = z.object({
  topicId: z.string().min(1, "Topic ID không được để trống"),
  quality: z
    .number()
    .int("Chất lượng ôn tập phải là số nguyên từ 0 đến 5")
    .min(0, "Chất lượng ôn tập phải từ 0 đến 5")
    .max(5, "Chất lượng ôn tập phải từ 0 đến 5"),
});

// ==========================================
// 6. TOPIC SCHEMAS
// ==========================================

export const TopicSchema = z.object({
  id: z.string().min(1, "Topic ID không được để trống"),
  title: z
    .string()
    .min(1, "Tiêu đề không được để trống")
    .max(200, "Tiêu đề quá dài"),
  slug: z.string().min(1, "Slug không được để trống"),
  categoryId: z.string().min(1, "Category ID không được để trống"),
  categorySlug: z.string().optional(),
  categoryName: z.string().optional(),
  type: CategoryTypeEnum,
  parentId: z.string().nullable().optional(),
  description: z.string().default(""),
  content: z.string().default(""),
  tags: z.array(z.string()).default([]),
  links: z.array(KnowledgeLinkSchema).default([]),
  createdAt: z
    .string()
    .optional()
    .default(() => new Date().toISOString()),
  updatedAt: z
    .string()
    .optional()
    .default(() => new Date().toISOString()),
  studyProgress: StudyProgressSchema.optional(),
});

export const TopicCreateSchema = z.object({
  title: z
    .string()
    .min(1, "Tiêu đề không được để trống")
    .max(200, "Tiêu đề quá dài"),
  slug: z.string().optional(),
  categoryId: z.string().min(1, "Category ID không được để trống"),
  categorySlug: z.string().optional(),
  categoryName: z.string().optional(),
  type: CategoryTypeEnum,
  parentId: z.string().nullable().optional(),
  description: z.string().optional().default(""),
  content: z.string().optional().default(""),
  tags: z.array(z.string()).optional().default([]),
});

export const TopicUpdateSchema = TopicCreateSchema.partial();

// ==========================================
// 7. NOTE SCHEMAS
// ==========================================

export const NoteSchema = z.object({
  id: z.string().min(1, "Note ID không được để trống"),
  topicId: z.string().min(1, "Topic ID không được để trống"),
  topicTitle: z.string().optional(),
  title: z.string().min(1, "Tiêu đề ghi chú không được để trống"),
  content: z.string().min(1, "Nội dung ghi chú không được để trống"),
  type: NoteTypeEnum.default("insight"),
  isPrivate: z.boolean().optional().default(false),
  tags: z.array(z.string()).default([]),
  createdAt: z
    .string()
    .optional()
    .default(() => new Date().toISOString()),
  updatedAt: z
    .string()
    .optional()
    .default(() => new Date().toISOString()),
});

export const NoteCreateSchema = z.object({
  topicId: z.string().min(1, "Topic ID không được để trống"),
  topicTitle: z.string().optional(),
  title: z.string().min(1, "Tiêu đề ghi chú không được để trống"),
  content: z.string().min(1, "Nội dung ghi chú không được để trống"),
  type: NoteTypeEnum.optional().default("insight"),
  isPrivate: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().default([]),
});

export const NoteUpdateSchema = NoteCreateSchema.partial();

// ==========================================
// 8. RESOURCE SCHEMAS
// ==========================================

export const ResourceSchema = z.object({
  id: z.string().min(1, "Resource ID không được để trống"),
  topicId: z.string().min(1, "Topic ID không được để trống"),
  topicTitle: z.string().optional(),
  title: z.string().min(1, "Tiêu đề tài liệu không được để trống"),
  type: ResourceTypeEnum.default("book"),
  author: z.string().optional(),
  url: z.string().optional(),
  filePath: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z
    .string()
    .optional()
    .default(() => new Date().toISOString()),
});

export const ResourceCreateSchema = z.object({
  topicId: z.string().min(1, "Topic ID không được để trống"),
  topicTitle: z.string().optional(),
  title: z.string().min(1, "Tiêu đề tài liệu không được để trống"),
  type: ResourceTypeEnum.optional().default("book"),
  author: z.string().optional(),
  url: z.string().optional(),
  filePath: z.string().optional(),
  notes: z.string().optional(),
});

export const ResourceUpdateSchema = ResourceCreateSchema.partial();

// ==========================================
// 9. IMPORT / EXPORT / HYDRATE PAYLOAD SCHEMA
// ==========================================

export const ImportExportPayloadSchema = z.object({
  version: z.string().default("2.0.0"),
  exportedAt: z.string().default(() => new Date().toISOString()),
  categories: z.array(CategorySchema).default([]),
  topics: z.array(TopicSchema).default([]),
  notes: z.array(NoteSchema).default([]),
  resources: z.array(ResourceSchema).default([]),
  tags: z.array(TagSchema).default([]),
  links: z.array(KnowledgeLinkSchema).optional().default([]),
});

// ==========================================
// 10. IDEMPOTENT HYDRATION SYNC SCHEMAS
// ==========================================

export const HydratePayloadSchema = z.object({
  clientSyncId: z.string().min(1, "clientSyncId không được để trống"),
  version: z.string().optional().default("2.0.0"),
  clientTimestamp: z
    .string()
    .optional()
    .default(() => new Date().toISOString()),
  forceOverwrite: z.boolean().optional().default(false),
  categories: z.array(CategorySchema).optional().default([]),
  topics: z.array(TopicSchema).optional().default([]),
  notes: z.array(NoteSchema).optional().default([]),
  resources: z.array(ResourceSchema).optional().default([]),
  tags: z.array(TagSchema).optional().default([]),
  links: z.array(KnowledgeLinkSchema).optional().default([]),
});

export const HydrateResponseSchema = z.object({
  success: z.boolean(),
  clientSyncId: z.string(),
  serverTimestamp: z.string(),
  summary: z.object({
    categoriesUpserted: z.number().int().min(0),
    topicsUpserted: z.number().int().min(0),
    notesUpserted: z.number().int().min(0),
    resourcesUpserted: z.number().int().min(0),
    tagsUpserted: z.number().int().min(0),
    linksUpserted: z.number().int().min(0),
    progressMerged: z.number().int().min(0),
  }),
});

export type ValidatedTopic = z.infer<typeof TopicSchema>;
export type ValidatedTopicCreate = z.infer<typeof TopicCreateSchema>;
export type ValidatedNote = z.infer<typeof NoteSchema>;
export type ValidatedNoteCreate = z.infer<typeof NoteCreateSchema>;
export type ValidatedResource = z.infer<typeof ResourceSchema>;
export type ValidatedResourceCreate = z.infer<typeof ResourceCreateSchema>;
export type ValidatedCategory = z.infer<typeof CategorySchema>;
export type ValidatedKnowledgeLink = z.infer<typeof KnowledgeLinkSchema>;
export type ValidatedStudyProgress = z.infer<typeof StudyProgressSchema>;
export type ValidatedImportExportPayload = z.infer<
  typeof ImportExportPayloadSchema
>;
export type ValidatedHydratePayload = z.infer<typeof HydratePayloadSchema>;
export type ValidatedHydrateInput = z.input<typeof HydratePayloadSchema>;
export type ValidatedHydrateResponse = z.infer<typeof HydrateResponseSchema>;
