import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

export class ResearchSessionService {
  constructor(private prisma: PrismaClient) {}

  private hashString(content: string): string {
    return crypto.createHash("sha256").update(content.trim()).digest("hex");
  }

  async getOrCreateSessionForTopic(topicId: string, notebookUrl?: string | null, notebookId?: string | null) {
    // Check if topic exists
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) {
      throw new Error(`Topic with id ${topicId} not found`);
    }

    // Find latest active session for topic or create one
    let session = await this.prisma.researchSession.findFirst({
      where: {
        topicId,
        status: { not: "archived" },
      },
      orderBy: { createdAt: "desc" },
      include: {
        sourcePackages: { orderBy: { version: "desc" } },
        taskPrompts: { orderBy: { version: "desc" } },
        artifacts: {
          orderBy: { createdAt: "desc" },
          include: { citations: true, imports: true, sourcePackage: true },
        },
        timelineEvents: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!session) {
      session = await this.prisma.researchSession.create({
        data: {
          topicId,
          notebookUrl: notebookUrl || null,
          notebookId: notebookId || null,
          status: "idle",
          timelineEvents: {
            create: {
              topicId,
              eventType: "session_created",
              eventData: { topicTitle: topic.title },
            },
          },
        },
        include: {
          sourcePackages: true,
          taskPrompts: true,
          artifacts: {
            include: { citations: true, imports: true, sourcePackage: true },
          },
          timelineEvents: true,
        },
      });
    }

    return session;
  }

  async getSessionById(sessionId: string) {
    const session = await this.prisma.researchSession.findUnique({
      where: { id: sessionId },
      include: {
        topic: true,
        sourcePackages: { orderBy: { version: "desc" } },
        taskPrompts: { orderBy: { version: "desc" } },
        artifacts: {
          orderBy: { createdAt: "desc" },
          include: { citations: true, imports: true, sourcePackage: true },
        },
        timelineEvents: { orderBy: { createdAt: "asc" } },
      },
    });

    return session;
  }

  async updateSession(sessionId: string, data: { status?: string; notebookUrl?: string | null; notebookId?: string | null }) {
    const updated = await this.prisma.researchSession.update({
      where: { id: sessionId },
      data,
      include: {
        sourcePackages: { orderBy: { version: "desc" } },
        taskPrompts: { orderBy: { version: "desc" } },
        artifacts: {
          orderBy: { createdAt: "desc" },
          include: { citations: true, imports: true, sourcePackage: true },
        },
        timelineEvents: { orderBy: { createdAt: "asc" } },
      },
    });
    return updated;
  }

  async packageSources(sessionId: string, content: string, sourceCount: number = 0) {
    const session = await this.prisma.researchSession.findUnique({
      where: { id: sessionId },
      include: { sourcePackages: { orderBy: { version: "desc" } } },
    });

    if (!session) {
      throw new Error(`Session with id ${sessionId} not found`);
    }

    const contentHash = this.hashString(content);
    const nextVersion = (session.sourcePackages[0]?.version || 0) + 1;

    // Run in transaction: set all existing packages isCurrent = false, create new package, record event
    const [_, newPackage] = await this.prisma.$transaction([
      this.prisma.sourcePackage.updateMany({
        where: { sessionId },
        data: { isCurrent: false },
      }),
      this.prisma.sourcePackage.create({
        data: {
          sessionId,
          version: nextVersion,
          isCurrent: true,
          content,
          contentHash,
          sourceCount,
        },
      }),
      this.prisma.researchSession.update({
        where: { id: sessionId },
        data: { status: "packaged" },
      }),
      this.prisma.researchTimelineEvent.create({
        data: {
          sessionId,
          topicId: session.topicId,
          eventType: "source_packaged",
          eventData: {
            version: nextVersion,
            sourceCount,
            contentLength: content.length,
            contentHash,
          },
        },
      }),
    ]);

    return newPackage;
  }

  async saveTaskPrompt(
    sessionId: string,
    promptMode: string,
    promptText: string,
    cliCommandHint?: string | null
  ) {
    const session = await this.prisma.researchSession.findUnique({
      where: { id: sessionId },
      include: { taskPrompts: { orderBy: { version: "desc" } } },
    });

    if (!session) {
      throw new Error(`Session with id ${sessionId} not found`);
    }

    const promptHash = this.hashString(promptText);
    const nextVersion = (session.taskPrompts[0]?.version || 0) + 1;

    const [_, newPrompt] = await this.prisma.$transaction([
      this.prisma.taskPrompt.updateMany({
        where: { sessionId },
        data: { isCurrent: false },
      }),
      this.prisma.taskPrompt.create({
        data: {
          sessionId,
          version: nextVersion,
          isCurrent: true,
          promptMode,
          promptText,
          promptHash,
          cliCommandHint: cliCommandHint || null,
        },
      }),
      this.prisma.researchSession.update({
        where: { id: sessionId },
        data: { status: "prompt_ready" },
      }),
      this.prisma.researchTimelineEvent.create({
        data: {
          sessionId,
          topicId: session.topicId,
          eventType: "prompt_generated",
          eventData: {
            version: nextVersion,
            promptMode,
            promptLength: promptText.length,
            promptHash,
          },
        },
      }),
    ]);

    return newPrompt;
  }
}
