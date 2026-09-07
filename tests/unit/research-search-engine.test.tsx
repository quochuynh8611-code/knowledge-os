/**
 * Unit Tests: Research Search Engine & Modal (Phase F7.0 Task 4)
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ResearchSearchEngine,
  buildSearchableDocuments,
  tokenizeText,
  highlightMatches,
} from "../../src/lib/researchSearchEngine";
import { ResearchSearchModal } from "../../src/components/research/ResearchSearchModal";
import type { Note, Resource } from "../../src/types";
import type { Flashcard } from "../../src/types/flashcard";

describe("Research Search Engine (BM25 & Normalization)", () => {
  const mockNotes: Note[] = [
    {
      id: "note-1",
      topicId: "topic-1",
      title: "Thiền Tứ Niệm Xứ Căn Bản",
      content: "Satipaṭṭhāna Sutta là bản kinh cốt lõi về bốn lĩnh vực quán niệm: thân, thọ, tâm, pháp.",
      type: "study",
      isPrivate: false,
      tags: [],
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
    {
      id: "note-2",
      topicId: "topic-2",
      title: "Thạch Học Khoa Học & Đá Quý",
      content: "Cấu trúc tinh thể thạch anh tím và ứng dụng trong năng lượng học.",
      type: "insight",
      isPrivate: false,
      tags: [],
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
    },
  ];

  const mockResources: Resource[] = [
    {
      id: "res-1",
      topicId: "topic-1",
      title: "Kinh Điển Pāli Dīgha Nikāya 22",
      type: "pdf",
      notes: "Mahāsatipaṭṭhāna Sutta văn bản gốc",
      createdAt: "2026-09-01T00:00:00.000Z",
    },
  ];

  it("tokenizes and normalizes text with Vietnamese accents and Pāli IAST", () => {
    const tokens = tokenizeText("Satipaṭṭhāna Sutta Tứ Niệm Xứ!");
    expect(tokens).toContain("satipatthana");
    expect(tokens).toContain("sutta");
    expect(tokens).toContain("tu");
    expect(tokens).toContain("niem");
    expect(tokens).toContain("xu");
  });

  it("finds matching documents regardless of accent variations (IAST & Vietnamese)", () => {
    const docs = buildSearchableDocuments({
      notes: mockNotes,
      flashcards: mockCards,
      resources: mockResources,
    });
    const engine = new ResearchSearchEngine(docs);

    // Search ASCII "satipatthana" should match "Satipaṭṭhāna"
    const results = engine.search("satipatthana");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.document.id.includes("note-1"))).toBe(true);

    // Search without accents "tu niem xu" should match "Tứ Niệm Xứ"
    const resultsVN = engine.search("tu niem xu");
    expect(resultsVN.length).toBeGreaterThan(0);
    expect(resultsVN[0].document.id).toContain("note-1");
  });

  it("filters search results by entity type", () => {
    const docs = buildSearchableDocuments({
      notes: mockNotes,
      flashcards: mockCards,
      resources: mockResources,
    });
    const engine = new ResearchSearchEngine(docs);

    // Search "thân" with filter "flashcard"
    const resultsCard = engine.search("than", { type: "flashcard" });
    expect(resultsCard.length).toBe(1);
    expect(resultsCard[0].document.type).toBe("flashcard");

    // Search "thân" with filter "resource" -> none
    const resultsRes = engine.search("than", { type: "resource" });
    expect(resultsRes.length).toBe(0);
  });

  it("highlights matched terms with <mark> tags", () => {
    const highlighted = highlightMatches("Thiền Tứ Niệm Xứ", ["tu", "niem"]);
    expect(highlighted).toContain("<mark");
    expect(highlighted).toContain("Tứ");
    expect(highlighted).toContain("Niệm");
  });
});

describe("ResearchSearchModal Component", () => {
  const mockNotes: Note[] = [
    {
      id: "note-1",
      topicId: "topic-1",
      title: "Ghi chú Thiền Quán",
      content: "Nội dung Satipaṭṭhāna",
      type: "study",
      isPrivate: false,
      tags: [],
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
  ];

  it("renders when open and responds to user input", () => {
    const onClose = vi.fn();
    render(
      <ResearchSearchModal
        isOpen={true}
        onClose={onClose}
        notes={mockNotes}
      />
    );

    expect(screen.getByTestId("research-search-modal")).toBeInTheDocument();

    const input = screen.getByTestId("bm25-search-input");
    fireEvent.change(input, { target: { value: "Satipaṭṭhāna" } });

    expect(screen.getByTestId("search-result-item")).toBeInTheDocument();
    expect(screen.getAllByText(/Ghi chú/i).length).toBeGreaterThanOrEqual(1);
  });

  it("calls onClose when ESC button clicked", () => {
    const onClose = vi.fn();
    render(
      <ResearchSearchModal
        isOpen={true}
        onClose={onClose}
        notes={mockNotes}
      />
    );

    const closeBtn = screen.getByTestId("close-search-modal");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("invokes onSelectResult when a result is clicked", () => {
    const onSelectResult = vi.fn();
    const onClose = vi.fn();

    render(
      <ResearchSearchModal
        isOpen={true}
        onClose={onClose}
        notes={mockNotes}
        onSelectResult={onSelectResult}
      />
    );

    const input = screen.getByTestId("bm25-search-input");
    fireEvent.change(input, { target: { value: "Thiền" } });

    const resultItem = screen.getByTestId("search-result-item");
    fireEvent.click(resultItem);

    expect(onSelectResult).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
