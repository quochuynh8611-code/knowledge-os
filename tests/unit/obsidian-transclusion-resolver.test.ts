import { describe, it, expect } from 'vitest';
import {
  parseTransclusionTarget,
  isNoteTransclusion,
  extractSection,
  ObsidianTransclusionResolver,
  MAX_TRANSCLUSION_DEPTH,
} from '../../src/lib/obsidianTransclusionResolver';
import { ResolverDocumentItem } from '../../src/lib/obsidianWikiLinkResolver';

describe('Obsidian Transclusion Resolver Core', () => {
  describe('parseTransclusionTarget', () => {
    it('parses simple note embed "![[Note]]"', () => {
      const res = parseTransclusionTarget('![[Note]]');
      expect(res).toEqual({
        target: 'Note',
        heading: null,
        alias: null,
      });
    });

    it('parses note with heading "![[Note#Heading]]"', () => {
      const res = parseTransclusionTarget('![[Note#Heading]]');
      expect(res).toEqual({
        target: 'Note',
        heading: 'Heading',
        alias: null,
      });
    });

    it('parses note with alias "![[Note|Custom Title]]"', () => {
      const res = parseTransclusionTarget('![[Note|Custom Title]]');
      expect(res).toEqual({
        target: 'Note',
        heading: null,
        alias: 'Custom Title',
      });
    });

    it('parses note with heading and alias "![[Note#Heading|Custom Title]]"', () => {
      const res = parseTransclusionTarget('![[Note#Heading|Custom Title]]');
      expect(res).toEqual({
        target: 'Note',
        heading: 'Heading',
        alias: 'Custom Title',
      });
    });

    it('parses anchor link in current document "![[#Local Heading]]"', () => {
      const res = parseTransclusionTarget('![[#Local Heading]]');
      expect(res).toEqual({
        target: '',
        heading: 'Local Heading',
        alias: null,
      });
    });

    it('handles whitespace around embed targets', () => {
      const res = parseTransclusionTarget('  ![[  Note Name # Section 1 | My Alias  ]]  ');
      expect(res).toEqual({
        target: 'Note Name',
        heading: 'Section 1',
        alias: 'My Alias',
      });
    });
  });

  describe('isNoteTransclusion', () => {
    it('identifies plain note targets as note transclusions', () => {
      expect(isNoteTransclusion('Note')).toBe(true);
      expect(isNoteTransclusion('Kien Thuc Phap Hoc')).toBe(true);
      expect(isNoteTransclusion('Folder/Subfolder/DeepNote')).toBe(true);
    });

    it('identifies .md files as note transclusions', () => {
      expect(isNoteTransclusion('Note.md')).toBe(true);
      expect(isNoteTransclusion('Folder/Guide.MD')).toBe(true);
    });

    it('identifies media and attachment files as NOT note transclusions', () => {
      expect(isNoteTransclusion('diagram.png')).toBe(false);
      expect(isNoteTransclusion('photo.JPG')).toBe(false);
      expect(isNoteTransclusion('vector.svg')).toBe(false);
      expect(isNoteTransclusion('paper.pdf')).toBe(false);
      expect(isNoteTransclusion('clip.mp4')).toBe(false);
      expect(isNoteTransclusion('podcast.mp3')).toBe(false);
    });
  });

  describe('extractSection', () => {
    const sampleDoc = `# Title of Document

Introductory text here.

## Overview
This is the overview section.
It has multiple lines.

### Sub-topic
Details inside sub-topic.

## Architecture
This is the architecture section.
- Point A
- Point B

### Implementation
Architecture implementation details.

# Next Major Chapter
Final text.
`;

    it('returns entire content when heading is null or empty', () => {
      expect(extractSection(sampleDoc, null)).toBe(sampleDoc);
      expect(extractSection(sampleDoc, undefined)).toBe(sampleDoc);
      expect(extractSection(sampleDoc, '')).toBe(sampleDoc);
    });

    it('extracts section until next heading of equal rank (H2 to H2)', () => {
      const section = extractSection(sampleDoc, 'Overview');
      expect(section).toContain('## Overview');
      expect(section).toContain('This is the overview section.');
      expect(section).toContain('### Sub-topic');
      expect(section).not.toContain('## Architecture');
      expect(section).not.toContain('# Next Major Chapter');
    });

    it('extracts section until next heading of higher rank (H3 to H2)', () => {
      const section = extractSection(sampleDoc, 'Sub-topic');
      expect(section).toContain('### Sub-topic');
      expect(section).toContain('Details inside sub-topic.');
      expect(section).not.toContain('## Architecture');
    });

    it('extracts section at H1 until next H1', () => {
      const section = extractSection(sampleDoc, 'Title of Document');
      expect(section).toContain('# Title of Document');
      expect(section).toContain('## Overview');
      expect(section).toContain('## Architecture');
      expect(section).not.toContain('# Next Major Chapter');
    });

    it('is case-insensitive and trims whitespace when matching heading', () => {
      const section = extractSection(sampleDoc, '  overview  ');
      expect(section).toContain('## Overview');
      expect(section).not.toContain('## Architecture');
    });

    it('returns empty string when heading does not exist', () => {
      expect(extractSection(sampleDoc, 'Non Existent Section')).toBe('');
    });
  });

  describe('ObsidianTransclusionResolver class', () => {
    const mockVaultDocs: ResolverDocumentItem[] = [
      {
        title: 'Note A',
        filePath: 'Notes/Note A.md',
      },
      {
        title: 'Note B',
        filePath: 'Notes/Note B.md',
      },
      {
        title: 'Note C',
        filePath: 'Notes/Note C.md',
      },
    ];

    const mockFileContents: Record<string, string> = {
      'Notes/Note A.md': '# Note A Content\nText in Note A\n![[Note B]]',
      'Notes/Note B.md': '## Summary of B\nB details here\n### Extra\nExtra B details',
      'Notes/Note C.md': '# Note C Content\nText C',
    };

    const mockFetcher = async (filePath: string): Promise<string | null> => {
      return mockFileContents[filePath] ?? null;
    };

    it('resolves and fetches note content successfully', async () => {
      const resolver = new ObsidianTransclusionResolver(mockVaultDocs, mockFetcher);
      const result = await resolver.resolve('![[Note A]]');

      expect(result.status).toBe('success');
      expect(result.filePath).toBe('Notes/Note A.md');
      expect(result.content).toBe(mockFileContents['Notes/Note A.md']);
      expect(result.heading).toBeNull();
    });

    it('extracts section when heading is specified in embed', async () => {
      const resolver = new ObsidianTransclusionResolver(mockVaultDocs, mockFetcher);
      const result = await resolver.resolve('![[Note B#Summary of B]]');

      expect(result.status).toBe('success');
      expect(result.filePath).toBe('Notes/Note B.md');
      expect(result.content).toContain('## Summary of B');
      expect(result.content).toContain('B details here');
    });

    it('returns not_found status when note does not exist in vault', async () => {
      const resolver = new ObsidianTransclusionResolver(mockVaultDocs, mockFetcher);
      const result = await resolver.resolve('![[Missing Note]]');

      expect(result.status).toBe('not_found');
      expect(result.filePath).toBeNull();
      expect(result.content).toBeUndefined();
    });

    it('detects and prevents direct circular reference (A embeds A)', async () => {
      const resolver = new ObsidianTransclusionResolver(mockVaultDocs, mockFetcher);
      // Ancestors list contains Note A
      const result = await resolver.resolve('![[Note A]]', ['Notes/Note A.md'], 1);

      expect(result.status).toBe('circular');
      expect(result.message).toContain('Circular Reference');
    });

    it('detects and prevents indirect circular reference (A -> B -> A)', async () => {
      const resolver = new ObsidianTransclusionResolver(mockVaultDocs, mockFetcher);
      // Ancestors list has Note A and Note B
      const result = await resolver.resolve('![[Note A]]', ['Notes/Note A.md', 'Notes/Note B.md'], 2);

      expect(result.status).toBe('circular');
      expect(result.message).toContain('Circular Reference');
    });

    it(`prevents recursion beyond MAX_TRANSCLUSION_DEPTH (${MAX_TRANSCLUSION_DEPTH})`, async () => {
      const resolver = new ObsidianTransclusionResolver(mockVaultDocs, mockFetcher);
      const result = await resolver.resolve('![[Note C]]', ['Notes/Note A.md', 'Notes/Note B.md', 'Notes/Note Other.md'], 4);

      expect(result.status).toBe('max_depth');
      expect(result.message).toContain('tối đa 3 cấp');
    });

    it('uses in-memory cache to avoid duplicate fetch calls', async () => {
      let fetchCount = 0;
      const trackingFetcher = async (filePath: string) => {
        fetchCount++;
        return mockFileContents[filePath] ?? null;
      };

      const resolver = new ObsidianTransclusionResolver(mockVaultDocs, trackingFetcher);

      const first = await resolver.resolve('![[Note A]]');
      expect(first.status).toBe('success');
      expect(fetchCount).toBe(1);

      // Second call for same note
      const second = await resolver.resolve('![[Note A]]');
      expect(second.status).toBe('success');
      expect(fetchCount).toBe(1); // Cached!
    });
  });
});
