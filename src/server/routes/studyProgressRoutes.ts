import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { SM2ReviewInputSchema } from "../../lib/validation";

export function createStudyProgressRouter(prisma: PrismaClient | any): Router {
  const router = Router();

  router.post("/study-progress", async (req, res) => {
    const parsed = SM2ReviewInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    try {
      const existing = await prisma.studyProgress.findUnique({
        where: { topicId: parsed.data.topicId },
      });

      const updated = await prisma.studyProgress.upsert({
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
      res.json(updated);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update study progress";
      res.status(500).json({ error: msg });
    }
  });

  return router;
}
