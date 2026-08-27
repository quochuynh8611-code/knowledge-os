import type JSZip from 'jszip';
import { Topic, Note, Resource, Category } from '../types';

export const DEFAULT_OBSIDIAN_VAULT_KEY = 'obsidian_vault_name_pref';
export const DEFAULT_OBSIDIAN_VAULT_NAME = 'Khao-Cuu-Phat-Hoc-Huyen-Hoc';

/**
 * Common child folder patterns inside Obsidian vaults to avoid confusing as the vault root
 */
export const OBSIDIAN_CHILD_DIR_PATTERNS = [
  /^0\d_.*$/i,       // 01_Inbox, 00_Meta, 02_Cards, etc.
  /^_.*$/i,           // _inbox, _templates, etc.
  /^\.obsidian$/i,    // .obsidian config directory
  /^inbox$/i,
  /^templates$/i,
  /^attachments$/i,
  /^assets$/i,
];

/**
 * Normalizes vault identifier from plain string or full filesystem path (macOS/Linux/Windows).
 * Handles subfolder paths like 01_Inbox by extracting parent vault folder.
 */
export function normalizeObsidianVaultIdentifier(input?: string | null): string {
  if (!input || typeof input !== 'string') {
    return DEFAULT_OBSIDIAN_VAULT_NAME;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return DEFAULT_OBSIDIAN_VAULT_NAME;
  }

  // Check if input looks like a filesystem path (contains / or \)
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    const normalizedPath = trimmed.replace(/\\/g, '/');
    const segments = normalizedPath
      .split('/')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s !== '.');

    if (segments.length === 0) {
      return DEFAULT_OBSIDIAN_VAULT_NAME;
    }

    let targetSegment = segments[segments.length - 1];
    if (segments.length > 1 && OBSIDIAN_CHILD_DIR_PATTERNS.some((p) => p.test(targetSegment))) {
      targetSegment = segments[segments.length - 2];
    }

    if (targetSegment && !/^(users|home|root|var|etc|c:|d:|e:)$/i.test(targetSegment)) {
      return targetSegment;
    }

    return targetSegment || DEFAULT_OBSIDIAN_VAULT_NAME;
  }

  return trimmed;
}

/**
 * Normalizes relative file paths for Obsidian URI protocol, stripping leading slashes.
 */
export function normalizeObsidianFilePath(filePath: string): string {
  if (!filePath || typeof filePath !== 'string') {
    return '';
  }

  let cleaned = filePath.trim().replace(/\\/g, '/');
  cleaned = cleaned.replace(/^\/+/, '');
  cleaned = cleaned.replace(/\/+/g, '/');

  return cleaned;
}

/**
 * Sanitize title into valid filename across OS and ZIP structures
 */
export function sanitizeFileName(title: string): string {
  return title.replace(/[/\\?%*:|"<>]/g, '-').trim();
}

export function getStoredVaultName(): string {
  try {
    const stored = localStorage.getItem(DEFAULT_OBSIDIAN_VAULT_KEY);
    if (stored && stored.trim().length > 0) {
      return normalizeObsidianVaultIdentifier(stored);
    }
    return DEFAULT_OBSIDIAN_VAULT_NAME;
  } catch {
    return DEFAULT_OBSIDIAN_VAULT_NAME;
  }
}

export function setStoredVaultName(name: string): void {
  try {
    const trimmed = name.trim();
    if (trimmed.length > 0) {
      const normalized = normalizeObsidianVaultIdentifier(trimmed);
      localStorage.setItem(DEFAULT_OBSIDIAN_VAULT_KEY, normalized);
    } else {
      localStorage.removeItem(DEFAULT_OBSIDIAN_VAULT_KEY);
    }
  } catch (e) {
    console.error('Failed to store vault name', e);
  }
}

/**
 * Sanitizes and normalizes tags for Markdown and YAML Frontmatter export.
 * - Strips leading '#' characters
 * - Trims whitespace
 * - Escapes internal double quotes (\")
 * - Removes empty/whitespace/null/undefined elements
 * - Deduplicates preserving initial insertion order
 */
export function normalizeExportTags(tags?: (string | null | undefined)[]): string[] {
  if (!tags || !Array.isArray(tags)) {
    return [];
  }

  const result: string[] = [];
  const seen = new Set<string>();

  for (const raw of tags) {
    if (typeof raw !== 'string') continue;
    let cleaned = raw.trim();
    if (!cleaned) continue;

    // Strip leading '#'
    cleaned = cleaned.replace(/^#+/, '').trim();
    if (!cleaned) continue;

    // Escape internal double quotes
    cleaned = cleaned.replace(/\\"/g, '"').replace(/"/g, '\\"');

    if (!seen.has(cleaned)) {
      seen.add(cleaned);
      result.push(cleaned);
    }
  }

  return result;
}

/**
 * Format topic as clean Obsidian Markdown with YAML Frontmatter
 */
export function formatTopicForObsidian(topic: Topic, allNotes: Note[] = []): string {
  const cleanTags = normalizeExportTags(topic.tags);
  const frontmatter = [
    '---',
    `title: "${topic.title.replace(/"/g, '\\"')}"`,
    `slug: "${topic.slug}"`,
    `domain: "${topic.type}"`,
    `category: "${topic.categoryName || topic.categoryId}"`,
    `tags: [${cleanTags.map((t) => `"${t}"`).join(', ')}]`,
    `aliases: ["${topic.title}"]`,
    `progress: ${topic.studyProgress?.progress || 0}`,
    `status: "${topic.studyProgress?.status || 'not_started'}"`,
    `ease_factor: ${topic.studyProgress?.easeFactor || 2.5}`,
    `interval_days: ${topic.studyProgress?.interval || 0}`,
    `created: "${topic.createdAt.slice(0, 10)}"`,
    `updated: "${topic.updatedAt.slice(0, 10)}"`,
    '---',
    '',
  ].join('\n');

  let body = `# ${topic.title}\n\n`;
  body += `> [!abstract] Mô tả & Định vị\n> ${topic.description}\n\n`;
  body += `## Nội Dung Khảo Cứu & Luận Thuyết\n\n${topic.content}\n\n`;

  // Links section with Obsidian [[Wiki Links]]
  if (topic.links && topic.links.length > 0) {
    body += `## 🔗 Liên Kết Tri Thức (Knowledge Links)\n\n`;
    topic.links.forEach((link) => {
      body += `- **${link.linkType.toUpperCase()}** (Trọng số ${link.strength}/5): [[${link.targetTitle || 'Chủ đề'}]]\n`;
      if (link.notes) {
        body += `  > *${link.notes}*\n`;
      }
    });
    body += '\n';
  }

  // Associated notes
  const relatedNotes = allNotes.filter((n) => n.topicId === topic.id);
  if (relatedNotes.length > 0) {
    body += `## 📝 Ghi Chú Chuyên Sâu Liên Quan\n\n`;
    relatedNotes.forEach((n) => {
      body += `### [[Ghi-Chu/${sanitizeFileName(n.title)}|${n.title}]]\n`;
      body += `*Loại: ${n.type} | Ngày: ${n.createdAt.slice(0, 10)}*\n\n`;
      body += `${n.content}\n\n---\n\n`;
    });
  }

  return frontmatter + body;
}

/**
 * Format single note for Obsidian
 */
export function formatNoteForObsidian(note: Note): string {
  const cleanTags = normalizeExportTags(note.tags);
  const frontmatter = [
    '---',
    `title: "${note.title.replace(/"/g, '\\"')}"`,
    `type: "${note.type}"`,
    `topic: "${note.topicTitle || ''}"`,
    `tags: [${cleanTags.map((t) => `"${t}"`).join(', ')}]`,
    `created: "${note.createdAt.slice(0, 10)}"`,
    `updated: "${note.updatedAt.slice(0, 10)}"`,
    '---',
    '',
  ].join('\n');

  let body = `# ${note.title}\n\n`;
  if (note.topicTitle) {
    body += `*Thuộc chủ đề: [[${note.topicTitle}]]*\n\n`;
  }
  body += `${note.content}\n`;

  return frontmatter + body;
}

/**
 * Generate deep link to open Obsidian
 */
export function getObsidianOpenUri(vaultName: string, filePath: string): string {
  const cleanVault = normalizeObsidianVaultIdentifier(vaultName);
  const cleanFilePath = normalizeObsidianFilePath(filePath);
  return `obsidian://open?vault=${encodeURIComponent(cleanVault)}&file=${encodeURIComponent(cleanFilePath)}`;
}

/**
 * Generate URI to create note in Obsidian
 */
export function getObsidianNewNoteUri(vaultName: string, noteName: string, content: string): string {
  const cleanVault = normalizeObsidianVaultIdentifier(vaultName);
  return `obsidian://new?vault=${encodeURIComponent(cleanVault)}&name=${encodeURIComponent(noteName.trim())}&content=${encodeURIComponent(content)}`;
}

export function getDomainFolderName(domainKey: string): string {
  if (!domainKey || typeof domainKey !== 'string') return 'Other';
  const trimmed = domainKey.trim();
  if (!trimmed || trimmed.toLowerCase() === 'other') return 'Other';

  return trimmed
    .split('-')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
}

/**
 * Export full Obsidian Vault ZIP
 */
export async function generateObsidianVaultZip(
  topics: Topic[],
  notes: Note[],
  resources: Resource[],
  categories?: Category[],
  vaultName: string = DEFAULT_OBSIDIAN_VAULT_NAME
): Promise<Blob> {
  const JSZipModule = await import('jszip');
  const JSZipConstructor = (JSZipModule.default || JSZipModule) as unknown as typeof JSZip;
  const zip = new JSZipConstructor();
  const cleanVault = vaultName && vaultName.trim().length > 0 ? vaultName.trim() : DEFAULT_OBSIDIAN_VAULT_NAME;

  // Root README / Map of Content (MOC)
  let mocContent = `# 🧭 BẢN ĐỒ TRI THỨC (MAP OF CONTENT - MOC)\n\n`;
  mocContent += `*Vault: ${cleanVault} | Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}*\n\n`;
  mocContent += `Chào mừng bạn đến với Obsidian Vault Khảo Cứu Tri Thức. Tất cả các ghi chú đã được kết nối bằng hệ thống liên kết hai chiều \`[[Wiki Links]]\`.\n\n`;

  const getTopicRootSlug = (topic: Topic): string => {
    if (categories && categories.length > 0 && topic.categoryId) {
      const catMap = new Map(categories.map((c) => [c.id, c]));
      let curr = catMap.get(topic.categoryId);
      const visited = new Set<string>();
      while (curr && curr.parentId) {
        if (visited.has(curr.id)) break;
        visited.add(curr.id);
        const parent = catMap.get(curr.parentId);
        if (!parent) break;
        curr = parent;
      }
      if (curr) return curr.slug || curr.type || curr.id;
    }
    return topic.categorySlug || topic.type || 'other';
  };

  let rootCats: { id: string; name: string; slug: string }[] = [];

  if (categories && categories.length > 0) {
    rootCats = categories
      .filter((c) => !c.parentId)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug || c.type || c.id,
      }));
  } else {
    // Derive root categories deterministically from topics when categories is empty
    const typeMap = new Map<string, { id: string; name: string; slug: string }>();
    topics.forEach((t) => {
      const slug = t.categorySlug || t.type || 'other';
      if (slug !== 'other' && !typeMap.has(slug)) {
        typeMap.set(slug, {
          id: slug,
          name: t.categoryName || getDomainFolderName(slug).replace(/-/g, ' '),
          slug,
        });
      }
    });
    rootCats = Array.from(typeMap.values()).sort((a, b) => a.slug.localeCompare(b.slug));
  }

  let sectionIndex = 1;
  const processedTopicIds = new Set<string>();

  rootCats.forEach((root) => {
    const rootSlug = root.slug;
    const domainTopics = topics.filter((t) => {
      const targetSlug = getTopicRootSlug(t);
      return targetSlug === rootSlug || t.type === rootSlug || t.categoryId === root.id;
    });

    if (domainTopics.length === 0) {
      return;
    }

    const folderName = getDomainFolderName(rootSlug);
    const heading = `## ${sectionIndex}. Lĩnh Vực ${root.name}`;
    sectionIndex++;

    mocContent += `${heading}\n`;
    domainTopics.forEach((t) => {
      processedTopicIds.add(t.id);
      mocContent += `- [[${folderName}/${sanitizeFileName(t.title)}|${t.title}]] — *${t.categoryName || 'Tổng quan'}* (Tiến độ: ${t.studyProgress?.progress || 0}%)\n`;
    });
    mocContent += '\n';

    // Add domain folder & files to zip
    const domainFolder = zip.folder(folderName);
    domainTopics.forEach((topic) => {
      const cleanFileName = `${sanitizeFileName(topic.title)}.md`;
      const content = formatTopicForObsidian(topic, notes);
      domainFolder?.file(cleanFileName, content);
    });
  });

  // Remaining topics not mapped to any known root category
  const remainingTopics = topics.filter((t) => !processedTopicIds.has(t.id));
  if (remainingTopics.length > 0) {
    const otherFolder = zip.folder('Other');
    mocContent += `## ${sectionIndex}. Lĩnh Vực Khác\n`;
    sectionIndex++;
    remainingTopics.forEach((t) => {
      mocContent += `- [[Other/${sanitizeFileName(t.title)}|${t.title}]] — *${t.categoryName || 'Tổng quan'}* (Tiến độ: ${t.studyProgress?.progress || 0}%)\n`;
      const cleanFileName = `${sanitizeFileName(t.title)}.md`;
      const content = formatTopicForObsidian(t, notes);
      otherFolder?.file(cleanFileName, content);
    });
    mocContent += '\n';
  }

  // Section: Library Resources
  mocContent += `## 📚 ${sectionIndex}. Thư Viện Tài Liệu Tham Khảo\n`;
  resources.forEach((r) => {
    mocContent += `- **${r.title}** [${r.type.toUpperCase()}] ${r.author ? `(Tác giả: ${r.author})` : ''} ${r.url ? `[Link](${r.url})` : ''}\n`;
  });

  zip.file('00_Map_Of_Content.md', mocContent);

  // Add separate notes folder
  const notesFolder = zip.folder('Ghi-Chu');
  notes.forEach((note) => {
    const cleanFileName = `${sanitizeFileName(note.title)}.md`;
    const content = formatNoteForObsidian(note);
    notesFolder?.file(cleanFileName, content);
  });

  return await zip.generateAsync({ type: 'blob' });
}
