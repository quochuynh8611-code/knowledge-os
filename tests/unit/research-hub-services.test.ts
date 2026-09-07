import { describe, it, expect, beforeEach, vi } from "vitest";
import { ResearchSessionService } from "../../src/server/services/researchSessionService";
import { ArtifactIngestionService } from "../../src/server/services/artifactIngestionService";

describe("ResearchSessionService & ArtifactIngestionService (Pipeline v2.1)", () => {
  let mockPrisma: any;
  let sessionService: ResearchSessionService;
  let ingestionService: ArtifactIngestionService;

  beforeEach(() => {
    mockPrisma = {
      topic: {
        findUnique: vi.fn(),
      },
      researchSession: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      sourcePackage: {
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      taskPrompt: {
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      groundedArtifact: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      artifactImport: {
        create: vi.fn(),
      },
      note: {
        create: vi.fn(),
      },
      flashcard: {
        create: vi.fn(),
      },
      researchTimelineEvent: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (ops: any[]) => Promise.all(ops)),
    };

    sessionService = new ResearchSessionService(mockPrisma);
    ingestionService = new ArtifactIngestionService(mockPrisma);
  });

  describe("ResearchSessionService", () => {
    it("creates a new session if none exists for topic", async () => {
      mockPrisma.topic.findUnique.mockResolvedValue({ id: "topic-1", title: "Tứ Diệu Đế" });
      mockPrisma.researchSession.findFirst.mockResolvedValue(null);
      mockPrisma.researchSession.create.mockResolvedValue({
        id: "session-1",
        topicId: "topic-1",
        status: "idle",
        sourcePackages: [],
        taskPrompts: [],
        artifacts: [],
        timelineEvents: [],
      });

      const session = await sessionService.getOrCreateSessionForTopic("topic-1");
      expect(session.id).toBe("session-1");
      expect(mockPrisma.researchSession.create).toHaveBeenCalled();
    });

    it("increments source package version and updates isCurrent on packageSources (Decision 1)", async () => {
      mockPrisma.researchSession.findUnique.mockResolvedValue({
        id: "session-1",
        topicId: "topic-1",
        sourcePackages: [{ id: "pkg-1", version: 1, isCurrent: true }],
      });

      mockPrisma.sourcePackage.create.mockResolvedValue({
        id: "pkg-2",
        sessionId: "session-1",
        version: 2,
        isCurrent: true,
        content: "Source content v2",
        contentHash: "hash-v2",
        sourceCount: 5,
      });

      const newPkg = await sessionService.packageSources("session-1", "Source content v2", 5);
      expect(newPkg.version).toBe(2);
      expect(mockPrisma.sourcePackage.updateMany).toHaveBeenCalledWith({
        where: { sessionId: "session-1" },
        data: { isCurrent: false },
      });
      expect(mockPrisma.sourcePackage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionId: "session-1",
            version: 2,
            isCurrent: true,
          }),
        })
      );
    });

    it("increments task prompt version and sets previous to isCurrent: false", async () => {
      mockPrisma.researchSession.findUnique.mockResolvedValue({
        id: "session-1",
        topicId: "topic-1",
        taskPrompts: [{ id: "prompt-1", version: 1, isCurrent: true }],
      });

      mockPrisma.taskPrompt.create.mockResolvedValue({
        id: "prompt-2",
        sessionId: "session-1",
        version: 2,
        isCurrent: true,
        promptMode: "study_guide",
        promptText: "Prompt text v2",
        promptHash: "prompt-hash-2",
      });

      const newPrompt = await sessionService.saveTaskPrompt(
        "session-1",
        "study_guide",
        "Prompt text v2"
      );
      expect(newPrompt.version).toBe(2);
      expect(mockPrisma.taskPrompt.updateMany).toHaveBeenCalledWith({
        where: { sessionId: "session-1" },
        data: { isCurrent: false },
      });
    });
  });

  describe("ArtifactIngestionService", () => {
    it("ingests artifact with citations and records timeline event", async () => {
      mockPrisma.groundedArtifact.findUnique.mockResolvedValue(null);
      mockPrisma.groundedArtifact.create.mockResolvedValue({
        id: "art-1",
        sessionId: "session-1",
        sourcePackageId: "pkg-1",
        taskPromptId: "prompt-1",
        topicId: "topic-1",
        artifactType: "study_guide",
        title: "Tóm lược Tứ Diệu Đế",
        rawContent: "# Tứ Diệu Đế [1]\nKhổ đế...",
        status: "received",
        citationCount: 1,
        citations: [{ id: "cit-1", markerIndex: 1, sourceTitle: "Kinh Chuyển Pháp Luân" }],
      });

      const { artifact, isDuplicate } = await ingestionService.ingestArtifact({
        sessionId: "session-1",
        sourcePackageId: "pkg-1",
        taskPromptId: "prompt-1",
        topicId: "topic-1",
        artifactType: "study_guide",
        title: "Tóm lược Tứ Diệu Đế",
        rawContent: "# Tứ Diệu Đế [1]\nKhổ đế...",
        citations: [{ markerIndex: 1, sourceTitle: "Kinh Chuyển Pháp Luân", quote: "Khổ đế" }],
      });

      expect(isDuplicate).toBe(false);
      expect(artifact.id).toBe("art-1");
      expect(mockPrisma.researchTimelineEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: "artifact_received",
          }),
        })
      );
    });

    it("deduplicates idempotently if exact artifact already ingested", async () => {
      const existingArtifact = {
        id: "art-1",
        sessionId: "session-1",
        title: "Existing Artifact",
        status: "received",
      };
      mockPrisma.groundedArtifact.findUnique.mockResolvedValue(existingArtifact);

      const { artifact, isDuplicate } = await ingestionService.ingestArtifact({
        sessionId: "session-1",
        sourcePackageId: "pkg-1",
        taskPromptId: "prompt-1",
        topicId: "topic-1",
        artifactType: "study_guide",
        title: "Existing Artifact",
        rawContent: "Same content",
      });

      expect(isDuplicate).toBe(true);
      expect(artifact.id).toBe("art-1");
      expect(mockPrisma.groundedArtifact.create).not.toHaveBeenCalled();
    });

    it("imports artifact to Note independently without requiring flashcard generation", async () => {
      mockPrisma.groundedArtifact.findUnique.mockResolvedValue({
        id: "art-1",
        sessionId: "session-1",
        topicId: "topic-1",
        title: "Ghi chú Nghiên cứu",
        rawContent: "Nội dung học thuật",
        artifactType: "study_guide",
        status: "received",
      });

      mockPrisma.note.create.mockResolvedValue({
        id: "note-100",
        topicId: "topic-1",
        title: "Ghi chú Nghiên cứu",
        content: "Nội dung học thuật",
        type: "insight",
      });

      mockPrisma.artifactImport.create.mockResolvedValue({
        id: "imp-1",
        artifactId: "art-1",
        targetType: "note",
        targetNoteId: "note-100",
        status: "success",
      });

      const { note, artifactImport } = await ingestionService.importToNote("art-1");
      expect(note.id).toBe("note-100");
      expect(artifactImport.status).toBe("success");
      expect(mockPrisma.groundedArtifact.update).toHaveBeenCalledWith({
        where: { id: "art-1" },
        data: { status: "partially_imported" },
      });
      expect(mockPrisma.researchTimelineEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: "note_imported",
            topicId: "topic-1",
          }),
        })
      );
    });

    it("imports flashcards independently and records timeline event", async () => {
      mockPrisma.groundedArtifact.findUnique.mockResolvedValue({
        id: "art-1",
        sessionId: "session-1",
        topicId: "topic-1",
        title: "Flashcard Source",
        rawContent: "Q&A content",
        artifactType: "qa_pair",
        status: "partially_imported",
      });

      mockPrisma.flashcard.create.mockResolvedValue({
        id: "card-1",
        topicId: "topic-1",
        front: "Khổ đế là gì?",
        back: "Sự thật về nỗi khổ",
      });

      mockPrisma.artifactImport.create.mockResolvedValue({
        id: "imp-2",
        artifactId: "art-1",
        targetType: "flashcards",
        status: "success",
        itemCount: 1,
      });

      const { flashcards, artifactImport } = await ingestionService.importToFlashcards(
        "art-1",
        [{ front: "Khổ đế là gì?", back: "Sự thật về nỗi khổ" }]
      );

      expect(flashcards.length).toBe(1);
      expect(artifactImport.status).toBe("success");
      expect(mockPrisma.researchTimelineEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: "flashcards_generated",
          }),
        })
      );
    });
  });
});
