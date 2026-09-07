import { Topic } from '../types';

/**
 * Curated Top 2 Priority / Core Anchor Topics per Domain
 * Total: 8 priority topics across 4 domains
 */
export const DEFAULT_PRIORITY_TOPIC_IDS: string[] = [
  // Phật Học (2 topics tiêu biểu)
  'topic-abhidharma-tong-quan', // Abhidharma - Vi Diệu Pháp Toàn Tập
  'topic-thien-vipassana', // Thiền Vipassana (Minh Sát Tuệ) & Tứ Niệm Xứ

  // Huyền Học (2 topics tiêu biểu)
  'topic-ky-mon-don-giap', // Kỳ Môn Độn Giáp - Môn Dự Trắc Địa Lý & Bát Trận
  'topic-kinh-dich', // Kinh Dịch - Đạo Biến Dịch & 64 Quẻ

  // Đông Y (2 topics tiêu biểu)
  'top-dongy-1', // Âm Dương Ngũ Hành & Học Thuyết Tạng Tượng
  'top-dongy-2', // Tứ Khí Ngũ Vị & Bát Cương Biện Chứng

  // Học Ngôn Ngữ (2 topics tiêu biểu)
  'top-ngonngu-1', // 214 Bộ Thủ Chữ Hán & Phương Pháp Chiết Tự
  'top-ngonngu-2', // Bảng Chữ Cái Devanāgarī & Hệ Thống Ngữ Âm Phạn-Pāli
];

/**
 * Filter topic list for compact selector display:
 * - When showAll = true or allTopics.length <= 8: returns all topics
 * - When allTopics.length > 8: returns top 8 priority topics. If active topic is outside top 8,
 *   dynamically prepends it so the user's active context is never lost.
 */
export function getCompactTopicOptions(
  allTopics: Topic[] = [],
  selectedTopicId?: string,
  showAll: boolean = false,
  priorityIds: string[] = DEFAULT_PRIORITY_TOPIC_IDS
): Topic[] {
  if (!allTopics || !Array.isArray(allTopics)) {
    return [];
  }

  // If list is already compact (<= 8 topics) or showAll is requested, return all
  if (showAll || allTopics.length <= 8) {
    return allTopics;
  }

  const prioritySet = new Set(priorityIds);
  const priorityList = allTopics.filter((t) => prioritySet.has(t.id));

  // If no priority items match (e.g. custom mock dataset), take top 2 per domain
  if (priorityList.length === 0) {
    const domainMap = new Map<string, Topic[]>();
    for (const t of allTopics) {
      const type = t.type || 'other';
      if (!domainMap.has(type)) domainMap.set(type, []);
      if (domainMap.get(type)!.length < 2) {
        domainMap.get(type)!.push(t);
      }
    }
    const dynamicPriority: Topic[] = [];
    domainMap.forEach((list) => dynamicPriority.push(...list));

    if (selectedTopicId && !dynamicPriority.some((t) => t.id === selectedTopicId)) {
      const activeTopic = allTopics.find((t) => t.id === selectedTopicId);
      if (activeTopic) {
        return [activeTopic, ...dynamicPriority];
      }
    }
    return dynamicPriority;
  }

  // If currently selected topic exists and is not in priority list, prepend it to preserve active context
  if (selectedTopicId && !prioritySet.has(selectedTopicId)) {
    const activeTopic = allTopics.find((t) => t.id === selectedTopicId);
    if (activeTopic) {
      return [activeTopic, ...priorityList];
    }
  }

  return priorityList;
}

/**
 * Helper to get clean display tag for domain/category in dropdown options
 */
export function getTopicDomainLabel(topic?: Topic): string {
  if (!topic) return 'Nghiên Cứu';
  switch (topic.type) {
    case 'phat-hoc':
      return 'Phật Học';
    case 'huyen-hoc':
      return 'Huyền Học';
    case 'dong-y':
      return 'Đông Y';
    case 'ngon-ngu':
      return 'Ngôn Ngữ';
    default:
      return topic.categoryName || topic.type || 'Nghiên Cứu';
  }
}
