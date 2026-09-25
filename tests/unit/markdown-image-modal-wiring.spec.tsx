import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { ObsidianDocumentViewerModal } from "../../src/components/modals/ObsidianDocumentViewerModal";
import { NoteReaderModal } from "../../src/components/modals/NoteReaderModal";
import { resolveAttachmentUrl, MarkdownReadabilityRenderer } from "../../src/lib/markdownReadability";
import { DataProvider } from "../../src/context/DataContext";

describe("Markdown Image Wiring in Modal & Reader Components (P2)", () => {
  it("resolves vault attachment URLs correctly when docPath and sourceType='vault' are passed", () => {
    // Case 1: Simple relative image
    const url1 = resolveAttachmentUrl("image.png", "guides/advanced/setup.md", "vault");
    expect(url1).toBe("/api/obsidian/vault/attachment?path=guides%2Fadvanced%2Fimage.png");

    // Case 2: Subfolder relative image
    const url2 = resolveAttachmentUrl("assets/diagram.png", "notes/architecture.md", "vault");
    expect(url2).toBe("/api/obsidian/vault/attachment?path=notes%2Fassets%2Fdiagram.png");

    // Case 3: Leading ./ relative image
    const url3 = resolveAttachmentUrl("./images/hero.png", "chapter1/intro.md", "vault");
    expect(url3).toBe("/api/obsidian/vault/attachment?path=chapter1%2Fimages%2Fhero.png");
  });

  it("resolves docs raw URLs correctly when docPath and sourceType='docs' are passed", () => {
    const url = resolveAttachmentUrl("assets/screenshots/ss-01.png", "docs/CAM_NANG_SOP.md", "docs");
    expect(url).toBe("/api/docs/raw?path=assets%2Fscreenshots%2Fss-01.png");
  });

  it("renders MarkdownReadabilityRenderer with correct image src for vault source", () => {
    const markdownWithImage = "# Note Title\n\n![Architecture Diagram](assets/arch.png)";
    render(
      <MarkdownReadabilityRenderer
        content={markdownWithImage}
        docPath="deep-research/quantum.md"
        sourceType="vault"
      />
    );

    const img = screen.getByRole("img", { name: "Architecture Diagram" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      "src",
      "/api/obsidian/vault/attachment?path=deep-research%2Fassets%2Farch.png"
    );
  });

  it("renders MarkdownReadabilityRenderer with correct image src for docs source", () => {
    const markdownWithImage = "# Docs Title\n\n![Hero Screenshot](./screenshots/hero.png)";
    render(
      <MarkdownReadabilityRenderer
        content={markdownWithImage}
        docPath="docs/user-guide.md"
        sourceType="docs"
      />
    );

    const img = screen.getByRole("img", { name: "Hero Screenshot" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      "src",
      "/api/docs/raw?path=screenshots%2Fhero.png"
    );
  });

  it("renders NoteReaderModal and preserves image URL resolution when note has sourcePath", () => {
    const mockNote = {
      id: "note-123",
      topicId: "topic-1",
      type: "study" as const,
      isPrivate: false,
      title: "Quantum Computing Foundations",
      content: "## Core Principles\n\n![Quantum Circuit](circuits/gate.png)",
      sourcePath: "vault:physics/quantum/circuit.md",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ["physics"],
    };

    render(
      <DataProvider>
        <NoteReaderModal
          isOpen={true}
          note={mockNote}
          onClose={vi.fn()}
          onEdit={vi.fn()}
        />
      </DataProvider>
    );

    const img = screen.getByRole("img", { name: "Quantum Circuit" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      "src",
      "/api/obsidian/vault/attachment?path=physics%2Fquantum%2Fcircuits%2Fgate.png"
    );
  });
});
