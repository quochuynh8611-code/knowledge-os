import JSZip from 'jszip';
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
 * Format topic as clean Obsidian Markdown with YAML Frontmatter
 */
export function formatTopicForObsidian(topic: Topic, allNotes: Note[] = []): string {
  const frontmatter = [
    '---',
    `title: "${topic.title.replace(/"/g, '\\"')}"`,
    `slug: "${topic.slug}"`,
    `domain: "${topic.type}"`,
    `category: "${topic.categoryName || topic.categoryId}"`,
    `tags: [${topic.tags.map((t) => `"${t}"`).join(', ')}]`,
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
  const frontmatter = [
    '---',
    `title: "${note.title.replace(/"/g, '\\"')}"`,
    `type: "${note.type}"`,
    `topic: "${note.topicTitle || ''}"`,
    `tags: [${note.tags.map((t) => `"${t}"`).join(', ')}]`,
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

/**
 * Export full Obsidian Vault ZIP
 */
export async function generateObsidianVaultZip(
  topics: Topic[],
  notes: Note[],
  resources: Resource[],
  categories: Category[],
  vaultName: string = DEFAULT_OBSIDIAN_VAULT_NAME
): Promise<Blob> {
  const zip = new JSZip();
  const cleanVault = vaultName && vaultName.trim().length > 0 ? vaultName.trim() : DEFAULT_OBSIDIAN_VAULT_NAME;

  // Root README / Map of Content (MOC)
  let mocContent = `# 🧭 BẢN ĐỒ TRI THỨC (MAP OF CONTENT - MOC)\n\n`;
  mocContent += `*Vault: ${cleanVault} | Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}*\n\n`;
  mocContent += `Chào mừng bạn đến với Obsidian Vault Khảo Cứu Phật Học & Huyền Học. Tất cả các ghi chú đã được kết nối bằng hệ thống liên kết hai chiều \`[[Wiki Links]]\`.\n\n`;

  mocContent += `## 🪷 1. Lĩnh Vực Phật Học (Buddhism)\n`;
  const phatHocTopics = topics.filter((t) => t.type === 'phat-hoc');
  phatHocTopics.forEach((t) => {
    mocContent += `- [[Phat-Hoc/${sanitizeFileName(t.title)}|${t.title}]] — *${t.categoryName || 'Tổng quan'}* (Tiến độ: ${t.studyProgress?.progress || 0}%)\n`;
  });

  mocContent += `\n## ☯️ 2. Lĩnh Vực Huyền Học & Dịch Học (Esotericism)\n`;
  const huyenHocTopics = topics.filter((t) => t.type === 'huyen-hoc');
  huyenHocTopics.forEach((t) => {
    mocContent += `- [[Huyen-Hoc/${sanitizeFileName(t.title)}|${t.title}]] — *${t.categoryName || 'Tổng quan'}* (Tiến độ: ${t.studyProgress?.progress || 0}%)\n`;
  });

  mocContent += `\n## 📚 3. Thư Viện Tài Liệu Tham Khảo\n`;
  resources.forEach((r) => {
    mocContent += `- **${r.title}** [${r.type.toUpperCase()}] ${r.author ? `(Tác giả: ${r.author})` : ''} ${r.url ? `[Link](${r.url})` : ''}\n`;
  });

  zip.file('00_Map_Of_Content.md', mocContent);

  // Add Phat-Hoc topic notes
  const phatHocFolder = zip.folder('Phat-Hoc');
  phatHocTopics.forEach((topic) => {
    const cleanFileName = `${sanitizeFileName(topic.title)}.md`;
    const content = formatTopicForObsidian(topic, notes);
    phatHocFolder?.file(cleanFileName, content);
  });

  // Add Huyen-Hoc topic notes
  const huyenHocFolder = zip.folder('Huyen-Hoc');
  huyenHocTopics.forEach((topic) => {
    const cleanFileName = `${sanitizeFileName(topic.title)}.md`;
    const content = formatTopicForObsidian(topic, notes);
    huyenHocFolder?.file(cleanFileName, content);
  });

  // Add separate notes folder
  const notesFolder = zip.folder('Ghi-Chu');
  notes.forEach((note) => {
    const cleanFileName = `${sanitizeFileName(note.title)}.md`;
    const content = formatNoteForObsidian(note);
    notesFolder?.file(cleanFileName, content);
  });

  return await zip.generateAsync({ type: 'blob' });
}
