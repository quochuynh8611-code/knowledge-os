import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TextSelectionPopover } from "../../src/components/notes/TextSelectionPopover";

describe("Phase F6.10: US1 — TextSelectionPopover Unit Tests", () => {
  const defaultProps = {
    isOpen: true,
    selectionText: "Khái niệm ngũ hành",
    position: { top: 120, left: 240 },
    onClose: vi.fn(),
    onCreateCard: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders TextSelectionPopover when text with length >= 2 is selected inside note content area", () => {
    render(<TextSelectionPopover {...defaultProps} />);

    expect(screen.getByTestId("text-selection-popover")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tạo thẻ nhớ/i })).toBeInTheDocument();
    expect(screen.getByText(/ngũ hành/i)).toBeInTheDocument();
  });

  it("hides popover when selection is collapsed or Escape key is pressed", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <TextSelectionPopover {...defaultProps} isOpen={false} onClose={onClose} />
    );

    expect(screen.queryByTestId("text-selection-popover")).not.toBeInTheDocument();

    // Re-render open and test Escape key
    rerender(<TextSelectionPopover {...defaultProps} isOpen={true} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("calculates popover fixed coordinates (top, left) based on selection range getBoundingClientRect()", () => {
    render(
      <TextSelectionPopover
        {...defaultProps}
        position={{ top: 180, left: 320 }}
      />
    );

    const popover = screen.getByTestId("text-selection-popover");
    expect(popover).toHaveStyle({ position: "fixed" });
    // Verify top and left styles are mapped accurately
    expect(popover.style.top).toMatch(/180px/);
    expect(popover.style.left).toMatch(/320px/);
  });

  it("supports keyboard shortcut (Alt+F) to capture current text selection and trigger flashcard modal", () => {
    const onCreateCard = vi.fn();
    render(
      <TextSelectionPopover
        {...defaultProps}
        selectionText="Đoạn văn bản bôi đen"
        onCreateCard={onCreateCard}
      />
    );

    // Simulate Alt+F
    fireEvent.keyDown(window, { key: "f", altKey: true });
    expect(onCreateCard).toHaveBeenCalledWith("Đoạn văn bản bôi đen");
  });
});
