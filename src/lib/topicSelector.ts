import { Topic } from '../types';

/**
 * Curated Top 2 Priority / Core Anchor Topics per Domain
 * Total: 8 priority topics across 4 domains
 */
export const DEFAULT_PRIORITY_TOPIC_IDS: string[] = [];

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
  return topic.categoryName || topic.type || 'Nghiên Cứu';
}
