import { describe, it, expect } from 'vitest';
import { resolveResourceReaderDescriptor } from '../../src/lib/resourceOpenResolver';
import type { Resource } from '../../src/types';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function makeResource(overrides: Partial<Resource>): Resource {
  return {
    id: 'res-test-id',
    topicId: 'topic-test',
    title: 'Test Resource',
    type: 'book',
    author: null,
    url: null,
    filePath: null,
    notes: null,
    createdAt: new Date().toISOString(),
    openTarget: null,
    ...overrides,
  } as Resource;
}

const ARCHIVE_HASH_MD =
  'md/3e/3ef2ef8e10b7d2971d94b433a60d812f385e9271a14d8b24f7cfb8198d7e3ed4.md';
const ARCHIVE_HASH_EPUB =
  'epub/f0/f06dce3555ed59fa7764713cf9f1aab325012f4159b8903e303ca70404e682e6.epub';
const ARCHIVE_HASH_PDF =
  'pdf/ab/ab12cd34ef567890ab12cd34ef567890ab12cd34ef567890ab12cd34ef567890.pdf';

// ──────────────────────────────────────────────────────────────────────────────
// Test Suite
// ──────────────────────────────────────────────────────────────────────────────

describe('resolveResourceReaderDescriptor — Archive Hash Path Detection', () => {
  // ── Test 1 ──────────────────────────────────────────────────────────────────
  // Given: a Markdown resource whose filePath follows the archive hash schema
  //   md/<2-char-prefix>/<sha256-hash>.md
  // When: resolveResourceReaderDescriptor is called
  // Then: fileUrl must route to /api/archive/file/<hash-without-extension>
  //   NOT to /api/obsidian/vault/file
  it('1. MD archive hash path → /api/archive/file/<hash> (not vault/file)', () => {
    const resource = makeResource({ filePath: ARCHIVE_HASH_MD, type: 'md' as any });
    const descriptor = resolveResourceReaderDescriptor(resource);

    expect(descriptor.canOpenInReader).toBe(true);
    expect(descriptor.format).toBe('md');

    expect(descriptor.fileUrl).toMatch(/^\/api\/archive\/file\//);
    expect(descriptor.fileUrl).not.toContain('/api/obsidian/vault');

    // Hash must be extracted without extension
    expect(descriptor.fileUrl).toContain(
      '3ef2ef8e10b7d2971d94b433a60d812f385e9271a14d8b24f7cfb8198d7e3ed4'
    );
    expect(descriptor.fileUrl).not.toContain('.md');
  });

  // ── Test 2 ──────────────────────────────────────────────────────────────────
  // Given: an EPUB resource whose filePath follows the archive hash schema
  //   epub/<2-char-prefix>/<sha256-hash>.epub
  // When: resolveResourceReaderDescriptor is called
  // Then: fileUrl must route to /api/archive/file/<hash-without-extension>
  //   NOT to /api/obsidian/vault/attachment
  it('2. EPUB archive hash path → /api/archive/file/<hash> (not vault/attachment)', () => {
    const resource = makeResource({ filePath: ARCHIVE_HASH_EPUB, type: 'book' });
    const descriptor = resolveResourceReaderDescriptor(resource);

    expect(descriptor.canOpenInReader).toBe(true);
    expect(descriptor.format).toBe('epub');

    expect(descriptor.fileUrl).toMatch(/^\/api\/archive\/file\//);
    expect(descriptor.fileUrl).not.toContain('/api/obsidian/vault');

    // Hash must be extracted without extension
    expect(descriptor.fileUrl).toContain(
      'f06dce3555ed59fa7764713cf9f1aab325012f4159b8903e303ca70404e682e6'
    );
    expect(descriptor.fileUrl).not.toContain('.epub');
  });

  // ── Test 3 ──────────────────────────────────────────────────────────────────
  // Given: a PDF resource whose filePath follows the archive hash schema
  //   pdf/<2-char-prefix>/<sha256-hash>.pdf
  // When: resolveResourceReaderDescriptor is called
  // Then: fileUrl must route to /api/archive/file/<hash-without-extension>
  it('3. PDF archive hash path → /api/archive/file/<hash> (not vault/attachment)', () => {
    const resource = makeResource({ filePath: ARCHIVE_HASH_PDF, type: 'pdf' });
    const descriptor = resolveResourceReaderDescriptor(resource);

    expect(descriptor.canOpenInReader).toBe(true);
    expect(descriptor.format).toBe('pdf');

    expect(descriptor.fileUrl).toMatch(/^\/api\/archive\/file\//);
    expect(descriptor.fileUrl).not.toContain('/api/obsidian/vault');

    expect(descriptor.fileUrl).toContain(
      'ab12cd34ef567890ab12cd34ef567890ab12cd34ef567890ab12cd34ef567890'
    );
    expect(descriptor.fileUrl).not.toContain('.pdf');
  });

  // ── Regression: Bare filename EPUB must NOT be treated as archive ────────────
  // Given: a bare EPUB filename (legacy vault resource, NOT a hash path)
  // Then: must still route to vault/attachment (not archive)
  // Note: resolveResourceReaderDescriptor does NOT inject the 05_EPUB_Export prefix;
  //       that convention lives in resolveReaderFileUrl (used by EpubReaderAdapter).
  it('4. [Regression] Bare EPUB filename still routes to vault/attachment (not archive)', () => {
    const resource = makeResource({
      filePath: 'Luan-Giai-Tu-Vi-Chien-Luoc-Quan-Tri-Huynh-Phu-Quoc.epub',
      type: 'book',
    });
    const descriptor = resolveResourceReaderDescriptor(resource);

    expect(descriptor.canOpenInReader).toBe(true);
    expect(descriptor.format).toBe('epub');
    expect(descriptor.fileUrl).toContain('/api/obsidian/vault/attachment');
    expect(descriptor.fileUrl).not.toContain('/api/archive/file');
  });

  // ── Regression: vault-prefixed path must NOT be treated as archive ──────────
  it('5. [Regression] vault:<vaultId>:<path>.epub still routes to vault/attachment', () => {
    const resource = makeResource({
      filePath: 'vault:phat-hoc:05_EPUB_Export/sample.epub',
      type: 'book',
    });
    const descriptor = resolveResourceReaderDescriptor(resource);

    expect(descriptor.canOpenInReader).toBe(true);
    expect(descriptor.format).toBe('epub');
    expect(descriptor.fileUrl).toContain('/api/obsidian/vault/attachment');
    expect(descriptor.fileUrl).toContain('phat-hoc');
    expect(descriptor.fileUrl).not.toContain('/api/archive/file');
  });

  // ── Regression: docs path must NOT be treated as archive ───────────────────
  it('6. [Regression] docs/books/sample.epub still routes to /api/docs/raw', () => {
    const resource = makeResource({
      filePath: 'docs/books/sample.epub',
      type: 'book',
    });
    const descriptor = resolveResourceReaderDescriptor(resource);

    expect(descriptor.canOpenInReader).toBe(true);
    expect(descriptor.format).toBe('epub');
    expect(descriptor.fileUrl).toContain('/api/docs/raw');
    expect(descriptor.fileUrl).not.toContain('/api/archive/file');
  });

  // ── Regression: archive:// URI must still work ─────────────────────────────
  it('7. [Regression] archive:// URI openTarget still routes to /api/archive/file/<id>', () => {
    const resource = makeResource({
      openTarget: 'archive://doc-abc123',
      filePath: null,
      type: 'book',
    });
    const descriptor = resolveResourceReaderDescriptor(resource);

    expect(descriptor.canOpenInReader).toBe(true);
    expect(descriptor.fileUrl).toContain('/api/archive/file/doc-abc123');
  });
});

describe('resolveReaderFileUrl & resolveArchiveLinkToReaderDoc — Archive Hash Path Taxonomy', () => {
  it('8. resolveReaderFileUrl routes MD archive hash path to /api/archive/file/<contentHash>', async () => {
    const { resolveReaderFileUrl } = await import('../../src/lib/readerDocumentResolver');
    const result = resolveReaderFileUrl(ARCHIVE_HASH_MD);
    expect(result).toBe('/api/archive/file/3ef2ef8e10b7d2971d94b433a60d812f385e9271a14d8b24f7cfb8198d7e3ed4');
    expect(result).not.toContain('/api/obsidian/vault');
  });

  it('9. resolveReaderFileUrl routes EPUB archive hash path to /api/archive/file/<contentHash>', async () => {
    const { resolveReaderFileUrl } = await import('../../src/lib/readerDocumentResolver');
    const result = resolveReaderFileUrl(ARCHIVE_HASH_EPUB);
    expect(result).toBe('/api/archive/file/f06dce3555ed59fa7764713cf9f1aab325012f4159b8903e303ca70404e682e6');
    expect(result).not.toContain('/api/obsidian/vault');
  });

  it('10. resolveArchiveLinkToReaderDoc resolves MD archive hash resource to format md and /api/archive/file URL', async () => {
    const { resolveArchiveLinkToReaderDoc } = await import('../../src/lib/readerDocumentResolver');
    const mdRes = makeResource({
      id: 'res-md-hash',
      title: '00 Dashboard Phat Hoc',
      type: 'book',
      filePath: ARCHIVE_HASH_MD,
    });

    const activeDoc = resolveArchiveLinkToReaderDoc('res-md-hash', undefined, [mdRes]);
    expect(activeDoc.format).toBe('md');
    expect(activeDoc.fileUrl).toBe('/api/archive/file/3ef2ef8e10b7d2971d94b433a60d812f385e9271a14d8b24f7cfb8198d7e3ed4');
  });
});
