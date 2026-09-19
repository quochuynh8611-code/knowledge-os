import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  MarkdownReadabilityRenderer,
  parseArchiveUri,
} from '../../src/lib/markdownReadability';

describe('Phase R3A.1: Markdown Archive Link Readability', () => {
  describe('1. parseArchiveUri helper', () => {
    it('1.1. parses canonical archive URI with locator query param', () => {
      const parsed = parseArchiveUri('archive://doc-triet-hoc?loc=chuong-2');
      expect(parsed).toEqual({
        documentId: 'doc-triet-hoc',
        locator: 'chuong-2',
      });
    });

    it('1.2. parses archive URI without locator', () => {
      const parsed = parseArchiveUri('archive://doc-tam-ly');
      expect(parsed).toEqual({
        documentId: 'doc-tam-ly',
        locator: undefined,
      });
    });

    it('1.3. decodes URI encoded documentId and locator', () => {
      const parsed = parseArchiveUri('archive://vault%3A01_Notes%2Fdoc.md?loc=tr.%2042');
      expect(parsed).toEqual({
        documentId: 'vault:01_Notes/doc.md',
        locator: 'tr. 42',
      });
    });

    it('1.4. returns null for non-archive URIs or empty string', () => {
      expect(parseArchiveUri('')).toBeNull();
      expect(parseArchiveUri('https://example.com')).toBeNull();
      expect(parseArchiveUri('obsidian://open')).toBeNull();
    });
  });

  describe('2. MarkdownReadabilityRenderer Archive Citation Link rendering', () => {
    it('2.1. renders archive:// URI as interactive citation link with BookOpen icon', () => {
      const content = '> — *Vi Diệu Pháp*, tr. 42 [Xem tài liệu](archive://doc-vi-dieu-phap?loc=42)';
      const handleOpenArchive = vi.fn();

      render(
        <MarkdownReadabilityRenderer
          content={content}
          onOpenArchiveLink={handleOpenArchive}
        />
      );

      const link = screen.getByRole('link', { name: /Xem tài liệu/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'archive://doc-vi-dieu-phap?loc=42');
      expect(link).toHaveAttribute('data-archive-document-id', 'doc-vi-dieu-phap');
      expect(link).toHaveAttribute('data-archive-locator', '42');

      fireEvent.click(link);
      expect(handleOpenArchive).toHaveBeenCalledWith('doc-vi-dieu-phap', '42');
    });

    it('2.2. renders archive URI without locator and calls callback with undefined locator', () => {
      const content = '[Mở nguồn](archive://doc-kinh-te)';
      const handleOpenArchive = vi.fn();

      render(
        <MarkdownReadabilityRenderer
          content={content}
          onOpenArchiveLink={handleOpenArchive}
        />
      );

      const link = screen.getByRole('link', { name: /Mở nguồn/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('data-archive-document-id', 'doc-kinh-te');

      fireEvent.click(link);
      expect(handleOpenArchive).toHaveBeenCalledWith('doc-kinh-te', undefined);
    });

    it('2.3. blocks unsafe arbitrary custom scheme and downgrades to plain text', () => {
      const content = '[Unsafe Action](custom://payload-exploit)';

      render(<MarkdownReadabilityRenderer content={content} />);

      expect(screen.queryByRole('link', { name: /Unsafe Action/i })).not.toBeInTheDocument();
      expect(screen.getByText('Unsafe Action')).toBeInTheDocument();
    });

    it('2.4. preserves standard behavior for https, mailto, and obsidian links', () => {
      const content = `
[Web Link](https://example.com)
[Email](mailto:user@example.com)
[Obsidian Note](obsidian://open?vault=Vault&file=Note)
      `;

      render(<MarkdownReadabilityRenderer content={content} />);

      const webLink = screen.getByRole('link', { name: /Web Link/i });
      expect(webLink).toHaveAttribute('href', 'https://example.com');
      expect(webLink).toHaveAttribute('target', '_blank');

      const mailLink = screen.getByRole('link', { name: /Email/i });
      expect(mailLink).toHaveAttribute('href', 'mailto:user@example.com');

      const obsLink = screen.getByRole('link', { name: /Obsidian Note/i });
      expect(obsLink).toHaveAttribute('href', 'obsidian://open?vault=Vault&file=Note');
    });
  });
});
