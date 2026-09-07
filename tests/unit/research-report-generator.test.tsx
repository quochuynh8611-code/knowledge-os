/**
 * Unit Tests: Research Report Generator & Export Modal (Phase F7.0 Task 5)
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  generateResearchReport,
  downloadMarkdownReport,
} from "../../src/lib/researchReportGenerator";
import { ExportReportModal } from "../../src/components/research/ExportReportModal";
import type { Note, Resource, Topic } from "../../src/types";
import type { Flashcard, FlashcardReview } from "../../src/types/flashcard";

describe("Research Report Generator", () => {
  const mockTopic: Topic = {
    id: "topic-1",
    categoryId: "cat-1",
    title: "Thiền Tứ Niệm Xứ",
    slug: "thien-tu-niem-xu",
    type: "phat-hoc",
    description: "Thực hành chánh niệm trên bốn lĩnh vực",
    content: "Nội dung chi tiết",
    tags: ["thien", "tu-niem-xu"],
    links: [],
    studyProgress: {
      topicId: "topic-1",
      status: "in_progress",
      progress: 50,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 1,
      totalNotes: 1,
      timeSpent: 30,
    },
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };

  const mockNotes: Note[] = [
    {
      id: "note-1",
      topicId: "topic-1",
      title: "Ghi chú Thân Hành Niệm",
      content: "Quán chiếu hơi thở vô, hơi thở ra dài hay ngắn.",
      type: "study",
      isPrivate: false,
      tags: ["chánh niệm", "hơi thở"],
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
  ];

  const mockCards: Flashcard[] = [
    {
      id: "card-1",
      topicId: "topic-1",
      front: "Kāyānupassanā là gì?",
      back: "Quán thân trên thân",
      type: "basic",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      schedule: {
        id: "s1",
        flashcardId: "card-1",
        state: "review",
        dueAt: "2026-09-10T00:00:00.000Z",
        interval: 5,
        easeFactor: 2.5,
        repetitions: 3,
        lapses: 0,
        retentionRate: 0.9,
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    },
  ];

  const mockResources: Resource[] = [
    {
      id: "res-1",
      topicId: "topic-1",
      title: "Đại Kinh Xóm Ngựa (Assapura Sutta)",
      type: "article",
      author: "Hòa thượng Thích Minh Châu",
      url: "https://budsas.net/assapura",
      notes: "Pháp hành căn bản của bậc Sa-môn.",
      createdAt: "2026-09-01T00:00:00.000Z",
    },
  ];

  it("generates markdown with valid YAML frontmatter and all sections", () => {
    const report = generateResearchReport({
      topic: mockTopic,
      categoryTitle: "Phật Học",
      notes: mockNotes,
      flashcards: mockCards,
      resources: mockResources,
    });

    // YAML frontmatter
    expect(report).toContain("---");
    expect(report).toContain('title: "Báo Cáo Nghiên Cứu: Thiền Tứ Niệm Xứ"');
    expect(report).toContain('topicId: "topic-1"');
    expect(report).toContain('category: "Phật Học"');
    expect(report).toContain("generator: ");

    // Main header
    expect(report).toContain("# BÁO CÁO NGHIÊN CỨU: THIỀN TỨ NIỆM XỨ");

    // Overview section
    expect(report).toContain("## 📊 1. Tổng Quan Chỉ Số Tri Thức & Ghi Nhớ");
    expect(report).toContain("Tổng số ghi chú");
    expect(report).toContain("Tổng số thẻ flashcard");

    // Notes section
    expect(report).toContain("## 📝 2. Danh Sách Ghi Chú Nghiên Cứu");
    expect(report).toContain("Ghi chú Thân Hành Niệm");
    expect(report).toContain("Quán chiếu hơi thở vô, hơi thở ra dài hay ngắn.");

    // Flashcards section
    expect(report).toContain("## 🧠 3. Danh Mục Flashcards & Trạng Thái Ôn Tập (SRS)");
    expect(report).toContain("Kāyānupassanā là gì?");
    expect(report).toContain("Quán thân trên thân");

    // Resources section
    expect(report).toContain("## 📚 4. Tài Liệu Tham Khảo & Nguồn Dữ Liệu");
    expect(report).toContain("Đại Kinh Xóm Ngựa (Assapura Sutta)");
    expect(report).toContain("Hòa thượng Thích Minh Châu");

    // Timeline section
    expect(report).toContain("## ⏳ 5. Dòng Thời Gian Nghiên Cứu");
  });

  it("excludes unchecked sections when requested", () => {
    const report = generateResearchReport({
      topic: mockTopic,
      notes: mockNotes,
      flashcards: mockCards,
      sections: {
        overview: true,
        notes: false,
        flashcards: false,
        resources: false,
        timeline: false,
      },
    });

    expect(report).toContain("## 📊 1. Tổng Quan Chỉ Số Tri Thức & Ghi Nhớ");
    expect(report).not.toContain("## 📝 2. Danh Sách Ghi Chú Nghiên Cứu");
    expect(report).not.toContain("## 🧠 3. Danh Mục Flashcards");
    expect(report).not.toContain("## 📚 4. Tài Liệu Tham Khảo");
    expect(report).not.toContain("## ⏳ 5. Dòng Thời Gian");
  });
});

describe("ExportReportModal Component", () => {
  const mockTopic: Topic = {
    id: "topic-1",
    categoryId: "cat-1",
    title: "Thiền Tứ Niệm Xứ",
    slug: "thien-tu-niem-xu",
    type: "phat-hoc",
    description: "Thực hành chánh niệm",
    content: "Nội dung",
    tags: [],
    links: [],
    studyProgress: {
      topicId: "topic-1",
      status: "in_progress",
      progress: 50,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 1,
      totalNotes: 1,
      timeSpent: 30,
    },
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };

  it("renders preview and switches to config view", () => {
    render(
      <ExportReportModal
        isOpen={true}
        onClose={() => {}}
        topic={mockTopic}
      />
    );

    expect(screen.getByTestId("export-report-modal")).toBeInTheDocument();
    expect(screen.getByTestId("export-preview-panel")).toBeInTheDocument();

    // Switch to config view
    const configTab = screen.getByTestId("tab-config");
    fireEvent.click(configTab);

    expect(screen.getByTestId("export-config-panel")).toBeInTheDocument();
    expect(screen.getByTestId("checkbox-overview")).toBeInTheDocument();
    expect(screen.getByTestId("checkbox-notes")).toBeInTheDocument();
  });

  it("copies markdown to clipboard", async () => {
    const originalClipboard = navigator.clipboard;
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <ExportReportModal
        isOpen={true}
        onClose={() => {}}
        topic={mockTopic}
      />
    );

    const copyBtn = screen.getByTestId("copy-markdown-btn");
    await React.act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalledTimes(1);

    // Restore
    Object.assign(navigator, { clipboard: originalClipboard });
  });

  it("triggers download button", () => {
    // Mock URL and createElement
    const clickMock = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName === "a") {
        el.click = clickMock;
      }
      return el;
    });

    render(
      <ExportReportModal
        isOpen={true}
        onClose={() => {}}
        topic={mockTopic}
      />
    );

    const downloadBtn = screen.getByTestId("download-report-btn");
    fireEvent.click(downloadBtn);

    expect(clickMock).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });
});
