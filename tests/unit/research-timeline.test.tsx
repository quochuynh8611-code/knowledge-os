/**
 * Unit Tests: Research Timeline Service & Component (Phase F7.0 Task 3)
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  buildResearchTimeline,
  groupTimelineByDateBuckets,
} from "../../src/lib/researchTimelineService";
import { ResearchTimeline } from "../../src/components/research/ResearchTimeline";
import type { Note, Resource } from "../../src/types";
import type { Flashcard, FlashcardReview } from "../../src/types/flashcard";

describe("Research Timeline Service", () => {
  const baseDate = new Date("2026-09-07T12:00:00.000Z");

  const mockNotes: Note[] = [
    {
      id: "note-1",
      topicId: "topic-1",
      title: "Ghi chú số 1",
      content: "Nội dung ghi chú",
      type: "study",
      isPrivate: false,
      tags: [],
      createdAt: "2026-09-07T10:00:00.000Z", // Hôm nay
      updatedAt: "2026-09-07T10:00:00.000Z",
    },
    {
      id: "note-2",
      topicId: "topic-2",
      title: "Ghi chú chủ đề 2",
      content: "Chủ đề khác",
      type: "study",
      isPrivate: false,
      tags: [],
      createdAt: "2026-09-06T10:00:00.000Z", // Hôm qua
      updatedAt: "2026-09-06T10:00:00.000Z",
    },
  ];

  const mockCards: Flashcard[] = [
    {
      id: "card-1",
      topicId: "topic-1",
      front: "Mặt trước thẻ",
      back: "Mặt sau thẻ",
      type: "basic",
      createdAt: "2026-09-04T10:00:00.000Z", // Tuần này (3 ngày trước)
      updatedAt: "2026-09-04T10:00:00.000Z",
    },
  ];

  const mockReviews: FlashcardReview[] = [
    {
      id: "rev-1",
      clientEventId: "evt-1",
      flashcardId: "card-1",
      topicId: "topic-1",
      rating: 4,
      reviewDurationMs: 3200,
      reviewedAt: "2026-08-20T10:00:00.000Z", // Tháng này (18 ngày trước)
      stateBefore: "review",
      stateAfter: "review",
      intervalBefore: 1,
      intervalAfter: 4,
      easeFactorBefore: 2.5,
      easeFactorAfter: 2.6,
      dueBeforeAt: "2026-08-20T10:00:00.000Z",
      dueAfterAt: "2026-08-24T10:00:00.000Z",
    },
  ];

  const mockResources: Resource[] = [
    {
      id: "res-1",
      topicId: "topic-1",
      title: "Sách tham khảo",
      type: "book",
      createdAt: "2026-07-01T10:00:00.000Z", // Cũ hơn (> 60 ngày trước)
    },
  ];

  it("builds a consolidated chronological event stream sorted descending", () => {
    const events = buildResearchTimeline({
      notes: mockNotes,
      flashcards: mockCards,
      reviews: mockReviews,
      resources: mockResources,
    });

    expect(events.length).toBe(5);
    // Newest is note-1 (2026-09-07)
    expect(events[0].id).toBe("evt-note-created-note-1");
    // Oldest is res-1 (2026-07-01)
    expect(events[events.length - 1].id).toBe("evt-res-created-res-1");
  });

  it("filters events by topicId correctly", () => {
    const events = buildResearchTimeline({
      topicId: "topic-1",
      notes: mockNotes,
      flashcards: mockCards,
      reviews: mockReviews,
      resources: mockResources,
    });

    expect(events.some((e) => e.topicId === "topic-2")).toBe(false);
    expect(events.length).toBe(4);
  });

  it("groups events into relative date buckets accurately", () => {
    const events = buildResearchTimeline({
      notes: mockNotes,
      flashcards: mockCards,
      reviews: mockReviews,
      resources: mockResources,
    });

    const buckets = groupTimelineByDateBuckets(events, baseDate);
    const bucketMap = new Map(buckets.map((b) => [b.key, b.events.length]));

    expect(bucketMap.get("Hôm nay")).toBe(1); // note-1
    expect(bucketMap.get("Hôm qua")).toBe(1); // note-2
    expect(bucketMap.get("Tuần này")).toBe(1); // card-1
    expect(bucketMap.get("Tháng này")).toBe(1); // rev-1
    expect(bucketMap.get("Cũ hơn")).toBe(1); // res-1
  });
});

describe("ResearchTimeline Component", () => {
  const mockNotes: Note[] = [
    {
      id: "note-1",
      topicId: "topic-1",
      title: "Ghi chú Tứ Niệm Xứ",
      content: "Chi tiết về thân thọ tâm pháp",
      type: "study",
      isPrivate: false,
      tags: [],
      createdAt: "2026-09-07T10:00:00.000Z",
      updatedAt: "2026-09-07T10:00:00.000Z",
    },
  ];

  const mockCards: Flashcard[] = [
    {
      id: "card-1",
      topicId: "topic-1",
      front: "Kāyānupassanā",
      back: "Quán thân trên thân",
      type: "basic",
      createdAt: "2026-09-07T09:00:00.000Z",
      updatedAt: "2026-09-07T09:00:00.000Z",
    },
  ];

  it("renders timeline events grouped in buckets", () => {
    render(
      <ResearchTimeline
        topicId="topic-1"
        topicTitle="Tứ Niệm Xứ"
        notes={mockNotes}
        flashcards={mockCards}
      />
    );

    expect(screen.getByTestId("research-timeline")).toBeInTheDocument();
    expect(screen.getByText("Ghi chú Tứ Niệm Xứ")).toBeInTheDocument();
    expect(screen.getByText("Kāyānupassanā")).toBeInTheDocument();
  });

  it("filters events by type chips", () => {
    render(
      <ResearchTimeline
        topicId="topic-1"
        notes={mockNotes}
        flashcards={mockCards}
      />
    );

    // Filter to Ghi chú only
    const notesFilter = screen.getByTestId("filter-notes");
    fireEvent.click(notesFilter);

    expect(screen.getByText("Ghi chú Tứ Niệm Xứ")).toBeInTheDocument();
    expect(screen.queryByText("Kāyānupassanā")).not.toBeInTheDocument();

    // Filter to Flashcards only
    const flashcardsFilter = screen.getByTestId("filter-flashcards");
    fireEvent.click(flashcardsFilter);

    expect(screen.getByText("Kāyānupassanā")).toBeInTheDocument();
    expect(screen.queryByText("Ghi chú Tứ Niệm Xứ")).not.toBeInTheDocument();
  });

  it("filters events by search query", () => {
    render(
      <ResearchTimeline
        topicId="topic-1"
        notes={mockNotes}
        flashcards={mockCards}
      />
    );

    const searchInput = screen.getByTestId("timeline-search-input");
    fireEvent.change(searchInput, { target: { value: "Kāyā" } });

    expect(screen.getByText("Kāyānupassanā")).toBeInTheDocument();
    expect(screen.queryByText("Ghi chú Tứ Niệm Xứ")).not.toBeInTheDocument();
  });

  it("opens and closes detail preview modal on event click", () => {
    const onSelectEvent = vi.fn();
    render(
      <ResearchTimeline
        topicId="topic-1"
        notes={mockNotes}
        onSelectEvent={onSelectEvent}
      />
    );

    const card = screen.getByText("Ghi chú Tứ Niệm Xứ");
    fireEvent.click(card);

    expect(onSelectEvent).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("timeline-preview-modal")).toBeInTheDocument();
    expect(screen.getByText("Chi Tiết Sự Kiện Nghiên Cứu")).toBeInTheDocument();

    const closeBtn = screen.getByTestId("close-preview-modal");
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId("timeline-preview-modal")).not.toBeInTheDocument();
  });
});
