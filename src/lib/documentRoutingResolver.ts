import type { ArchivedDocument } from '../types';
import type { DocItem } from '../components/docs/DocsExplorerView';

export type SupportedRoutingFormat = 'pdf' | 'epub';

export interface BaseResolvedRoute {
  readonly documentId: string;
  readonly title: string;
  readonly fileUrl: string;
  readonly format: SupportedRoutingFormat;
  readonly initialPosition?: string;
}

export interface DocsResolvedRoute extends BaseResolvedRoute {
  readonly routeType: 'docs';
  readonly sourceType: 'docs';
}

export interface VaultResolvedRoute extends BaseResolvedRoute {
  readonly routeType: 'vault';
  readonly sourceType: 'vault';
}

export interface ArchiveResolvedRoute extends BaseResolvedRoute {
  readonly routeType: 'archive';
  readonly sourceType: 'archive';
  readonly archiveId: string;
}

export type ResolvedRoute = DocsResolvedRoute | VaultResolvedRoute | ArchiveResolvedRoute;

export interface RoutingResolutionFailure {
  readonly routeType: 'unresolved';
  readonly status: 'ambiguous' | 'not_found' | 'unsupported_format';
  readonly reason: string;
  readonly candidateIds?: string[];
}

export type ResolveDocumentRoutingResult =
  | { readonly success: true; readonly route: ResolvedRoute }
  | { readonly success: false; readonly error: RoutingResolutionFailure };

export interface ResolveDocumentRoutingInput {
  readonly doc: DocItem;
  readonly format: 'pdf' | 'epub' | 'md' | 'other';
  readonly archivedDocs: readonly ArchivedDocument[];
  readonly docsList?: readonly DocItem[];
}

const ARCHIVE_HASH_PATTERN = /^(md|epub|pdf)\/([a-f0-9]{2})\/([a-f0-9]{40,})\.(md|epub|pdf)$/i;

function extractPosition(
  format: SupportedRoutingFormat,
  archivedDoc?: ArchivedDocument
): string | undefined {
  if (!archivedDoc || !archivedDoc.lastPosition) {
    return undefined;
  }
  const pos = archivedDoc.lastPosition;
  if (format === 'pdf' && typeof pos.pageNumber === 'number') {
    return String(pos.pageNumber);
  }
  if (format === 'epub' && typeof pos.cfi === 'string' && pos.cfi.trim().length > 0) {
    return pos.cfi;
  }
  return undefined;
}

/**
 * Pure Resolver Function for NDH1a Document Routing & Identity Contract.
 * Implements deterministic routing for PDF and EPUB without React, DOM or network side-effects.
 */
export function resolveDocumentRouting(
  input: ResolveDocumentRoutingInput
): ResolveDocumentRoutingResult {
  const { doc, format, archivedDocs, docsList = [] } = input;

  // 1. Format Gate: Only 'pdf' and 'epub' are supported in NDH1a
  if (format !== 'pdf' && format !== 'epub') {
    return {
      success: false,
      error: {
        routeType: 'unresolved',
        status: 'unsupported_format',
        reason: `Định dạng ${format} không được hỗ trợ bởi resolver NDH1a (chỉ hỗ trợ pdf và epub)`,
      },
    };
  }

  // 2. Priority 1: Vault Resolution
  const isVaultDoc =
    doc.sourceType === 'vault' ||
    doc.relativePath.startsWith('vault://') ||
    archivedDocs.some(
      (a) =>
        (a.id === doc.id ||
          a.sourcePath === doc.relativePath ||
          a.sourceKey === `vault:${doc.relativePath}`) &&
        (a.sourceType === 'vault' || (a.storageRelPath && a.storageRelPath.startsWith('vault://')))
    );

  if (isVaultDoc) {
    // Tìm authoritative vault record nếu có
    const authoritativeVault = archivedDocs.find(
      (a) =>
        (a.id === doc.id ||
          a.sourcePath === doc.relativePath ||
          a.sourceKey === `vault:${doc.relativePath}`) &&
        (a.sourceType === 'vault' || (a.storageRelPath && a.storageRelPath.startsWith('vault://')))
    );

    const cleanVaultPath =
      doc.sourcePath ||
      (authoritativeVault?.sourceType === 'vault' ? authoritativeVault.sourcePath : undefined) ||
      (authoritativeVault?.storageRelPath?.startsWith('vault://')
        ? authoritativeVault.storageRelPath.replace(/^vault:\/\//, '')
        : undefined) ||
      doc.relativePath.replace(/^vault:\/\//, '').replace(/^\/+/, '');

    const documentId = authoritativeVault?.id || doc.id || `vault:${cleanVaultPath}`;
    const title = doc.title || cleanVaultPath.split('/').pop() || cleanVaultPath;
    const initialPosition = extractPosition(format, authoritativeVault);

    return {
      success: true,
      route: {
        routeType: 'vault',
        sourceType: 'vault',
        documentId,
        title,
        format,
        fileUrl: `/api/obsidian/vault/attachment?path=${encodeURIComponent(cleanVaultPath)}`,
        initialPosition,
      },
    };
  }

  // 3. Priority 2: Strict Docs Repo Resolution
  const isExplicitDocs = doc.sourceType === 'docs';
  const isInDocsList = docsList.some(
    (d) => (d.id && d.id === doc.id) || (d.relativePath && d.relativePath === doc.relativePath)
  );
  const isArchiveTagged = doc.sourceType === 'archive' || doc.relativePath.startsWith('archive://');
  const isStrictDocs = (isExplicitDocs || (isInDocsList && !isArchiveTagged)) && !isArchiveTagged;

  if (isStrictDocs) {
    // Tìm authoritative Archive record nếu có (khớp exact ID hoặc structural unique match)
    let authoritativeArch: ArchivedDocument | undefined = undefined;

    if (doc.id) {
      authoritativeArch = archivedDocs.find((a) => a.id === doc.id);
    }

    if (!authoritativeArch) {
      const structCandidates = archivedDocs.filter(
        (a) =>
          a.sourceType !== 'vault' &&
          a.sourceType !== 'docs' &&
          (a.storageRelPath === doc.relativePath ||
            a.sourcePath === doc.relativePath ||
            a.sourceKey === `archive:${doc.relativePath}`)
      );
      if (structCandidates.length === 1) {
        authoritativeArch = structCandidates[0];
      }
    }

    const sanitizedRelative = doc.relativePath.replace(/^\/+/, '');
    const documentId = authoritativeArch?.id || doc.id || doc.relativePath;
    const initialPosition = extractPosition(format, authoritativeArch);

    return {
      success: true,
      route: {
        routeType: 'docs',
        sourceType: 'docs',
        documentId,
        title: doc.title,
        format,
        fileUrl: `/api/docs/raw?path=${encodeURIComponent(sanitizedRelative)}`,
        initialPosition,
      },
    };
  }

  // 4. Priority 3: Archive Resolution (Authoritative)
  // 4a. Exact ID Match (Highest confidence)
  let authoritativeArch: ArchivedDocument | undefined = undefined;
  if (doc.id) {
    authoritativeArch = archivedDocs.find((a) => a.id === doc.id);
  }

  // 4b. Structural Unique Match (CẤM filename / suffix matching)
  if (!authoritativeArch) {
    const structCandidates = archivedDocs.filter(
      (a) =>
        a.sourceType !== 'vault' &&
        a.sourceType !== 'docs' &&
        (a.storageRelPath === doc.relativePath ||
          a.sourcePath === doc.relativePath ||
          a.sourceKey === `archive:${doc.relativePath}`)
    );

    if (structCandidates.length > 1) {
      return {
        success: false,
        error: {
          routeType: 'unresolved',
          status: 'ambiguous',
          reason: `Phát hiện nhiều hơn 1 bản ghi lưu trữ trùng khớp đường dẫn cấu trúc: ${doc.relativePath}`,
          candidateIds: structCandidates.map((c) => c.id),
        },
      };
    }

    if (structCandidates.length === 1) {
      authoritativeArch = structCandidates[0];
    }
  }

  // 4c. Explicit Pattern & Hash-like Identification
  const hasArchivePrefix = doc.relativePath.startsWith('archive://');
  const directHashMatch = doc.relativePath.match(ARCHIVE_HASH_PATTERN);
  const storageHashMatch = authoritativeArch?.storageRelPath?.match(ARCHIVE_HASH_PATTERN);

  const archiveIdentifier =
    authoritativeArch?.id ||
    (hasArchivePrefix
      ? doc.relativePath.replace(/^archive:\/\//, '').split('?')[0].trim()
      : undefined) ||
    directHashMatch?.[3] ||
    storageHashMatch?.[3];

  const isArchiveSource =
    doc.sourceType === 'archive' ||
    hasArchivePrefix ||
    Boolean(directHashMatch) ||
    Boolean(authoritativeArch);

  if (isArchiveSource && archiveIdentifier) {
    const initialPosition = extractPosition(format, authoritativeArch);
    return {
      success: true,
      route: {
        routeType: 'archive',
        sourceType: 'archive',
        archiveId: archiveIdentifier,
        documentId: authoritativeArch?.id || doc.id || archiveIdentifier,
        title: doc.title,
        format,
        fileUrl: `/api/archive/file/${encodeURIComponent(archiveIdentifier)}`,
        initialPosition,
      },
    };
  }

  // 5. Fail-Closed: Không thể xác định nguồn an toàn hoặc thiếu định danh hợp lệ
  return {
    success: false,
    error: {
      routeType: 'unresolved',
      status: 'not_found',
      reason: isArchiveSource
        ? 'Không thể xác định mã định danh tài liệu lưu trữ hợp lệ'
        : 'Không tìm thấy nguồn tài liệu phù hợp cho định tuyến đọc',
    },
  };
}
