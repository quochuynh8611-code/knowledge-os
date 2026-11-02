import { Router } from "express";
import { Prisma, type PrismaClient } from "@prisma/client";
import { ResourceCreateSchema } from "../../lib/validation";

export function createResourceRouter(prisma: PrismaClient | any): Router {
  const router = Router();

  router.get("/resources", async (_req, res) => {
    try {
      const resources = await prisma.resource.findMany({
        orderBy: { createdAt: "desc" },
      });
      res.json(resources);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      res.status(500).json({ error: msg });
    }
  });

  router.post("/resources", async (req, res) => {
    const parsed = ResourceCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    const clientProvidedId =
      typeof req.body.id === "string" && req.body.id.trim().length > 0
        ? req.body.id.trim()
        : undefined;

    // Normalization rules for openTarget:
    // - omitted (undefined): do not override when updating existing record
    // - null or empty string or pure whitespace: explicit clear to null
    // - non-empty valid string: trimmed string
    const rawOpenTarget = parsed.data.openTarget;
    const isExplicitlyProvided = Object.prototype.hasOwnProperty.call(
      req.body,
      "openTarget"
    );

    let normalizedOpenTarget: string | null | undefined = undefined;
    if (isExplicitlyProvided) {
      if (rawOpenTarget === null || rawOpenTarget === undefined) {
        normalizedOpenTarget = null;
      } else {
        const trimmed = rawOpenTarget.trim();
        normalizedOpenTarget = trimmed.length > 0 ? trimmed : null;
      }
    }

    try {
      if (clientProvidedId) {
        const existing = await prisma.resource.findUnique({
          where: { id: clientProvidedId },
        });

        if (existing) {
          const updateData: Prisma.ResourceUpdateInput = {
            topic: { connect: { id: parsed.data.topicId } },
            title: parsed.data.title,
            type: parsed.data.type,
            author: parsed.data.author,
            url: parsed.data.url,
            filePath: parsed.data.filePath,
            notes: parsed.data.notes,
          };

          if (isExplicitlyProvided) {
            updateData.openTarget = normalizedOpenTarget;
          }

          const updatedResource = await prisma.resource.update({
            where: { id: clientProvidedId },
            data: updateData,
          });

          return res.status(200).json(updatedResource);
        }

        try {
          const newResource = await prisma.resource.create({
            data: {
              id: clientProvidedId,
              topicId: parsed.data.topicId,
              title: parsed.data.title,
              type: parsed.data.type,
              author: parsed.data.author,
              url: parsed.data.url,
              filePath: parsed.data.filePath,
              openTarget: isExplicitlyProvided ? normalizedOpenTarget : null,
              notes: parsed.data.notes,
            },
          });

          return res.status(201).json(newResource);
        } catch (createErr: unknown) {
          // Verify if error is P2002 Unique Constraint Violation targeting Resource.id or Resource_pkey
          const isKnownRequestError =
            createErr instanceof Prisma.PrismaClientKnownRequestError ||
            (typeof createErr === "object" &&
              createErr !== null &&
              "code" in createErr);

          if (isKnownRequestError) {
            const errCode = (createErr as { code?: string }).code;
            const meta = (createErr as { meta?: Record<string, unknown> }).meta;

            if (errCode === "P2002") {
              const target = meta?.target;
              const driverAdapterFields = (
                meta?.driverAdapterError as {
                  cause?: { constraint?: { fields?: string[] } };
                }
              )?.cause?.constraint?.fields;
              const originalMessage = (
                meta?.driverAdapterError as {
                  cause?: { originalMessage?: string };
                }
              )?.cause?.originalMessage;

              const isIdConflict =
                (Array.isArray(target) && target.length === 1 && target[0] === "id") ||
                (typeof target === "string" && (target === "id" || target === "Resource_pkey")) ||
                (Array.isArray(driverAdapterFields) &&
                  driverAdapterFields.length === 1 &&
                  driverAdapterFields[0] === "id") ||
                (typeof originalMessage === "string" &&
                  originalMessage.includes("Resource_pkey"));

              if (isIdConflict) {
                // Fallback update outside transaction with exact same openTarget mapping
                const fallbackUpdateData: Prisma.ResourceUpdateInput = {
                  topic: { connect: { id: parsed.data.topicId } },
                  title: parsed.data.title,
                  type: parsed.data.type,
                  author: parsed.data.author,
                  url: parsed.data.url,
                  filePath: parsed.data.filePath,
                  notes: parsed.data.notes,
                };

                if (isExplicitlyProvided) {
                  fallbackUpdateData.openTarget = normalizedOpenTarget;
                }

                const fallbackUpdated = await prisma.resource.update({
                  where: { id: clientProvidedId },
                  data: fallbackUpdateData,
                });

                return res.status(200).json(fallbackUpdated);
              }
            }
          }

          // If not P2002 on Resource.id/Resource_pkey, rethrow original error
          throw createErr;
        }
      }

      // No client ID provided: purely new resource creation
      const createdResource = await prisma.resource.create({
        data: {
          topicId: parsed.data.topicId,
          title: parsed.data.title,
          type: parsed.data.type,
          author: parsed.data.author,
          url: parsed.data.url,
          filePath: parsed.data.filePath,
          openTarget: isExplicitlyProvided ? normalizedOpenTarget : null,
          notes: parsed.data.notes,
        },
      });

      return res.status(201).json(createdResource);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to persist resource";
      res.status(500).json({ error: msg });
    }
  });

  router.delete("/resources/:id", async (req, res) => {
    try {
      await prisma.resource.delete({
        where: { id: req.params.id },
      });
      res.json({ success: true, id: req.params.id });
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: unknown }).code === "P2025"
      ) {
        return res.json({
          success: true,
          id: req.params.id,
          alreadyDeleted: true,
        });
      }
      const msg =
        err instanceof Error ? err.message : "Failed to delete resource";
      res.status(500).json({ error: msg });
    }
  });

  return router;
}
