import { Category, Topic, Note, Resource, Tag } from '../types';
import {
  BackupSnapshotSchema,
  ValidatedBackupSnapshot,
  calculateBackupChecksum,
  validateBackupSnapshotPreflight,
} from './validation';
import { FileLibraryAuditSummary, normalizeFilePath } from './fileLibraryAudit';

export interface SnapshotEntityCounts {
  categories: number;
  topics: number;
  notes: number;
  resources: number;
  tags: number;
}

export interface SnapshotInspectionResult {
  isValid: boolean;
  hasLogicalData: boolean;
  includesPhysicalBinary: boolean;
  version?: string;
  checksumMatch?: boolean;
  entityCounts: SnapshotEntityCounts;
  error?: string;
}

export interface ManifestInspectionResult {
  isValid: boolean;
  manifestVersion?: string;
  totalEntries: number;
  resourceCount: number;
  noteCount: number;
  unverifiedCount: number;
  missingCount: number;
  outsideCount: number;
  error?: string;
}

export interface CalculateBackupReadinessOptions {
  categories: Category[];
  topics: Topic[];
  notes: Note[];
  resources: Resource[];
  tags: Tag[];
  libraryRootPath?: string;
  auditSummary?: FileLibraryAuditSummary;
}

export interface BackupReadinessReport {
  overallStatus: 'fully_ready' | 'ready_with_recommendations' | 'action_required';
  layers: {
    snapshot: {
      status: 'ready' | 'empty';
      isLogicalOnly: true;
      entityCounts: SnapshotEntityCounts;
    };
    manifest: {
      status: 'ready' | 'empty';
      totalReferences: number;
      outsideCount: number;
      missingCount: number;
    };
    physicalFiles: {
      status: 'ready' | 'action_required';
      hasOutsideFiles: boolean;
      outsideCount: number;
      missingCount: number;
      actionRecommendation: string;
    };
  };
  summary: {
    totalEntities: number;
    totalWithLocalPath: number;
    unverifiedCount: number;
    missingCount: number;
    outsideLibraryCount: number;
  };
}

export interface RestoreValidationResult {
  isValid: boolean;
  format: 'snapshot_v2' | 'legacy_json' | 'unknown';
  checksumMatch?: boolean;
  counts: SnapshotEntityCounts;
  snapshotData?: {
    categories: Category[];
    topics: Topic[];
    notes: Note[];
    resources: Resource[];
    tags: Tag[];
  };
  error?: string;
}

export interface RestorePreview {
  totalEntities: number;
  categoriesCount: number;
  topicsCount: number;
  notesCount: number;
  resourcesCount: number;
  tagsCount: number;
  sampleTopicTitles: string[];
  sampleNoteTitles: string[];
}

export interface AppDataState {
  categories: Category[];
  topics: Topic[];
  notes: Note[];
  resources: Resource[];
  tags: Tag[];
}

export interface RestoreDrillResult {
  drillSuccess: boolean;
  isDryRun: true;
  simulatedMode: 'merge' | 'replace';
  simulatedImpact: {
    categoriesDelta: number;
    topicsDelta: number;
    notesDelta: number;
    resourcesDelta: number;
    tagsDelta: number;
  };
  simulatedResultState: AppDataState;
  error?: string;
}

export interface OperatorDrillReadinessReport {
  isDrillReady: boolean;
  gate1Validation: {
    passed: boolean;
    format: RestoreValidationResult['format'];
    checksumMatch?: boolean;
    error?: string;
  };
  gate2DryRun: RestoreDrillResult;
  gate3Confirmation: {
    isDestructiveReplace: boolean;
    requiredPhrase: string;
  };
  evidenceRecord: {
    snapshotChecksum?: string;
    simulatedImpact: RestoreDrillResult['simulatedImpact'];
    timestamp: string;
  };
}

export interface RestoreDrillEvidenceCaptureOptions {
  evidenceId?: string;
  operatorSignOffStatus?: 'pending' | 'signed_off' | 'rejected';
  operatorNotes?: string;
  timestamp?: string;
}

export interface RestoreDrillEvidenceRecord {
  evidenceId: string;
  snapshotChecksum?: string;
  snapshotFormat: RestoreValidationResult['format'];
  validationStatus: 'valid' | 'invalid';
  dryRunStatus: 'simulated_success' | 'simulated_failed';
  simulatedMode: 'merge' | 'replace';
  simulatedImpact: {
    categoriesDelta: number;
    topicsDelta: number;
    notesDelta: number;
    resourcesDelta: number;
    tagsDelta: number;
  };
  gateSummary: {
    gate1Passed: boolean;
    gate2Passed: boolean;
    gate3Required: boolean;
    overallDrillReady: boolean;
  };
  timestamp: string;
  operatorSignOffStatus: 'pending' | 'signed_off' | 'rejected';
  operatorNotes?: string;
}

/**
 * Inspects a snapshot payload, validating format, entity presence, and confirming exclusion of binary files.
 */
export function inspectSnapshotPayload(payload: unknown): SnapshotInspectionResult {
  if (!payload || typeof payload !== 'object') {
    return {
      isValid: false,
      hasLogicalData: false,
      includesPhysicalBinary: false,
      entityCounts: { categories: 0, topics: 0, notes: 0, resources: 0, tags: 0 },
      error: 'Payload rỗng hoặc không phải đối tượng JSON hợp lệ',
    };
  }

  const preflight = validateBackupSnapshotPreflight(payload);
  if (preflight.valid && preflight.snapshot) {
    return {
      isValid: true,
      hasLogicalData: true,
      includesPhysicalBinary: false,
      version: preflight.snapshot.version,
      checksumMatch: preflight.checksumMatch,
      entityCounts: preflight.snapshot.counts,
    };
  }

  // Fallback for legacy JSON structures (e.g. { categories: [], topics: [] })
  const raw = payload as Record<string, unknown>;
  const categories = Array.isArray(raw.categories) ? raw.categories : [];
  const topics = Array.isArray(raw.topics) ? raw.topics : [];
  const notes = Array.isArray(raw.notes) ? raw.notes : [];
  const resources = Array.isArray(raw.resources) ? raw.resources : [];
  const tags = Array.isArray(raw.tags) ? raw.tags : [];

  const total = categories.length + topics.length + notes.length + resources.length + tags.length;
  if (total > 0) {
    return {
      isValid: true,
      hasLogicalData: true,
      includesPhysicalBinary: false,
      version: typeof raw.version === 'string' ? raw.version : 'legacy',
      checksumMatch: undefined,
      entityCounts: {
        categories: categories.length,
        topics: topics.length,
        notes: notes.length,
        resources: resources.length,
        tags: tags.length,
      },
    };
  }

  return {
    isValid: false,
    hasLogicalData: false,
    includesPhysicalBinary: false,
    entityCounts: { categories: 0, topics: 0, notes: 0, resources: 0, tags: 0 },
    error: preflight.error || 'Dữ liệu không chứa thực thể nào',
  };
}

/**
 * Inspects a File Library Manifest payload.
 */
export function inspectManifestPayload(payload: unknown): ManifestInspectionResult {
  if (!payload || typeof payload !== 'object') {
    return {
      isValid: false,
      totalEntries: 0,
      resourceCount: 0,
      noteCount: 0,
      unverifiedCount: 0,
      missingCount: 0,
      outsideCount: 0,
      error: 'Manifest không hợp lệ',
    };
  }

  const raw = payload as Record<string, unknown>;
  const entries = Array.isArray(raw.entries) ? raw.entries : [];
  const manifestVersion = typeof raw.manifestVersion === 'string' ? raw.manifestVersion : undefined;

  let resourceCount = 0;
  let noteCount = 0;
  let unverifiedCount = 0;
  let missingCount = 0;
  let outsideCount = 0;

  for (const entry of entries) {
    if (entry.sourceType === 'resource') resourceCount++;
    if (entry.sourceType === 'note') noteCount++;
    if (entry.status === 'unverified') unverifiedCount++;
    if (entry.status === 'missing') missingCount++;
    if (entry.status === 'outside_library') outsideCount++;
  }

  return {
    isValid: true,
    manifestVersion,
    totalEntries: entries.length,
    resourceCount,
    noteCount,
    unverifiedCount,
    missingCount,
    outsideCount,
  };
}

/**
 * Calculates a comprehensive Backup Readiness Report across the 3 layers.
 */
export function calculateBackupReadiness(options: CalculateBackupReadinessOptions): BackupReadinessReport {
  const { categories, topics, notes, resources, tags, libraryRootPath, auditSummary } = options;

  const totalEntities = categories.length + topics.length + notes.length + resources.length + tags.length;
  const snapshotStatus: 'ready' | 'empty' = totalEntities > 0 ? 'ready' : 'empty';

  const totalWithLocalPath = auditSummary?.totalWithLocalPath ?? 0;
  const manifestStatus: 'ready' | 'empty' = totalWithLocalPath > 0 ? 'ready' : 'empty';

  const missingCount = auditSummary?.missingCount ?? 0;
  const outsideCount = auditSummary?.outsideLibraryCount ?? 0;
  const unverifiedCount = auditSummary?.unverifiedCount ?? 0;
  const hasOutsideFiles = outsideCount > 0;

  let physicalActionRecommendation = 'Bắt buộc sao chép toàn bộ thư mục tệp vật lý (Knowledge-Library) sang ổ cứng ngoài hoặc lưu trữ đám mây.';
  if (missingCount > 0) {
    physicalActionRecommendation = `Cảnh báo: Có ${missingCount} tệp thất lạc không tìm thấy đường dẫn. Vui lòng kiểm tra lại trước khi sao lưu.`;
  } else if (hasOutsideFiles) {
    physicalActionRecommendation = `Cảnh báo: Có ${outsideCount} tệp nằm ngoài thư viện gốc (${libraryRootPath || 'chưa đặt'}). Hãy gom các tệp này vào thư mục chuẩn để tránh bị bỏ sót khi sao lưu.`;
  }

  const physicalStatus: 'ready' | 'action_required' = missingCount > 0 || hasOutsideFiles || totalWithLocalPath > 0 ? 'action_required' : 'ready';

  let overallStatus: 'fully_ready' | 'ready_with_recommendations' | 'action_required' = 'ready_with_recommendations';
  if (missingCount > 0) {
    overallStatus = 'action_required';
  } else if (totalEntities > 0 && outsideCount === 0 && missingCount === 0) {
    overallStatus = 'ready_with_recommendations';
  }

  return {
    overallStatus,
    layers: {
      snapshot: {
        status: snapshotStatus,
        isLogicalOnly: true,
        entityCounts: {
          categories: categories.length,
          topics: topics.length,
          notes: notes.length,
          resources: resources.length,
          tags: tags.length,
        },
      },
      manifest: {
        status: manifestStatus,
        totalReferences: totalWithLocalPath,
        outsideCount,
        missingCount,
      },
      physicalFiles: {
        status: physicalStatus,
        hasOutsideFiles,
        outsideCount,
        missingCount,
        actionRecommendation: physicalActionRecommendation,
      },
    },
    summary: {
      totalEntities,
      totalWithLocalPath,
      unverifiedCount,
      missingCount,
      outsideLibraryCount: outsideCount,
    },
  };
}

/**
 * Validates a candidate restore payload (Semver 2.x or legacy) in memory.
 */
export function validateRestoreCandidate(payload: unknown): RestoreValidationResult {
  if (!payload || typeof payload !== 'object') {
    return {
      isValid: false,
      format: 'unknown',
      counts: { categories: 0, topics: 0, notes: 0, resources: 0, tags: 0 },
      error: 'Dữ liệu khôi phục không hợp lệ',
    };
  }

  // 1. Try Semver 2.x BackupSnapshot
  const preflight = validateBackupSnapshotPreflight(payload);
  if (preflight.valid && preflight.snapshot) {
    return {
      isValid: true,
      format: 'snapshot_v2',
      checksumMatch: preflight.checksumMatch,
      counts: preflight.snapshot.counts,
      snapshotData: preflight.snapshot.data as unknown as {
        categories: Category[];
        topics: Topic[];
        notes: Note[];
        resources: Resource[];
        tags: Tag[];
      },
    };
  }

  if (preflight.checksumMatch === false) {
    return {
      isValid: false,
      format: 'snapshot_v2',
      checksumMatch: false,
      counts: { categories: 0, topics: 0, notes: 0, resources: 0, tags: 0 },
      error: preflight.error || 'SHA-256 Checksum không khớp',
    };
  }

  // 2. Try Legacy JSON Format
  const raw = payload as Record<string, unknown>;
  const categories = (Array.isArray(raw.categories) ? raw.categories : []) as Category[];
  const topics = (Array.isArray(raw.topics) ? raw.topics : []) as Topic[];
  const notes = (Array.isArray(raw.notes) ? raw.notes : []) as Note[];
  const resources = (Array.isArray(raw.resources) ? raw.resources : []) as Resource[];
  const tags = (Array.isArray(raw.tags) ? raw.tags : []) as Tag[];

  const total = categories.length + topics.length + notes.length + resources.length + tags.length;
  if (total > 0) {
    return {
      isValid: true,
      format: 'legacy_json',
      checksumMatch: undefined,
      counts: {
        categories: categories.length,
        topics: topics.length,
        notes: notes.length,
        resources: resources.length,
        tags: tags.length,
      },
      snapshotData: { categories, topics, notes, resources, tags },
    };
  }

  return {
    isValid: false,
    format: 'unknown',
    counts: { categories: 0, topics: 0, notes: 0, resources: 0, tags: 0 },
    error: preflight.error || 'Cấu trúc snapshot không đúng chuẩn Semver 2.x hoặc JSON hợp lệ',
  };
}

/**
 * Builds a preview of entities to be restored without altering live state.
 */
export function buildRestorePreview(payload: unknown): RestorePreview {
  const validated = validateRestoreCandidate(payload);
  if (!validated.isValid || !validated.snapshotData) {
    return {
      totalEntities: 0,
      categoriesCount: 0,
      topicsCount: 0,
      notesCount: 0,
      resourcesCount: 0,
      tagsCount: 0,
      sampleTopicTitles: [],
      sampleNoteTitles: [],
    };
  }

  const { categories, topics, notes, resources, tags } = validated.snapshotData;
  return {
    totalEntities: categories.length + topics.length + notes.length + resources.length + tags.length,
    categoriesCount: categories.length,
    topicsCount: topics.length,
    notesCount: notes.length,
    resourcesCount: resources.length,
    tagsCount: tags.length,
    sampleTopicTitles: topics.slice(0, 5).map((t) => t.title),
    sampleNoteTitles: notes.slice(0, 5).map((n) => n.title),
  };
}

/**
 * Pure simulation function: Runs a dry-run in-memory restore drill without mutating live state.
 */
export function runRestoreDrill(
  payload: unknown,
  currentState: AppDataState,
  options: { mode?: 'merge' | 'replace' } = {}
): RestoreDrillResult {
  const mode = options.mode || 'merge';
  const validated = validateRestoreCandidate(payload);

  if (!validated.isValid || !validated.snapshotData) {
    return {
      drillSuccess: false,
      isDryRun: true,
      simulatedMode: mode,
      simulatedImpact: {
        categoriesDelta: 0,
        topicsDelta: 0,
        notesDelta: 0,
        resourcesDelta: 0,
        tagsDelta: 0,
      },
      simulatedResultState: {
        categories: [...currentState.categories],
        topics: [...currentState.topics],
        notes: [...currentState.notes],
        resources: [...currentState.resources],
        tags: [...currentState.tags],
      },
      error: validated.error || 'Thẩm định snapshot thất bại',
    };
  }

  const incoming = validated.snapshotData;

  if (mode === 'replace') {
    return {
      drillSuccess: true,
      isDryRun: true,
      simulatedMode: 'replace',
      simulatedImpact: {
        categoriesDelta: incoming.categories.length - currentState.categories.length,
        topicsDelta: incoming.topics.length - currentState.topics.length,
        notesDelta: incoming.notes.length - currentState.notes.length,
        resourcesDelta: incoming.resources.length - currentState.resources.length,
        tagsDelta: incoming.tags.length - currentState.tags.length,
      },
      simulatedResultState: {
        categories: [...incoming.categories],
        topics: [...incoming.topics],
        notes: [...incoming.notes],
        resources: [...incoming.resources],
        tags: [...incoming.tags],
      },
    };
  }

  // Merge mode simulation
  const mergeById = <T extends { id: string }>(current: T[], inc: T[]): T[] => {
    const map = new Map<string, T>();
    current.forEach((item) => map.set(item.id, item));
    inc.forEach((item) => map.set(item.id, item));
    return Array.from(map.values());
  };

  const simulatedCategories = mergeById(currentState.categories, incoming.categories);
  const simulatedTopics = mergeById(currentState.topics, incoming.topics);
  const simulatedNotes = mergeById(currentState.notes, incoming.notes);
  const simulatedResources = mergeById(currentState.resources, incoming.resources);
  const simulatedTags = mergeById(currentState.tags, incoming.tags);

  return {
    drillSuccess: true,
    isDryRun: true,
    simulatedMode: 'merge',
    simulatedImpact: {
      categoriesDelta: simulatedCategories.length - currentState.categories.length,
      topicsDelta: simulatedTopics.length - currentState.topics.length,
      notesDelta: simulatedNotes.length - currentState.notes.length,
      resourcesDelta: simulatedResources.length - currentState.resources.length,
      tagsDelta: simulatedTags.length - currentState.tags.length,
    },
    simulatedResultState: {
      categories: simulatedCategories,
      topics: simulatedTopics,
      notes: simulatedNotes,
      resources: simulatedResources,
      tags: simulatedTags,
    },
  };
}

/**
 * Aggregates Gate 1 (Validation), Gate 2 (In-Memory Dry Run), and Gate 3 (Confirmation Requirements)
 * into a standardized Operator Drill Readiness certificate report without mutating live state.
 */
export function evaluateRestoreDrillReadiness(
  payload: unknown,
  currentState: AppDataState,
  options: { mode: 'merge' | 'replace' } = { mode: 'merge' }
): OperatorDrillReadinessReport {
  const candidateVal = validateRestoreCandidate(payload);
  const drillResult = runRestoreDrill(payload, currentState, options);
  const isDestructiveReplace = options.mode === 'replace';

  const isDrillReady = candidateVal.isValid && drillResult.drillSuccess;

  return {
    isDrillReady,
    gate1Validation: {
      passed: candidateVal.isValid,
      format: candidateVal.format,
      checksumMatch: candidateVal.checksumMatch,
      error: candidateVal.error,
    },
    gate2DryRun: drillResult,
    gate3Confirmation: {
      isDestructiveReplace,
      requiredPhrase: 'XÁC NHẬN THAY THẾ',
    },
    evidenceRecord: {
      snapshotChecksum: (payload as any)?.checksum,
      simulatedImpact: drillResult.simulatedImpact,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Captures an immutable RestoreDrillEvidenceRecord from an OperatorDrillReadinessReport
 * for audit logging, dry-run tracking, and operator sign-off without mutating live state.
 */
export function captureRestoreDrillEvidence(
  readinessReport: OperatorDrillReadinessReport,
  options?: RestoreDrillEvidenceCaptureOptions
): RestoreDrillEvidenceRecord {
  const timestamp =
    options?.timestamp ||
    readinessReport.evidenceRecord?.timestamp ||
    new Date().toISOString();

  const evidenceId =
    options?.evidenceId ||
    `drill-ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const validationStatus: 'valid' | 'invalid' = readinessReport.gate1Validation.passed
    ? 'valid'
    : 'invalid';

  const dryRunStatus: 'simulated_success' | 'simulated_failed' = readinessReport.gate2DryRun.drillSuccess
    ? 'simulated_success'
    : 'simulated_failed';

  const simulatedImpact = {
    categoriesDelta: readinessReport.gate2DryRun.simulatedImpact.categoriesDelta,
    topicsDelta: readinessReport.gate2DryRun.simulatedImpact.topicsDelta,
    notesDelta: readinessReport.gate2DryRun.simulatedImpact.notesDelta,
    resourcesDelta: readinessReport.gate2DryRun.simulatedImpact.resourcesDelta,
    tagsDelta: readinessReport.gate2DryRun.simulatedImpact.tagsDelta,
  };

  const gateSummary = {
    gate1Passed: Boolean(readinessReport.gate1Validation.passed),
    gate2Passed: Boolean(readinessReport.gate2DryRun.drillSuccess),
    gate3Required: Boolean(readinessReport.gate3Confirmation.isDestructiveReplace),
    overallDrillReady: Boolean(readinessReport.isDrillReady),
  };

  const record: RestoreDrillEvidenceRecord = {
    evidenceId,
    snapshotChecksum: readinessReport.evidenceRecord.snapshotChecksum,
    snapshotFormat: readinessReport.gate1Validation.format,
    validationStatus,
    dryRunStatus,
    simulatedMode: readinessReport.gate2DryRun.simulatedMode,
    simulatedImpact,
    gateSummary,
    timestamp,
    operatorSignOffStatus: options?.operatorSignOffStatus || 'pending',
  };

  if (options?.operatorNotes !== undefined) {
    record.operatorNotes = options.operatorNotes;
  }

  return record;
}

export interface SerializeEvidenceOptions {
  pretty?: boolean;
}

export type EvidenceValidationResult =
  | { valid: true; evidence: RestoreDrillEvidenceRecord; error?: undefined }
  | { valid: false; evidence?: undefined; error: string };

/**
 * Serializes a RestoreDrillEvidenceRecord into a deterministic, formatted JSON string.
 */
export function serializeRestoreDrillEvidenceJSON(
  evidence: RestoreDrillEvidenceRecord,
  options: SerializeEvidenceOptions = { pretty: true }
): string {
  const ordered: Record<string, unknown> = {
    evidenceId: evidence.evidenceId,
    snapshotChecksum: evidence.snapshotChecksum,
    snapshotFormat: evidence.snapshotFormat,
    validationStatus: evidence.validationStatus,
    dryRunStatus: evidence.dryRunStatus,
    simulatedMode: evidence.simulatedMode,
    simulatedImpact: {
      categoriesDelta: evidence.simulatedImpact.categoriesDelta,
      topicsDelta: evidence.simulatedImpact.topicsDelta,
      notesDelta: evidence.simulatedImpact.notesDelta,
      resourcesDelta: evidence.simulatedImpact.resourcesDelta,
      tagsDelta: evidence.simulatedImpact.tagsDelta,
    },
    gateSummary: {
      gate1Passed: evidence.gateSummary.gate1Passed,
      gate2Passed: evidence.gateSummary.gate2Passed,
      gate3Required: evidence.gateSummary.gate3Required,
      overallDrillReady: evidence.gateSummary.overallDrillReady,
    },
    timestamp: evidence.timestamp,
    operatorSignOffStatus: evidence.operatorSignOffStatus,
  };

  if (evidence.operatorNotes !== undefined) {
    ordered.operatorNotes = evidence.operatorNotes;
  }

  const space = options.pretty !== false ? 2 : undefined;
  return JSON.stringify(ordered, null, space);
}

/**
 * Generates a safe export filename for RestoreDrillEvidenceRecord with path traversal protection.
 */
export function formatRestoreDrillEvidenceFilename(
  evidence: RestoreDrillEvidenceRecord
): string {
  const dateStr =
    (evidence.timestamp && evidence.timestamp.slice(0, 10)) ||
    new Date().toISOString().slice(0, 10);

  const safeId = (evidence.evidenceId || 'record')
    .replace(/\.\./g, '-')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `knowledge-os-restore-drill-evidence-${dateStr}-${safeId || 'record'}.json`;
}

/**
 * Validates a raw JSON string or object against the RestoreDrillEvidenceRecord contract.
 * Returns an isolated deep-copy on success.
 */
export function validateRestoreDrillEvidenceJSON(
  rawInput: unknown
): EvidenceValidationResult {
  let parsed: unknown = rawInput;

  if (typeof rawInput === 'string') {
    try {
      parsed = JSON.parse(rawInput);
    } catch (err) {
      return {
        valid: false,
        error: `JSON syntax error: ${(err as Error).message}`,
      };
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      valid: false,
      error: 'Bản ghi bằng chứng phải là một đối tượng JSON hợp lệ',
    };
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.evidenceId !== 'string' || obj.evidenceId.trim().length === 0) {
    return { valid: false, error: 'Trường evidenceId không được để trống' };
  }

  const validFormats = ['snapshot_v2', 'legacy_json', 'unknown'];
  if (!validFormats.includes(obj.snapshotFormat as string)) {
    return { valid: false, error: 'Trường snapshotFormat không hợp lệ' };
  }

  const validValidationStatuses = ['valid', 'invalid'];
  if (!validValidationStatuses.includes(obj.validationStatus as string)) {
    return { valid: false, error: 'Trường validationStatus không hợp lệ' };
  }

  const validDryRunStatuses = ['simulated_success', 'simulated_failed'];
  if (!validDryRunStatuses.includes(obj.dryRunStatus as string)) {
    return { valid: false, error: 'Trường dryRunStatus không hợp lệ' };
  }

  const validModes = ['merge', 'replace'];
  if (!validModes.includes(obj.simulatedMode as string)) {
    return { valid: false, error: 'Trường simulatedMode không hợp lệ' };
  }

  if (!obj.simulatedImpact || typeof obj.simulatedImpact !== 'object') {
    return { valid: false, error: 'Trường simulatedImpact không hợp lệ' };
  }

  const impact = obj.simulatedImpact as Record<string, unknown>;
  const deltaFields = ['categoriesDelta', 'topicsDelta', 'notesDelta', 'resourcesDelta', 'tagsDelta'];
  for (const field of deltaFields) {
    if (typeof impact[field] !== 'number' || isNaN(impact[field] as number)) {
      return { valid: false, error: `simulatedImpact.${field} phải là số hợp lệ` };
    }
  }

  if (!obj.gateSummary || typeof obj.gateSummary !== 'object') {
    return { valid: false, error: 'Trường gateSummary không hợp lệ' };
  }

  const gates = obj.gateSummary as Record<string, unknown>;
  const gateFields = ['gate1Passed', 'gate2Passed', 'gate3Required', 'overallDrillReady'];
  for (const field of gateFields) {
    if (typeof gates[field] !== 'boolean') {
      return { valid: false, error: `gateSummary.${field} phải là boolean hợp lệ` };
    }
  }

  if (typeof obj.timestamp !== 'string' || isNaN(Date.parse(obj.timestamp))) {
    return { valid: false, error: 'Trường timestamp phải là chuỗi ngày giờ ISO 8601 hợp lệ' };
  }

  const validSignOffStatuses = ['pending', 'signed_off', 'rejected'];
  if (!validSignOffStatuses.includes(obj.operatorSignOffStatus as string)) {
    return { valid: false, error: 'Trường operatorSignOffStatus không hợp lệ' };
  }

  const evidenceRecord: RestoreDrillEvidenceRecord = {
    evidenceId: obj.evidenceId as string,
    snapshotChecksum: typeof obj.snapshotChecksum === 'string' ? obj.snapshotChecksum : undefined,
    snapshotFormat: obj.snapshotFormat as RestoreValidationResult['format'],
    validationStatus: obj.validationStatus as 'valid' | 'invalid',
    dryRunStatus: obj.dryRunStatus as 'simulated_success' | 'simulated_failed',
    simulatedMode: obj.simulatedMode as 'merge' | 'replace',
    simulatedImpact: {
      categoriesDelta: impact.categoriesDelta as number,
      topicsDelta: impact.topicsDelta as number,
      notesDelta: impact.notesDelta as number,
      resourcesDelta: impact.resourcesDelta as number,
      tagsDelta: impact.tagsDelta as number,
    },
    gateSummary: {
      gate1Passed: Boolean(gates.gate1Passed),
      gate2Passed: Boolean(gates.gate2Passed),
      gate3Required: Boolean(gates.gate3Required),
      overallDrillReady: Boolean(gates.overallDrillReady),
    },
    timestamp: obj.timestamp as string,
    operatorSignOffStatus: obj.operatorSignOffStatus as 'pending' | 'signed_off' | 'rejected',
  };

  if (typeof obj.operatorNotes === 'string') {
    evidenceRecord.operatorNotes = obj.operatorNotes;
  }

  return {
    valid: true,
    evidence: evidenceRecord,
  };
}
