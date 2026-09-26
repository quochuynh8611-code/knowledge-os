import { describe, it, expect } from 'vitest';
import { resolveResourceReaderDescriptor } from '../../src/lib/resourceOpenResolver';
import { Resource } from '../../src/types';

describe('Resource Open Resolver - Canonical Vault Contract Specification', () => {
  it('1. Resolves canonical openTarget with explicit vaultId to attachment API endpoint', () => {
    const resource: Resource = {
      id: 'res-pdf-canonical-1',
      topicId: 'top-1',
      title: 'Chánh Niệm Thực Tập PDF',
      type: 'pdf',
      filePath: '02_PDF_Source/04_Thien_Hoc/chanh_niem.pdf',
      openTarget: 'vault:phat-hoc:02_PDF_Source/04_Thien_Hoc/chanh_niem.pdf',
      createdAt: '2026-09-26T00:00:00.000Z',
    };

    const descriptor = resolveResourceReaderDescriptor(resource);

    expect(descriptor.canOpenInReader).toBe(true);
    expect(descriptor.format).toBe('pdf');
    expect(descriptor.sourceType).toBe('vault');
    expect(descriptor.documentId).toBe('vault:phat-hoc:02_PDF_Source/04_Thien_Hoc/chanh_niem.pdf');
    expect(descriptor.fileUrl).toBe(
      '/api/obsidian/vault/attachment?path=02_PDF_Source%2F04_Thien_Hoc%2Fchanh_niem.pdf&vaultId=phat-hoc'
    );
  });

  it('2. Resolves canonical openTarget for EPUB with explicit vaultId', () => {
    const resource: Resource = {
      id: 'res-epub-canonical-1',
      topicId: 'top-1',
      title: 'Luận Giải Tử Vi EPUB',
      type: 'book',
      filePath: '05_EPUB_Export/Luan-Giai-Tu-Vi.epub',
      openTarget: 'vault:dong-y:05_EPUB_Export/Luan-Giai-Tu-Vi.epub',
      createdAt: '2026-09-26T00:00:00.000Z',
    };

    const descriptor = resolveResourceReaderDescriptor(resource);

    expect(descriptor.canOpenInReader).toBe(true);
    expect(descriptor.format).toBe('epub');
    expect(descriptor.sourceType).toBe('vault');
    expect(descriptor.documentId).toBe('vault:dong-y:05_EPUB_Export/Luan-Giai-Tu-Vi.epub');
    expect(descriptor.fileUrl).toBe(
      '/api/obsidian/vault/attachment?path=05_EPUB_Export%2FLuan-Giai-Tu-Vi.epub&vaultId=dong-y'
    );
  });

  it('3. Resolves canonical openTarget for Markdown with explicit vaultId', () => {
    const resource: Resource = {
      id: 'res-md-canonical-1',
      topicId: 'top-1',
      title: 'Ghi Chú Triết Học MD',
      type: 'article',
      filePath: '01_Notes/Triet_Hoc.md',
      openTarget: 'vault:huyen-hoc:01_Notes/Triet_Hoc.md',
      createdAt: '2026-09-26T00:00:00.000Z',
    };

    const descriptor = resolveResourceReaderDescriptor(resource);

    expect(descriptor.canOpenInReader).toBe(true);
    expect(descriptor.format).toBe('md');
    expect(descriptor.sourceType).toBe('vault');
    expect(descriptor.documentId).toBe('vault:huyen-hoc:01_Notes/Triet_Hoc.md');
    expect(descriptor.fileUrl).toBe(
      '/api/obsidian/vault/file?path=01_Notes%2FTriet_Hoc.md&vaultId=huyen-hoc'
    );
  });

  it('4. Preserves archive:// scheme priority when openTarget is local archive', () => {
    const resource: Resource = {
      id: 'res-archive-1',
      topicId: 'top-1',
      title: 'Uploaded Document',
      type: 'pdf',
      filePath: 'pdf/aa/test.pdf',
      openTarget: 'archive://doc-archive-123',
      createdAt: '2026-09-26T00:00:00.000Z',
    };

    const descriptor = resolveResourceReaderDescriptor(resource);

    expect(descriptor.canOpenInReader).toBe(true);
    expect(descriptor.format).toBe('pdf');
    expect(descriptor.fileUrl).toBe('/api/archive/file/doc-archive-123');
    expect(descriptor.documentId).toBe('doc-archive-123');
  });
});
