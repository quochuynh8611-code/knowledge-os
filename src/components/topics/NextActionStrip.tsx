/**
 * NextActionStrip
 *
 * A single-line contextual nudge that appears below the Progress Bar
 * inside the Topic Header Banner. Helps learners know what to do next
 * based on their current study status and progress.
 *
 * Design: calm, text-only, no icons that add visual weight. One sentence.
 *
 * Phase 17B spec: docs/specs/phase-17b-topic-detail-toolbar.md
 */

import React from 'react';
import { Topic } from '../../types';

export interface NextActionStripProps {
  topic: Topic;
}

interface ActionMessage {
  text: string;
}

function resolveMessage(topic: Topic): ActionMessage {
  const { status, progress, totalNotes, timeSpent } = topic.studyProgress;

  if (status === 'not_started' || progress === 0) {
    return { text: 'Bắt đầu phiên học đầu tiên để kích hoạt tiến trình học tập.' };
  }

  if (status === 'completed') {
    return { text: 'Đã hoàn thành · Ôn tập định kỳ để duy trì trí nhớ dài hạn.' };
  }

  if (status === 'reviewing') {
    return { text: 'Đang ôn tập · Tiếp tục thực hành SM-2 để củng cố kiến thức.' };
  }

  // in_progress
  if (progress >= 50) {
    return { text: 'Gần hoàn thành · Hãy ôn tập SM-2 để củng cố và chuyển sang bộ nhớ dài hạn.' };
  }

  if (totalNotes === 0) {
    return { text: 'Tiếp tục nghiên cứu · Thêm ghi chú đầu tiên để củng cố kiến thức.' };
  }

  return {
    text: `Tiếp tục nghiên cứu · Bạn đã học ${Math.round(timeSpent)} phút — ghi thêm đúc kết để tăng tiến độ.`,
  };
}

export function NextActionStrip({ topic }: NextActionStripProps) {
  const { text } = resolveMessage(topic);

  return (
    <p
      data-testid="next-action-strip"
      className="text-[11px] text-stone-500 dark:text-stone-400 italic leading-snug pt-2 border-t border-stone-100 dark:border-stone-800"
    >
      💡 {text}
    </p>
  );
}
