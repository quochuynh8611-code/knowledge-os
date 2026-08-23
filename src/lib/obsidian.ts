import JSZip from 'jszip';
import { Topic, Note, Resource, Category } from '../types';

export const DEFAULT_OBSIDIAN_VAULT_KEY = 'obsidian_vault_name_pref';

export function getStoredVaultName(): string {
  try {
    return localStorage.getItem(DEFAULT_OBSIDIAN_VAULT_KEY) || 'Khao-Cuu-Phat-Hoc-Huyen-Hoc';
  } catch {
    return 'Khao-Cuu-Phat-Hoc-Huyen-Hoc';
  }
}

export function setStoredVaultName(name: string): void {
  try {
    localStorage.setItem(DEFAULT_OBSIDIAN_VAULT_KEY, name.trim());
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
      body += `### [[Ghi-Chu/${n.title.replace(/[/\\?%*:|"<>]/g, '-')}|${n.title}]]\n`;
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
  return `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(filePath)}`;
}

/**
 * Generate URI to create note in Obsidian
 */
export function getObsidianNewNoteUri(vaultName: string, noteName: string, content: string): string {
  return `obsidian://new?vault=${encodeURIComponent(vaultName)}&name=${encodeURIComponent(noteName)}&content=${encodeURIComponent(content)}`;
}

/**
 * Export full Obsidian Vault ZIP
 */
export async function generateObsidianVaultZip(
  topics: Topic[],
  notes: Note[],
  resources: Resource[],
  categories: Category[],
  vaultName: string = 'Khao-Cuu-Phat-Hoc-Huyen-Hoc'
): Promise<Blob> {
  const zip = new JSZip();

  // Root README / Map of Content (MOC)
  let mocContent = `# 🧭 BẢN ĐỒ TRI THỨC (MAP OF CONTENT - MOC)\n\n`;
  mocContent += `*Vault: ${vaultName} | Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}*\n\n`;
  mocContent += `Chào mừng bạn đến với Obsidian Vault Khảo Cứu Phật Học & Huyền Học. Tất cả các ghi chú đã được kết nối bằng hệ thống liên kết hai chiều \`[[Wiki Links]]\`.\n\n`;

  mocContent += `## 🪷 1. Lĩnh Vực Phật Học (Buddhism)\n`;
  const phatHocTopics = topics.filter((t) => t.type === 'phat-hoc');
  phatHocTopics.forEach((t) => {
    mocContent += `- [[Phat-Hoc/${t.title.replace(/[/\\?%*:|"<>]/g, '-')}|${t.title}]] — *${t.categoryName || 'Tổng quan'}* (Tiến độ: ${t.studyProgress?.progress || 0}%)\n`;
  });

  mocContent += `\n## ☯️ 2. Lĩnh Vực Huyền Học & Dịch Học (Esotericism)\n`;
  const huyenHocTopics = topics.filter((t) => t.type === 'huyen-hoc');
  huyenHocTopics.forEach((t) => {
    mocContent += `- [[Huyen-Hoc/${t.title.replace(/[/\\?%*:|"<>]/g, '-')}|${t.title}]] — *${t.categoryName || 'Tổng quan'}* (Tiến độ: ${t.studyProgress?.progress || 0}%)\n`;
  });

  mocContent += `\n## 📚 3. Thư Viện Tài Liệu Tham Khảo\n`;
  resources.forEach((r) => {
    mocContent += `- **${r.title}** [${r.type.toUpperCase()}] ${r.author ? `(Tác giả: ${r.author})` : ''} ${r.url ? `[Link](${r.url})` : ''}\n`;
  });

  zip.file('00_Map_Of_Content.md', mocContent);

  // Add Phat-Hoc topic notes
  const phatHocFolder = zip.folder('Phat-Hoc');
  phatHocTopics.forEach((topic) => {
    const cleanFileName = `${topic.title.replace(/[/\\?%*:|"<>]/g, '-')}.md`;
    const content = formatTopicForObsidian(topic, notes);
    phatHocFolder?.file(cleanFileName, content);
  });

  // Add Huyen-Hoc topic notes
  const huyenHocFolder = zip.folder('Huyen-Hoc');
  huyenHocTopics.forEach((topic) => {
    const cleanFileName = `${topic.title.replace(/[/\\?%*:|"<>]/g, '-')}.md`;
    const content = formatTopicForObsidian(topic, notes);
    huyenHocFolder?.file(cleanFileName, content);
  });

  // Add separate notes folder
  const notesFolder = zip.folder('Ghi-Chu');
  notes.forEach((note) => {
    const cleanFileName = `${note.title.replace(/[/\\?%*:|"<>]/g, '-')}.md`;
    const content = formatNoteForObsidian(note);
    notesFolder?.file(cleanFileName, content);
  });

  return await zip.generateAsync({ type: 'blob' });
}
