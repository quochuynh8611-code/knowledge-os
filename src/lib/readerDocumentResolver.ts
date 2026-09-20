import { Resource, ResearchExcerpt } from '../types';

export interface ActiveReaderDocument {
  documentId: string;
  title: string;
  format: 'pdf' | 'epub' | 'md' | string;
  fileUrl?: string;
  content?: string;
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
 * 4. Obsidian Vault paths (05_EPUB_Export/..., attachments/..., 02_PDF_Source/..., etc.) -> /api/obsidian/vault/attachment?path=${encodeURIComponent(relVaultPath)}
 * 5. Absolute paths containing Obsidian Vault root or folder -> extracts relative vault path -> /api/obsidian/vault/attachment?path=...
 * 6. Bare filenames:
 *    - .epub -> /api/obsidian/vault/attachment?path=05_EPUB_Export%2F${encodeURIComponent(filename)} (Obsidian EPUB export convention)
 *    - .pdf -> /api/obsidian/vault/attachment?path=${encodeURIComponent(filename)}
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

  // Normalize backslashes to forward slashes
  const normalized = trimmed.replace(/\\/g, '/');

  // 2. Docs repo path (e.g. "docs/books/sample.epub" or "/docs/books/sample.epub")
  if (normalized.startsWith('docs/') || normalized.startsWith('/docs/')) {
    const cleanDocsPath = normalized.replace(/^\/?docs\//, '');
    return `/api/docs/raw?path=${encodeURIComponent(cleanDocsPath)}`;
  }

  // If starts with "books/" (subfolder in docs repo)
  if (normalized.startsWith('books/') && !normalized.includes('05_EPUB_Export')) {
    return `/api/docs/raw?path=${encodeURIComponent(normalized)}`;
  }

  // 3. Absolute path containing Obsidian Vault or 05_EPUB_Export
  // e.g. /Users/mr.chem/Documents/Obsidian/Phat-Hoc-Obsidian/05_EPUB_Export/sample.epub
  // or C:/Users/.../Obsidian/Vault/05_EPUB_Export/sample.epub
  if (normalized.includes('/05_EPUB_Export/')) {
    const relPart = normalized.slice(normalized.indexOf('05_EPUB_Export/'));
    return `/api/obsidian/vault/attachment?path=${encodeURIComponent(relPart)}`;
  }

  if (normalized.includes('/Obsidian/')) {
    // Extract part after vault name: /Obsidian/<vaultName>/<relPart>
    const match = normalized.match(/\/Obsidian\/[^/]+\/(.+)$/i);
    if (match && match[1]) {
      return `/api/obsidian/vault/attachment?path=${encodeURIComponent(match[1])}`;
    }
  }

  // 4. Obsidian Vault Relative Path (e.g. "05_EPUB_Export/sample.epub", "attachments/sample.pdf")
  if (
    normalized.startsWith('05_EPUB_Export/') ||
    normalized.startsWith('attachments/') ||
    normalized.startsWith('02_PDF_Source/') ||
    normalized.startsWith('01_Books/') ||
    normalized.startsWith('03_Notes/')
  ) {
    const cleanRel = normalized.replace(/^\/+/, '');
    return `/api/obsidian/vault/attachment?path=${encodeURIComponent(cleanRel)}`;
  }

  // 5. Bare filename handling
  const isBare = !normalized.includes('/');
  if (isBare) {
    if (normalized.toLowerCase().endsWith('.epub')) {
      // Convention: Knowledge OS Obsidian EPUB export folder
      return `/api/obsidian/vault/attachment?path=${encodeURIComponent('05_EPUB_Export/' + normalized)}`;
    }
    return `/api/obsidian/vault/attachment?path=${encodeURIComponent(normalized)}`;
  }

  // 6. Generic relative path fallback -> vault attachment endpoint
  const cleanFallback = normalized.replace(/^\/+/, '');
  return `/api/obsidian/vault/attachment?path=${encodeURIComponent(cleanFallback)}`;
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

  const isPdf =
    matchedResource?.type === 'pdf' ||
    Boolean(matchedResource?.filePath?.toLowerCase().endsWith('.pdf')) ||
    normalizedDocId.toLowerCase().endsWith('.pdf');

  const isEpub =
    Boolean(matchedResource?.filePath?.toLowerCase().endsWith('.epub')) ||
    normalizedDocId.toLowerCase().endsWith('.epub');

  const format = isPdf ? 'pdf' : isEpub ? 'epub' : 'md';

  const fileUrl = matchedResource?.filePath
    ? resolveReaderFileUrl(matchedResource.filePath)
    : matchedResource?.url
    ? resolveReaderFileUrl(matchedResource.url)
    : undefined;

  return {
    documentId: normalizedDocId,
    title,
    format,
    fileUrl,
    initialPosition: locator,
  };
}
