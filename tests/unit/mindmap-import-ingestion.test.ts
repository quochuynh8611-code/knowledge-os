import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ingestMindMapAst,
  IngestionOptions,
  IngestionPort,
} from "../../src/lib/mindmapImportIngestion";
import { parseMindMapMarkdownOutline } from "../../src/lib/mindmapImportParser";
import { Topic } from "../../src/types";

describe("Phase I3: Mind Map Controlled Ingestion Engine (Unit Tests)", () => {
  let createdTopics: any[] = [];
  let deletedTopicIds: string[] = [];
  let createdLinks: any[] = [];
  let deletedLinkIds: string[] = [];
  let existingTopics: Topic[] = [];

  let mockPort: IngestionPort;

  beforeEach(() => {
    createdTopics = [];
    deletedTopicIds = [];
    createdLinks = [];
    deletedLinkIds = [];
    existingTopics = [];

    mockPort = {
      getExistingTopics: vi.fn(() => existingTopics),
      createTopic: vi.fn((data) => {
        const id = `new-topic-${createdTopics.length + 1}`;
        createdTopics.push({ id, ...data });
        return id;
      }),
      deleteTopic: vi.fn((id) => {
        deletedTopicIds.push(id);
      }),
      createKnowledgeLink: vi.fn((linkData) => {
        createdLinks.push(linkData);
      }),
      deleteKnowledgeLink: vi.fn((linkId) => {
        deletedLinkIds.push(linkId);
      }),
    };
  });

  it("Scenario 1 (Happy Path): creates topics and links in topological order under target category", async () => {
    const md = `- 📚 Bát Chánh Đạo
  - [tiên quyết] 📚 Chánh Kiến
  - [nâng cao] 📚 Chánh Tư Duy
`;
    const parsed = parseMindMapMarkdownOutline(md);
    expect(parsed.root).not.toBeNull();

    const options: IngestionOptions = {
      targetCategoryId: "cat-phat-hoc",
      targetCategoryType: "phat_hoc",
      dedupeStrategy: "skip-and-reuse",
    };

    const result = await ingestMindMapAst(parsed.root!, options, mockPort);

    expect(result.success).toBe(true);
    expect(result.createdTopicIds.length).toBe(3);
    expect(mockPort.createTopic).toHaveBeenCalledTimes(3);

    // Root topic created first
    expect(createdTopics[0].title).toBe("Bát Chánh Đạo");
    expect(createdTopics[0].categoryId).toBe("cat-phat-hoc");

    // Children created with parentId and knowledge links
    expect(createdTopics[1].title).toBe("Chánh Kiến");
    expect(createdTopics[1].categoryId).toBe("cat-phat-hoc");
    expect(createdTopics[1].parentId).toBe(createdTopics[0].id);

    expect(createdTopics[2].title).toBe("Chánh Tư Duy");
    expect(createdTopics[2].categoryId).toBe("cat-phat-hoc");
    expect(createdTopics[2].parentId).toBe(createdTopics[0].id);

    // Links created
    expect(createdLinks.length).toBe(2);
    expect(createdLinks[0].sourceId).toBe(createdTopics[0].id);
    expect(createdLinks[0].targetId).toBe(createdTopics[1].id);
    expect(createdLinks[0].linkType).toBe("prerequisite");

    expect(createdLinks[1].sourceId).toBe(createdTopics[0].id);
    expect(createdLinks[1].targetId).toBe(createdTopics[2].id);
    expect(createdLinks[1].linkType).toBe("advanced");
  });

  it("Scenario 2 (Deduplication - skip-and-reuse): reuses existing topic and connects children", async () => {
    existingTopics = [
      {
        id: "existing-topic-1",
        title: "Bát Chánh Đạo",
        slug: "bat-chanh-dao",
        categoryId: "cat-phat-hoc",
        type: "phat_hoc",
        description: "Existing topic",
        content: "",
        tags: [],
        links: [],
        studyProgress: {
          topicId: "existing-topic-1",
          status: "in_progress",
          progress: 50,
          interval: 1,
          easeFactor: 2.5,
          repetitions: 1,
          totalNotes: 0,
          timeSpent: 0,
        },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];

    const md = `- 📚 Bát Chánh Đạo
  - 📚 Chánh Định
`;
    const parsed = parseMindMapMarkdownOutline(md);
    expect(parsed.root).not.toBeNull();

    const options: IngestionOptions = {
      targetCategoryId: "cat-phat-hoc",
      dedupeStrategy: "skip-and-reuse",
    };

    const result = await ingestMindMapAst(parsed.root!, options, mockPort);

    expect(result.success).toBe(true);
    expect(result.reusedTopicIds).toContain("existing-topic-1");
    // Only 1 new topic created (Chánh Định)
    expect(result.createdTopicIds.length).toBe(1);
    expect(createdTopics[0].title).toBe("Chánh Định");
    expect(createdTopics[0].parentId).toBe("existing-topic-1");

    // Link connects from existing topic to new child
    expect(createdLinks.length).toBe(1);
    expect(createdLinks[0].sourceId).toBe("existing-topic-1");
    expect(createdLinks[0].targetId).toBe(createdTopics[0].id);
  });

  it("Scenario 3 (Deduplication - create-with-suffix): creates new topic with distinguishing suffix", async () => {
    existingTopics = [
      {
        id: "existing-topic-1",
        title: "Bát Chánh Đạo",
        slug: "bat-chanh-dao",
        categoryId: "cat-phat-hoc",
        type: "phat_hoc",
        description: "Existing topic",
        content: "",
        tags: [],
        links: [],
        studyProgress: {
          topicId: "existing-topic-1",
          status: "not_started",
          progress: 0,
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          totalNotes: 0,
          timeSpent: 0,
        },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];

    const md = `- 📚 Bát Chánh Đạo`;
    const parsed = parseMindMapMarkdownOutline(md);

    const options: IngestionOptions = {
      targetCategoryId: "cat-phat-hoc",
      dedupeStrategy: "create-with-suffix",
    };

    const result = await ingestMindMapAst(parsed.root!, options, mockPort);

    expect(result.success).toBe(true);
    expect(result.createdTopicIds.length).toBe(1);
    expect(createdTopics[0].title).toBe("Bát Chánh Đạo (Nhập mới)");
  });

  it("Scenario 4 (Deduplication - strict-abort): rejects and halts ingestion on duplicate", async () => {
    existingTopics = [
      {
        id: "existing-topic-1",
        title: "Bát Chánh Đạo",
        slug: "bat-chanh-dao",
        categoryId: "cat-phat-hoc",
        type: "phat_hoc",
        description: "Existing topic",
        content: "",
        tags: [],
        links: [],
        studyProgress: {
          topicId: "existing-topic-1",
          status: "not_started",
          progress: 0,
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          totalNotes: 0,
          timeSpent: 0,
        },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];

    const md = `- 📚 Bát Chánh Đạo\n  - 📚 Chánh Kiến`;
    const parsed = parseMindMapMarkdownOutline(md);

    const options: IngestionOptions = {
      targetCategoryId: "cat-phat-hoc",
      dedupeStrategy: "strict-abort",
    };

    await expect(
      ingestMindMapAst(parsed.root!, options, mockPort)
    ).rejects.toThrow(/trùng lặp/i);

    expect(createdTopics.length).toBe(0);
    expect(mockPort.createTopic).not.toHaveBeenCalled();
  });

  it("Scenario 5 (Batch Failure & Rollback): cleans up all previously created topics on mid-batch failure", async () => {
    let callCount = 0;
    mockPort.createTopic = vi.fn((data) => {
      callCount++;
      if (callCount === 3) {
        throw new Error("Simulated storage write error on 3rd topic");
      }
      const id = `topic-rollback-${callCount}`;
      createdTopics.push({ id, ...data });
      return id;
    });

    const md = `- 📚 Gốc
  - 📚 Con 1
  - 📚 Con 2 (Fail)
`;
    const parsed = parseMindMapMarkdownOutline(md);

    const options: IngestionOptions = {
      targetCategoryId: "cat-phat-hoc",
      dedupeStrategy: "skip-and-reuse",
    };

    await expect(
      ingestMindMapAst(parsed.root!, options, mockPort)
    ).rejects.toThrow("Simulated storage write error on 3rd topic");

    // Compensation rollback must have executed
    expect(deletedTopicIds.length).toBe(2);
    expect(deletedTopicIds).toContain("topic-rollback-1");
    expect(deletedTopicIds).toContain("topic-rollback-2");
  });
});
