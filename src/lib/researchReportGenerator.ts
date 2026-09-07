/**
 * Research Report Generator (Phase F7.0 Task 5)
 *
 * Synthesizes comprehensive Markdown research reports for topics,
 * aggregating notes, flashcards with SRS mastery, resources, and timeline milestones.
 *
 * Strictly zero database migrations: derived purely at runtime with UTF-8 BOM.
 */

import type { Note, Resource, Topic } from "../types";
import type { Flashcard, FlashcardReview } from "../types/flashcard";
import {
  aggregateTopicAssets,
  calculateTopicStats,
} from "./researchAggregationService";
import { buildResearchTimeline } from "./researchTimelineService";

export interface ReportSectionSelection {
  overview?: boolean;
  notes?: boolean;
  flashcards?: boolean;
  resources?: boolean;
  timeline?: boolean;
}

export interface GenerateReportOptions {
  topic: Topic;
  categoryTitle?: string;
  notes?: Note[];
  flashcards?: Flashcard[];
  reviews?: FlashcardReview[];
  resources?: Resource[];
  sections?: ReportSectionSelection;
  now?: Date;
}

/**
 * Generates a full Markdown research report with YAML frontmatter.
 */
export function generateResearchReport(options: GenerateReportOptions): string {
  const {
    topic,
    categoryTitle = "Chung",
    notes = [],
    flashcards = [],
    reviews = [],
    resources = [],
    sections = {
      overview: true,
      notes: true,
      flashcards: true,
      resources: true,
      timeline: true,
    },
    now = new Date(),
  } = options;

  const topicNotes = notes.filter(
    (n) => n.topicId === topic.id || (n.topicIds && n.topicIds.includes(topic.id))
  );
  const topicCards = flashcards.filter((f) => f.topicId === topic.id);
  const topicResources = resources.filter((r) => r.topicId === topic.id);

  const assets = aggregateTopicAssets(topic.id, {
    notes: topicNotes,
    flashcards: topicCards,
    resources: topicResources,
    now,
  });

  const stats = calculateTopicStats(topic.id, {
    reviews,
    flashcards: topicCards,
    now,
  });

  const nowIso = now.toISOString();
  const dateFormatted = now.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const lines: string[] = [];

  // 1. YAML Frontmatter
  lines.push("---");
  lines.push(`title: "Báo Cáo Nghiên Cứu: ${topic.title.replace(/"/g, '\\"')}"`);
  lines.push(`topicId: "${topic.id}"`);
  lines.push(`category: "${categoryTitle}"`);
  lines.push(`generatedAt: "${nowIso}"`);
  lines.push(`generator: "Knowledge OS Research Hub (v0.13.0)"`);
  lines.push("---");
  lines.push("");

  // 2. Title & Meta
  lines.push(`# BÁO CÁO NGHIÊN CỨU: ${topic.title.toUpperCase()}`);
  lines.push("");
  lines.push(`- **Chuyên mục**: ${categoryTitle}`);
  lines.push(`- **Ngày xuất**: ${dateFormatted}`);
  lines.push(`- **Mô tả**: ${topic.description || "Chưa có mô tả chi tiết."}`);
  lines.push("");

  // 3. Section: Overview Metrics Table
  if (sections.overview) {
    lines.push("## 📊 1. Tổng Quan Chỉ Số Tri Thức & Ghi Nhớ");
    lines.push("");
    lines.push("| Chỉ Số | Giá Trị | Đơn Vị / Chi Tiết |");
    lines.push("| :--- | :--- | :--- |");
    lines.push(`| **Tổng số ghi chú** | ${assets.notesCount} | bài viết nghiên cứu |`);
    lines.push(
      `| **Tổng số thẻ flashcard** | ${assets.flashcardsCount} | ${assets.activeCardsCount} đang học • ${assets.cardsDueCount} cần ôn |`
    );
    lines.push(`| **Tài liệu tham khảo** | ${assets.resourcesCount} | nguồn tài liệu |`);
    lines.push(
      `| **Tỷ lệ ghi nhớ (Retention)** | **${stats.retentionRate}%** | dựa trên ${stats.totalReviews} lượt ôn tập |`
    );
    lines.push(`| **Chuỗi ngày học (Streak)** | ${stats.streakDays} | ngày liên tiếp |`);
    lines.push(
      `| **Thời gian ôn tập đã tích lũy** | ${
        stats.timeSpentMinutes < 60
          ? `${stats.timeSpentMinutes} phút`
          : `${(stats.timeSpentMinutes / 60).toFixed(1)} giờ`
      } | tổng thời lượng tương tác |`
    );
    lines.push(
      `| **Độ ổn định trí nhớ (Stability)** | ~${stats.stabilityDays} ngày | thời gian bán rã thông tin |`
    );
    lines.push(
      `| **Hệ số dễ trung bình (Ease Factor)** | ${stats.averageEaseFactor} | thuật toán SM-2 / Adaptive |`
    );
    lines.push("");
  }

  // 4. Section: Notes
  if (sections.notes) {
    lines.push("## 📝 2. Danh Sách Ghi Chú Nghiên Cứu");
    lines.push("");
    if (topicNotes.length === 0) {
      lines.push("*Chưa có ghi chú nào cho chủ đề này.*");
      lines.push("");
    } else {
      for (let i = 0; i < topicNotes.length; i++) {
        const note = topicNotes[i];
        lines.push(`### 2.${i + 1}. ${note.title}`);
        lines.push(
          `- *Ngày tạo*: ${new Date(note.createdAt).toLocaleDateString("vi-VN")}${
            note.tags && note.tags.length > 0 ? ` • *Thẻ*: \`${note.tags.join("`, `")}\`` : ""
          }`
        );
        lines.push("");
        if (note.content) {
          lines.push(note.content.trim());
        } else {
          lines.push("*(Nội dung trống)*");
        }
        lines.push("");
      }
    }
  }

  // 5. Section: Flashcards
  if (sections.flashcards) {
    lines.push("## 🧠 3. Danh Mục Flashcards & Trạng Thái Ôn Tập (SRS)");
    lines.push("");
    if (topicCards.length === 0) {
      lines.push("*Chưa có flashcard nào cho chủ đề này.*");
      lines.push("");
    } else {
      lines.push("| STT | Mặt Trước (Câu hỏi / Thuật ngữ) | Mặt Sau (Đáp án / Định nghĩa) | Trạng Thái | Khoảng Cách |");
      lines.push("| :--- | :--- | :--- | :--- | :--- |");

      topicCards.forEach((card, idx) => {
        const frontClean = (card.front || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
        const backClean = (card.back || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
        const state = card.schedule?.state || "new";
        const interval = card.schedule?.interval ? `${card.schedule.interval}d` : "0d";
        lines.push(`| ${idx + 1} | ${frontClean} | ${backClean} | \`${state}\` | ${interval} |`);
      });
      lines.push("");
    }
  }

  // 6. Section: Resources
  if (sections.resources) {
    lines.push("## 📚 4. Tài Liệu Tham Khảo & Nguồn Dữ Liệu");
    lines.push("");
    if (topicResources.length === 0) {
      lines.push("*Chưa có tài liệu nguồn nào cho chủ đề này.*");
      lines.push("");
    } else {
      topicResources.forEach((res, idx) => {
        lines.push(`### 4.${idx + 1}. ${res.title}`);
        lines.push(`- **Loại tài liệu**: \`${res.type}\``);
        if (res.author) lines.push(`- **Tác giả / Nguồn**: ${res.author}`);
        if (res.url) lines.push(`- **Liên kết**: [${res.url}](${res.url})`);
        if (res.filePath) lines.push(`- **Đường dẫn tệp**: \`${res.filePath}\``);
        if (res.notes) {
          lines.push("");
          lines.push(`> ${res.notes.trim().replace(/\n/g, "\n> ")}`);
        }
        lines.push("");
      });
    }
  }

  // 7. Section: Timeline
  if (sections.timeline) {
    lines.push("## ⏳ 5. Dòng Thời Gian Nghiên Cứu (15 Mốc Gần Nhất)");
    lines.push("");
    const timelineEvents = buildResearchTimeline({
      topicId: topic.id,
      notes: topicNotes,
      flashcards: topicCards,
      reviews,
      resources: topicResources,
    }).slice(0, 15);

    if (timelineEvents.length === 0) {
      lines.push("*Chưa có sự kiện dòng thời gian nào.*");
      lines.push("");
    } else {
      for (const evt of timelineEvents) {
        const timeStr = new Date(evt.timestamp).toLocaleString("vi-VN");
        lines.push(`- **[${timeStr}]** \`${evt.type}\` — **${evt.title}**`);
        if (evt.snippet) {
          lines.push(`  - *${evt.snippet.replace(/\n/g, " ").slice(0, 120)}*`);
        }
      }
      lines.push("");
    }
  }

  lines.push("---");
  lines.push(`*Báo cáo được tổng hợp tự động bởi Knowledge OS vào lúc ${nowIso}.*`);
  lines.push("");

  return lines.join("\n");
}

/**
 * Downloads a generated Markdown report file with UTF-8 BOM encoding.
 */
export function downloadMarkdownReport(
  markdownContent: string,
  filename: string
): void {
  // Prepend UTF-8 BOM (\uFEFF)
  const bom = "\uFEFF";
  const blob = new Blob([bom + markdownContent], {
    type: "text/markdown;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".md") ? filename : `${filename}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
