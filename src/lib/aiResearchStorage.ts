/**
 * AI Research Studio Persistence & Export Architecture (Phase P6.0)
 *
 * Core library providing resilient client-side storage, topic isolation,
 * rolling buffer management (max 20 sessions), and structured Markdown export.
 */

import {
  safeGetLocalStorageItem,
  safeSetLocalStorageItem,
  safeRemoveLocalStorageItem,
} from './storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AIResearchMode =
  | 'concept_analysis'
  | 'terminology_exegesis'
  | 'cross_domain_synthesis'
  | 'scholar_analysis'
  | 'pali_sanskrit_exegesis'
  | 'cross_domain_link';

export interface AIResearchSession {
  id: string;
  topicId: string;
  topicTitle: string;
  mode: AIResearchMode;
  prompt: string;
  result: string;
  timestamp: number;
}

export interface FormatMarkdownOptions {
  domainOrCategory?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const AI_RESEARCH_SESSIONS_STORAGE_KEY = 'knowledge_os_ai_research_sessions_v1';
export const MAX_RESEARCH_SESSIONS = 20;

const VALID_RESEARCH_MODES = new Set<string>([
  'concept_analysis',
  'terminology_exegesis',
  'cross_domain_synthesis',
  'scholar_analysis',
  'pali_sanskrit_exegesis',
  'cross_domain_link',
]);

/**
 * Validates whether a value is a supported AIResearchMode.
 */
export function isValidResearchMode(val: unknown): val is AIResearchMode {
  return typeof val === 'string' && VALID_RESEARCH_MODES.has(val);
}

const MODE_DISPLAY_NAMES: Record<AIResearchMode, string> = {
  concept_analysis: 'Phân Tích Khái Niệm',
  scholar_analysis: 'Phân Tích Học Giả & Luận Thuyết',
  terminology_exegesis: 'Ngữ Nguyên & Thuật Ngữ',
  pali_sanskrit_exegesis: 'Chiết Tự Pali / Sanskrit / Hán Cổ',
  cross_domain_synthesis: 'Tổng Hợp Liên Ngành',
  cross_domain_link: 'Đối Chiếu & Liên Kết Đa Ngành',
};

// ─── Slug & Filename Utilities ────────────────────────────────────────────────

/**
 * Generates an ASCII/Unicode safe slug for filenames and URLs.
 * Handles Vietnamese diacritics and removes illegal filesystem characters.
 */
export function slugifyTopicTitle(title: string): string {
  if (!title || typeof title !== 'string') return 'research';

  const normalized = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics for clean ASCII filenames
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'research';
}

/**
 * Builds a sanitized, deterministic filename for Markdown research export.
 * Format: AI-Research-[topic-slug]-[timestamp].md
 */
export function sanitizeExportFilename(topicSlugOrTitle: string, timestamp: number): string {
  const safeSlug = slugifyTopicTitle(topicSlugOrTitle);
  const safeTime = Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now();
  return `AI-Research-${safeSlug}-${safeTime}.md`;
}

// ─── Storage Operations ───────────────────────────────────────────────────────

/**
 * Validates whether an unknown object conforms strictly to the AIResearchSession structure.
 */
function isValidResearchSession(item: any): item is AIResearchSession {
  return (
    item != null &&
    typeof item === 'object' &&
    typeof item.id === 'string' &&
    item.id.trim() !== '' &&
    typeof item.topicId === 'string' &&
    item.topicId.trim() !== '' &&
    typeof item.prompt === 'string' &&
    item.prompt.trim() !== '' &&
    typeof item.result === 'string' &&
    item.result.trim() !== '' &&
    typeof item.timestamp === 'number' &&
    Number.isFinite(item.timestamp) &&
    isValidResearchMode(item.mode)
  );
}

/**
 * Safely reads and validates all stored AI research sessions.
 * Returns an empty array if storage is empty, inaccessible, or contains corrupted JSON.
 */
export function getStoredResearchSessions(): AIResearchSession[] {
  const raw = safeGetLocalStorageItem(AI_RESEARCH_SESSIONS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const validSessions = parsed.filter(isValidResearchSession);
    // Return sorted newest first
    return validSessions.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    // Malformed JSON fallback
    return [];
  }
}

/**
 * Saves a successful AI research session into local storage with rolling buffer limit.
 *
 * Rules:
 * 1. Only persists if prompt, result, and topicId are non-empty.
 * 2. Generates unique id and timestamp if not provided.
 * 3. Prepends new session to beginning (newest first).
 * 4. Caps list to MAX_RESEARCH_SESSIONS (20).
 * 5. Returns the persisted session object or null on rejection/failure.
 */
export function saveResearchSession(
  sessionInput: Omit<AIResearchSession, 'id' | 'timestamp'> & {
    id?: string;
    timestamp?: number;
  }
): AIResearchSession | null {
  if (
    !sessionInput ||
    typeof sessionInput.topicId !== 'string' ||
    !sessionInput.topicId.trim() ||
    typeof sessionInput.prompt !== 'string' ||
    !sessionInput.prompt.trim() ||
    typeof sessionInput.result !== 'string' ||
    !sessionInput.result.trim()
  ) {
    return null;
  }

  const newSession: AIResearchSession = {
    id:
      sessionInput.id?.trim() ||
      `airs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    topicId: sessionInput.topicId.trim(),
    topicTitle: sessionInput.topicTitle?.trim() || 'Chủ Đề Nghiên Cứu',
    mode: isValidResearchMode(sessionInput.mode)
      ? sessionInput.mode
      : 'concept_analysis',
    prompt: sessionInput.prompt.trim(),
    result: sessionInput.result.trim(),
    timestamp: sessionInput.timestamp && Number.isFinite(sessionInput.timestamp)
      ? sessionInput.timestamp
      : Date.now(),
  };

  const currentSessions = getStoredResearchSessions();

  // Deduplicate if same ID exists, then prepend new session
  const filtered = currentSessions.filter((s) => s.id !== newSession.id);
  const updated = [newSession, ...filtered].slice(0, MAX_RESEARCH_SESSIONS);

  const success = safeSetLocalStorageItem(
    AI_RESEARCH_SESSIONS_STORAGE_KEY,
    JSON.stringify(updated)
  );

  return success ? newSession : null;
}

/**
 * Returns all stored sessions for a given topicId in reverse chronological order (newest first).
 */
export function getSessionsForTopic(
  topicId: string,
  sessions?: AIResearchSession[]
): AIResearchSession[] {
  if (!topicId || typeof topicId !== 'string') return [];
  const source = sessions || getStoredResearchSessions();
  return source
    .filter((s) => s.topicId === topicId.trim())
    .sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Returns the most recent successful session for a given topicId, or null if none exists.
 */
export function getLatestSessionForTopic(
  topicId: string,
  sessions?: AIResearchSession[]
): AIResearchSession | null {
  const topicSessions = getSessionsForTopic(topicId, sessions);
  return topicSessions.length > 0 ? topicSessions[0] : null;
}

/**
 * Clears all stored AI research sessions.
 */
export function clearResearchSessions(): boolean {
  return safeRemoveLocalStorageItem(AI_RESEARCH_SESSIONS_STORAGE_KEY);
}

// ─── Markdown Export Formatter ────────────────────────────────────────────────

/**
 * Formats an AIResearchSession into a structured, academic Markdown document.
 */
export function formatResearchMarkdown(
  session: AIResearchSession,
  options?: FormatMarkdownOptions
): string {
  const modeLabel = MODE_DISPLAY_NAMES[session.mode] || session.mode;
  const domain = options?.domainOrCategory || 'Nghiên Cứu Học Thuật';
  const isoDate = new Date(session.timestamp).toISOString();
  const localeDate = new Date(session.timestamp).toLocaleString('vi-VN');

  return `# Khảo Cứu Antigravity AI: ${session.topicTitle}

- **Chủ đề:** ${session.topicTitle}
- **Lĩnh vực:** ${domain}
- **Chế độ khảo cứu:** ${modeLabel}
- **Thời gian thực hiện:** ${localeDate} (${isoDate})
- **Session ID:** \`${session.id}\`

---

## 1. Yêu Cầu Khảo Cứu (Prompt)

${session.prompt}

---

## 2. Kết Quả Khảo Cứu & Tổng Hợp Học Thuật

${session.result}

---
*Tài liệu được xuất tự động từ Antigravity AI Scholar & Research Engine.*
`;
}
