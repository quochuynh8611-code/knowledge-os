/**
 * Unit Tests: ExamCountdownToolbar Component (Phase F6.12)
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExamCountdownToolbar } from "../../src/components/flashcards/ExamCountdownToolbar";

describe("ExamCountdownToolbar Component", () => {
  it("renders toolbar, date picker, and handles date change", () => {
    const handleDateChange = vi.fn();
    const handleToggleSmart = vi.fn();

    render(
      <ExamCountdownToolbar
        examDate={null}
        smartQueueEnabled={false}
        onExamDateChange={handleDateChange}
        onSmartQueueToggle={handleToggleSmart}
      />
    );

    expect(screen.getByTestId("exam-countdown-toolbar")).toBeInTheDocument();
    const dateInput = screen.getByTestId("input-exam-date");
    fireEvent.change(dateInput, { target: { value: "2026-09-20" } });

    expect(handleDateChange).toHaveBeenCalledWith("2026-09-20");
  });

  it("renders countdown badge when exam date is set", () => {
    // Set exam date 5 days ahead
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const dateStr = futureDate.toISOString().split("T")[0];

    render(
      <ExamCountdownToolbar
        examDate={dateStr}
        smartQueueEnabled={true}
        onExamDateChange={vi.fn()}
        onSmartQueueToggle={vi.fn()}
      />
    );

    expect(screen.getByTestId("days-remaining-badge")).toBeInTheDocument();
    expect(screen.getByTestId("days-remaining-badge")).toHaveTextContent("Còn 5 ngày");
  });

  it("handles presets and clear button", () => {
    const handleDateChange = vi.fn();

    const { rerender } = render(
      <ExamCountdownToolbar
        examDate={null}
        smartQueueEnabled={false}
        onExamDateChange={handleDateChange}
        onSmartQueueToggle={vi.fn()}
      />
    );

    const preset7 = screen.getByTestId("btn-preset-7d");
    fireEvent.click(preset7);
    expect(handleDateChange).toHaveBeenCalled();

    // Rerender with date set
    rerender(
      <ExamCountdownToolbar
        examDate="2026-09-14"
        smartQueueEnabled={false}
        onExamDateChange={handleDateChange}
        onSmartQueueToggle={vi.fn()}
      />
    );

    const clearBtn = screen.getByTestId("btn-clear-exam-date");
    fireEvent.click(clearBtn);
    expect(handleDateChange).toHaveBeenCalledWith(null);
  });

  it("handles toggling Smart Priority Queue", () => {
    const handleToggleSmart = vi.fn();

    render(
      <ExamCountdownToolbar
        examDate={null}
        smartQueueEnabled={false}
        onExamDateChange={vi.fn()}
        onSmartQueueToggle={handleToggleSmart}
      />
    );

    const toggleBtn = screen.getByTestId("btn-toggle-smart-queue");
    fireEvent.click(toggleBtn);
    expect(handleToggleSmart).toHaveBeenCalledWith(true);
  });
});
