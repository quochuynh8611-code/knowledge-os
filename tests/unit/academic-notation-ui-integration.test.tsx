import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MarkdownReadabilityRenderer } from "../../src/lib/markdownReadability";
import { FlashcardCardView } from "../../src/components/flashcards/FlashcardCardView";
import { MindMapNodeDrawer, MindMapDrawerNode } from "../../src/components/mindmap/MindMapNodeDrawer";
import { MermaidDiagramBlock } from "../../src/components/ui/MermaidDiagramBlock";
import { AcademicMarkdown } from "../../src/components/ui/AcademicMarkdown";
import type { Flashcard } from "../../src/types/flashcard";

describe("Phase 1C: Academic Notation UI Integration Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. MarkdownReadabilityRenderer Integration", () => {
    it("renders inline math ($...$) and block math ($$...$$) with KaTeX classes", () => {
      const markdown = `
# Khảo cứu Năng lượng

Phương trình Einstein: $E = mc^2$ là nền tảng.

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$
      `.trim();

      const { container } = render(<MarkdownReadabilityRenderer content={markdown} />);

      // Check inline math
      const katexElements = container.querySelectorAll(".katex");
      expect(katexElements.length).toBeGreaterThanOrEqual(2);

      // Check block math container
      const displayMath = container.querySelector(".katex-display");
      expect(displayMath).toBeTruthy();
    });

    it("renders mhchem chemistry equations correctly", () => {
      const markdown = `Phản ứng tạo nước: $\\ce{2H2 + O2 -> 2H2O}$ tỏa nhiệt.`;
      const { container } = render(<MarkdownReadabilityRenderer content={markdown} />);

      const chemEl = container.querySelector(".katex");
      expect(chemEl).toBeTruthy();
      expect(chemEl?.textContent).toContain("H");
      expect(chemEl?.textContent).toContain("O");
    });

    it("renders fenced mermaid blocks using MermaidDiagramBlock", async () => {
      const markdown = `
\`\`\`mermaid
graph TD
  A[Bắt đầu] --> B[Kết thúc]
\`\`\`
      `.trim();

      const { container } = render(<MarkdownReadabilityRenderer content={markdown} />);
      const mermaidBlock = container.querySelector('[data-testid="mermaid-diagram-block"]');
      expect(mermaidBlock).toBeTruthy();
    });

    it("STRICT INVARIANT: Preserves archive:// citation links and data-archive attributes 100%", () => {
      const markdown = `Tham chiếu tài liệu gốc: [Xem trích đoạn](archive://doc-triet-hoc-01?loc=trang-42) để đối chiếu.`;

      render(<MarkdownReadabilityRenderer content={markdown} />);

      const citationLink = screen.getByRole("link", { name: /Xem trích đoạn/i });
      expect(citationLink).toBeInTheDocument();
      expect(citationLink).toHaveAttribute("href", "archive://doc-triet-hoc-01?loc=trang-42");
      expect(citationLink).toHaveAttribute("data-archive-document-id", "doc-triet-hoc-01");
      expect(citationLink).toHaveAttribute("data-archive-locator", "trang-42");
      expect(citationLink.className).toContain("citation-source-deeplink");
    });
  });

  describe("2. FlashcardCardView Cloze & LaTeX Collision Fix", () => {
    const complexLaTeXClozeCard: Flashcard = {
      id: "card-latex-cloze-1",
      topicId: "topic-math",
      type: "cloze",
      front: "Biểu thức liên phân số: {{c1::$\\frac{1}{1 + \\frac{a}{b}}$::Phân số lồng}} hội tụ.",
      back: "Ghi chú: $a, b > 0$",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it("renders front side: masks cloze deletion cleanly with [...] and does not leak closing braces", () => {
      const { container } = render(
        <FlashcardCardView card={complexLaTeXClozeCard} isFlipped={false} />
      );

      // Must show [...] badge
      const clozeBadge = screen.getByTestId("cloze-deletion");
      expect(clozeBadge).toBeInTheDocument();
      expect(clozeBadge.textContent).toBe("[...]");

      // Must display before and after text cleanly
      expect(screen.getByText(/Biểu thức liên phân số:/)).toBeInTheDocument();
      expect(screen.getByText(/hội tụ\./)).toBeInTheDocument();

      // Must NOT leak raw closing delimiters "}}$" or "}}" into the visible text
      expect(container.textContent).not.toContain("}}$");
      expect(container.textContent).not.toContain("::Phân số lồng}}");

      // Must show hint
      expect(screen.getByText(/Phân số lồng/)).toBeInTheDocument();
    });

    it("renders back side: displays the LaTeX answer rendered via KaTeX without raw cloze syntax", () => {
      const { container } = render(
        <FlashcardCardView card={complexLaTeXClozeCard} isFlipped={true} />
      );

      // Must render KaTeX in the answer badge
      const katexInAnswer = container.querySelectorAll(".katex");
      expect(katexInAnswer.length).toBeGreaterThanOrEqual(1);

      // Text before and after should be preserved
      expect(screen.getByText(/Biểu thức liên phân số:/)).toBeInTheDocument();
      expect(screen.getByText(/hội tụ\./)).toBeInTheDocument();

      // Card back note should also be rendered with KaTeX
      expect(screen.getByText(/Ghi chú:/)).toBeInTheDocument();
    });
  });

  describe("3. MindMapNodeDrawer Academic Notation Live Preview", () => {
    it("displays drawer-node-academic-preview when title contains math notation", () => {
      const mockNode: MindMapDrawerNode = {
        id: "node-1",
        title: "Định luật: $E = mc^2$",
        type: "note",
        domain: "science",
        hopDistance: 0,
        tags: [],
        children: [],
      };

      render(
        <MindMapNodeDrawer
          isOpen={true}
          node={mockNode}
          onClose={vi.fn()}
          onUpdateTitle={vi.fn()}
        />
      );

      const previewBox = screen.getByTestId("drawer-node-academic-preview");
      expect(previewBox).toBeInTheDocument();
      expect(previewBox.textContent).toContain("Xem trước công thức:");

      const katexEl = previewBox.querySelector(".katex");
      expect(katexEl).toBeTruthy();
    });

    it("dynamically shows preview when user inputs chemical formula into drawer input", () => {
      const mockNode: MindMapDrawerNode = {
        id: "node-2",
        title: "Khái niệm Hóa học",
        type: "note",
        domain: "science",
        hopDistance: 0,
        tags: [],
        children: [],
      };

      render(
        <MindMapNodeDrawer
          isOpen={true}
          node={mockNode}
          onClose={vi.fn()}
          onUpdateTitle={vi.fn()}
        />
      );

      // Initially no academic preview for plain text
      expect(screen.queryByTestId("drawer-node-academic-preview")).toBeNull();

      // Type formula with chemistry notation
      const titleInput = screen.getByTestId("input-drawer-node-title");
      fireEvent.change(titleInput, { target: { value: "Axit Sunfuric $\\ce{H2SO4}$" } });

      // Preview should now appear
      const previewBox = screen.getByTestId("drawer-node-academic-preview");
      expect(previewBox).toBeInTheDocument();
      expect(previewBox.querySelector(".katex")).toBeTruthy();
    });
  });

  describe("4. MermaidDiagramBlock Error Handling & Fallback", () => {
    it("renders fallback UI when mermaid diagram syntax is invalid without throwing", async () => {
      const invalidCode = "this is not a valid mermaid syntax ::: ((( %%%";

      render(<MermaidDiagramBlock code={invalidCode} />);

      // Should render fallback container
      await waitFor(
        () => {
          const fallback = screen.getByTestId("mermaid-error-fallback");
          expect(fallback).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      expect(screen.getByText(/Biểu đồ Mermaid không thể hiển thị/i)).toBeInTheDocument();
      expect(screen.getByText(invalidCode)).toBeInTheDocument();
    });
  });
});
