import { z } from "zod";

// ==========================================
// 1. ENUMS & BASIC PRIMITIVES
// ==========================================

export const CategoryTypeEnum = z.string().min(1, "Lĩnh vực không được để trống");

export const TopicVisibilityEnum = z.enum(["active", "hidden"]);

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
  ["book", "article", "video", "audio", "pdf", "md"],
  {
    message: "Loại tài liệu không hợp lệ",
  },
);

export const LinkTypeEnum = z.enum(
  ["related", "prerequisite", "advanced", "contradicts"],
  {
    message: "Loại liên kết tri thức không hợp lệ",
  },
);

// ==========================================
// 2. TAG SCHEMAS
// ==========================================

export const TagSchema = z.object({
  id: z.string().min(1, "Tag ID không được để trống"),
  name: z.string().min(1, "Tên tag không được để trống"),
  slug: z.string().min(1, "Slug không được để trống"),
  color: z.string().default("#3b82f6"),
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
  type: CategoryTypeEnum.optional(),
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
  triggerReason: z.string().optional(),
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
  visibility: TopicVisibilityEnum.optional(),
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
  type: CategoryTypeEnum.optional().default("general"),
  parentId: z.string().nullable().optional(),
  description: z.string().optional().default(""),
  content: z.string().optional().default(""),
  tags: z.array(z.string()).optional().default([]),
  visibility: TopicVisibilityEnum.optional().default("active"),
});

export const TopicUpdateSchema = TopicCreateSchema.partial();

// ==========================================
// 7. NOTE SCHEMAS
// ==========================================

export const NoteSchema = z.object({
  id: z.string().min(1, "Note ID không được để trống"),
  topicId: z.string().min(1, "Topic ID không được để trống"),
  topicIds: z.array(z.string()).optional(),
  topicTitle: z.string().optional(),
  title: z.string().min(1, "Tiêu đề ghi chú không được để trống"),
  content: z.string().min(1, "Nội dung ghi chú không được để trống"),
  sourcePath: z.string().optional(),
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

export const NoteCreateSchema = z
  .object({
    topicId: z.string().optional(),
    topicIds: z.array(z.string()).optional(),
    topicTitle: z.string().optional(),
    title: z.string().min(1, "Tiêu đề ghi chú không được để trống"),
    content: z.string().min(1, "Nội dung ghi chú không được để trống"),
    sourcePath: z.string().optional(),
    type: NoteTypeEnum.optional().default("insight"),
    isPrivate: z.boolean().optional().default(false),
    tags: z.array(z.string()).optional().default([]),
  })
  .refine(
    (data) =>
      Boolean(data.topicId || (data.topicIds && data.topicIds.length > 0)),
    { message: "Topic ID không được để trống", path: ["topicId"] }
  );

export const NoteUpdateSchema = z.object({
  topicId: z.string().optional(),
  topicIds: z.array(z.string()).optional(),
  topicTitle: z.string().optional(),
  title: z.string().min(1, "Tiêu đề ghi chú không được để trống").optional(),
  content: z.string().min(1, "Nội dung ghi chú không được để trống").optional(),
  sourcePath: z.string().optional(),
  type: NoteTypeEnum.optional(),
  isPrivate: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

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
  openTarget: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z
    .string()
    .optional()
    .default(() => new Date().toISOString()),
});

export const ResourceCreateBaseSchema = z.object({
  topicId: z.string().min(1, "Topic ID không được để trống"),
  topicTitle: z.string().optional(),
  title: z.string().min(1, "Tiêu đề tài liệu không được để trống"),
  type: ResourceTypeEnum.optional().default("book"),
  author: z.string().optional(),
  url: z.string().optional(),
  filePath: z.string().optional(),
  openTarget: z.string().optional(),
  notes: z.string().optional(),
});

export const ResourceCreateSchema = ResourceCreateBaseSchema.refine(
  (data) => {
    const hasUrl = Boolean(data.url && data.url.trim().length > 0);
    const hasPath = Boolean(data.filePath && data.filePath.trim().length > 0);
    const hasOpenTarget = Boolean(data.openTarget && data.openTarget.trim().length > 0);
    return hasUrl || hasPath || hasOpenTarget;
  },
  {
    message: "Tài liệu phải có ít nhất một nguồn: Đích mở (openTarget), URL tham chiếu hoặc filePath",
    path: ["url"],
  },
);

export const ResourceUpdateSchema = ResourceCreateBaseSchema.partial();

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

// ==========================================
// 11. PERSISTENT SYNC SESSION SCHEMA (IDEMPOTENCY LOG)
// ==========================================

export const SyncSessionSchema = z.object({
  id: z.string().optional(),
  clientSyncId: z.string().min(1, "clientSyncId không được để trống"),
  clientTimestamp: z.string(),
  processedAt: z.string().default(() => new Date().toISOString()),
  status: z.enum(["pending", "completed", "failed"]).default("completed"),
  summary: z.record(z.string(), z.unknown()).optional().default({}),
});

// ==========================================
// 12. BACKUP SNAPSHOT & RESTORE SCHEMAS (PHASE 2B / 2C)
// ==========================================

/**
 * Sắp xếp đệ quy tất cả khóa đối tượng theo thứ tự bảng chữ cái để đảm bảo JSON chuẩn tất định.
 * Cần thiết vì Zod's safeParse() có thể sắp xếp lại thứ tự khóa theo định nghĩa schema,
 * khiến JSON.stringify() tạo ra chuỗi khác nhau cho cùng một dữ liệu về mặt ngữ nghĩa.
 */
function sortKeysRecursive(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortKeysRecursive);
  if (obj !== null && typeof obj === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysRecursive((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return obj;
}

/**
 * Chuẩn hóa tuần tự hóa dữ liệu Snapshot Backup theo thứ tự khóa tất định (Deterministic Canonical JSON)
 * Luôn chỉ trích xuất 5 collections thực thể cốt lõi và bỏ qua trường checksum metadata.
 * Sắp xếp tất cả khóa đối tượng theo thứ tự bảng chữ cái để đảm bảo kết quả không phụ thuộc
 * vào thứ tự khóa đầu vào — kể cả sau khi Zod safeParse() tái cấu trúc thứ tự khóa.
 */
export function serializeCanonicalBackupData(data: unknown): string {
  const src = (data && typeof data === "object" ? data : {}) as Record<
    string,
    unknown
  >;
  const canonical = {
    categories: Array.isArray(src.categories) ? src.categories : [],
    topics: Array.isArray(src.topics) ? src.topics : [],
    notes: Array.isArray(src.notes) ? src.notes : [],
    resources: Array.isArray(src.resources) ? src.resources : [],
    tags: Array.isArray(src.tags) ? src.tags : [],
  };
  return JSON.stringify(sortKeysRecursive(canonical));
}

/**
 * Thuật toán băm SHA-256 thuần (Pure TypeScript SHA-256) tương thích chuẩn FIPS 180-4
 * Hoạt động đồng bộ 100% trên cả Node.js, Web Browser, Web Worker và JSDOM mà không cần module ngoài
 */
export function sha256Sync(str: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    } else {
      // Surrogate pair
      i++;
      const nextCode = str.charCodeAt(i);
      code = 0x10000 + (((code & 0x3ff) << 10) | (nextCode & 0x3ff));
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }

  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length + 8) % 64 !== 0) {
    bytes.push(0x00);
  }

  const hi = Math.floor(bitLength / 0x100000000);
  const lo = bitLength >>> 0;
  bytes.push(
    (hi >>> 24) & 0xff,
    (hi >>> 16) & 0xff,
    (hi >>> 8) & 0xff,
    hi & 0xff,
    (lo >>> 24) & 0xff,
    (lo >>> 16) & 0xff,
    (lo >>> 8) & 0xff,
    lo & 0xff,
  );

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Int32Array(64);

  for (let i = 0; i < bytes.length; i += 64) {
    for (let t = 0; t < 16; t++) {
      const idx = i + t * 4;
      w[t] =
        (bytes[idx] << 24) |
        (bytes[idx + 1] << 16) |
        (bytes[idx + 2] << 8) |
        bytes[idx + 3];
    }
    for (let t = 16; t < 64; t++) {
      const s0 =
        ((w[t - 15] >>> 7) | (w[t - 15] << 25)) ^
        ((w[t - 15] >>> 18) | (w[t - 15] << 14)) ^
        (w[t - 15] >>> 3);
      const s1 =
        ((w[t - 2] >>> 17) | (w[t - 2] << 15)) ^
        ((w[t - 2] >>> 19) | (w[t - 2] << 13)) ^
        (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let t = 0; t < 64; t++) {
      const S1 =
        ((e >>> 6) | (e << 26)) ^
        ((e >>> 11) | (e << 21)) ^
        ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + w[t]) | 0;
      const S0 =
        ((a >>> 2) | (a << 30)) ^
        ((a >>> 13) | (a << 19)) ^
        ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const toHex = (val: number) => (val >>> 0).toString(16).padStart(8, "0");
  return (
    toHex(h0) +
    toHex(h1) +
    toHex(h2) +
    toHex(h3) +
    toHex(h4) +
    toHex(h5) +
    toHex(h6) +
    toHex(h7)
  ).toLowerCase();
}

/**
 * Tính mã SHA-256 Checksum cho Snapshot Backup
 */
export function calculateBackupChecksum(data: unknown): string {
  const jsonString = serializeCanonicalBackupData(data);
  return sha256Sync(jsonString);
}

/**
 * Tính toán SHA-256 bất đồng bộ sử dụng Web Crypto API với fallback đồng bộ
 */
export async function computeWebCryptoSHA256(
  textOrPayload: string | unknown,
): Promise<string> {
  const jsonString =
    typeof textOrPayload === "string"
      ? textOrPayload
      : serializeCanonicalBackupData(textOrPayload);

  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    globalThis.crypto.subtle &&
    typeof globalThis.crypto.subtle.digest === "function"
  ) {
    try {
      const msgBuffer = new TextEncoder().encode(jsonString);
      const hashBuffer = await globalThis.crypto.subtle.digest(
        "SHA-256",
        msgBuffer,
      );
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .toLowerCase();
    } catch {
      // Fallback to pure JS sha256Sync
    }
  }

  return sha256Sync(jsonString);
}

/**
 * Kiểm tra tính hợp lệ sơ bộ của Snapshot Backup ở tầng Client (Pre-Validation Primitive)
 */
export function validateBackupSnapshotPreflight(rawSnapshot: unknown): {
  valid: boolean;
  error?: string;
  checksumMatch?: boolean;
  expectedChecksum?: string;
  calculatedChecksum?: string;
  counts?: {
    categories: number;
    topics: number;
    notes: number;
    resources: number;
    tags: number;
  };
  snapshot?: ValidatedBackupSnapshot;
} {
  const parsed = BackupSnapshotSchema.safeParse(rawSnapshot);
  if (!parsed.success) {
    return {
      valid: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const calculatedChecksum = calculateBackupChecksum(parsed.data.data);
  const checksumMatch = parsed.data.checksum === calculatedChecksum;

  if (!checksumMatch) {
    return {
      valid: false,
      checksumMatch: false,
      expectedChecksum: parsed.data.checksum,
      calculatedChecksum,
      error: "Mã băm SHA-256 Checksum không khớp với dữ liệu snapshot",
    };
  }

  return {
    valid: true,
    checksumMatch: true,
    expectedChecksum: parsed.data.checksum,
    calculatedChecksum,
    counts: parsed.data.counts,
    snapshot: parsed.data,
  };
}

export const BackupSnapshotSchema = z.object({
  version: z
    .string()
    .regex(/^2\.\d+\.\d+$/, "Version must be semver 2.x format (e.g. 2.0.0)"),
  exportedAt: z.string().datetime(),
  checksum: z
    .string()
    .regex(/^[a-f0-9]{64}$/, "Checksum must be a 64-char SHA-256 hex string"),
  counts: z.object({
    categories: z.number().int().nonnegative(),
    topics: z.number().int().nonnegative(),
    notes: z.number().int().nonnegative(),
    resources: z.number().int().nonnegative(),
    tags: z.number().int().nonnegative(),
  }),
  data: z.object({
    categories: z.array(CategorySchema),
    topics: z.array(TopicSchema),
    notes: z.array(NoteSchema),
    resources: z.array(ResourceSchema),
    tags: z.array(TagSchema),
  }),
});

export const RestoreRequestSchema = z
  .object({
    snapshot: BackupSnapshotSchema,
    mode: z.enum(["replace", "merge"]).default("replace"),
    confirmReplace: z.boolean().optional(),
  })
  .refine((data) => data.mode !== "replace" || data.confirmReplace === true, {
    message: "confirmReplace must be true when mode is 'replace'",
    path: ["confirmReplace"],
  });

export const RestoreResponseSchema = z.object({
  success: z.boolean(),
  mode: z.enum(["replace", "merge"]),
  restoredAt: z.string().datetime(),
  restoredCounts: z.object({
    categories: z.number().int().nonnegative(),
    topics: z.number().int().nonnegative(),
    notes: z.number().int().nonnegative(),
    resources: z.number().int().nonnegative(),
    tags: z.number().int().nonnegative(),
  }),
});

// ==========================================
// 13. DATABASE HEALTH PROBE SCHEMA (PHASE 2B)
// ==========================================

export const DbHealthResponseSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  latencyMs: z.number().nonnegative(),
  database: z.literal("postgresql"),
  connected: z.boolean(),
  timestamp: z.string().datetime(),
});

// ==========================================
// 14. AI RESEARCH & BOUNDARY GUARD SCHEMAS (PHASE 4)
// ==========================================

export const MAX_PROMPT_LENGTH = 20_000;
export const MAX_HANDOFF_CONTEXT_LENGTH = 100_000;

export const GeminiResearchInputSchema = z.object({
  prompt: z
    .string()
    .min(1, "Yêu cầu nghiên cứu (prompt) không được để trống")
    .max(
      MAX_PROMPT_LENGTH,
      `Yêu cầu nghiên cứu quá dài (tối đa ${MAX_PROMPT_LENGTH.toLocaleString()} ký tự)`,
    ),
  topicTitle: z.string().optional(),
  category: z.string().optional(),
  contextNotes: z
    .string()
    .max(
      MAX_HANDOFF_CONTEXT_LENGTH,
      `Ghi chú ngữ cảnh quá dài (tối đa ${MAX_HANDOFF_CONTEXT_LENGTH.toLocaleString()} ký tự)`,
    )
    .optional(),
  mode: z
    .enum([
      "concept_analysis",
      "terminology_exegesis",
      "cross_domain_synthesis",
      "scholar_analysis",
      "pali_sanskrit_exegesis",
      "cross_domain_link",
    ])
    .optional()
    .default("concept_analysis"),
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
export type ValidatedSyncSession = z.infer<typeof SyncSessionSchema>;
export type ValidatedBackupSnapshot = z.infer<typeof BackupSnapshotSchema>;
export type ValidatedRestoreRequest = z.infer<typeof RestoreRequestSchema>;
export type ValidatedRestoreResponse = z.infer<typeof RestoreResponseSchema>;
export type ValidatedDbHealthResponse = z.infer<typeof DbHealthResponseSchema>;
export type ValidatedGeminiResearchInput = z.infer<
  typeof GeminiResearchInputSchema
>;

// ==========================================
// 6. FLASHCARD & SPACED REPETITION SCHEMAS
// ==========================================

export const FlashcardTypeEnum = z.enum(["basic", "cloze"], {
  message: "Loại thẻ flashcard không hợp lệ (chỉ chấp nhận 'basic' hoặc 'cloze')",
});

export const FlashcardStateEnum = z.enum(
  ["new", "learning", "review", "relearning"],
  {
    message: "Trạng thái lặp lại ngắt quãng không hợp lệ",
  },
);

export const FlashcardLifecycleStatusEnum = z.enum(
  ["active", "suspended", "archived"],
  {
    message: "Trạng thái vòng đời thẻ không hợp lệ",
  },
);

export const ReviewRatingEnum = z.union(
  [z.literal(1), z.literal(2), z.literal(3), z.literal(4)],
  {
    message: "Đánh giá ôn tập phải là số nguyên từ 1 đến 4 (1: Again, 2: Hard, 3: Good, 4: Easy)",
  },
);

export const FlashcardScheduleSchema = z
  .object({
    id: z.string().min(1, "Schedule ID không được để trống"),
    flashcardId: z.string().min(1, "flashcardId không được để trống").optional(),
    cardId: z.string().min(1, "cardId không được để trống").optional(),
    state: FlashcardStateEnum,
    dueAt: z.string().datetime().or(z.string().min(1)).optional(),
    due: z.string().datetime().or(z.string().min(1)).optional(),
    interval: z
      .number()
      .int("interval phải là số nguyên")
      .min(0, "interval phải lớn hơn hoặc bằng 0")
      .default(0),
    easeFactor: z
      .number()
      .min(1.3, "easeFactor không được nhỏ hơn 1.3")
      .max(3.5, "easeFactor không được lớn hơn 3.5")
      .default(2.5),
    repetitions: z
      .number()
      .int("repetitions phải là số nguyên")
      .min(0, "repetitions phải lớn hơn hoặc bằng 0")
      .default(0),
    lapses: z
      .number()
      .int("lapses phải là số nguyên")
      .min(0, "lapses phải lớn hơn hoặc bằng 0")
      .default(0),
    lastReviewedAt: z.string().datetime().or(z.string().min(1)).nullable().optional(),
    lastReviewed: z.string().datetime().or(z.string().min(1)).nullable().optional(),
    updatedAt: z.string().datetime().or(z.string().min(1)).optional(),
  })
  .refine((data) => !!(data.flashcardId || data.cardId), {
    message: "flashcardId hoặc cardId không được để trống",
    path: ["flashcardId"],
  })
  .refine((data) => !!(data.dueAt || data.due), {
    message: "dueAt hoặc due không được để trống",
    path: ["dueAt"],
  });

export const FlashcardCreateSchema = z.object({
  topicId: z.string().min(1, "Topic ID không được để trống"),
  noteId: z.string().nullable().optional(),
  resourceId: z.string().nullable().optional(),
  type: FlashcardTypeEnum,
  front: z.string().min(1, "Mặt trước không được để trống"),
  back: z.string({ message: "Mặt sau không được để trống" }),
  lifecycleStatus: FlashcardLifecycleStatusEnum.default("active"),
});

export const FlashcardCreateInputSchema = FlashcardCreateSchema;

export const FlashcardUpdateSchema = FlashcardCreateSchema.partial();

/**
 * Schema riêng biệt cho action "Tạm ngưng thẻ từ Duplicate Detection".
 *
 * Phân biệt với FlashcardUpdateSchema (PATCH chung) — schema này:
 * - Chỉ cho phép lifecycleStatus = "suspended" (literal, không phải enum toàn bộ).
 * - Bắt buộc expectedTopicId khi đang ở Topic-scoped mode.
 *   - Nếu có: server guard-check card.topicId === expectedTopicId → 403 nếu mismatch.
 *   - Nếu không có: Global Duplicate Dashboard flow — chỉ validate card tồn tại.
 * - Route riêng POST /api/flashcards/:id/suspend-duplicate để isolate intent.
 */
export const FlashcardSuspendDuplicateSchema = z.object({
  lifecycleStatus: z.literal("suspended", {
    message: "suspend-duplicate chỉ chấp nhận lifecycleStatus = 'suspended'",
  }),
  expectedTopicId: z
    .string()
    .min(1, "expectedTopicId không được để trống khi được cung cấp")
    .optional(),
});

export const FlashcardSchema = FlashcardCreateSchema.extend({
  id: z.string().min(1, "Flashcard ID không được để trống"),
  schedule: FlashcardScheduleSchema.optional(),
  createdAt: z.string().datetime().or(z.string().min(1)).optional(),
  updatedAt: z.string().datetime().or(z.string().min(1)).optional(),
});

export const FlashcardReviewCreateSchema = z
  .object({
    clientEventId: z.string().trim().min(1, "clientEventId không được để trống"),
    flashcardId: z.string().min(1, "flashcardId không được để trống").optional(),
    cardId: z.string().min(1, "cardId không được để trống").optional(),
    topicId: z.string().min(1, "Topic ID không được để trống"),
    rating: ReviewRatingEnum,
    reviewDurationMs: z
      .number()
      .int("reviewDurationMs phải là số nguyên")
      .min(0, "reviewDurationMs phải lớn hơn hoặc bằng 0"),
    reviewedAt: z.string().datetime().or(z.string().min(1)),
    stateBefore: FlashcardStateEnum,
    stateAfter: FlashcardStateEnum,
    intervalBefore: z.number().int().min(0, "intervalBefore phải lớn hơn hoặc bằng 0"),
    intervalAfter: z.number().int().min(0, "intervalAfter phải lớn hơn hoặc bằng 0"),
    easeFactorBefore: z.number().min(1.3).max(3.5),
    easeFactorAfter: z.number().min(1.3).max(3.5),
    dueBeforeAt: z.string().datetime().or(z.string().min(1)).optional(),
    dueBefore: z.string().datetime().or(z.string().min(1)).optional(),
    dueAfterAt: z.string().datetime().or(z.string().min(1)).optional(),
    dueAfter: z.string().datetime().or(z.string().min(1)).optional(),
  })
  .refine((data) => !!(data.flashcardId || data.cardId), {
    message: "flashcardId hoặc cardId không được để trống",
    path: ["flashcardId"],
  })
  .refine((data) => !!(data.dueBeforeAt || data.dueBefore), {
    message: "dueBeforeAt hoặc dueBefore không được để trống",
    path: ["dueBeforeAt"],
  })
  .refine((data) => !!(data.dueAfterAt || data.dueAfter), {
    message: "dueAfterAt hoặc dueAfter không được để trống",
    path: ["dueAfterAt"],
  });

export const FlashcardReviewSchema = FlashcardReviewCreateSchema.and(
  z.object({
    id: z.string().min(1, "Review ID không được để trống"),
  }),
);

export const FlashcardReviewInputSchema = z
  .object({
    clientEventId: z.string().trim().min(1, "clientEventId không được để trống"),
    flashcardId: z.string().min(1, "flashcardId không được để trống").optional(),
    cardId: z.string().min(1, "cardId không được để trống").optional(),
    topicId: z.string().min(1, "Topic ID không được để trống"),
    rating: ReviewRatingEnum,
    reviewDurationMs: z
      .number()
      .int("reviewDurationMs phải là số nguyên")
      .min(0, "reviewDurationMs phải lớn hơn hoặc bằng 0"),
  })
  .refine((data) => !!(data.flashcardId || data.cardId), {
    message: "flashcardId hoặc cardId không được để trống",
    path: ["flashcardId"],
  });

export const FlashcardReviewResponseSchema = z.object({
  success: z.boolean(),
  duplicate: z.boolean(),
  clientEventId: z.string().trim().min(1, "clientEventId không được để trống"),
  review: FlashcardReviewSchema,
  schedule: FlashcardScheduleSchema,
});

export type ValidatedFlashcard = z.infer<typeof FlashcardSchema>;
export type ValidatedFlashcardCreate = z.infer<typeof FlashcardCreateSchema>;
export type ValidatedFlashcardSchedule = z.infer<typeof FlashcardScheduleSchema>;
export type ValidatedFlashcardReview = z.infer<typeof FlashcardReviewSchema>;
export type ValidatedFlashcardReviewCreate = z.infer<typeof FlashcardReviewCreateSchema>;
export type ValidatedFlashcardReviewInput = z.infer<typeof FlashcardReviewInputSchema>;
export type ValidatedFlashcardReviewResponse = z.infer<typeof FlashcardReviewResponseSchema>;
export type ValidatedFlashcardSuspendDuplicate = z.infer<typeof FlashcardSuspendDuplicateSchema>;

