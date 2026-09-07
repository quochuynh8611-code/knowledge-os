/**
 * Unit Tests: FlashcardCardView Component (Phase F5)
 *
 * Feature: Flashcard Rendering & Flip Mechanism
 *
 * Scenario 1: Render basic flashcard front
 *   Given a basic card with front="Khái niệm Bát Nhã" and back="Trí tuệ thanh tịnh"
 *   When FlashcardCardView renders with isFlipped=false
 *   Then front content is visible in the DOM
 *   And back content is hidden or not active
 *
 * Scenario 2: Render basic flashcard back upon flip
 *   Given isFlipped=true
 *   When FlashcardCardView renders
 *   Then back content "Trí tuệ thanh tịnh" is visible
 *
 * Scenario 3: Render cloze deletion card front
 *   Given a cloze card with front="Tứ Diệu Đế gồm: {{c1::Khổ::Dukkha}}, Tập, Diệt, Đạo"
 *   When FlashcardCardView renders with isFlipped=false
 *   Then the deletion is replaced with "[...]" or cloze blank prompt
 *   And hint "Dukkha" is presented
 *
 * Scenario 4: Render cloze deletion card back
 *   Given a cloze card with isFlipped=true
 *   When FlashcardCardView renders
 *   Then the answer "Khổ" is revealed and highlighted
 *
 * Scenario 5: Trigger flip callback on card click
 *   Given onFlip callback mock
 *   When user clicks the card element
 *   Then onFlip is invoked exactly once
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FlashcardCardView } from "../../src/components/flashcards/FlashcardCardView";
import type { Flashcard } from "../../src/types/flashcard";

describe("FlashcardCardView Unit Tests", () => {
  const mockBasicCard: Flashcard = {
    id: "card-basic-001",
    topicId: "topic-prajna",
    type: "basic",
    front: "Khái niệm Bát Nhã là gì?",
    back: "Trí tuệ thanh tịnh thấy rõ thực tại các pháp.",
    lifecycleStatus: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockClozeCard: Flashcard = {
    id: "card-cloze-001",
    topicId: "topic-4-truths",
    type: "cloze",
    front: "Tứ Diệu Đế gồm: {{c1::Khổ::Dukkha}}, Tập, Diệt, Đạo",
    back: "Khổ đế là chân lý đầu tiên",
    lifecycleStatus: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("Scenario 1: Hiển thị mặt trước của thẻ basic khi chưa lật", () => {
    render(<FlashcardCardView card={mockBasicCard} isFlipped={false} />);

    expect(screen.getByText("Khái niệm Bát Nhã là gì?")).toBeInTheDocument();
    const cardEl = screen.getByTestId("flashcard-card");
    expect(cardEl).toHaveAttribute("data-flipped", "false");
  });

  it("Scenario 2: Hiển thị mặt sau của thẻ basic khi đã lật", () => {
    render(<FlashcardCardView card={mockBasicCard} isFlipped={true} />);

    expect(
      screen.getByText("Trí tuệ thanh tịnh thấy rõ thực tại các pháp.")
    ).toBeInTheDocument();
    const cardEl = screen.getByTestId("flashcard-card");
    expect(cardEl).toHaveAttribute("data-flipped", "true");
  });

  it("Scenario 3: Hiển thị chỗ trống cloze deletion và gợi ý ở mặt trước", () => {
    render(<FlashcardCardView card={mockClozeCard} isFlipped={false} />);

    // Kiểm tra render cloze deletion placeholder
    const clozeEl = screen.getByTestId("cloze-deletion");
    expect(clozeEl).toBeInTheDocument();
    expect(clozeEl).toHaveTextContent(/\[\.\.\.\]|\.\.\./);
    expect(screen.getByText(/Dukkha/i)).toBeInTheDocument();
  });

  it("Scenario 4: Tiết lộ câu trả lời cloze khi đã lật", () => {
    render(<FlashcardCardView card={mockClozeCard} isFlipped={true} />);

    expect(screen.getByText("Khổ")).toBeInTheDocument();
  });

  it("Scenario 5: Gọi hàm onFlip khi người dùng click vào bề mặt thẻ", () => {
    const handleFlip = vi.fn();
    render(
      <FlashcardCardView
        card={mockBasicCard}
        isFlipped={false}
        onFlip={handleFlip}
      />
    );

    const cardEl = screen.getByTestId("flashcard-card");
    fireEvent.click(cardEl);

    expect(handleFlip).toHaveBeenCalledTimes(1);
  });
});
