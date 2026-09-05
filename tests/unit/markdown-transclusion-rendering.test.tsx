import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MarkdownReadabilityRenderer } from '../../src/lib/markdownReadability';
import {
  ObsidianTransclusionResolver,
} from '../../src/lib/obsidianTransclusionResolver';
import { ResolverDocumentItem } from '../../src/lib/obsidianWikiLinkResolver';

describe('Markdown Transclusion Rendering', () => {
  const mockDocs: ResolverDocumentItem[] = [
    { title: 'Doc Alpha', filePath: 'Notes/Doc Alpha.md' },
    { title: 'Doc Beta', filePath: 'Notes/Doc Beta.md' },
    { title: 'Doc Circular', filePath: 'Notes/Doc Circular.md' },
  ];

  const mockFileContents: Record<string, string> = {
    'Notes/Doc Alpha.md': '# Title Alpha\nThis is content of Alpha note.\n## Key Concepts\n- Concept 1\n- Concept 2',
    'Notes/Doc Beta.md': '## Summary\nBeta summary details.\n## Other\nOther beta text.',
    'Notes/Doc Circular.md': 'Circular note text: ![[Doc Circular]]',
  };

  const mockFetcher = vi.fn(async (filePath: string) => {
    return mockFileContents[filePath] ?? null;
  });

  it('renders embedded note content when using "![[Doc Alpha]]"', async () => {
    const resolver = new ObsidianTransclusionResolver(mockDocs, mockFetcher);

    render(
      <MarkdownReadabilityRenderer
        content="Here is a transcluded note:\n\n![[Doc Alpha]]\n\nEnd of text."
        transclusionResolver={resolver}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('This is content of Alpha note.')).toBeDefined();
    });
    expect(screen.getByText('Title Alpha')).toBeDefined();
  });

  it('renders only the extracted section when using "![[Doc Beta#Summary]]"', async () => {
    const resolver = new ObsidianTransclusionResolver(mockDocs, mockFetcher);

    render(
      <MarkdownReadabilityRenderer
        content="Section embed:\n![[Doc Beta#Summary]]"
        transclusionResolver={resolver}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Beta summary details.')).toBeDefined();
    });
    // Should NOT contain ## Other section
    expect(screen.queryByText('Other beta text.')).toBeNull();
  });

  it('renders fallback when transcluded note is not found in vault', async () => {
    const resolver = new ObsidianTransclusionResolver(mockDocs, mockFetcher);

    render(
      <MarkdownReadabilityRenderer
        content="![[Non Existent Note]]"
        transclusionResolver={resolver}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Không tìm thấy ghi chú "Non Existent Note"/i)).toBeDefined();
    });
  });

  it('detects and renders warning badge for circular references', async () => {
    const resolver = new ObsidianTransclusionResolver(mockDocs, mockFetcher);

    render(
      <MarkdownReadabilityRenderer
        content="![[Doc Alpha]]"
        transclusionResolver={resolver}
        transclusionAncestors={['Notes/Doc Alpha.md']}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Phát hiện vòng lặp transclusion/i)).toBeDefined();
    });
  });

  it('stops recursion and renders warning badge when max depth is exceeded', async () => {
    const resolver = new ObsidianTransclusionResolver(mockDocs, mockFetcher);

    render(
      <MarkdownReadabilityRenderer
        content="![[Doc Alpha]]"
        transclusionResolver={resolver}
        transclusionDepth={4}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Vượt quá giới hạn độ sâu transclusion/i)).toBeDefined();
    });
  });

  it('sanitizes script tags in transcluded content without executing XSS', async () => {
    const maliciousFetcher = async () => {
      return 'Malicious note: <script>window.xssExposed = true;</script> Safe text.';
    };
    const resolver = new ObsidianTransclusionResolver(
      [{ title: 'Hacked', filePath: 'Notes/Hacked.md' }],
      maliciousFetcher
    );

    render(
      <MarkdownReadabilityRenderer
        content="![[Hacked]]"
        transclusionResolver={resolver}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Safe text\./)).toBeDefined();
    });

    expect((window as any).xssExposed).toBeUndefined();
    expect(document.querySelector('script')).toBeNull();
  });

  it('renders loading state indicator while transclusion is being resolved', async () => {
    let resolvePromise: (val: string) => void;
    const slowFetcher = () =>
      new Promise<string>((resolve) => {
        resolvePromise = resolve;
      });

    const resolver = new ObsidianTransclusionResolver(
      [{ title: 'Slow Note', filePath: 'Notes/Slow.md' }],
      slowFetcher
    );

    render(
      <MarkdownReadabilityRenderer
        content="![[Slow Note]]"
        transclusionResolver={resolver}
      />
    );

    expect(screen.getByText(/Đang tải nội dung nhúng/i)).toBeDefined();

    resolvePromise!('Delayed content arrived.');
    await waitFor(() => {
      expect(screen.getByText('Delayed content arrived.')).toBeDefined();
    });
  });

  it('renders error state when fetch fails', async () => {
    const failingFetcher = async () => {
      throw new Error('Network timeout fetching vault document');
    };
    const resolver = new ObsidianTransclusionResolver(
      [{ title: 'Fail Note', filePath: 'Notes/Fail.md' }],
      failingFetcher
    );

    render(
      <MarkdownReadabilityRenderer
        content="![[Fail Note]]"
        transclusionResolver={resolver}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Network timeout fetching vault document/i)).toBeDefined();
    });
  });
});
