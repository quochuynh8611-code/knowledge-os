import { describe, it, expect } from "vitest";
import { calculateBackupChecksum, serializeCanonicalBackupData } from "../../src/lib/validation";
import {
  INITIAL_CATEGORIES,
  INITIAL_TOPICS,
  INITIAL_NOTES,
  INITIAL_RESOURCES,
  INITIAL_TAGS,
} from "../../src/data/initialData";

describe("Phase 2C.1: Cross-Runtime SHA-256 Checksum Parity Tests", () => {
  // Minimal fixed fixture
  const minimalFixedData = {
    categories: [
      { id: "cat-1", name: "Cat 1", slug: "cat-1", type: "phat-hoc", order: 0 },
    ],
    topics: [
      {
        id: "top-1",
        title: "Topic 1",
        slug: "top-1",
        categoryId: "cat-1",
        type: "phat-hoc",
        description: "Desc",
        content: "Content",
        tags: ["tag1"],
        links: [],
      },
    ],
    notes: [
      {
        id: "note-1",
        topicId: "top-1",
        title: "Note 1",
        content: "Note Content",
        type: "study",
        isPrivate: false,
        tags: [],
      },
    ],
    resources: [
      { id: "res-1", topicId: "top-1", title: "Res 1", type: "book" },
    ],
    tags: [{ id: "tag-1", name: "Tag 1", slug: "tag-1", count: 1 }],
  };

  const canonical35TopicsData = {
    categories: INITIAL_CATEGORIES,
    topics: INITIAL_TOPICS,
    notes: INITIAL_NOTES,
    resources: INITIAL_RESOURCES,
    tags: INITIAL_TAGS,
  };

  // Helper WebCrypto implementation (Standard in Browser & Modern Node WebCrypto)
  // Uses serializeCanonicalBackupData so the canonical serialization (sorted keys) matches
  // calculateBackupChecksum, making this a true algorithm-parity test (sha256Sync vs WebCrypto
  // on the identical canonical input string).
  async function computeWebCryptoSHA256(
    canonicalPayload: unknown,
  ): Promise<string> {
    const jsonString = serializeCanonicalBackupData(canonicalPayload);
    const msgBuffer = new TextEncoder().encode(jsonString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  it("1. Canonical JSON serializer là tất định (deterministic) và không phụ thuộc thứ tự key đầu vào", () => {
    // Given 2 đối tượng có thứ tự key khác nhau
    const objA = {
      categories: minimalFixedData.categories,
      topics: minimalFixedData.topics,
      notes: minimalFixedData.notes,
      resources: minimalFixedData.resources,
      tags: minimalFixedData.tags,
    };

    const objB = {
      tags: minimalFixedData.tags,
      resources: minimalFixedData.resources,
      notes: minimalFixedData.notes,
      topics: minimalFixedData.topics,
      categories: minimalFixedData.categories,
    };

    // When
    const hashA = calculateBackupChecksum(objA);
    const hashB = calculateBackupChecksum(objB);

    // Then
    expect(hashA).toBe(hashB);
    expect(hashA).toMatch(/^[a-f0-9]{64}$/);
  });

  it("2. Node.js SHA-256 và Browser WebCrypto SHA-256 cho cùng kết quả bit-for-bit chính xác", async () => {
    // Given
    const canonicalPayload = {
      categories: minimalFixedData.categories,
      topics: minimalFixedData.topics,
      notes: minimalFixedData.notes,
      resources: minimalFixedData.resources,
      tags: minimalFixedData.tags,
    };

    // When
    const nodeChecksum = calculateBackupChecksum(canonicalPayload);
    const webCryptoChecksum = await computeWebCryptoSHA256(canonicalPayload);

    // Then
    expect(nodeChecksum).toBe(webCryptoChecksum);
    expect(nodeChecksum).toMatch(/^[a-f0-9]{64}$/);
    expect(nodeChecksum).toBe(nodeChecksum.toLowerCase());
  });

  it("3. Parity trên Dataset Canonical 35 Topics giữa Server và WebCrypto", async () => {
    // Given
    const canonicalPayload = {
      categories: canonical35TopicsData.categories,
      topics: canonical35TopicsData.topics,
      notes: canonical35TopicsData.notes,
      resources: canonical35TopicsData.resources,
      tags: canonical35TopicsData.tags,
    };

    // When
    const nodeChecksum = calculateBackupChecksum(canonicalPayload);
    const webCryptoChecksum = await computeWebCryptoSHA256(canonicalPayload);

    // Then
    expect(nodeChecksum).toBe(webCryptoChecksum);
    expect(nodeChecksum).toHaveLength(64);
  });

  it("4. Bất kỳ thay đổi nào trong 1 ký tự thuộc topics đều làm thay đổi hoàn toàn mã SHA-256", async () => {
    // Given
    const modifiedPayload = {
      ...canonical35TopicsData,
      topics: [
        ...canonical35TopicsData.topics.slice(1),
        {
          ...canonical35TopicsData.topics[0],
          title: canonical35TopicsData.topics[0].title + " (Sửa đổi)",
        },
      ],
    };

    // When
    const originalHash = calculateBackupChecksum(canonical35TopicsData);
    const modifiedHash = calculateBackupChecksum(modifiedPayload);
    const modifiedWebCryptoHash = await computeWebCryptoSHA256(modifiedPayload);

    // Then
    expect(modifiedHash).not.toBe(originalHash);
    expect(modifiedHash).toBe(modifiedWebCryptoHash);
  });

  it("5. Trường checksum metadata không được tự tham gia vào nội dung được hash", () => {
    // Given
    const dataWithoutChecksum = {
      categories: minimalFixedData.categories,
      topics: minimalFixedData.topics,
      notes: minimalFixedData.notes,
      resources: minimalFixedData.resources,
      tags: minimalFixedData.tags,
    };

    const dataWithChecksumInjected = {
      ...dataWithoutChecksum,
      checksum: "dummy-checksum-should-be-ignored",
    };

    // When
    const hashPure = calculateBackupChecksum(dataWithoutChecksum);
    const hashInjected = calculateBackupChecksum(
      dataWithChecksumInjected as any,
    );

    // Then: calculateBackupChecksum chỉ extract 5 collections canonical
    expect(hashInjected).toBe(hashPure);
  });
});
