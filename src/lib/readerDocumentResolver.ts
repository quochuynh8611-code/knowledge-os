import { Resource, ResearchExcerpt } from '../types';

export interface ActiveReaderDocument {
  documentId: string;
  title: string;
  format: 'pdf' | 'epub' | 'md' | string;
  fileUrl?: string;
  content?: string;
  sourceType?: 'docs' | 'vault';
  initialPosition?: string;
}

export interface DocumentMatchContext {
  documentId: string;
  title?: string;
  fileUrl?: string;
  resources?: Resource[];
}

/**
 * Resolves any raw file path, URL, vault path, or document ID into a valid endpoint URL for Reader adapters.
 * Path Taxonomy Contract:
 * 1. Web URLs & Blobs (http://, https://, blob:) -> untouched
 * 2. Pre-resolved API endpoints (/api/...) -> untouched
 * 3. Docs repository paths (docs/books/..., /docs/...) -> /api/docs/raw?path=${encodeURIComponent(cleanDocsPath)}
 * 4. Obsidian Vault Markdown (.md) -> /api/obsidian/vault/file?path=${encodeURIComponent(relVaultPath)}
 * 5. Obsidian Vault Attachments (.epub, .pdf, images, etc.) -> /api/obsidian/vault/attachment?path=${encodeURIComponent(relVaultPath)}
 * 6. Absolute paths containing Obsidian Vault root or folder -> extracts relative vault path
 * 7. Bare filenames:
 *    - .epub -> /api/obsidian/vault/attachment?path=05_EPUB_Export%2F${encodeURIComponent(filename)} (Obsidian EPUB export convention)
 *    - .pdf -> /api/obsidian/vault/attachment?path=${encodeURIComponent(filename)}
 *    - .md -> /api/obsidian/vault/file?path=${encodeURIComponent(filename)}
 */
export function resolveReaderFileUrl(rawUrlOrPath?: string | null): string {
  if (!rawUrlOrPath) return '';
  const trimmed = rawUrlOrPath.trim();
  if (!trimmed) return '';

  // 1. External URLs, Blobs, and pre-resolved API routes
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/api/')
  ) {
    return trimmed;
  }

  // 1b. Archive Scheme (e.g. "archive://doc-123" or "archive://doc-123?loc=...")
  if (trimmed.toLowerCase().startsWith('archive://')) {
    const rawDocId = trimmed.slice(10).trim();
    const cleanDocId = rawDocId.split('?')[0].trim();
    return `/api/archive/file/${encodeURIComponent(cleanDocId)}`;
  }

  // 1c. Archive Content-Hash Storage Path (e.g. "md/3e/<hash>.md", "epub/f0/<hash>.epub", "pdf/ab/<hash>.pdf")
  {
    const ARCHIVE_HASH_PATTERN = /^(md|epub|pdf)\/([a-f0-9]{2})\/([a-f0-9]{40,})\.(md|epub|pdf)$/i;
    const archiveMatch = trimmed.match(ARCHIVE_HASH_PATTERN);
    if (archiveMatch) {
      const contentHash = archiveMatch[3];
      return `/api/archive/file/${encodeURIComponent(contentHash)}`;
    }
  }

  // Normalize backslashes to forward slashes
  const normalized = trimmed.replace(/\\/g, '/');
  const lower = normalized.toLowerCase();
  const isMarkdown = lower.endsWith('.md');

  // 2. Docs repo path (e.g. "docs/books/sample.epub" or "/docs/books/sample.epub")
  if (normalized.startsWith('docs/') || normalized.startsWith('/docs/')) {
    const cleanDocsPath = normalized.replace(/^\/?docs\//, '');
    return `/api/docs/raw?path=${encodeURIComponent(cleanDocsPath)}`;
  }

  // If starts with "books/" (subfolder in docs repo)
  if (normalized.startsWith('books/') && !normalized.includes('05_EPUB_Export')) {
    return `/api/docs/raw?path=${encodeURIComponent(normalized)}`;
  }

  // 3a. Handle explicit vault: prefix (e.g. "vault:phat-hoc:02_PDF_Source/guide.pdf" or "vault:02_PDF_Source/guide.pdf")
  if (/^vault:/i.test(normalized)) {
    const withoutPrefix = normalized.replace(/^vault:/i, '');
    let explicitVaultId: string | undefined = undefined;
    let pathPart = withoutPrefix;
    const parts = withoutPrefix.split(':');
    if (parts.length >= 2 && parts[0] && !parts[0].includes('/')) {
      explicitVaultId = parts[0];
      pathPart = parts.slice(1).join(':');
    }
    const cleanRel = pathPart.replace(/^\/+/, '');
    const isMd = cleanRel.toLowerCase().endsWith('.md');
    const vaultQuery = explicitVaultId ? `&vaultId=${encodeURIComponent(explicitVaultId)}` : '';
    return isMd
      ? `/api/obsidian/vault/file?path=${encodeURIComponent(cleanRel)}${vaultQuery}`
      : `/api/obsidian/vault/attachment?path=${encodeURIComponent(cleanRel)}${vaultQuery}`;
  }

  // 3b. Absolute path containing Obsidian Vault or 05_EPUB_Export
  if (normalized.includes('/05_EPUB_Export/')) {
    const relPart = normalized.slice(normalized.indexOf('05_EPUB_Export/'));
    return isMarkdown
      ? `/api/obsidian/vault/file?path=${encodeURIComponent(relPart)}`
      : `/api/obsidian/vault/attachment?path=${encodeURIComponent(relPart)}`;
  }

  if (normalized.includes('/Obsidian/')) {
    // Extract part after vault name: /Obsidian/<vaultName>/<relPart>
    const match = normalized.match(/\/Obsidian\/[^/]+\/(.+)$/i);
    if (match && match[1]) {
      return isMarkdown
        ? `/api/obsidian/vault/file?path=${encodeURIComponent(match[1])}`
        : `/api/obsidian/vault/attachment?path=${encodeURIComponent(match[1])}`;
    }
  }

  // 4. Obsidian Vault Relative Path (e.g. "05_EPUB_Export/sample.epub", "attachments/sample.pdf", "01_Notes/note.md")
  if (
    normalized.startsWith('05_EPUB_Export/') ||
    normalized.startsWith('attachments/') ||
    normalized.startsWith('02_PDF_Source/') ||
    normalized.startsWith('01_Books/') ||
    normalized.startsWith('01_Notes/') ||
    normalized.startsWith('000-Dashboard/') ||
    normalized.startsWith('03_Notes/')
  ) {
    const cleanRel = normalized.replace(/^\/+/, '');
    return isMarkdown
      ? `/api/obsidian/vault/file?path=${encodeURIComponent(cleanRel)}`
      : `/api/obsidian/vault/attachment?path=${encodeURIComponent(cleanRel)}`;
  }

  // 5. Bare filename handling
  const isBare = !normalized.includes('/');
  if (isBare) {
    if (isMarkdown) {
      return `/api/obsidian/vault/file?path=${encodeURIComponent(normalized)}`;
    }
    if (lower.endsWith('.epub')) {
      // Convention: Knowledge OS Obsidian EPUB export folder
      return `/api/obsidian/vault/attachment?path=${encodeURIComponent('05_EPUB_Export/' + normalized)}`;
    }
    return `/api/obsidian/vault/attachment?path=${encodeURIComponent(normalized)}`;
  }

  // 6. Generic relative path fallback -> vault file for .md, attachment for binaries
  const cleanFallback = normalized.replace(/^\/+/, '');
  return isMarkdown
    ? `/api/obsidian/vault/file?path=${encodeURIComponent(cleanFallback)}`
    : `/api/obsidian/vault/attachment?path=${encodeURIComponent(cleanFallback)}`;
}

/**
 * Normalizes any document ID, vault path, or file URL to a canonical relative path.
 * Examples:
 * - "vault:02_PDF_Source/guide.pdf" -> "02_PDF_Source/guide.pdf"
 * - "/api/obsidian/vault/attachment?path=02_PDF_Source%2Fguide.pdf" -> "02_PDF_Source/guide.pdf"
 * - "/api/docs/raw?path=02_PDF_Source%2Fguide.pdf" -> "02_PDF_Source/guide.pdf"
 * - "02_PDF_Source/guide.pdf" -> "02_PDF_Source/guide.pdf"
 */
export function normalizeDocumentPath(rawIdOrUrl?: string | null): string {
  if (!rawIdOrUrl) return '';
  let cleaned = rawIdOrUrl.trim();

  // Strip archive:// prefix if present
  if (cleaned.toLowerCase().startsWith('archive://')) {
    cleaned = cleaned.slice(10);
    if (cleaned.includes('?')) {
      cleaned = cleaned.split('?')[0];
    }
  }

  // Strip vault: prefix
  if (cleaned.toLowerCase().startsWith('vault:')) {
    cleaned = cleaned.slice(6);
  }

  // Extract path from API URLs if applicable
  if (cleaned.includes('path=')) {
    try {
      const urlObj = new URL(cleaned, 'http://localhost');
      const param = urlObj.searchParams.get('path');
      if (param) cleaned = param;
    } catch {
      const match = cleaned.match(/[?&]path=([^&]+)/);
      if (match) cleaned = decodeURIComponent(match[1]);
    }
  }

  // Decode URI components & normalize slashes
  try {
    cleaned = decodeURIComponent(cleaned);
  } catch {
    // fallback if already decoded
  }

  cleaned = cleaned.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  return cleaned;
}

/**
 * Checks whether a ResearchExcerpt belongs to the active document being viewed in Reader.
 * Applies a 4-tier matching strategy with anti-collision checks:
 * 1. Strict ID Match (guarded against colliding generic IDs with mismatched titles)
 * 2. Canonical Path & Scheme Equivalence (vault:path == relative path == fileUrl path)
 * 3. Resource ID <-> File Path Cross-Resolution
 * 4. Filename Base Name & Citation Title Safe Fallback
 */
const GENERIC_DOC_IDS = new Set([
  'doc',
  'pdf',
  'epub',
  'md',
  'markdown',
  'doc-1',
  'doc-2',
  'doc-generic',
  'document',
  'untitled',
  'default',
  'preview',
]);

export function isGenericDocId(id?: string | null): boolean {
  if (!id) return true;
  const trimmed = id.trim().toLowerCase();
  if (!trimmed) return true;
  if (GENERIC_DOC_IDS.has(trimmed)) return true;
  if (trimmed.startsWith('preview-') || trimmed.startsWith('untitled-')) return true;
  return false;
}

/**
 * Checks whether a ResearchExcerpt belongs to the active document being viewed in Reader.
 * Applies a 4-tier matching strategy with anti-collision checks:
 * 1. Strict ID Match (guarded against colliding generic IDs with mismatched titles)
 * 2. Canonical Path & Scheme Equivalence (vault:path == relative path == fileUrl path)
 * 3. Resource ID <-> File Path Cross-Resolution
 * 4. Filename Base Name & Citation Title Safe Fallback
 */
export function isExcerptMatchingDocument(
  excerpt: ResearchExcerpt,
  context: DocumentMatchContext
): boolean {
  if (!excerpt) return false;

  const targetDocId = (context.documentId || '').trim();
  const excerptDocId = (excerpt.archivedDocumentId || '').trim();
  const contextTitle = (context.title || '').trim().toLowerCase();
  const excerptTitle = (excerpt.citationSnapshot?.title || '').trim().toLowerCase();

  if (!targetDocId && !excerptDocId && !contextTitle) return false;

  const isTargetGeneric = isGenericDocId(targetDocId);
  const isExcerptGeneric = isGenericDocId(excerptDocId);

  // Tier 1: Exact ID match with anti-collision guard
  if (targetDocId && excerptDocId && targetDocId === excerptDocId) {
    if (isTargetGeneric || isExcerptGeneric) {
      // For generic placeholder IDs, exact ID match is NOT trustworthy on its own;
      // require verified matching title with length > 3
      if (contextTitle && excerptTitle && contextTitle === excerptTitle && contextTitle.length > 3) {
        return true;
      }
      return false;
    }
    if (contextTitle && excerptTitle && contextTitle !== excerptTitle) {
      if (!targetDocId.includes('/') && !targetDocId.includes('.')) {
        return false;
      }
    }
    return true;
  }

  // Tier 2: Canonical Path & Vault Scheme Matching
  const canonicalTarget = normalizeDocumentPath(targetDocId);
  const canonicalExcerpt = normalizeDocumentPath(excerptDocId);
  const canonicalFileUrl = normalizeDocumentPath(context.fileUrl);

  const isCanonicalTargetGeneric = isGenericDocId(canonicalTarget);
  const isCanonicalExcerptGeneric = isGenericDocId(canonicalExcerpt);

  if (
    !isCanonicalTargetGeneric &&
    !isCanonicalExcerptGeneric &&
    canonicalTarget &&
    canonicalExcerpt &&
    canonicalTarget.toLowerCase() === canonicalExcerpt.toLowerCase()
  ) {
    return true;
  }

  if (
    !isCanonicalExcerptGeneric &&
    canonicalExcerpt &&
    canonicalFileUrl &&
    canonicalExcerpt.toLowerCase() === canonicalFileUrl.toLowerCase()
  ) {
    return true;
  }

  if (
    !isCanonicalTargetGeneric &&
    canonicalTarget &&
    canonicalFileUrl &&
    canonicalTarget.toLowerCase() === canonicalFileUrl.toLowerCase()
  ) {
    if (
      !isCanonicalExcerptGeneric &&
      canonicalExcerpt &&
      canonicalExcerpt.toLowerCase() === canonicalTarget.toLowerCase()
    ) {
      return true;
    }
  }

  // Tier 3: Resource Alias Cross-Resolution
  const resources = context.resources || [];
  const targetResource = resources.find(
    (r) =>
      r.id === targetDocId ||
      (r.filePath && normalizeDocumentPath(r.filePath).toLowerCase() === canonicalTarget.toLowerCase())
  );
  const excerptResource = resources.find(
    (r) =>
      r.id === excerptDocId ||
      (r.filePath && normalizeDocumentPath(r.filePath).toLowerCase() === canonicalExcerpt.toLowerCase())
  );

  if (targetResource && excerptResource && targetResource.id === excerptResource.id) {
    return true;
  }

  if (
    targetResource &&
    targetResource.filePath &&
    normalizeDocumentPath(targetResource.filePath).toLowerCase() === canonicalExcerpt.toLowerCase()
  ) {
    return true;
  }

  if (
    excerptResource &&
    excerptResource.filePath &&
    normalizeDocumentPath(excerptResource.filePath).toLowerCase() === canonicalTarget.toLowerCase()
  ) {
    return true;
  }

  // Tier 4: Filename Base Name & Title Citation Match (Safe Fallback)
  const targetBaseName = canonicalTarget.split('/').pop()?.replace(/\.[^.]+$/, '').toLowerCase();
  const excerptBaseName = canonicalExcerpt.split('/').pop()?.replace(/\.[^.]+$/, '').toLowerCase();

  if (
    targetBaseName &&
    excerptBaseName &&
    !isGenericDocId(targetBaseName) &&
    !isGenericDocId(excerptBaseName) &&
    targetBaseName === excerptBaseName &&
    targetBaseName.length > 3
  ) {
    return true;
  }

  if (contextTitle && excerptTitle && contextTitle === excerptTitle && contextTitle.length > 3) {
    return true;
  }

  return false;
}

/**
 * Phân giải documentId và optional locator từ archive citation URI
 * thành đối tượng ActiveReaderDocument chuẩn hóa cho UnifiedResearchReader.
 */
export function resolveArchiveLinkToReaderDoc(
  documentId: string,
  locator?: string,
  resources: Resource[] = []
): ActiveReaderDocument {
  const normalizedDocId = (documentId || '').trim();
  const canonicalPath = normalizeDocumentPath(normalizedDocId);
  const matchedResource = (resources || []).find(
    (r) =>
      r.id === normalizedDocId ||
      r.filePath === normalizedDocId ||
      (r.filePath && normalizeDocumentPath(r.filePath) === canonicalPath) ||
      r.url === normalizedDocId
  );

  const title =
    matchedResource?.title ||
    normalizedDocId.split('/').pop()?.replace(/\.[^.]+$/, '') ||
    'Tài liệu nghiên cứu';

  const rawTarget = (matchedResource?.openTarget && matchedResource.openTarget.trim())
    ? matchedResource.openTarget.trim()
    : (matchedResource?.filePath && matchedResource.filePath.trim())
    ? matchedResource.filePath.trim()
    : (matchedResource?.url && matchedResource.url.trim())
    ? matchedResource.url.trim()
    : normalizedDocId;

  const cleanLower = rawTarget.toLowerCase();

  const isPdf =
    cleanLower.endsWith('.pdf') ||
    matchedResource?.type === 'pdf' ||
    normalizedDocId.toLowerCase().endsWith('.pdf');

  const isEpub =
    cleanLower.endsWith('.epub') ||
    ((matchedResource?.type as string) === 'epub') ||
    normalizedDocId.toLowerCase().endsWith('.epub');

  const format = isPdf ? 'pdf' : isEpub ? 'epub' : 'md';

  const isDocs =
    cleanLower.startsWith('docs/') ||
    cleanLower.startsWith('/docs/') ||
    cleanLower.endsWith('.feature');
  const sourceType: 'docs' | 'vault' = isDocs ? 'docs' : 'vault';

  const fileUrl = matchedResource?.openTarget
    ? resolveReaderFileUrl(matchedResource.openTarget)
    : matchedResource?.filePath
    ? resolveReaderFileUrl(matchedResource.filePath)
    : matchedResource?.url
    ? resolveReaderFileUrl(matchedResource.url)
    : undefined;

  return {
    documentId: normalizedDocId,
    title,
    format,
    fileUrl,
    sourceType,
    initialPosition: locator,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 19: Bidirectional Citation Deep-Link Navigation
// ─────────────────────────────────────────────────────────────────────────────

/** Result of parseArchiveCitation — null means the URI is invalid or unsafe. */
export interface ParsedArchiveCitation {
  documentId: string;
  locator: string | undefined;
}

/**
 * Blocked URI schemes — any raw href starting with these is rejected immediately.
 * This list is intentionally conservative (allowlist-by-exclusion).
 */
const BLOCKED_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'file:'];

/**
 * Parses an `archive://` citation URI into its documentId and optional locator.
 *
 * Format: `archive://{documentId}[?loc={locator}]`
 *
 * - Decodes URL-encoded locators (supports EPUB CFI, unicode headings, etc.)
 * - Rejects dangerous pseudo-schemes (XSS prevention).
 * - Returns null for any malformed or non-archive URI.
 *
 * @pure — no side effects, no mutations.
 */
export function parseArchiveCitation(href: string): ParsedArchiveCitation | null {
  if (!href || typeof href !== 'string') return null;

  const trimmed = href.trim();
  if (!trimmed) return null;

  // Security: reject blocked pseudo-schemes regardless of case
  const lowerHref = trimmed.toLowerCase();
  for (const scheme of BLOCKED_SCHEMES) {
    if (lowerHref.startsWith(scheme)) return null;
  }

  // Must start with archive://
  if (!lowerHref.startsWith('archive://')) return null;

  // Strip the scheme
  const withoutScheme = trimmed.slice('archive://'.length);
  if (!withoutScheme) return null;

  // Split on first '?' to separate documentId from query
  const qIndex = withoutScheme.indexOf('?');
  const rawDocId = qIndex === -1 ? withoutScheme : withoutScheme.slice(0, qIndex);
  const queryString = qIndex === -1 ? '' : withoutScheme.slice(qIndex + 1);

  // documentId must not be empty after stripping
  if (!rawDocId || rawDocId.trim() === '') return null;

  let documentId: string;
  try {
    documentId = decodeURIComponent(rawDocId);
  } catch {
    documentId = rawDocId;
  }

  if (!documentId || documentId.trim() === '') return null;

  // Extract locator from ?loc= query param
  let locator: string | undefined;
  if (queryString) {
    const params = new URLSearchParams(queryString);
    const rawLoc = params.get('loc');
    if (rawLoc !== null) {
      try {
        locator = decodeURIComponent(rawLoc);
      } catch {
        locator = rawLoc;
      }
    }
  }

  return { documentId, locator };
}

/** Result returned by resolveCitationTargetDocument. */
export interface CitationResolutionResult {
  isSameDocument: boolean;
  locator: string | undefined;
  document: {
    documentId: string;
    title: string;
    format: 'md' | 'epub' | 'pdf' | string;
    fileUrl?: string;
    sourceType?: 'docs' | 'vault';
  } | null;
}

/**
 * 5-tier resolver engine for bidirectional citation navigation (Phase 19).
 *
 * Resolution order:
 *  T1 – Same-document fast path (exact active documentId match)
 *  T2 – Direct documentId match against resources list
 *  T3 – Resource filePath / alias match (decoded canonical paths)
 *  T4 – Canonical path normalization (vault: prefix, URL-encoded paths)
 *  T5 – Title / baseName heuristic (last resort, non-generic names only)
 *  T6 – Unresolved → returns null (safe no-op)
 *
 * @pure — no side effects, no mutations, no vault writes.
 */
export function resolveCitationTargetDocument(
  targetDocId: string,
  locator: string | undefined,
  activeDocContext: {
    documentId: string;
    title?: string;
    format?: string;
    fileUrl?: string;
    sourceType?: 'docs' | 'vault';
  } | null | undefined,
  resources: Resource[]
): CitationResolutionResult | null {
  if (!targetDocId) return null;

  const normalizedTarget = targetDocId.trim();

  // Tier 1: Same-document fast path
  if (activeDocContext && normalizedTarget === activeDocContext.documentId) {
    return {
      isSameDocument: true,
      locator,
      document: {
        documentId: activeDocContext.documentId,
        title: activeDocContext.title || activeDocContext.documentId,
        format: activeDocContext.format || 'md',
        fileUrl: activeDocContext.fileUrl,
        sourceType: activeDocContext.sourceType,
      },
    };
  }

  // Helper: build CitationResolutionResult for a matched resource
  const makeResult = (r: Resource): CitationResolutionResult => {
    const rawTarget = (r.openTarget && r.openTarget.trim())
      ? r.openTarget.trim()
      : (r.filePath && r.filePath.trim())
      ? r.filePath.trim()
      : (r.url && r.url.trim())
      ? r.url.trim()
      : '';
    const cleanLower = rawTarget.toLowerCase();

    const isPdf =
      cleanLower.endsWith('.pdf') ||
      r.type === 'pdf';

    const isEpub =
      cleanLower.endsWith('.epub') ||
      (((r.type as string) === 'epub') && !isPdf);

    const format = isPdf ? 'pdf' : isEpub ? 'epub' : 'md';
    const fileUrl = rawTarget ? resolveReaderFileUrl(rawTarget) : undefined;

    const isDocs =
      cleanLower.startsWith('docs/') ||
      cleanLower.startsWith('/docs/') ||
      cleanLower.endsWith('.feature');
    const sourceType: 'docs' | 'vault' = isDocs ? 'docs' : 'vault';

    return {
      isSameDocument: false,
      locator,
      document: {
        documentId: r.id,
        title: r.title || r.id,
        format,
        fileUrl,
        sourceType,
      },
    };
  };

  // Tier 2: Direct documentId match
  const byId = resources.find((r) => r.id === normalizedTarget);
  if (byId) return makeResult(byId);

  // Tier 3: filePath / alias match (raw & decoded canonical)
  const canonicalTarget = normalizeDocumentPath(normalizedTarget).toLowerCase();

  const byFilePath = resources.find((r) => {
    if (!r.filePath) return false;
    const rawPath = r.filePath.trim();
    const canonicalFilePath = normalizeDocumentPath(rawPath).toLowerCase();
    return (
      rawPath === normalizedTarget ||
      rawPath.toLowerCase() === normalizedTarget.toLowerCase() ||
      canonicalFilePath === canonicalTarget
    );
  });
  if (byFilePath) return makeResult(byFilePath);

  // Tier 4: vault: prefix canonical normalization
  // e.g. "vault:05_EPUB_Export/tam-ly.epub" → "05_epub_export/tam-ly.epub"
  if (normalizedTarget.toLowerCase().startsWith('vault:')) {
    const stripped = normalizeDocumentPath(normalizedTarget).toLowerCase();
    const byVaultPath = resources.find((r) => {
      if (!r.filePath) return false;
      return normalizeDocumentPath(r.filePath).toLowerCase() === stripped;
    });
    if (byVaultPath) return makeResult(byVaultPath);
  }

  // Tier 5: Title / baseName heuristic — only for non-generic names (len > 3)
  if (normalizedTarget.length > 3 && !isGenericDocId(normalizedTarget)) {
    const lowerTarget = normalizedTarget.toLowerCase();

    // Try exact title match first
    const byTitle = resources.find(
      (r) => r.title && r.title.trim().toLowerCase() === lowerTarget
    );
    if (byTitle) return makeResult(byTitle);

    // Try baseName (filename without extension) match
    const byBaseName = resources.find((r) => {
      if (!r.filePath) return false;
      const base = r.filePath.split('/').pop()?.replace(/\.[^.]+$/, '').toLowerCase();
      return base && base.length > 3 && base === lowerTarget;
    });
    if (byBaseName) return makeResult(byBaseName);
  }

  // Tier 6: No match — safe null fallback
  return null;
}
