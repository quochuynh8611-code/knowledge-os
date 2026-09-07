import crypto from "crypto";
import { PrismaClient, Prisma } from "@prisma/client";

export interface IngestArtifactInput {
  sessionId: string;
  sourcePackageId?: string | null;
  taskPromptId?: string | null;
  topicId: string;
  artifactType: string;
  title: string;
  rawContent: string;
  citations?: Array<{
    markerIndex: number;
    sourceTitle: string;
    quote?: string | null;
  }>;
  metadata?: Record<string, unknown> | null;
}

export interface ImportNoteOptions {
  title?: string;
  type?: string;
  tags?: string[];
  targetTopicId?: string;
}

export interface ImportFlashcardItem {
  front: string;
  back: string;
  type?: string;
}

export class ArtifactIngestionService {
  constructor(private prisma: PrismaClient) {}

  private hashString(content: string): string {
    return crypto.createHash("sha256").update(content.trim()).digest("hex");
  }

  private generateIdempotencyKey(
    sourcePackageId: string | null | undefined,
    taskPromptId: string | null | undefined,
    contentHash: string
  ): string {
    const raw = `${sourcePackageId || "none"}:${taskPromptId || "none"}:${contentHash}`;
    return this.hashString(raw);
  }

  async ingestArtifact(input: IngestArtifactInput) {
    const contentHash = this.hashString(input.rawContent);
    const idempotencyKey = this.generateIdempotencyKey(
      input.sourcePackageId,
      input.taskPromptId,
      contentHash
    );

    // Check if artifact with identical idempotencyKey already exists
    const existing = await this.prisma.groundedArtifact.findUnique({
      where: { idempotencyKey },
      include: { citations: true, imports: true, sourcePackage: true, taskPrompt: true },
    });

    if (existing) {
      return { artifact: existing, isDuplicate: true };
    }

    const citationList = input.citations || [];

    const artifact = await this.prisma.groundedArtifact.create({
      data: {
        sessionId: input.sessionId,
        sourcePackageId: input.sourcePackageId || null,
        taskPromptId: input.taskPromptId || null,
        topicId: input.topicId,
        artifactType: input.artifactType || "study_guide",
        title: input.title,
        rawContent: input.rawContent,
        contentHash,
        idempotencyKey,
        status: "received",
        citationCount: citationList.length,
        metadata: (input.metadata as Prisma.InputJsonValue) || Prisma.JsonNull,
        citations: {
          create: citationList.map((c) => ({
            markerIndex: c.markerIndex,
            sourceTitle: c.sourceTitle,
            quote: c.quote || null,
          })),
        },
      },
      include: { citations: true, imports: true, sourcePackage: true, taskPrompt: true },
    });

    // Update session status & timeline event
    await this.prisma.researchSession.update({
      where: { id: input.sessionId },
      data: { status: "artifact_received" },
    });

    await this.prisma.researchTimelineEvent.create({
      data: {
        sessionId: input.sessionId,
        topicId: input.topicId,
        eventType: "artifact_received",
        eventData: {
          artifactId: artifact.id,
          title: artifact.title,
          citationCount: citationList.length,
          contentHash,
        },
      },
    });

    return { artifact, isDuplicate: false };
  }

  async getArtifactById(artifactId: string) {
    return this.prisma.groundedArtifact.findUnique({
      where: { id: artifactId },
      include: {
        citations: { orderBy: { markerIndex: "asc" } },
        imports: { orderBy: { createdAt: "desc" }, include: { targetNote: true, targetCard: true } },
        sourcePackage: true,
        taskPrompt: true,
        topic: true,
        session: true,
      },
    });
  }

  async reviewArtifact(artifactId: string, status: "validated" | "archived" | "received") {
    const artifact = await this.prisma.groundedArtifact.update({
      where: { id: artifactId },
      data: { status },
      include: { citations: true, imports: true, sourcePackage: true, taskPrompt: true },
    });

    await this.prisma.researchTimelineEvent.create({
      data: {
        sessionId: artifact.sessionId,
        topicId: artifact.topicId,
        eventType: "artifact_reviewed",
        eventData: {
          artifactId: artifact.id,
          newStatus: status,
        },
      },
    });

    return artifact;
  }

  async importToNote(artifactId: string, options: ImportNoteOptions = {}) {
    const artifact = await this.getArtifactById(artifactId);
    if (!artifact) {
      throw new Error(`Artifact ${artifactId} not found`);
    }

    const topicId = options.targetTopicId || artifact.topicId;
    const noteTitle = options.title || artifact.title;

    // Create Note in DB
    const note = await this.prisma.note.create({
      data: {
        topicId,
        title: noteTitle,
        content: artifact.rawContent,
        type: options.type || "insight",
        tags: options.tags || ["notebooklm-artifact", artifact.artifactType],
      },
    });

    // Create ArtifactImport record
    const artifactImport = await this.prisma.artifactImport.create({
      data: {
        artifactId,
        targetType: "note",
        targetNoteId: note.id,
        status: "success",
        itemCount: 1,
      },
    });

    // Update artifact status
    const newStatus = artifact.status === "received" ? "partially_imported" : artifact.status;
    await this.prisma.groundedArtifact.update({
      where: { id: artifactId },
      data: { status: newStatus },
    });

    // Record timeline event
    await this.prisma.researchTimelineEvent.create({
      data: {
        sessionId: artifact.sessionId,
        topicId: artifact.topicId,
        eventType: "note_imported",
        eventData: {
          artifactId,
          noteId: note.id,
          noteTitle: note.title,
        },
      },
    });

    return { note, artifactImport };
  }

  async importToFlashcards(
    artifactId: string,
    cards: ImportFlashcardItem[],
    targetTopicId?: string
  ) {
    const artifact = await this.getArtifactById(artifactId);
    if (!artifact) {
      throw new Error(`Artifact ${artifactId} not found`);
    }

    if (!cards || cards.length === 0) {
      throw new Error("No flashcard items provided for import");
    }

    const topicId = targetTopicId || artifact.topicId;

    const createdCards = [];
    for (const card of cards) {
      const created = await this.prisma.flashcard.create({
        data: {
          topicId,
          type: card.type || "basic",
          front: card.front,
          back: card.back,
          lifecycleStatus: "active",
          schedule: {
            create: {
              state: "new",
              dueAt: new Date(),
              interval: 0,
              easeFactor: 2.5,
              repetitions: 0,
              lapses: 0,
            },
          },
        },
      });
      createdCards.push(created);
    }

    // Create ArtifactImport record
    const artifactImport = await this.prisma.artifactImport.create({
      data: {
        artifactId,
        targetType: "flashcards",
        status: "success",
        itemCount: createdCards.length,
      },
    });

    // Update artifact status
    const newStatus = artifact.status === "received" ? "partially_imported" : artifact.status;
    await this.prisma.groundedArtifact.update({
      where: { id: artifactId },
      data: { status: newStatus },
    });

    // Record timeline event
    await this.prisma.researchTimelineEvent.create({
      data: {
        sessionId: artifact.sessionId,
        topicId: artifact.topicId,
        eventType: "flashcards_generated",
        eventData: {
          artifactId,
          cardCount: createdCards.length,
        },
      },
    });

    return { flashcards: createdCards, artifactImport };
  }
}
