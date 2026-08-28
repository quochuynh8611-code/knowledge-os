import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { SM2ReviewInputSchema } from "../../lib/validation";

async function executeInTx<T>(
  prisma: any,
  callback: (tx: any) => Promise<T>
): Promise<T> {
  if (typeof prisma.$transaction === "function") {
    return prisma.$transaction(callback);
  }
  return callback(prisma);
}

export function createStudyProgressRouter(prisma: PrismaClient | any): Router {
  const router = Router();

  router.get("/study-progress/:topicId/snapshots", async (req, res) => {
    try {
      if (!prisma.knowledgeProgressSnapshot) {
        return res.json([]);
      }
      const snapshots = await prisma.knowledgeProgressSnapshot.findMany({
        where: { topicId: req.params.topicId },
        orderBy: { capturedAt: "desc" },
      });
      res.json(snapshots);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to fetch study progress snapshots";
      res.status(500).json({ error: msg });
    }
  });

  router.post("/study-progress", async (req, res) => {
    const parsed = SM2ReviewInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    try {
      const result = await executeInTx(prisma, async (tx) => {
        const existing = await tx.studyProgress.findUnique({
          where: { topicId: parsed.data.topicId },
        });

        const updated = await tx.studyProgress.upsert({
          where: { topicId: parsed.data.topicId },
          create: {
            topicId: parsed.data.topicId,
            status: "in_progress",
            progress: 10,
            repetitions: 1,
            timeSpent: 15,
          },
          update: {
            repetitions: (existing?.repetitions ?? 0) + 1,
            timeSpent: (existing?.timeSpent ?? 0) + 15,
          },
        });

        if (tx.knowledgeProgressSnapshot) {
          await tx.knowledgeProgressSnapshot.create({
            data: {
              topicId: parsed.data.topicId,
              progressData: updated,
              triggerReason: parsed.data.triggerReason || "review_completed",
            },
          });
        }

        return updated;
      });

      res.json(result);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update study progress";
      res.status(500).json({ error: msg });
    }
  });

  return router;
}
