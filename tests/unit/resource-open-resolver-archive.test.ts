import { describe, it, expect } from "vitest";
import { resolveResourceReaderDescriptor } from "../../src/lib/resourceOpenResolver";
import { resolveReaderFileUrl } from "../../src/lib/readerDocumentResolver";
import { Resource } from "../../src/types";

describe("Archive Open Resolver Specification", () => {
  it("1. Resolves Resource with openTarget = archive://{archivedDocumentId} to /api/archive/file/{id}", () => {
    const resource: Resource = {
      id: "res-upload-1",
      topicId: "topic-1",
      title: "Triết Học Về Tánh Không",
      type: "pdf",
      filePath: "triet_hoc_ve_tanh_khong.pdf",
      openTarget: "archive://doc-pdf-12345",
      createdAt: new Date().toISOString(),
    };

    const descriptor = resolveResourceReaderDescriptor(resource);
    expect(descriptor.canOpenInReader).toBe(true);
    expect(descriptor.format).toBe("pdf");
    expect(descriptor.documentId).toBe("doc-pdf-12345");
    expect(descriptor.fileUrl).toBe("/api/archive/file/doc-pdf-12345");
    expect(descriptor.title).toBe("Triết Học Về Tánh Không");
  });

  it("2. Resolves Resource with openTarget = archive://{archivedDocumentId} for EPUB format", () => {
    const resource: Resource = {
      id: "res-upload-2",
      topicId: "topic-1",
      title: "Kinh Điển EPUB",
      type: "book",
      filePath: "kinh_dien.epub",
      openTarget: "archive://doc-epub-67890",
      createdAt: new Date().toISOString(),
    };

    const descriptor = resolveResourceReaderDescriptor(resource);
    expect(descriptor.canOpenInReader).toBe(true);
    expect(descriptor.format).toBe("epub");
    expect(descriptor.documentId).toBe("doc-epub-67890");
    expect(descriptor.fileUrl).toBe("/api/archive/file/doc-epub-67890");
  });

  it("3. resolveReaderFileUrl resolves archive:// URIs to /api/archive/file/{id}", () => {
    const url = resolveReaderFileUrl("archive://doc-pdf-12345");
    expect(url).toBe("/api/archive/file/doc-pdf-12345");
  });

  it("4. Vault and Docs flows remain unaffected", () => {
    const vaultRes: Resource = {
      id: "res-vault-1",
      topicId: "topic-1",
      title: "Vault PDF",
      type: "pdf",
      filePath: "02_PDF_Source/guide.pdf",
      createdAt: new Date().toISOString(),
    };
    const vaultDesc = resolveResourceReaderDescriptor(vaultRes);
    expect(vaultDesc.fileUrl).toBe("/api/obsidian/vault/attachment?path=02_PDF_Source%2Fguide.pdf");

    const docsRes: Resource = {
      id: "res-docs-1",
      topicId: "topic-docs",
      title: "Docs MD",
      type: "md",
      filePath: "docs/spec.md",
      createdAt: new Date().toISOString(),
    };
    const docsDesc = resolveResourceReaderDescriptor(docsRes);
    expect(docsDesc.fileUrl).toBe("/api/docs/raw?path=spec.md");
  });
});
