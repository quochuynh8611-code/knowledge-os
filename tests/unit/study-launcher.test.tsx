/**
 * Unit Tests: StudyLauncher Component (Phase F6.6)
 *
 * Validates:
 * 1. Renders 4 strategy cards (review, new, weak, cram) with counters
 * 2. Displays daily new-card limit and handles limit changes
 * 3. Clicking launch buttons fires onLaunchSession callback with appropriate sessionType
 * 4. Renders quick switcher button to Card Browser
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StudyLauncher } from "../../src/components/flashcards/StudyLauncher";
import type { Flashcard } from "../../src/types/flashcard";

describe("StudyLauncher Component (Phase F6.6)", () => {
  const mockCards: Flashcard[] = [
    {
      id: "c-1",
      topicId: "topic-1",
      type: "basic",
      front: "Thẻ đến hạn",
      back: "Nội dung",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schedule: {
        id: "s-1",
        flashcardId: "c-1",
        state: "review",
        dueAt: new Date(Date.now() - 100000).toISOString(),
        interval: 1,
        easeFactor: 2.5,
        repetitions: 1,
        lapses: 0,
        updatedAt: new Date().toISOString(),
      },
    },
    {
      id: "c-2",
      topicId: "topic-1",
      type: "basic",
      front: "Thẻ mới",
      back: "Nội dung",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schedule: {
        id: "s-2",
        flashcardId: "c-2",
        state: "new",
        dueAt: new Date().toISOString(),
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        lapses: 0,
        updatedAt: new Date().toISOString(),
      },
    },
    {
      id: "c-3",
      topicId: "topic-1",
      type: "basic",
      front: "Thẻ yếu",
      back: "Nội dung",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schedule: {
        id: "s-3",
        flashcardId: "c-3",
        state: "relearning",
        dueAt: new Date().toISOString(),
        interval: 1,
        easeFactor: 1.8,
        repetitions: 1,
        lapses: 4,
        updatedAt: new Date().toISOString(),
      },
    },
  ];

  beforeEach(() => {
    localStorage.clear();
  });

  it("1. renders 4 strategy cards with proper metrics", () => {
    render(<StudyLauncher cards={mockCards} />);

    expect(screen.getByTestId("card-strategy-review")).toBeInTheDocument();
    expect(screen.getByTestId("card-strategy-new")).toBeInTheDocument();
    expect(screen.getByTestId("card-strategy-weak")).toBeInTheDocument();
    expect(screen.getByTestId("card-strategy-cram")).toBeInTheDocument();

    // Check count displays
    expect(screen.getByTestId("count-due")).toHaveTextContent("2"); // c-1 and c-3 are due
    expect(screen.getByTestId("count-new")).toHaveTextContent("1"); // c-2 is new
    expect(screen.getByTestId("count-weak")).toHaveTextContent("1"); // c-3 is weak
    expect(screen.getByTestId("count-cram")).toHaveTextContent("3"); // all 3 active
  });

  it("2. allows configuring daily new-card limit", () => {
    render(<StudyLauncher cards={mockCards} />);

    const limitInput = screen.getByTestId("input-daily-new-limit") as HTMLInputElement;
    expect(limitInput.value).toBe("20");

    fireEvent.change(limitInput, { target: { value: "30" } });
    expect(limitInput.value).toBe("30");
    expect(localStorage.getItem("knowledge_os_flashcard_daily_new_limit")).toBe("30");
  });

  it("3. clicking launch buttons calls onLaunchSession callback with correct sessionType", () => {
    const onLaunch = vi.fn();
    render(<StudyLauncher cards={mockCards} onLaunchSession={onLaunch} />);

    // Review session
    fireEvent.click(screen.getByTestId("btn-launch-review"));
    expect(onLaunch).toHaveBeenCalledWith("review");

    // New cards session
    fireEvent.click(screen.getByTestId("btn-launch-new"));
    expect(onLaunch).toHaveBeenCalledWith("new");

    // Weak cards session
    fireEvent.click(screen.getByTestId("btn-launch-weak"));
    expect(onLaunch).toHaveBeenCalledWith("weak");

    // Cram session
    fireEvent.click(screen.getByTestId("btn-launch-cram"));
    expect(onLaunch).toHaveBeenCalledWith("cram");
  });

  it("4. clicking Card Browser button calls onOpenBrowser callback", () => {
    const onOpenBrowser = vi.fn();
    render(<StudyLauncher cards={mockCards} onOpenBrowser={onOpenBrowser} />);

    fireEvent.click(screen.getByTestId("btn-launcher-to-browser"));
    expect(onOpenBrowser).toHaveBeenCalledTimes(1);
  });
});
