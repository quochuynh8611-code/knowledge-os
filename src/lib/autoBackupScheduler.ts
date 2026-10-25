/**
 * Guarded Auto-Backup Engine, Retention Rotation & Strict Integrity Verification
 * Phase 6A Core Reliability Engine
 *
 * Architecture Invariants:
 * 1. Zero-Data Overwrite Guard: Refuse to overwrite/rotate existing snapshots when candidate workspace is empty (0 entities),
 *    unless forceEmpty === true is explicitly passed.
 * 2. Deterministic Content Fingerprint & Deduplication: SHA-256 fingerprint over canonical entity content to skip redundant writes.
 * 3. Atomic Verify-Before-Rotate: Candidate preflight validation before recording; pruning occurs strictly after validation.
 * 4. Hermetic Test Guard Compliance (ADR-077): Pure deterministic scheduling and timestamp comparisons without active setInterval leaks.
 */

import { safeGetLocalStorageItem, safeSetLocalStorageItem, safeRemoveLocalStorageItem } from './storage';
import { sha256Sync } from './validation';

export type AutoBackupTrigger = 'auto' | 'manual' | 'pre-restore';

export interface AutoBackupPreferences {
  enabled: boolean;
  intervalMinutes: number;
  maxSnapshots: number;
}

export interface AutoBackupEntityCounts {
  categories: number;
  topics: number;
  notes: number;
  flashcards: number;
  resources: number;
  tags: number;
}

export interface WorkspaceBackupPayload {
  version?: string;
  exportedAt?: string;
  checksum?: string;
  categories?: unknown[];
  topics?: unknown[];
  notes?: unknown[];
  flashcards?: unknown[];
  resources?: unknown[];
  tags?: unknown[];
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AutoBackupCandidateInspection {
  valid: boolean;
  errors: string[];
  counts: AutoBackupEntityCounts;
  totalEntities: number;
  fingerprint: string;
  normalizedData: {
    categories: unknown[];
    topics: unknown[];
    notes: unknown[];
    flashcards: unknown[];
    resources: unknown[];
    tags: unknown[];
  };
}

export interface AutoBackupSnapshotRecord {
  id: string;
  createdAt: string;
  trigger: AutoBackupTrigger;
  label?: string;
  fingerprint: string;
  totalEntities: number;
  counts: AutoBackupEntityCounts;
  sizeBytes: number;
  payload: WorkspaceBackupPayload;
}

export interface GuardedBackupResult {
  status: 'created' | 'skipped-empty' | 'skipped-unchanged' | 'rejected-invalid';
  reason?: string;
  snapshot?: AutoBackupSnapshotRecord;
  retainedCount: number;
  fingerprint?: string;
}

// Storage Keys
export const AUTO_BACKUP_SNAPSHOTS_STORAGE_KEY = 'knowledge_os_auto_backup_snapshots_v1';
export const AUTO_BACKUP_PREFERENCES_STORAGE_KEY = 'knowledge_os_auto_backup_preferences_v1';

// Limits & Defaults
export const MIN_INTERVAL_MINUTES = 5;
export const MAX_INTERVAL_MINUTES = 1440; // 24 hours
export const DEFAULT_INTERVAL_MINUTES = 30;

export const MIN_SNAPSHOTS = 3;
export const MAX_SNAPSHOTS = 50;
export const DEFAULT_MAX_SNAPSHOTS = 10;

/**
 * Recursively sorts keys of an object to ensure deterministic canonical JSON serialization.
 */
function sortKeysRecursive(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sortKeysRecursive);
  }
  if (obj !== null && typeof obj === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysRecursive((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return obj;
}

/**
 * Stable sorting by 'id' if available.
 */
function sortByIdOrContent(a: unknown, b: unknown): number {
  const idA = a && typeof a === 'object' && 'id' in a ? String((a as Record<string, unknown>).id) : '';
  const idB = b && typeof b === 'object' && 'id' in b ? String((b as Record<string, unknown>).id) : '';
  if (idA && idB) {
    return idA.localeCompare(idB);
  }
  return 0;
}

/**
 * Computes deterministic SHA-256 content fingerprint across normalized research entities.
 * Invariant to exportedAt timestamps or root metadata envelopes.
 */
export function computeSnapshotFingerprint(
  normalizedData: AutoBackupCandidateInspection['normalizedData']
): string {
  const canonical = {
    categories: [...(normalizedData.categories || [])].sort(sortByIdOrContent),
    topics: [...(normalizedData.topics || [])].sort(sortByIdOrContent),
    notes: [...(normalizedData.notes || [])].sort(sortByIdOrContent),
    flashcards: [...(normalizedData.flashcards || [])].sort(sortByIdOrContent),
    resources: [...(normalizedData.resources || [])].sort(sortByIdOrContent),
    tags: [...(normalizedData.tags || [])].sort(sortByIdOrContent),
  };

  const jsonString = JSON.stringify(sortKeysRecursive(canonical));
  return sha256Sync(jsonString);
}

/**
 * Computes payload size in bytes safely across all environments.
 */
function computePayloadSizeBytes(payload: unknown): number {
  try {
    const json = JSON.stringify(payload);
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(json).length;
    }
    return json.length;
  } catch {
    return 0;
  }
}

/**
 * Inspects a candidate backup payload for structural integrity and entity counts.
 * Handles both Flat format and Semver 2.0 enveloped format transparently.
 */
export function inspectAutoBackupCandidate(payload: unknown): AutoBackupCandidateInspection {
  const emptyInspection: AutoBackupCandidateInspection = {
    valid: false,
    errors: [],
    counts: { categories: 0, topics: 0, notes: 0, flashcards: 0, resources: 0, tags: 0 },
    totalEntities: 0,
    fingerprint: '',
    normalizedData: { categories: [], topics: [], notes: [], flashcards: [], resources: [], tags: [] },
  };

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      ...emptyInspection,
      errors: ['Candidate payload must be a non-null object'],
    };
  }

  const rawObj = payload as Record<string, unknown>;
  const errors: string[] = [];

  const innerData =
    rawObj.data && typeof rawObj.data === 'object' && !Array.isArray(rawObj.data)
      ? (rawObj.data as Record<string, unknown>)
      : null;

  if (
    'data' in rawObj &&
    rawObj.data !== undefined &&
    (rawObj.data === null || typeof rawObj.data !== 'object' || Array.isArray(rawObj.data))
  ) {
    errors.push('Envelope field "data" must be an object if provided.');
  }

  const entityKeys = ['categories', 'topics', 'notes', 'flashcards', 'resources', 'tags'] as const;

  const extractCollection = (key: typeof entityKeys[number]): unknown[] => {
    // Check root first
    if (key in rawObj && rawObj[key] !== undefined) {
      if (Array.isArray(rawObj[key])) {
        return rawObj[key] as unknown[];
      }
      errors.push(`Field "${key}" must be an array if provided.`);
      return [];
    }
    // Check innerData if exists
    if (innerData && key in innerData && innerData[key] !== undefined) {
      if (Array.isArray(innerData[key])) {
        return innerData[key] as unknown[];
      }
      errors.push(`Inner data field "${key}" must be an array if provided.`);
      return [];
    }
    return [];
  };

  const categories = extractCollection('categories');
  const topics = extractCollection('topics');
  const notes = extractCollection('notes');
  const flashcards = extractCollection('flashcards');
  const resources = extractCollection('resources');
  const tags = extractCollection('tags');

  const normalizedData = {
    categories,
    topics,
    notes,
    flashcards,
    resources,
    tags,
  };

  const counts: AutoBackupEntityCounts = {
    categories: categories.length,
    topics: topics.length,
    notes: notes.length,
    flashcards: flashcards.length,
    resources: resources.length,
    tags: tags.length,
  };

  const totalEntities =
    counts.categories + counts.topics + counts.notes + counts.flashcards + counts.resources + counts.tags;

  const valid = errors.length === 0;
  const fingerprint = valid ? computeSnapshotFingerprint(normalizedData) : '';

  return {
    valid,
    errors,
    counts,
    totalEntities,
    fingerprint,
    normalizedData,
  };
}

/**
 * Retrieves persisted auto-backup preferences with safe defaults.
 */
export function getAutoBackupPreferences(): AutoBackupPreferences {
  const raw = safeGetLocalStorageItem(AUTO_BACKUP_PREFERENCES_STORAGE_KEY);
  if (!raw) {
    return {
      enabled: true,
      intervalMinutes: DEFAULT_INTERVAL_MINUTES,
      maxSnapshots: DEFAULT_MAX_SNAPSHOTS,
    };
  }

  try {
    const parsed = JSON.parse(raw);
    const enabled = typeof parsed.enabled === 'boolean' ? parsed.enabled : true;
    const intervalMinutes =
      typeof parsed.intervalMinutes === 'number'
        ? Math.max(MIN_INTERVAL_MINUTES, Math.min(MAX_INTERVAL_MINUTES, parsed.intervalMinutes))
        : DEFAULT_INTERVAL_MINUTES;
    const maxSnapshots =
      typeof parsed.maxSnapshots === 'number'
        ? Math.max(MIN_SNAPSHOTS, Math.min(MAX_SNAPSHOTS, parsed.maxSnapshots))
        : DEFAULT_MAX_SNAPSHOTS;

    return { enabled, intervalMinutes, maxSnapshots };
  } catch {
    return {
      enabled: true,
      intervalMinutes: DEFAULT_INTERVAL_MINUTES,
      maxSnapshots: DEFAULT_MAX_SNAPSHOTS,
    };
  }
}

/**
 * Updates auto-backup preferences, enforcing valid ranges and persisting to localStorage.
 */
export function saveAutoBackupPreferences(prefs: Partial<AutoBackupPreferences>): AutoBackupPreferences {
  const current = getAutoBackupPreferences();
  const next: AutoBackupPreferences = {
    enabled: typeof prefs.enabled === 'boolean' ? prefs.enabled : current.enabled,
    intervalMinutes:
      typeof prefs.intervalMinutes === 'number'
        ? Math.max(MIN_INTERVAL_MINUTES, Math.min(MAX_INTERVAL_MINUTES, prefs.intervalMinutes))
        : current.intervalMinutes,
    maxSnapshots:
      typeof prefs.maxSnapshots === 'number'
        ? Math.max(MIN_SNAPSHOTS, Math.min(MAX_SNAPSHOTS, prefs.maxSnapshots))
        : current.maxSnapshots,
  };

  safeSetLocalStorageItem(AUTO_BACKUP_PREFERENCES_STORAGE_KEY, JSON.stringify(next));
  return next;
}

/**
 * Evaluates whether an automated backup is due based on elapsed time and preferences.
 * Hermetic test safe: pure timestamp arithmetic with no timers.
 */
export function isAutoBackupDue(
  lastBackupIso: string | null | undefined,
  prefs?: AutoBackupPreferences,
  now?: Date
): boolean {
  const effectivePrefs = prefs ?? getAutoBackupPreferences();
  if (!effectivePrefs.enabled) {
    return false;
  }

  if (!lastBackupIso) {
    return true;
  }

  const lastBackupTime = new Date(lastBackupIso).getTime();
  if (isNaN(lastBackupTime)) {
    return true;
  }

  const currentTime = (now ?? new Date()).getTime();
  const elapsedMinutes = (currentTime - lastBackupTime) / (60 * 1000);
  return elapsedMinutes >= effectivePrefs.intervalMinutes;
}

/**
 * Retrieves all stored auto-backup snapshots in reverse-chronological order (newest first).
 */
export function getAutoBackupSnapshots(): AutoBackupSnapshotRecord[] {
  const raw = safeGetLocalStorageItem(AUTO_BACKUP_SNAPSHOTS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as AutoBackupSnapshotRecord[];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Retrieves a single snapshot by ID for inspection or restore.
 */
export function getAutoBackupSnapshotById(id: string): AutoBackupSnapshotRecord | null {
  const snapshots = getAutoBackupSnapshots();
  return snapshots.find((s) => s.id === id) || null;
}

/**
 * Deletes a single snapshot by ID.
 */
export function deleteAutoBackupSnapshot(id: string): AutoBackupSnapshotRecord[] {
  const snapshots = getAutoBackupSnapshots();
  const remaining = snapshots.filter((s) => s.id !== id);
  safeSetLocalStorageItem(AUTO_BACKUP_SNAPSHOTS_STORAGE_KEY, JSON.stringify(remaining));
  return remaining;
}

/**
 * Clears all auto-backup snapshots from storage.
 */
export function clearAutoBackupSnapshots(): void {
  safeRemoveLocalStorageItem(AUTO_BACKUP_SNAPSHOTS_STORAGE_KEY);
}

/**
 * Executes a guarded backup of the workspace payload:
 * 1. Preflight integrity inspection
 * 2. Zero-Data Overwrite Guard
 * 3. Deterministic content deduplication
 * 4. Atomic verify-before-rotate snapshot retention
 */
export function runGuardedAutoBackup(
  payload: unknown,
  options?: {
    trigger?: AutoBackupTrigger;
    label?: string;
    forceEmpty?: boolean;
    maxSnapshots?: number;
    now?: Date;
  }
): GuardedBackupResult {
  const existingSnapshots = getAutoBackupSnapshots();

  // 1. Preflight inspection
  const inspection = inspectAutoBackupCandidate(payload);
  if (!inspection.valid) {
    return {
      status: 'rejected-invalid',
      reason: inspection.errors.join('; '),
      retainedCount: existingSnapshots.length,
    };
  }

  // 2. Zero-Data Overwrite Guard
  if (inspection.totalEntities === 0 && !options?.forceEmpty) {
    return {
      status: 'skipped-empty',
      reason: 'Workspace is empty (0 entities). Auto-backup refused to overwrite history.',
      retainedCount: existingSnapshots.length,
    };
  }

  // 3. Deduplication check against the most recent snapshot
  const mostRecent = existingSnapshots[0];
  if (mostRecent && mostRecent.fingerprint === inspection.fingerprint) {
    return {
      status: 'skipped-unchanged',
      fingerprint: inspection.fingerprint,
      retainedCount: existingSnapshots.length,
    };
  }

  // 4. Create new snapshot record
  const timestamp = (options?.now ?? new Date()).toISOString();
  const trigger = options?.trigger ?? 'auto';
  const snapshotId = `auto-backup-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const newSnapshot: AutoBackupSnapshotRecord = {
    id: snapshotId,
    createdAt: timestamp,
    trigger,
    label: options?.label,
    fingerprint: inspection.fingerprint,
    totalEntities: inspection.totalEntities,
    counts: inspection.counts,
    sizeBytes: computePayloadSizeBytes(payload),
    payload: payload as WorkspaceBackupPayload,
  };

  // 5. Enforce retention limit (atomic rotate)
  const prefs = getAutoBackupPreferences();
  const requestedMax = typeof options?.maxSnapshots === 'number' ? options.maxSnapshots : prefs.maxSnapshots;
  const maxLimit = Math.max(MIN_SNAPSHOTS, Math.min(MAX_SNAPSHOTS, requestedMax));

  const rotatedSnapshots = [newSnapshot, ...existingSnapshots].slice(0, maxLimit);
  safeSetLocalStorageItem(AUTO_BACKUP_SNAPSHOTS_STORAGE_KEY, JSON.stringify(rotatedSnapshots));

  return {
    status: 'created',
    snapshot: newSnapshot,
    retainedCount: rotatedSnapshots.length,
    fingerprint: newSnapshot.fingerprint,
  };
}
