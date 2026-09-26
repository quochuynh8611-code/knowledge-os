import { describe, it, expect } from "vitest";
import { resolveResourceReaderDescriptor } from "../../src/lib/resourceOpenResolver";
import { resolveReaderFileUrl } from "../../src/lib/readerDocumentResolver";
import { Resource } from "../../src/types";

describe("Multi-Vault Resource & Reader URL Resolution", () => {
  it("1. Resolves Resource with vault:<vaultId>:<relPath> prefix", () => {
    const resource: Resource = {
      id: "res-test-1",
      topicId: "topic-1",
      title: "Triết Học Về Tánh Không",
      type: "pdf",
      filePath: "vault:phat-hoc:02_PDF_Source/03_Kinh_Luan_Dai_Thua/triet_hoc_ve_tanh_khong_ht_thich_tue_sy.pdf",
      createdAt: new Date().toISOString(),
    };

    const descriptor = resolveResourceReaderDescriptor(resource);
    expect(descriptor.canOpenInReader).toBe(true);
    expect(descriptor.format).toBe("pdf");
    expect(descriptor.sourceType).toBe("vault");
    expect(descriptor.documentId).toBe(
      "vault:phat-hoc:02_PDF_Source/03_Kinh_Luan_Dai_Thua/triet_hoc_ve_tanh_khong_ht_thich_tue_sy.pdf"
    );
    expect(descriptor.fileUrl).toBe(
      "/api/obsidian/vault/attachment?path=02_PDF_Source%2F03_Kinh_Luan_Dai_Thua%2Ftriet_hoc_ve_tanh_khong_ht_thich_tue_sy.pdf&vaultId=phat-hoc"
    );
  });

  it("2. Resolves Resource with bare filename to vault attachment", () => {
    const resource: Resource = {
      id: "res-test-2",
      topicId: "topic-1",
      title: "Triết Học Về Tánh Không",
      type: "pdf",
      filePath: "triet_hoc_ve_tanh_khong_ht_thich_tue_sy.pdf",
      createdAt: new Date().toISOString(),
    };

    const descriptor = resolveResourceReaderDescriptor(resource);
    expect(descriptor.canOpenInReader).toBe(true);
    expect(descriptor.format).toBe("pdf");
    expect(descriptor.sourceType).toBe("vault");
    expect(descriptor.fileUrl).toBe(
      "/api/obsidian/vault/attachment?path=triet_hoc_ve_tanh_khong_ht_thich_tue_sy.pdf"
    );
  });

  it("3. resolveReaderFileUrl preserves vaultId if present", () => {
    const url = resolveReaderFileUrl("vault:dong-y:05_EPUB_Export/noi_kinh.epub");
    expect(url).toBe(
      "/api/obsidian/vault/attachment?path=05_EPUB_Export%2Fnoi_kinh.epub&vaultId=dong-y"
    );
  });

  it("4. Docs flow remains unchanged", () => {
    const resource: Resource = {
      id: "res-docs-1",
      topicId: "topic-docs",
      title: "Feature Spec",
      type: "md",
      filePath: "docs/feature-spec.md",
      createdAt: new Date().toISOString(),
    };

    const descriptor = resolveResourceReaderDescriptor(resource);
    expect(descriptor.canOpenInReader).toBe(true);
    expect(descriptor.format).toBe("md");
    expect(descriptor.sourceType).toBe("docs");
    expect(descriptor.fileUrl).toBe("/api/docs/raw?path=feature-spec.md");
  });
});
