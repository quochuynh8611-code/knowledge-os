import { Resource, Note } from '../types';

export type FileReferenceStatus =
  | 'exists'
  | 'missing'
  | 'outside_library'
  | 'unspecified'
  | 'unverified';

export interface FileReferenceEntry {
  id: string;
  sourceType: 'resource' | 'note';
  title: string;
  topicId: string;
  topicTitle?: string;
  rawPath?: string;
  resolvedPath?: string;
  relativeToRoot?: string;
  status: FileReferenceStatus;
  sizeBytes?: number;
  mimeType?: string;
  lastCheckedAt: string;
}

export interface FileLibraryAuditSummary {
  totalItems: number;
  totalWithLocalPath: number;
  existingCount: number;
  missingCount: number;
  outsideLibraryCount: number;
  unspecifiedCount: number;
  unverifiedCount: number;
  totalFileSizeBytes: number;
  libraryRootPath?: string;
  auditedAt: string;
}

export interface FileLibraryManifest {
  manifestVersion: '1.0';
  exportedAt: string;
  libraryRootPath?: string;
  summary: FileLibraryAuditSummary;
  entries: FileReferenceEntry[];
}

export interface AuditFileReferencesOptions {
  libraryRootPath?: string;
  fileExistsChecker?: (path: string) => boolean;
  fileSizeGetter?: (path: string) => number;
  auditedAt?: string;
}

export interface RecommendedSubdirectory {
  name: string;
  description: string;
}

export interface RecommendedLibraryStructure {
  rootName: string;
  subdirectories: RecommendedSubdirectory[];
}

/**
 * Returns the canonical recommended folder hierarchy for local research assets.
 */
export function getRecommendedLibraryStructure(): RecommendedLibraryStructure {
  return {
    rootName: 'Knowledge-Library',
    subdirectories: [
      { name: 'PDF', description: 'Sách, giáo trình, bài báo học thuật, luận văn PDF' },
      { name: 'Notes', description: 'Bản dịch thô, trích yếu, tệp Markdown ghi chép ngoài' },
      { name: 'Attachments', description: 'Biểu đồ, hình ảnh minh họa, tệp âm thanh/video bài giảng' },
      { name: 'Inbox', description: 'Tài liệu mới thu thập chờ phân loại và gắn vào topic' },
      { name: 'Exports', description: 'Nơi lưu trữ các tệp Snapshot JSON và File Manifest JSON' },
    ],
  };
}

/**
 * Validates a user-entered library root path.
 */
export function validateLibraryRootPath(path?: string): { valid: boolean; error?: string } {
  if (!path || typeof path !== 'string' || !path.trim()) {
    return { valid: false, error: 'Đường dẫn thư mục gốc không được để trống' };
  }
  return { valid: true };
}

/**
 * Normalizes file paths:
 * - Trims whitespace
 * - Replaces Windows backslashes with POSIX forward slashes
 * - Collapses consecutive slashes (except protocol/root markers)
 * - Removes trailing slashes unless root
 */
export function normalizeFilePath(rawPath?: string): string {
  if (!rawPath || typeof rawPath !== 'string') return '';
  const trimmed = rawPath.trim();
  if (!trimmed) return '';

  // Replace backslashes with forward slashes
  let normalized = trimmed.replace(/\\+/g, '/');

  // Collapse redundant slashes while preserving drive letter or leading slash
  normalized = normalized.replace(/\/{2,}/g, '/');

  // Strip trailing slash if longer than 1 char (and not drive root like C:/)
  if (normalized.length > 1 && normalized.endsWith('/') && !normalized.match(/^[a-zA-Z]:\/$/)) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

/**
 * Classifies whether a normalized file path is inside or outside a canonical library root.
 * Guarantees boundary safety (e.g. /Library/Books-Archive is NOT inside /Library/Books).
 */
export function classifyPathRelativeToRoot(
  resolvedPath?: string,
  libraryRootPath?: string
): 'inside' | 'outside' | 'no_root' {
  if (!resolvedPath || typeof resolvedPath !== 'string') return 'no_root';
  if (!libraryRootPath || typeof libraryRootPath !== 'string') return 'no_root';

  const normPath = normalizeFilePath(resolvedPath);
  const normRoot = normalizeFilePath(libraryRootPath);

  if (!normPath || !normRoot) return 'no_root';

  // Exact match with root directory
  if (normPath === normRoot) return 'inside';

  // Check if normPath is a proper descendant of normRoot
  const rootWithSlash = normRoot.endsWith('/') ? normRoot : `${normRoot}/`;
  if (normPath.startsWith(rootWithSlash)) {
    return 'inside';
  }

  return 'outside';
}

/**
 * Computes a relative path string from canonical root if inside.
 */
export function computeRelativePath(
  resolvedPath?: string,
  libraryRootPath?: string
): string | undefined {
  if (!resolvedPath || !libraryRootPath) return undefined;
  const normPath = normalizeFilePath(resolvedPath);
  const normRoot = normalizeFilePath(libraryRootPath);

  if (!normPath || !normRoot) return undefined;
  if (normPath === normRoot) return '.';

  const rootWithSlash = normRoot.endsWith('/') ? normRoot : `${normRoot}/`;
  if (normPath.startsWith(rootWithSlash)) {
    return normPath.slice(rootWithSlash.length);
  }

  return undefined;
}

/**
 * Pure audit function: Evaluates file paths against filesystem checker and library root.
 * Does not mutate inputs or perform uncontrolled side-effects.
 */
export function auditFileReferences(
  resources: Resource[] = [],
  notes: Note[] = [],
  options: AuditFileReferencesOptions = {}
): { summary: FileLibraryAuditSummary; entries: FileReferenceEntry[] } {
  const auditedAt = options.auditedAt || new Date().toISOString();
  const libraryRootPath = options.libraryRootPath ? normalizeFilePath(options.libraryRootPath) : undefined;
  const fileExistsChecker = options.fileExistsChecker;
  const fileSizeGetter = options.fileSizeGetter;

  const entries: FileReferenceEntry[] = [];

  let totalWithLocalPath = 0;
  let existingCount = 0;
  let missingCount = 0;
  let outsideLibraryCount = 0;
  let unspecifiedCount = 0;
  let unverifiedCount = 0;
  let totalFileSizeBytes = 0;

  // 1. Audit Resources
  for (const resource of resources) {
    const rawPath = resource.filePath;
    const normPath = normalizeFilePath(rawPath);

    if (!normPath) {
      // No local file path specified (e.g., Web URL only or empty)
      unspecifiedCount++;
      entries.push({
        id: resource.id,
        sourceType: 'resource',
        title: resource.title,
        topicId: resource.topicId,
        topicTitle: resource.topicTitle,
        status: 'unspecified',
        lastCheckedAt: auditedAt,
      });
      continue;
    }

    totalWithLocalPath++;

    // Check if we have a filesystem checker available
    if (fileExistsChecker) {
      const exists = fileExistsChecker(normPath);

      if (!exists) {
        missingCount++;
        entries.push({
          id: resource.id,
          sourceType: 'resource',
          title: resource.title,
          topicId: resource.topicId,
          topicTitle: resource.topicTitle,
          rawPath,
          resolvedPath: normPath,
          status: 'missing',
          lastCheckedAt: auditedAt,
        });
      } else {
        const pathClass = classifyPathRelativeToRoot(normPath, libraryRootPath);
        const sizeBytes = fileSizeGetter ? fileSizeGetter(normPath) : undefined;
        if (sizeBytes && sizeBytes > 0) {
          totalFileSizeBytes += sizeBytes;
        }

        if (pathClass === 'outside') {
          outsideLibraryCount++;
          entries.push({
            id: resource.id,
            sourceType: 'resource',
            title: resource.title,
            topicId: resource.topicId,
            topicTitle: resource.topicTitle,
            rawPath,
            resolvedPath: normPath,
            status: 'outside_library',
            sizeBytes,
            lastCheckedAt: auditedAt,
          });
        } else {
          existingCount++;
          entries.push({
            id: resource.id,
            sourceType: 'resource',
            title: resource.title,
            topicId: resource.topicId,
            topicTitle: resource.topicTitle,
            rawPath,
            resolvedPath: normPath,
            relativeToRoot: computeRelativePath(normPath, libraryRootPath),
            status: 'exists',
            sizeBytes,
            lastCheckedAt: auditedAt,
          });
        }
      }
    } else {
      // In browser or environments without direct filesystem access
      const pathClass = classifyPathRelativeToRoot(normPath, libraryRootPath);
      const isOutside = pathClass === 'outside';
      if (isOutside) {
        outsideLibraryCount++;
      } else {
        unverifiedCount++;
      }
      entries.push({
        id: resource.id,
        sourceType: 'resource',
        title: resource.title,
        topicId: resource.topicId,
        topicTitle: resource.topicTitle,
        rawPath,
        resolvedPath: normPath,
        relativeToRoot: computeRelativePath(normPath, libraryRootPath),
        status: isOutside ? 'outside_library' : 'unverified',
        lastCheckedAt: auditedAt,
      });
    }
  }

  // 2. Audit Notes (if note has sourcePath metadata)
  for (const note of notes) {
    const rawPath = note.sourcePath;
    const normPath = normalizeFilePath(rawPath);

    if (!normPath) {
      unspecifiedCount++;
      entries.push({
        id: note.id,
        sourceType: 'note',
        title: note.title,
        topicId: note.topicId,
        topicTitle: note.topicTitle,
        status: 'unspecified',
        lastCheckedAt: auditedAt,
      });
      continue;
    }

    totalWithLocalPath++;

    if (fileExistsChecker) {
      const exists = fileExistsChecker(normPath);
      if (!exists) {
        missingCount++;
        entries.push({
          id: note.id,
          sourceType: 'note',
          title: note.title,
          topicId: note.topicId,
          topicTitle: note.topicTitle,
          rawPath,
          resolvedPath: normPath,
          status: 'missing',
          lastCheckedAt: auditedAt,
        });
      } else {
        const pathClass = classifyPathRelativeToRoot(normPath, libraryRootPath);
        const sizeBytes = fileSizeGetter ? fileSizeGetter(normPath) : undefined;
        if (sizeBytes && sizeBytes > 0) {
          totalFileSizeBytes += sizeBytes;
        }

        if (pathClass === 'outside') {
          outsideLibraryCount++;
          entries.push({
            id: note.id,
            sourceType: 'note',
            title: note.title,
            topicId: note.topicId,
            topicTitle: note.topicTitle,
            rawPath,
            resolvedPath: normPath,
            status: 'outside_library',
            sizeBytes,
            lastCheckedAt: auditedAt,
          });
        } else {
          existingCount++;
          entries.push({
            id: note.id,
            sourceType: 'note',
            title: note.title,
            topicId: note.topicId,
            topicTitle: note.topicTitle,
            rawPath,
            resolvedPath: normPath,
            relativeToRoot: computeRelativePath(normPath, libraryRootPath),
            status: 'exists',
            sizeBytes,
            lastCheckedAt: auditedAt,
          });
        }
      }
    } else {
      const pathClass = classifyPathRelativeToRoot(normPath, libraryRootPath);
      const isOutside = pathClass === 'outside';
      if (isOutside) {
        outsideLibraryCount++;
      } else {
        unverifiedCount++;
      }
      entries.push({
        id: note.id,
        sourceType: 'note',
        title: note.title,
        topicId: note.topicId,
        topicTitle: note.topicTitle,
        rawPath,
        resolvedPath: normPath,
        relativeToRoot: computeRelativePath(normPath, libraryRootPath),
        status: isOutside ? 'outside_library' : 'unverified',
        lastCheckedAt: auditedAt,
      });
    }
  }

  const summary: FileLibraryAuditSummary = {
    totalItems: resources.length + notes.length,
    totalWithLocalPath,
    existingCount,
    missingCount,
    outsideLibraryCount,
    unspecifiedCount,
    unverifiedCount,
    totalFileSizeBytes,
    libraryRootPath,
    auditedAt,
  };

  return { summary, entries };
}

/**
 * Serializes the audit result into a standard File Library Manifest format.
 */
export function generateFileLibraryManifest(
  auditResult: { summary: FileLibraryAuditSummary; entries: FileReferenceEntry[] },
  options?: { libraryRootPath?: string; exportedAt?: string }
): FileLibraryManifest {
  const exportedAt = options?.exportedAt || new Date().toISOString();
  const libraryRootPath = options?.libraryRootPath || auditResult.summary.libraryRootPath;

  return {
    manifestVersion: '1.0',
    exportedAt,
    libraryRootPath,
    summary: {
      ...auditResult.summary,
      auditedAt: auditResult.summary.auditedAt || exportedAt,
    },
    entries: auditResult.entries.map((entry) => ({
      ...entry,
    })),
  };
}
